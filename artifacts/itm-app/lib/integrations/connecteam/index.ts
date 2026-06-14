import { enqueue } from "@/lib/sync";

export type ConnecteamShiftParams = {
  org_id: string;
  job_title: string;
  location: string;
  hubspot_asset_id: string;
  maintenance_record_id: string;
  scheduled_at: string;
  duration_hours: number;
  notes?: string;
};

export type OutboxEnqueuedResult = {
  client_uuid: string;
  status: "PENDING";
};

class ConnecteamConnector {
  async createCrewShift(params: ConnecteamShiftParams): Promise<OutboxEnqueuedResult> {
    const item = await enqueue({
      org_id: params.org_id,
      entity_type: "crew_shift",
      entity_id: params.maintenance_record_id,
      operation: "CREATE",
      payload: params as unknown as Record<string, unknown>,
      target_provider: "CONNECTEAM",
    });
    return { client_uuid: item.client_uuid, status: "PENDING" };
  }

  async cancelShift(orgId: string, shiftClientUuid: string): Promise<OutboxEnqueuedResult> {
    const item = await enqueue({
      org_id: orgId,
      entity_type: "crew_shift",
      entity_id: shiftClientUuid,
      operation: "DELETE",
      payload: { shift_client_uuid: shiftClientUuid },
      target_provider: "CONNECTEAM",
    });
    return { client_uuid: item.client_uuid, status: "PENDING" };
  }

  async updateShift(orgId: string, shiftClientUuid: string, updates: Partial<ConnecteamShiftParams>): Promise<OutboxEnqueuedResult> {
    const item = await enqueue({
      org_id: orgId,
      entity_type: "crew_shift",
      entity_id: shiftClientUuid,
      operation: "UPDATE",
      payload: { shift_client_uuid: shiftClientUuid, ...updates } as Record<string, unknown>,
      target_provider: "CONNECTEAM",
    });
    return { client_uuid: item.client_uuid, status: "PENDING" };
  }
}

let connector: ConnecteamConnector | null = null;
export function getConnecteamConnector(): ConnecteamConnector {
  if (!connector) connector = new ConnecteamConnector();
  return connector;
}
