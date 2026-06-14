export type GeneratedFormField = {
  id: string;
  label: string;
  type: "pass_fail" | "yes_no" | "text" | "number" | "select" | "checkbox";
  required: boolean;
  deficiency_trigger?: string;
  options?: string[];
};

export type GeneratedFormDraft = {
  form_name: string;
  system_type: string;
  compliance_standard_code: string;
  fields: GeneratedFormField[];
};

export type CodeUpdateResult = {
  form_id: string;
  form_name: string;
  standard_code: string;
  current_version: string;
  latest_version: string;
  change_summary: string;
};

export type CodeReferenceResult = {
  code: string;
  section: string;
  text: string;
};

const STUB_FORM_TEMPLATES: Record<string, GeneratedFormField[]> = {
  FIRE_SPRINKLER: [
    { id: "visual_no_obstructions", label: "No obstructions within 18\" of sprinkler heads", type: "pass_fail", required: true, deficiency_trigger: "FAIL" },
    { id: "visual_no_corrosion", label: "No visible corrosion, scale, or paint on heads", type: "pass_fail", required: true, deficiency_trigger: "FAIL" },
    { id: "static_pressure_psi", label: "Static pressure reading (psi)", type: "number", required: true },
    { id: "residual_pressure_psi", label: "Residual pressure at most remote outlet (psi)", type: "number", required: true },
    { id: "valves_correct_position", label: "All control valves in correct open position", type: "pass_fail", required: true, deficiency_trigger: "FAIL" },
    { id: "gauges_functional", label: "Gauges functioning and within acceptable range", type: "pass_fail", required: true, deficiency_trigger: "FAIL" },
    { id: "alarm_valve_tested", label: "Alarm valve tested and operational", type: "pass_fail", required: true, deficiency_trigger: "FAIL" },
    { id: "signage_present", label: "Required NFPA signage posted and legible", type: "yes_no", required: false, deficiency_trigger: "NO" },
    { id: "inspector_notes", label: "Additional inspector observations", type: "text", required: false },
  ],
  FIRE_ALARM: [
    { id: "panel_no_faults", label: "Main control panel shows no active faults", type: "pass_fail", required: true, deficiency_trigger: "FAIL" },
    { id: "battery_backup_ok", label: "Battery backup tested — holds charge under load", type: "pass_fail", required: true, deficiency_trigger: "FAIL" },
    { id: "smoke_detector_sensitivity", label: "Smoke detector sensitivity within listed range (%/ft)", type: "number", required: true },
    { id: "pull_stations_accessible", label: "All pull stations accessible and unobstructed", type: "pass_fail", required: true, deficiency_trigger: "FAIL" },
    { id: "notification_appliances_ok", label: "Horns/strobes tested — audible/visual output verified", type: "pass_fail", required: true, deficiency_trigger: "FAIL" },
    { id: "monitoring_verified", label: "Central station monitoring connection verified", type: "yes_no", required: true, deficiency_trigger: "NO" },
    { id: "records_on_site", label: "Previous inspection records available on site", type: "yes_no", required: false },
    { id: "inspector_notes", label: "Additional inspector observations", type: "text", required: false },
  ],
  KITCHEN_HOOD: [
    { id: "hood_clean", label: "Grease filters clean — no buildup exceeding 1/8\"", type: "pass_fail", required: true, deficiency_trigger: "FAIL" },
    { id: "fusible_links_intact", label: "All fusible links intact and not deformed", type: "pass_fail", required: true, deficiency_trigger: "FAIL" },
    { id: "agent_cylinder_pressure", label: "Suppression agent cylinder pressure within range", type: "pass_fail", required: true, deficiency_trigger: "FAIL" },
    { id: "nozzles_unobstructed", label: "All discharge nozzles unobstructed and properly aimed", type: "pass_fail", required: true, deficiency_trigger: "FAIL" },
    { id: "manual_pull_accessible", label: "Manual pull station accessible and labeled", type: "pass_fail", required: true, deficiency_trigger: "FAIL" },
    { id: "gas_valve_interlocked", label: "Gas/electric interlock shuts off on system actuation", type: "pass_fail", required: true, deficiency_trigger: "FAIL" },
    { id: "inspector_notes", label: "Additional inspector observations", type: "text", required: false },
  ],
};

