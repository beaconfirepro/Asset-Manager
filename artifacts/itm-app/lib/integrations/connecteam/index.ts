function genId() { return Date.now().toString(36) + Math.random().toString(36).substring(2, 9); }

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

export type ConnecteamShiftResult = {
  shift_id: string;
  status: string;
};

class ConnecteamConnector {
  async createCrewShift(params: ConnecteamShiftParams): Promise<ConnecteamShiftResult> {
    console.log("[Connecteam STUB] createCrewShift", params);
    return {
      shift_id: `ct_shift_${genId()}`,
      status: "SCHEDULED",
    };
  }

  async cancelShift(shiftId: string): Promise<void> {
    console.log("[Connecteam STUB] cancelShift", shiftId);
  }

  async updateShift(shiftId: string, updates: Partial<ConnecteamShiftParams>): Promise<void> {
    console.log("[Connecteam STUB] updateShift", { shiftId, updates });
  }

  async handleOutboxItem(
    entityType: string,
    operation: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    console.log("[Connecteam STUB] handleOutboxItem", { entityType, operation, payload });
    await new Promise((r) => setTimeout(r, 100));
  }
}

let connector: ConnecteamConnector | null = null;

export function getConnecteamConnector(): ConnecteamConnector {
  if (!connector) connector = new ConnecteamConnector();
  return connector;
}
