const ITM_API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api/itm`
  : "http://localhost:5000/api/itm";

export type SyncEntityPayload = {
  entity_type: string;
  operation: string;
  payload: Record<string, unknown>;
  client_uuid: string;
};

class ITMApiClient {
  private baseUrl: string;
  private accessToken: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setToken(token: string | null) {
    this.accessToken = token;
  }

  private async fetch(path: string, options: RequestInit = {}): Promise<unknown> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(this.accessToken ? { Authorization: `Bearer ${this.accessToken}` } : {}),
    };
    const res = await fetch(`${this.baseUrl}${path}`, { ...options, headers });
    if (!res.ok) throw new Error(`ITM API error ${res.status}: ${await res.text()}`);
    return res.json();
  }

  async syncEntity(
    entityType: string,
    operation: string,
    payload: Record<string, unknown>,
    clientUuid: string,
  ): Promise<void> {
    await this.fetch("/sync", {
      method: "POST",
      body: JSON.stringify({ entity_type: entityType, operation, payload, client_uuid: clientUuid }),
    });
  }

  async getDashboard(orgId: string): Promise<unknown> {
    return this.fetch(`/dashboard?org_id=${orgId}`);
  }

  async getAssets(orgId: string): Promise<unknown> {
    return this.fetch(`/assets?org_id=${orgId}`);
  }

  async getAiSuggestions(orgId: string, contextType: string, contextId: string): Promise<unknown> {
    return this.fetch(`/ai?org_id=${orgId}&context_type=${contextType}&context_id=${contextId}`);
  }
}

let client: ITMApiClient | null = null;

export function getITMApiClient(): ITMApiClient {
  if (!client) {
    client = new ITMApiClient(ITM_API_BASE);
  }
  return client;
}

export function setApiToken(token: string | null): void {
  getITMApiClient().setToken(token);
}
