const ITM_API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api/itm`
  : "http://localhost:5000/api/itm";

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
    if (!res.ok) throw new Error(`ITM API ${res.status}: ${await res.text()}`);
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
    return this.fetch(`/dashboard?org_id=${encodeURIComponent(orgId)}`);
  }

  async getAssets(orgId: string): Promise<unknown> {
    return this.fetch(`/assets?org_id=${encodeURIComponent(orgId)}`);
  }

  async getAiSuggestions(orgId: string, contextType: string, contextId: string): Promise<unknown> {
    return this.fetch(
      `/ai?org_id=${encodeURIComponent(orgId)}&context_type=${encodeURIComponent(contextType)}&context_id=${encodeURIComponent(contextId)}`,
    );
  }

  async refreshToken(orgId: string, refreshToken: string): Promise<{ access_token: string; expires_at: string }> {
    const res = await this.fetch("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ org_id: orgId, refresh_token: refreshToken }),
    }) as { access_token: string; expires_at: string };
    return res;
  }

  async revokeToken(orgId: string): Promise<void> {
    await this.fetch("/auth/revoke", {
      method: "POST",
      body: JSON.stringify({ org_id: orgId }),
    });
  }

  async getAuthConfig(orgId: string): Promise<{
    provider: string;
    client_id: string;
    tenant_id: string | null;
    scopes: string;
  }> {
    return this.fetch(`/auth/config?org_id=${encodeURIComponent(orgId)}`) as Promise<{
      provider: string;
      client_id: string;
      tenant_id: string | null;
      scopes: string;
    }>;
  }

  async validateToken(orgId: string): Promise<{ valid: boolean; expires_at?: string }> {
    return this.fetch(`/auth/validate?org_id=${encodeURIComponent(orgId)}`) as Promise<{
      valid: boolean;
      expires_at?: string;
    }>;
  }

  async getComplianceStandards(orgId: string): Promise<unknown> {
    return this.fetch(`/compliance-standards?org_id=${encodeURIComponent(orgId)}`);
  }

  async getInspectionForms(orgId: string, systemType?: string): Promise<unknown> {
    const q = systemType ? `&system_type=${encodeURIComponent(systemType)}` : "";
    return this.fetch(`/inspection-forms?org_id=${encodeURIComponent(orgId)}${q}`);
  }

  async getReport(orgId: string, reportId: string): Promise<unknown> {
    return this.fetch(`/reports/${encodeURIComponent(reportId)}?org_id=${encodeURIComponent(orgId)}`);
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
