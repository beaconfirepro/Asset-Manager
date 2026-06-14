import { Router, type IRouter } from "express";

const router: IRouter = Router();

type GeneratedFormField = {
  id: string;
  label: string;
  type: "pass_fail" | "yes_no" | "text" | "number" | "select" | "checkbox";
  required: boolean;
  deficiency_trigger?: string;
  options?: string[];
};

const TEMPLATES: Record<string, GeneratedFormField[]> = {
  FIRE_SPRINKLER: [
    { id: "visual_no_obstructions", label: "No obstructions within 18\" of sprinkler heads", type: "pass_fail", required: true, deficiency_trigger: "FAIL" },
    { id: "visual_no_corrosion", label: "No visible corrosion, scale, or paint on heads", type: "pass_fail", required: true, deficiency_trigger: "FAIL" },
    { id: "valves_correct_position", label: "All control valves in correct open position", type: "pass_fail", required: true, deficiency_trigger: "FAIL" },
    { id: "static_pressure_psi", label: "Static pressure reading (psi)", type: "number", required: true },
    { id: "residual_pressure_psi", label: "Residual pressure at most remote outlet (psi)", type: "number", required: true },
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

router.post("/itm/forms/ai-generate", (req, res) => {
  const { system_type, standard_code } = req.body as {
    org_id?: string;
    system_type?: string;
    standard_code?: string;
  };

  if (!system_type) {
    res.status(400).json({ error: "system_type is required" });
    return;
  }

  const systemLabel = system_type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c: string) => c.toUpperCase());

  const code = standard_code ?? system_type;
  const fields = TEMPLATES[system_type] ?? DEFAULT_FIELDS;

  res.json({
    form_name: `${code} ${systemLabel} Checklist`,
    system_type,
    compliance_standard_code: code,
    fields,
  });
});

export default router;
