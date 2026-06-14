import { and, eq, gt } from "drizzle-orm";
import { getDb } from "@/db/client";
import { hubspotObjectCache, type HubspotObjectCache, type NewHubspotObjectCache } from "@/db/schema";
import { enqueue, genId } from "@/lib/sync";

function nowIso() { return new Date().toISOString(); }

export type HubSpotAsset = {
  id: string;
  name: string;
  location: string;
  system_type: string;
  lifecycle_status: string;
  properties: Record<string, unknown>;
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

export type HubSpotProposalHandoffParams = {
  org_id: string;
  hubspot_customer_id: string;
  inspection_result_id: string;
  deficiency_summary: string;
};

export type HubSpotReportDeliveryParams = {
  org_id: string;
  hubspot_customer_id: string;
  report_id: string;
  pdf_url: string;
};

export type OutboxEnqueuedResult = {
  client_uuid: string;
  status: "PENDING";
};

const CACHE_TTL_MS = 15 * 60 * 1000;

class HubSpotConnector {
  async getAsset(orgId: string, assetId: string): Promise<HubSpotAsset | null> {
    const cached = await this.getCached(orgId, "asset", assetId);
    if (cached) return JSON.parse(cached.payload) as HubSpotAsset;
    const mockAsset: HubSpotAsset = {
      id: assetId,
      name: `Asset ${assetId.slice(-6)}`,
      location: "Building A — Floor 3",
      system_type: "FIRE_SPRINKLER",
      lifecycle_status: "ACTIVE",
      properties: { installation_date: "2020-01-15" },
    };
    await this.cacheObject(orgId, "asset", assetId, mockAsset);
    return mockAsset;
  }

  async listAssets(orgId: string): Promise<HubSpotAsset[]> {
    const CACHE_KEY = `list:${orgId}`;
    const cached = await this.getCached(orgId, "asset_list", CACHE_KEY);
    if (cached) {
      try {
        return JSON.parse(cached.payload) as HubSpotAsset[];
      } catch {
      }
    }

    const freshAssets: HubSpotAsset[] = [
      { id: "hs_asset_001", name: "Main Lobby Sprinkler System", location: "Building A — Ground Floor", system_type: "FIRE_SPRINKLER", lifecycle_status: "ACTIVE", properties: { nfpa_standard: "NFPA 25" } },
      { id: "hs_asset_002", name: "Kitchen Suppression Unit", location: "Building B — Kitchen", system_type: "KITCHEN_HOOD", lifecycle_status: "ACTIVE", properties: { nfpa_standard: "NFPA 96" } },
      { id: "hs_asset_003", name: "Warehouse Alarm System", location: "Building C — Warehouse", system_type: "FIRE_ALARM", lifecycle_status: "INACTIVE", properties: { nfpa_standard: "NFPA 72" } },
      { id: "hs_asset_004", name: "Parking Garage Suppression", location: "Building A — Garage", system_type: "SUPPRESSION", lifecycle_status: "ACTIVE", properties: { nfpa_standard: "NFPA 11" } },
      { id: "hs_asset_005", name: "Emergency Egress Lighting", location: "Building B — All Floors", system_type: "EMERGENCY_LIGHTING", lifecycle_status: "ACTIVE", properties: { nfpa_standard: "NFPA 101" } },
      { id: "hs_asset_006", name: "Server Room Halon System", location: "Building C — Data Center", system_type: "SPECIAL_HAZARD", lifecycle_status: "ACTIVE", properties: { nfpa_standard: "NFPA 2001" } },
    ];

    await this.cacheObject(orgId, "asset_list", CACHE_KEY, freshAssets);
    for (const asset of freshAssets) {
      await this.cacheObject(orgId, "asset", asset.id, asset);
    }

    return freshAssets;
  }

  async createInspectionTicket(params: HubSpotInspectionTicketParams): Promise<OutboxEnqueuedResult> {
    const item = await enqueue({
      org_id: params.org_id,
      entity_type: "inspection_ticket",
      entity_id: params.schedule_id,
      operation: "CREATE",
      payload: params as unknown as Record<string, unknown>,
      target_provider: "HUBSPOT",
    });
    return { client_uuid: item.client_uuid, status: "PENDING" };
  }

  async createDeficiencyTicket(params: HubSpotDeficiencyTicketParams): Promise<OutboxEnqueuedResult> {
    const item = await enqueue({
      org_id: params.org_id,
      entity_type: "deficiency_ticket",
      entity_id: params.inspection_result_id,
      operation: "CREATE",
      payload: params as unknown as Record<string, unknown>,
      target_provider: "HUBSPOT",
    });
    return { client_uuid: item.client_uuid, status: "PENDING" };
  }

  async createProposalHandoff(params: HubSpotProposalHandoffParams): Promise<OutboxEnqueuedResult> {
    const item = await enqueue({
      org_id: params.org_id,
      entity_type: "proposal_handoff",
      entity_id: params.inspection_result_id,
      operation: "CREATE",
      payload: params as unknown as Record<string, unknown>,
      target_provider: "HUBSPOT",
    });
    return { client_uuid: item.client_uuid, status: "PENDING" };
  }

  async deliverReport(params: HubSpotReportDeliveryParams): Promise<OutboxEnqueuedResult> {
    const item = await enqueue({
      org_id: params.org_id,
      entity_type: "report_delivery",
      entity_id: params.report_id,
      operation: "CREATE",
      payload: params as unknown as Record<string, unknown>,
      target_provider: "HUBSPOT",
    });
    return { client_uuid: item.client_uuid, status: "PENDING" };
  }

  private async getCached(orgId: string, objectType: string, objectId: string): Promise<HubspotObjectCache | null> {
    const db = await getDb();
    const rows = await db
      .select()
      .from(hubspotObjectCache)
      .where(and(
        eq(hubspotObjectCache.org_id, orgId),
        eq(hubspotObjectCache.object_type, objectType),
        eq(hubspotObjectCache.object_id, objectId),
        gt(hubspotObjectCache.expires_at, nowIso()),
      ));
    return rows[0] ?? null;
  }

  private async cacheObject(orgId: string, objectType: string, objectId: string, data: unknown): Promise<void> {
    const db = await getDb();
    const now = nowIso();
    const expiresAt = new Date(Date.now() + CACHE_TTL_MS).toISOString();
    const existing = await this.getCached(orgId, objectType, objectId);
    if (existing) {
      await db.update(hubspotObjectCache)
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
        sync_status: "SYNCED",
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