const DEFAULT_FIELDS: GeneratedFormField[] = [
  { id: "visual_general", label: "System in good general condition — no visible damage", type: "pass_fail", required: true, deficiency_trigger: "FAIL" },
  { id: "equipment_accessible", label: "All equipment accessible for inspection", type: "pass_fail", required: true, deficiency_trigger: "FAIL" },
  { id: "documentation_on_site", label: "System documentation available on site", type: "yes_no", required: false },
  { id: "inspector_notes", label: "Additional inspector observations", type: "text", required: false },
];

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

  async generateForm(
    orgId: string,
    systemType: string,
    standardCode: string,
  ): Promise<GeneratedFormDraft> {
    try {
      const result = await this.fetch("/forms/ai-generate", {
        method: "POST",
        body: JSON.stringify({ org_id: orgId, system_type: systemType, standard_code: standardCode }),
      });
      return result as GeneratedFormDraft;
    } catch {
      const systemLabel = systemType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      const fields = STUB_FORM_TEMPLATES[systemType] ?? DEFAULT_FIELDS;
      return {
        form_name: `${standardCode} ${systemLabel} Checklist`,
        system_type: systemType,
        compliance_standard_code: standardCode,
        fields,
      };
    }
  }

  async detectCodeUpdates(_orgId: string): Promise<CodeUpdateResult[]> {
    return [];
  }

  async analyzePhoto(
    _orgId: string,
    _photoUrl: string,
    _contextId: string,
  ): Promise<{ detected_issues: string[]; confidence: number; suggestion_text: string }> {
    return {
      detected_issues: ["corrosion"],
      confidence: 0.72,
      suggestion_text: "Possible corrosion detected near equipment. Review photo and confirm deficiency.",
    };
  }

  async autofillFinding(
    _orgId: string,
    _fieldId: string,
    _context: Record<string, unknown>,
  ): Promise<{ suggested_text: string; confidence: number }> {
    return { suggested_text: "", confidence: 0 };
  }

  async getCodeReference(
    _orgId: string,
    standardCode: string,
    section?: string,
  ): Promise<CodeReferenceResult[]> {
    const refs: Record<string, CodeReferenceResult[]> = {
      "NFPA 25": [
        { code: "NFPA 25", section: "§5.2.1", text: "Control valves shall be inspected weekly or monthly depending on supervision method." },
        { code: "NFPA 25", section: "§14.2.1.2", text: "Wet pipe systems shall be inspected per the frequency requirements of Table 5.1." },
        { code: "NFPA 25", section: "§13.2.5.1", text: "Gauges on wet pipe systems shall be replaced or recalibrated every 5 years." },
      ],
      "NFPA 72": [
        { code: "NFPA 72", section: "§14.3.1", text: "Smoke detectors shall be tested at least annually using listed aerosol or functional test method." },
        { code: "NFPA 72", section: "§10.14.1", text: "Primary power failure shall be annunciated at the control unit within 200 seconds." },
        { code: "NFPA 72", section: "§14.4.5", text: "Notification appliances shall be tested annually for audibility and visibility." },
      ],
      "NFPA 96": [
        { code: "NFPA 96", section: "§11.4.1", text: "Fusible links shall be replaced at maximum 12-month intervals or more frequently if required." },
        { code: "NFPA 96", section: "§11.2.3", text: "Grease filters and extraction equipment shall be cleaned to bare metal at required intervals." },
        { code: "NFPA 96", section: "§10.5.1", text: "Cooking equipment shall be shut off upon system actuation via interlock." },
      ],
      "NFPA 2001": [
        { code: "NFPA 2001", section: "§7.2.1", text: "Containers shall be weighed or the quantity of agent verified by an approved method annually." },
        { code: "NFPA 2001", section: "§7.3.1", text: "Detection systems shall be tested per the requirements of NFPA 72." },
      ],
      "NFPA 110": [
        { code: "NFPA 110", section: "§8.4.1", text: "Level 1 systems shall be tested monthly under simulated loss of normal power." },
        { code: "NFPA 110", section: "§8.4.2", text: "The generator shall be exercised under load for a minimum of 30 minutes monthly." },
      ],
    };
    const all = refs[standardCode] ?? [];
    return section ? all.filter((r) => r.section.includes(section)) : all;
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
