import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  assetComplianceLinks,
  inspectionSchedules,
  inspectionResults,
  systemTests,
  maintenanceRecords,
  type AssetComplianceLink,
} from "@/db/schema";
import { getHubSpotConnector, STATIC_HUBSPOT_ASSETS, type HubSpotAsset } from "@/lib/integrations/hubspot";
import { cloudList, cloudUpsert, isWeb } from "@/lib/cloud/repo";
import { enqueue } from "@/lib/sync";
import { useAuth } from "@/context/AuthContext";

export type AssetWithOverlay = HubSpotAsset & {
  complianceLinks: AssetComplianceLink[];
  overallStatus: string;
  lastInspectionAt: string | null;
  nextInspectionAt: string | null;
};

export type AssetHistory = {
  results: (typeof inspectionResults.$inferSelect)[];
  tests: (typeof systemTests.$inferSelect)[];
  maintenance: (typeof maintenanceRecords.$inferSelect)[];
  schedules: (typeof inspectionSchedules.$inferSelect)[];
};

export function useAssets() {
  const { orgId } = useAuth();

  return useQuery({
    queryKey: ["assets", orgId],
    enabled: !!orgId,
    queryFn: async (): Promise<AssetWithOverlay[]> => {
      if (!orgId) return [];

      const [hsAssets, links] = isWeb
        ? await Promise.all([
            Promise.resolve(STATIC_HUBSPOT_ASSETS),
            cloudList<AssetComplianceLink>("asset_compliance_links", orgId),
          ])
        : await (async () => {
            const db = await getDb();
            const connector = getHubSpotConnector();
            return Promise.all([
              connector.listAssets(orgId),
              db.select().from(assetComplianceLinks).where(eq(assetComplianceLinks.org_id, orgId)),
            ]);
          })();

      return hsAssets.map((asset) => {
        const assetLinks = links.filter((l) => l.hubspot_asset_id === asset.id);

        let overallStatus = "PENDING";
        if (assetLinks.length > 0) {
          if (assetLinks.some((l) => l.compliance_status === "NON_COMPLIANT")) {
            overallStatus = "NON_COMPLIANT";
          } else if (assetLinks.every((l) => l.compliance_status === "COMPLIANT")) {
            overallStatus = "COMPLIANT";
          } else if (assetLinks.every((l) => l.compliance_status === "EXEMPT")) {
            overallStatus = "EXEMPT";
          }
        }

        const nextDates = assetLinks
          .filter((l) => l.next_inspection_at)
          .map((l) => l.next_inspection_at!)
          .sort();

        const lastDates = assetLinks
          .filter((l) => l.last_inspection_at)
          .map((l) => l.last_inspection_at!)
          .sort()
          .reverse();

        return {
          ...asset,
          complianceLinks: assetLinks,
          overallStatus,
          lastInspectionAt: lastDates[0] ?? null,
          nextInspectionAt: nextDates[0] ?? null,
        };
      });
    },
    staleTime: 5 * 60_000,
  });
}

export function useAsset(assetId: string) {
  const assetsQuery = useAssets();
  return {
    ...assetsQuery,
    data: assetsQuery.data?.find((a) => a.id === assetId),
  };
}

export function useAssetHistory(hubspotAssetId: string) {
  const { orgId } = useAuth();

  return useQuery({
    queryKey: ["asset-history", orgId, hubspotAssetId],
    enabled: !!orgId && !!hubspotAssetId,
    queryFn: async (): Promise<AssetHistory> => {
      if (!orgId) return { results: [], tests: [], maintenance: [], schedules: [] };

      if (isWeb) {
        const [allResults, allTests, allMaint, allSched] = await Promise.all([
          cloudList<AssetHistory["results"][number]>("inspection_results", orgId),
          cloudList<AssetHistory["tests"][number]>("system_tests", orgId),
          cloudList<AssetHistory["maintenance"][number]>("maintenance_records", orgId),
          cloudList<AssetHistory["schedules"][number]>("inspection_schedules", orgId),
        ]);
        const byAsset = <T extends { hubspot_asset_id: string }>(rows: T[]) =>
          rows.filter((r) => r.hubspot_asset_id === hubspotAssetId);
        return {
          results: byAsset(allResults),
          tests: byAsset(allTests),
          maintenance: byAsset(allMaint),
          schedules: byAsset(allSched),
        };
      }

      const db = await getDb();

      const [results, tests, maintenance, schedules] = await Promise.all([
        db.select().from(inspectionResults).where(
          and(eq(inspectionResults.org_id, orgId), eq(inspectionResults.hubspot_asset_id, hubspotAssetId)),
        ),
        db.select().from(systemTests).where(
          and(eq(systemTests.org_id, orgId), eq(systemTests.hubspot_asset_id, hubspotAssetId)),
        ),
        db.select().from(maintenanceRecords).where(
          and(eq(maintenanceRecords.org_id, orgId), eq(maintenanceRecords.hubspot_asset_id, hubspotAssetId)),
        ),
        db.select().from(inspectionSchedules).where(
          and(eq(inspectionSchedules.org_id, orgId), eq(inspectionSchedules.hubspot_asset_id, hubspotAssetId)),
        ),
      ]);

      return { results, tests, maintenance, schedules };
    },
    staleTime: 2 * 60_000,
  });
}

type UpdateOverlayParams = {
  complianceLinkId: string;
  assetId: string;
  notes?: string | null;
};

export function useUpdateAssetOverlay() {
  const { orgId } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: UpdateOverlayParams) => {
      if (!orgId) return;
      const now = new Date().toISOString();

      if (isWeb) {
        const links = await cloudList<AssetComplianceLink>("asset_compliance_links", orgId);
        const current = links.find((l) => l.id === params.complianceLinkId);
        if (!current) return;
        await cloudUpsert<AssetComplianceLink>("asset_compliance_links", {
          ...current,
          notes: params.notes ?? null,
          updated_at: now,
          sync_status: "SYNCED",
        });
        return;
      }

      const db = await getDb();

      await db
        .update(assetComplianceLinks)
        .set({ notes: params.notes ?? null, updated_at: now, sync_status: "PENDING" })
        .where(
          and(
            eq(assetComplianceLinks.id, params.complianceLinkId),
            eq(assetComplianceLinks.org_id, orgId),
          ),
        );

      await enqueue({
        org_id: orgId,
        entity_type: "asset_compliance_link",
        entity_id: params.complianceLinkId,
        operation: "UPDATE",
        payload: { notes: params.notes, hubspot_asset_id: params.assetId },
        target_provider: "HUBSPOT",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assets", orgId] });
      qc.invalidateQueries({ queryKey: ["dashboard", orgId] });
    },
  });
}
