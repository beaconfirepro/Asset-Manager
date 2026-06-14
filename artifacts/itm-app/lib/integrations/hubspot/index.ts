import { getDb } from "@/db/client";
import { hubspotObjectCache, type HubspotObjectCache, type NewHubspotObjectCache } from "@/db/schema";
import { and, eq, gt } from "drizzle-orm";

function nowIso() { return new Date().toISOString(); }
function genId() { return Date.now().toString(36) + Math.random().toString(36).substring(2, 9); }

export type HubSpotAsset = {
  id: string;
  name: string;
  location: string;
  system_type: string;
  lifecycle_status: string;
  properties: Record<string, unknown>;
};

export type HubSpotTicket = {
  id: string;
  subject: string;
  status: string;
  type: string;
  hubspot_asset_id: string;
  properties: Record<string, unknown>;
};

export type HubSpotProposalHandoffParams = {
  org_id: string;
  hubspot_customer_id: string;
  inspection_result_id: string;
  deficiency_summary: string;
};

export type HubSpotInspectionTicketParams = {
  org_id: string;
  hubspot_asset_id: string;
  schedule_id: string;
  scheduled_date: string;
};

export type HubSpotDeficiencyTicketParams = {
  org_id: string;
  hubspot_asset_id: string;
  inspection_result_id: string;
  deficiency_description: string;
  severity: string;
};

export type HubSpotReportDeliveryParams = {
  org_id: string;
  hubspot_customer_id: string;
  report_id: string;
  pdf_url: string;
};

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

class HubSpotConnector {
  async getAsset(orgId: string, assetId: string): Promise<HubSpotAsset | null> {
    const cached = await this.getCached(orgId, "asset", assetId);
    if (cached) return JSON.parse(cached.payload) as HubSpotAsset;

    const mockAsset: HubSpotAsset = {
      id: assetId,
      name: `Asset ${assetId.slice(-6)}`,
      location: "Building A - Floor 3",
      system_type: "FIRE_SPRINKLER",
      lifecycle_status: "ACTIVE",
      properties: { installation_date: "2020-01-15", last_inspection: "2024-06-01" },
    };

    await this.cacheObject(orgId, "asset", assetId, mockAsset);
    return mockAsset;
  }

  async listAssets(orgId: string, limit = 50): Promise<HubSpotAsset[]> {
    return [
      {
        id: "hs_asset_001",
        name: "Main Lobby Sprinkler System",
        location: "Building A - Ground Floor",
        system_type: "FIRE_SPRINKLER",
        lifecycle_status: "ACTIVE",
        properties: { installation_date: "2018-03-10", nfpa_standard: "NFPA 25" },
      },
      {
        id: "hs_asset_002",
        name: "Kitchen Suppression Unit",
        location: "Building B - Kitchen",
        system_type: "KITCHEN_HOOD",
        lifecycle_status: "ACTIVE",
        properties: { installation_date: "2021-07-22", nfpa_standard: "NFPA 96" },
      },
      {
        id: "hs_asset_003",
        name: "Warehouse Alarm System",
        location: "Building C - Warehouse",
        system_type: "FIRE_ALARM",
        lifecycle_status: "INACTIVE",
        properties: { installation_date: "2015-11-30", nfpa_standard: "NFPA 72" },
      },
    ];
  }

  async createInspectionTicket(params: HubSpotInspectionTicketParams): Promise<{ ticket_id: string }> {
    console.log("[HubSpot STUB] createInspectionTicket", params);
    return { ticket_id: `hs_insp_ticket_${genId()}` };
  }

  async createDeficiencyTicket(params: HubSpotDeficiencyTicketParams): Promise<{ ticket_id: string }> {
    console.log("[HubSpot STUB] createDeficiencyTicket", params);
    return { ticket_id: `hs_def_ticket_${genId()}` };
  }

  async createProposalHandoff(params: HubSpotProposalHandoffParams): Promise<{ proposal_id: string }> {
    console.log("[HubSpot STUB] createProposalHandoff", params);
    return { proposal_id: `hs_proposal_${genId()}` };
  }

  async deliverReport(params: HubSpotReportDeliveryParams): Promise<void> {
    console.log("[HubSpot STUB] deliverReport", params);
  }

  async handleOutboxItem(
    entityType: string,
    operation: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    console.log("[HubSpot STUB] handleOutboxItem", { entityType, operation, payload });
    await new Promise((r) => setTimeout(r, 100));
  }

  private async getCached(
    orgId: string,
    objectType: string,
    objectId: string,
  ): Promise<HubspotObjectCache | null> {
    const db = await getDb();
    const now = nowIso();
    const rows = await db
      .select()
      .from(hubspotObjectCache)
      .where(
        and(
          eq(hubspotObjectCache.org_id, orgId),
          eq(hubspotObjectCache.object_type, objectType),
          eq(hubspotObjectCache.object_id, objectId),
          gt(hubspotObjectCache.expires_at, now),
        ),
      );
    return rows[0] ?? null;
  }

  private async cacheObject(
    orgId: string,
    objectType: string,
    objectId: string,
    data: unknown,
  ): Promise<void> {
    const db = await getDb();
    const now = nowIso();
    const expiresAt = new Date(Date.now() + CACHE_TTL_MS).toISOString();

    const existing = await this.getCached(orgId, objectType, objectId);
    if (existing) {
      await db
        .update(hubspotObjectCache)
        .set({ payload: JSON.stringify(data), fetched_at: now, expires_at: expiresAt, updated_at: now })
        .where(eq(hubspotObjectCache.id, existing.id));
    } else {
      const entry: NewHubspotObjectCache = {
        id: genId(),
        org_id: orgId,
        object_type: objectType,
        object_id: objectId,
        payload: JSON.stringify(data),
        fetched_at: now,
        expires_at: expiresAt,
        created_at: now,
        updated_at: now,
      };
      await db.insert(hubspotObjectCache).values(entry);
    }
  }
}

let connector: HubSpotConnector | null = null;

export function getHubSpotConnector(): HubSpotConnector {
  if (!connector) connector = new HubSpotConnector();
  return connector;
}
