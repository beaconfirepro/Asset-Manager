import { getDb } from "./client";
import * as schema from "./schema";

const ORG = "org_beacon_test_001";
let _seeded = false;

function nowIso() { return new Date().toISOString(); }
function daysFromNow(d: number) { return new Date(Date.now() + d * 86_400_000).toISOString(); }
function daysAgo(d: number) { return new Date(Date.now() - d * 86_400_000).toISOString(); }
function id(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export async function seedDatabase(): Promise<void> {
  if (_seeded) return;
  _seeded = true;

  const db = await getDb();
  const now = nowIso();

  const ENTRA_CLIENT_ID = process.env.EXPO_PUBLIC_ENTRA_CLIENT_ID ?? "STUB_CLIENT_ID";
  const ENTRA_TENANT_ID = process.env.EXPO_PUBLIC_ENTRA_TENANT_ID ?? "STUB_TENANT_ID";

  await db.insert(schema.authProviderConfigs).values([{
    id: "apc_beacon_entra",
    org_id: ORG,
    provider: "MICROSOFT_ENTRA",
    client_id: ENTRA_CLIENT_ID,
    tenant_id: ENTRA_TENANT_ID,
    scopes: "openid profile email User.Read",
    is_active: true,
    created_at: now,
    updated_at: now,
    sync_status: "SYNCED",
  }]).onConflictDoUpdate({
    target: schema.authProviderConfigs.id,
    set: {
      client_id: ENTRA_CLIENT_ID,
      tenant_id: ENTRA_TENANT_ID,
      updated_at: now,
    },
  });

  const existing = await db.select().from(schema.complianceStandards);
  if (existing.length > 0) return;

  const csSprinker = id("cs");
  const csAlarm = id("cs");
  const csKitchen = id("cs");
  const csSuppression = id("cs");
  const csHazard = id("cs");
  const csEmergency = id("cs");

  await db.insert(schema.complianceStandards).values([
    { id: csSprinker, org_id: ORG, name: "NFPA 25 — Water-Based Fire Protection", code: "NFPA_25", authority: "NFPA", system_type: "FIRE_SPRINKLER", version: "2023", description: "Standard for inspection, testing, and maintenance of water-based fire protection systems", effective_date: "2023-01-01", created_at: now, updated_at: now, sync_status: "SYNCED" },
    { id: csAlarm, org_id: ORG, name: "NFPA 72 — National Fire Alarm and Signaling", code: "NFPA_72", authority: "NFPA", system_type: "FIRE_ALARM", version: "2022", description: "Standard for fire alarm and signaling systems", effective_date: "2022-01-01", created_at: now, updated_at: now, sync_status: "SYNCED" },
    { id: csKitchen, org_id: ORG, name: "NFPA 96 — Commercial Cooking Ventilation", code: "NFPA_96", authority: "NFPA", system_type: "KITCHEN_HOOD", version: "2021", description: "Standard for ventilation control and fire protection of commercial cooking operations", effective_date: "2021-01-01", created_at: now, updated_at: now, sync_status: "SYNCED" },
    { id: csSuppression, org_id: ORG, name: "NFPA 2001 — Clean Agent Extinguishing Systems", code: "NFPA_2001", authority: "NFPA", system_type: "SUPPRESSION", version: "2022", description: "Standard for clean agent fire extinguishing systems", effective_date: "2022-06-01", created_at: now, updated_at: now, sync_status: "SYNCED" },
    { id: csHazard, org_id: ORG, name: "NFPA 750 — Water Mist Fire Protection", code: "NFPA_750", authority: "NFPA", system_type: "SPECIAL_HAZARD", version: "2023", description: "Standard on water mist fire protection systems", effective_date: "2023-01-01", created_at: now, updated_at: now, sync_status: "SYNCED" },
    { id: csEmergency, org_id: ORG, name: "NFPA 110 — Emergency and Standby Power Systems", code: "NFPA_110", authority: "NFPA", system_type: "EMERGENCY_LIGHTING", version: "2022", description: "Standard for emergency and standby power systems", effective_date: "2022-01-01", created_at: now, updated_at: now, sync_status: "SYNCED" },
  ]);

  const aclCompliant = id("acl");
  const aclNonCompliant = id("acl");
  const aclPending = id("acl");
  const aclExempt = id("acl");

  await db.insert(schema.assetComplianceLinks).values([
    { id: aclCompliant, org_id: ORG, hubspot_asset_id: "hs_asset_001", compliance_standard_id: csSprinker, compliance_status: "COMPLIANT", last_inspection_at: daysAgo(30), next_inspection_at: daysFromNow(335), notes: "Passed annual inspection", created_at: now, updated_at: now, sync_status: "SYNCED" },
    { id: aclNonCompliant, org_id: ORG, hubspot_asset_id: "hs_asset_002", compliance_standard_id: csKitchen, compliance_status: "NON_COMPLIANT", last_inspection_at: daysAgo(95), next_inspection_at: daysFromNow(270), notes: "Deficiency: hood grease trap requires cleaning", created_at: now, updated_at: now, sync_status: "SYNCED" },
    { id: aclPending, org_id: ORG, hubspot_asset_id: "hs_asset_003", compliance_standard_id: csAlarm, compliance_status: "PENDING", last_inspection_at: null, next_inspection_at: daysFromNow(14), notes: "Initial inspection scheduled", created_at: now, updated_at: now, sync_status: "SYNCED" },
    { id: aclExempt, org_id: ORG, hubspot_asset_id: "hs_asset_004", compliance_standard_id: csSuppression, compliance_status: "EXEMPT", last_inspection_at: null, next_inspection_at: null, notes: "Asset decommissioned — exempt from compliance schedule", created_at: now, updated_at: now, sync_status: "SYNCED" },
  ]);

  const seriesSprinkler = id("is");
  const seriesAlarm = id("is");
  const seriesKitchen = id("is");

  await db.insert(schema.inspectionSeries).values([
    { id: seriesSprinkler, org_id: ORG, name: "Annual Sprinkler Inspection Series", hubspot_asset_id: "hs_asset_001", system_type: "FIRE_SPRINKLER", frequency_days: 365, generation_horizon_days: 180, starts_at: daysAgo(400), ends_at: null, hubspot_service_team_id: "team_001", is_booked: true, contracted_amount: 1800.00, notes: null, created_at: now, updated_at: now, sync_status: "SYNCED" },
    { id: seriesAlarm, org_id: ORG, name: "Semi-Annual Alarm Inspection", hubspot_asset_id: "hs_asset_003", system_type: "FIRE_ALARM", frequency_days: 180, generation_horizon_days: 90, starts_at: daysAgo(200), ends_at: null, hubspot_service_team_id: "team_002", is_booked: false, contracted_amount: 950.00, notes: null, created_at: now, updated_at: now, sync_status: "SYNCED" },
    { id: seriesKitchen, org_id: ORG, name: "Quarterly Kitchen Hood Inspection", hubspot_asset_id: "hs_asset_002", system_type: "KITCHEN_HOOD", frequency_days: 90, generation_horizon_days: 60, starts_at: daysAgo(300), ends_at: null, hubspot_service_team_id: null, is_booked: true, contracted_amount: 450.00, notes: "NFPA 96 quarterly requirement", created_at: now, updated_at: now, sync_status: "SYNCED" },
  ]);

  const schedDraft = id("sch");
  const schedInProgress = id("sch");
  const schedSubmitted = id("sch");
  const schedQaReview = id("sch");
  const schedApproved = id("sch");
  const schedCompleted = id("sch");
  const schedVoid = id("sch");

  await db.insert(schema.inspectionSchedules).values([
    { id: schedDraft, org_id: ORG, series_id: seriesSprinkler, hubspot_asset_id: "hs_asset_001", scheduled_date: daysFromNow(60), status: "DRAFT", hubspot_inspection_ticket_id: null, rescheduled_from: null, notes: "Next annual inspection", created_at: now, updated_at: now, sync_status: "PENDING" },
    { id: schedInProgress, org_id: ORG, series_id: seriesAlarm, hubspot_asset_id: "hs_asset_003", scheduled_date: nowIso().slice(0, 10), status: "IN_PROGRESS", hubspot_inspection_ticket_id: "hs_ticket_002", rescheduled_from: null, notes: null, created_at: now, updated_at: now, sync_status: "SYNCED" },
    { id: schedSubmitted, org_id: ORG, series_id: seriesKitchen, hubspot_asset_id: "hs_asset_002", scheduled_date: daysAgo(3), status: "SUBMITTED", hubspot_inspection_ticket_id: "hs_ticket_003", rescheduled_from: null, notes: "Awaiting QA review", created_at: now, updated_at: now, sync_status: "SYNCED" },
    { id: schedQaReview, org_id: ORG, series_id: seriesSprinkler, hubspot_asset_id: "hs_asset_001", scheduled_date: daysAgo(7), status: "QA_REVIEW", hubspot_inspection_ticket_id: "hs_ticket_004", rescheduled_from: null, notes: "Reviewer assigned", created_at: now, updated_at: now, sync_status: "SYNCED" },
    { id: schedApproved, org_id: ORG, series_id: seriesAlarm, hubspot_asset_id: "hs_asset_003", scheduled_date: daysAgo(14), status: "APPROVED", hubspot_inspection_ticket_id: "hs_ticket_005", rescheduled_from: null, notes: null, created_at: now, updated_at: now, sync_status: "SYNCED" },
    { id: schedCompleted, org_id: ORG, series_id: seriesSprinkler, hubspot_asset_id: "hs_asset_001", scheduled_date: daysAgo(30), status: "COMPLETED", hubspot_inspection_ticket_id: "hs_ticket_006", rescheduled_from: null, notes: "Report delivered to customer", created_at: now, updated_at: now, sync_status: "SYNCED" },
    { id: schedVoid, org_id: ORG, series_id: seriesKitchen, hubspot_asset_id: "hs_asset_002", scheduled_date: daysAgo(90), status: "VOID", hubspot_inspection_ticket_id: null, rescheduled_from: null, notes: "Customer cancelled — rescheduled", created_at: now, updated_at: now, sync_status: "SYNCED" },
  ]);

  const formSchema = JSON.stringify({
    sections: [
      {
        id: "general", title: "General Condition",
        fields: [
          { id: "visual_ok", type: "boolean", label: "Visual inspection OK?" },
          { id: "corrosion", type: "boolean", label: "Signs of corrosion?" },
          { id: "notes", type: "text", label: "General notes", multiline: true },
        ],
      },
      {
        id: "pressure", title: "Pressure Testing",
        fields: [
          { id: "static_psi", type: "number", label: "Static pressure (PSI)", min: 0, max: 300 },
          { id: "residual_psi", type: "number", label: "Residual pressure (PSI)", min: 0, max: 300 },
          { id: "flow_gpm", type: "number", label: "Flow rate (GPM)", min: 0, max: 1000 },
        ],
      },
      {
        id: "deficiencies", title: "Deficiencies",
        fields: [
          { id: "deficiency_found", type: "boolean", label: "Deficiency found?" },
          { id: "deficiency_desc", type: "text", label: "Deficiency description", multiline: true, conditional_on: "deficiency_found" },
          { id: "photo", type: "photo", label: "Deficiency photo", conditional_on: "deficiency_found" },
        ],
      },
    ],
  });

  const alarmFormSchema = JSON.stringify({
    sections: [{
      id: "devices", title: "Device Check",
      fields: [
        { id: "detector_count", type: "number", label: "Smoke detectors tested" },
        { id: "all_activated", type: "boolean", label: "All activated correctly?" },
        { id: "horn_strobes", type: "boolean", label: "Horn/strobes functioning?" },
      ],
    }],
  });

  const formSprinkler = id("if");
  const formAlarm = id("if");

  await db.insert(schema.inspectionForms).values([
    { id: formSprinkler, org_id: ORG, name: "NFPA 25 Annual Sprinkler Inspection", system_type: "FIRE_SPRINKLER", version: "2.1", form_schema: formSchema, is_active: true, ai_generated: false, deficiency_triggers: JSON.stringify(["corrosion", "pressure_below_threshold"]), compliance_standard_id: csSprinker, created_at: now, updated_at: now, sync_status: "SYNCED" },
    { id: formAlarm, org_id: ORG, name: "NFPA 72 Semi-Annual Alarm Inspection", system_type: "FIRE_ALARM", version: "1.0", form_schema: alarmFormSchema, is_active: true, ai_generated: true, deficiency_triggers: JSON.stringify(["device_failure", "strobe_not_activated"]), compliance_standard_id: csAlarm, created_at: now, updated_at: now, sync_status: "SYNCED" },
  ]);

  const userId1 = id("u");
  const userId2 = id("u");
  const userId3 = id("u");
  const userId4 = id("u");

  await db.insert(schema.appUsers).values([
    { id: userId1, org_id: ORG, external_id: "ext_admin_001", provider: "MICROSOFT_ENTRA", email: "admin@beaconfire.com", name: "Beacon Admin", role: "ADMIN", avatar_url: null, last_login_at: daysAgo(1), created_at: now, updated_at: now, sync_status: "SYNCED" },
    { id: userId2, org_id: ORG, external_id: "ext_inspector_001", provider: "MICROSOFT_ENTRA", email: "inspector@beaconfire.com", name: "Alex Inspector", role: "INSPECTOR", avatar_url: null, last_login_at: daysAgo(0), created_at: now, updated_at: now, sync_status: "SYNCED" },
    { id: userId3, org_id: ORG, external_id: "ext_reviewer_001", provider: "MICROSOFT_ENTRA", email: "qa@beaconfire.com", name: "Quinn Reviewer", role: "REVIEWER", avatar_url: null, last_login_at: daysAgo(2), created_at: now, updated_at: now, sync_status: "SYNCED" },
    { id: userId4, org_id: ORG, external_id: "ext_viewer_001", provider: "MICROSOFT_ENTRA", email: "view@beaconfire.com", name: "Sam Viewer", role: "VIEWER", avatar_url: null, last_login_at: daysAgo(7), created_at: now, updated_at: now, sync_status: "SYNCED" },
  ]);

  const resultDraft = id("ir");
  const resultInProgress = id("ir");
  const resultSubmitted = id("ir");
  const resultQaReview = id("ir");
  const resultApproved = id("ir");
  const resultCompleted = id("ir");
  const resultVoid = id("ir");

  await db.insert(schema.inspectionResults).values([
    { id: resultDraft, org_id: ORG, schedule_id: schedDraft, form_id: formSprinkler, inspector_id: userId2, hubspot_asset_id: "hs_asset_001", status: "DRAFT", form_data: "{}", gps_lat: 37.7749, gps_lng: -122.4194, photo_urls: null, signature_url: null, started_at: now, submitted_at: null, client_uuid: id("cu"), hubspot_deficiency_ticket_id: null, qa_status: null, qa_reviewer_id: null, qa_reviewed_at: null, qa_notes: null, created_at: now, updated_at: now, sync_status: "PENDING" },
    { id: resultInProgress, org_id: ORG, schedule_id: schedInProgress, form_id: formAlarm, inspector_id: userId2, hubspot_asset_id: "hs_asset_003", status: "IN_PROGRESS", form_data: JSON.stringify({ detector_count: 12 }), gps_lat: null, gps_lng: null, photo_urls: null, signature_url: null, started_at: daysAgo(0), submitted_at: null, client_uuid: id("cu"), hubspot_deficiency_ticket_id: null, qa_status: null, qa_reviewer_id: null, qa_reviewed_at: null, qa_notes: null, created_at: now, updated_at: now, sync_status: "SYNCED" },
    { id: resultSubmitted, org_id: ORG, schedule_id: schedSubmitted, form_id: formSprinkler, inspector_id: userId2, hubspot_asset_id: "hs_asset_002", status: "SUBMITTED", form_data: JSON.stringify({ visual_ok: true, corrosion: false, static_psi: 72, residual_psi: 65, flow_gpm: 480 }), gps_lat: null, gps_lng: null, photo_urls: null, signature_url: null, started_at: daysAgo(3), submitted_at: daysAgo(3), client_uuid: id("cu"), hubspot_deficiency_ticket_id: null, qa_status: "PENDING", qa_reviewer_id: null, qa_reviewed_at: null, qa_notes: null, created_at: now, updated_at: now, sync_status: "SYNCED" },
    { id: resultQaReview, org_id: ORG, schedule_id: schedQaReview, form_id: formSprinkler, inspector_id: userId2, hubspot_asset_id: "hs_asset_001", status: "QA_REVIEW", form_data: JSON.stringify({ visual_ok: true, corrosion: true, static_psi: 68, residual_psi: 60, flow_gpm: 440, deficiency_found: true, deficiency_desc: "Corrosion on zone 3 heads" }), gps_lat: null, gps_lng: null, photo_urls: JSON.stringify(["file://local/photo001.jpg"]), signature_url: null, started_at: daysAgo(7), submitted_at: daysAgo(7), client_uuid: id("cu"), hubspot_deficiency_ticket_id: "hs_def_001", qa_status: "PENDING", qa_reviewer_id: userId3, qa_reviewed_at: null, qa_notes: null, created_at: now, updated_at: now, sync_status: "SYNCED" },
    { id: resultApproved, org_id: ORG, schedule_id: schedApproved, form_id: formAlarm, inspector_id: userId2, hubspot_asset_id: "hs_asset_003", status: "APPROVED", form_data: JSON.stringify({ detector_count: 24, all_activated: true, horn_strobes: true }), gps_lat: null, gps_lng: null, photo_urls: null, signature_url: "file://local/sig001.png", started_at: daysAgo(14), submitted_at: daysAgo(14), client_uuid: id("cu"), hubspot_deficiency_ticket_id: null, qa_status: "APPROVED", qa_reviewer_id: userId3, qa_reviewed_at: daysAgo(13), qa_notes: "All clear", created_at: now, updated_at: now, sync_status: "SYNCED" },
    { id: resultCompleted, org_id: ORG, schedule_id: schedCompleted, form_id: formSprinkler, inspector_id: userId2, hubspot_asset_id: "hs_asset_001", status: "COMPLETED", form_data: JSON.stringify({ visual_ok: true, corrosion: false, static_psi: 75, residual_psi: 68, flow_gpm: 500, deficiency_found: false }), gps_lat: null, gps_lng: null, photo_urls: null, signature_url: "file://local/sig002.png", started_at: daysAgo(30), submitted_at: daysAgo(30), client_uuid: id("cu"), hubspot_deficiency_ticket_id: null, qa_status: "APPROVED", qa_reviewer_id: userId3, qa_reviewed_at: daysAgo(29), qa_notes: null, created_at: now, updated_at: now, sync_status: "SYNCED" },
    { id: resultVoid, org_id: ORG, schedule_id: schedVoid, form_id: formSprinkler, inspector_id: userId2, hubspot_asset_id: "hs_asset_002", status: "VOID", form_data: "{}", gps_lat: null, gps_lng: null, photo_urls: null, signature_url: null, started_at: daysAgo(90), submitted_at: null, client_uuid: id("cu"), hubspot_deficiency_ticket_id: null, qa_status: null, qa_reviewer_id: null, qa_reviewed_at: null, qa_notes: "Customer cancelled prior to start", created_at: now, updated_at: now, sync_status: "SYNCED" },
  ]);

  const rptDraft = id("rpt");
  const rptQaReview = id("rpt");
  const rptApproved = id("rpt");
  const rptSent = id("rpt");

  await db.insert(schema.inspectionReports).values([
    { id: rptDraft, org_id: ORG, result_id: resultSubmitted, status: "DRAFT", pdf_url: null, hubspot_customer_id: "hs_cust_001", sent_at: null, report_config: null, title: "Sprinkler Inspection Draft Report", created_at: now, updated_at: now, sync_status: "PENDING" },
    { id: rptQaReview, org_id: ORG, result_id: resultQaReview, status: "QA_REVIEW", pdf_url: null, hubspot_customer_id: "hs_cust_001", sent_at: null, report_config: null, title: "Sprinkler Inspection — Corrosion Deficiency Report", created_at: now, updated_at: now, sync_status: "SYNCED" },
    { id: rptApproved, org_id: ORG, result_id: resultApproved, status: "APPROVED", pdf_url: "file://local/rpt_approved.pdf", hubspot_customer_id: "hs_cust_002", sent_at: null, report_config: null, title: "NFPA 72 Semi-Annual Alarm Inspection", created_at: now, updated_at: now, sync_status: "SYNCED" },
    { id: rptSent, org_id: ORG, result_id: resultCompleted, status: "SENT", pdf_url: "file://local/rpt_sent.pdf", hubspot_customer_id: "hs_cust_001", sent_at: daysAgo(28), report_config: null, title: "NFPA 25 Annual Sprinkler Inspection — Completed", created_at: now, updated_at: now, sync_status: "SYNCED" },
  ]);

  await db.insert(schema.inspectionReportItems).values([
    { id: id("iri"), org_id: ORG, report_id: rptSent, item_type: "SUMMARY", content: "All systems passed annual inspection per NFPA 25 (2023).", sort_order: 0, is_visible: true, created_at: now, updated_at: now, sync_status: "SYNCED" },
    { id: id("iri"), org_id: ORG, report_id: rptSent, item_type: "PHOTO", content: "file://local/photo002.jpg", sort_order: 1, is_visible: true, created_at: now, updated_at: now, sync_status: "SYNCED" },
    { id: id("iri"), org_id: ORG, report_id: rptQaReview, item_type: "FINDING", content: "Visible corrosion detected on zone 3 sprinkler heads — immediate remediation required.", sort_order: 0, is_visible: true, created_at: now, updated_at: now, sync_status: "SYNCED" },
  ]);

  await db.insert(schema.systemTests).values([
    { id: id("st"), org_id: ORG, hubspot_asset_id: "hs_asset_001", compliance_standard_id: csSprinker, inspector_id: userId2, test_type: "FLOW_TEST", result: "PASS", readings: JSON.stringify({ static_psi: 75, residual_psi: 68, flow_gpm: 500 }), notes: "Pressure within spec", tested_at: daysAgo(30), hubspot_work_order_ticket_id: "hs_wo_001", created_at: now, updated_at: now, sync_status: "SYNCED" },
    { id: id("st"), org_id: ORG, hubspot_asset_id: "hs_asset_002", compliance_standard_id: csKitchen, inspector_id: userId2, test_type: "SUPPRESSION_DISCHARGE", result: "FAIL", readings: JSON.stringify({ discharge_time_s: 45, expected_max_s: 30 }), notes: "Discharge exceeded threshold — cleaning required", tested_at: daysAgo(10), hubspot_work_order_ticket_id: null, created_at: now, updated_at: now, sync_status: "SYNCED" },
    { id: id("st"), org_id: ORG, hubspot_asset_id: "hs_asset_003", compliance_standard_id: csAlarm, inspector_id: userId2, test_type: "SMOKE_DETECTOR_SENSITIVITY", result: "INCONCLUSIVE", readings: JSON.stringify({ tested: 24, passed: 22, inconclusive: 2 }), notes: "2 detectors require follow-up sensitivity retest", tested_at: daysAgo(5), hubspot_work_order_ticket_id: null, created_at: now, updated_at: now, sync_status: "SYNCED" },
  ]);

  await db.insert(schema.maintenanceRecords).values([
    { id: id("mr"), org_id: ORG, hubspot_asset_id: "hs_asset_001", maintenance_type: "PREVENTIVE", status: "SCHEDULED", description: "Annual valve lubrication and head replacement check", technician_id: userId2, connecteam_shift_id: null, hubspot_work_order_ticket_id: "hs_wo_002", scheduled_at: daysFromNow(30), completed_at: null, next_maintenance_at: daysFromNow(395), cost: null, notes: null, created_at: now, updated_at: now, sync_status: "PENDING" },
    { id: id("mr"), org_id: ORG, hubspot_asset_id: "hs_asset_002", maintenance_type: "CORRECTIVE", status: "IN_PROGRESS", description: "Kitchen hood grease trap cleaning — deficiency remediation", technician_id: userId2, connecteam_shift_id: "ct_shift_001", hubspot_work_order_ticket_id: "hs_wo_003", scheduled_at: daysAgo(2), completed_at: null, next_maintenance_at: daysFromNow(88), cost: null, notes: "Parts ordered", created_at: now, updated_at: now, sync_status: "SYNCED" },
    { id: id("mr"), org_id: ORG, hubspot_asset_id: "hs_asset_001", maintenance_type: "EMERGENCY", status: "COMPLETED", description: "Emergency head replacement after activation during cooking incident", technician_id: userId2, connecteam_shift_id: "ct_shift_002", hubspot_work_order_ticket_id: "hs_wo_004", scheduled_at: daysAgo(60), completed_at: daysAgo(59), next_maintenance_at: null, cost: 340.00, notes: "3 heads replaced, system restored to service", created_at: now, updated_at: now, sync_status: "SYNCED" },
    { id: id("mr"), org_id: ORG, hubspot_asset_id: "hs_asset_003", maintenance_type: "PREVENTIVE", status: "CANCELLED", description: "Scheduled battery replacement — customer requested deferral", technician_id: null, connecteam_shift_id: null, hubspot_work_order_ticket_id: null, scheduled_at: daysAgo(15), completed_at: null, next_maintenance_at: daysFromNow(60), cost: null, notes: "Rescheduled per customer request", created_at: now, updated_at: now, sync_status: "SYNCED" },
  ]);

  const teValid = id("te");
  const teDueSoon = id("te");
  const teExpired = id("te");
  const teOverdue = id("te");

  await db.insert(schema.testEquipment).values([
    { id: teValid, org_id: ORG, name: "Digital Pitot Gauge", model: "DPG-350", serial_number: "SN-2024-0011", manufacturer: "Reed Instruments", calibration_status: "VALID", last_calibration_at: daysAgo(30), next_calibration_at: daysFromNow(335), notes: null, created_at: now, updated_at: now, sync_status: "SYNCED" },
    { id: teDueSoon, org_id: ORG, name: "Clamp Meter", model: "CM-100", serial_number: "SN-2023-0045", manufacturer: "Fluke", calibration_status: "DUE_SOON", last_calibration_at: daysAgo(330), next_calibration_at: daysFromNow(35), notes: "Schedule calibration this month", created_at: now, updated_at: now, sync_status: "SYNCED" },
    { id: teExpired, org_id: ORG, name: "Pressure Test Pump", model: "PTP-200", serial_number: "SN-2022-0088", manufacturer: "Clas Ohlson", calibration_status: "EXPIRED", last_calibration_at: daysAgo(380), next_calibration_at: daysAgo(15), notes: "DO NOT USE — calibration expired", created_at: now, updated_at: now, sync_status: "SYNCED" },
    { id: teOverdue, org_id: ORG, name: "Flow Meter", model: "FM-500", serial_number: "SN-2021-0012", manufacturer: "Badger Meter", calibration_status: "OVERDUE", last_calibration_at: daysAgo(730), next_calibration_at: daysAgo(365), notes: "Critical — overdue by 1 year", created_at: now, updated_at: now, sync_status: "SYNCED" },
  ]);

  await db.insert(schema.calibrationRecords).values([
    { id: id("cr"), org_id: ORG, equipment_id: teValid, technician: "AccuCal Labs", result: "PASS", certificate_number: "CERT-2024-0011", notes: "Within manufacturer spec ±0.5%", calibrated_at: daysAgo(30), expires_at: daysFromNow(335), created_at: now, updated_at: now, sync_status: "SYNCED" },
    { id: id("cr"), org_id: ORG, equipment_id: teDueSoon, technician: "AccuCal Labs", result: "PASS", certificate_number: "CERT-2023-0045", notes: null, calibrated_at: daysAgo(330), expires_at: daysFromNow(35), created_at: now, updated_at: now, sync_status: "SYNCED" },
    { id: id("cr"), org_id: ORG, equipment_id: teExpired, technician: "City Cal Services", result: "FAIL", certificate_number: null, notes: "Failed — zero drift > 3%, returned for repair", calibrated_at: daysAgo(380), expires_at: daysAgo(15), created_at: now, updated_at: now, sync_status: "SYNCED" },
    { id: id("cr"), org_id: ORG, equipment_id: teOverdue, technician: "City Cal Services", result: "INCONCLUSIVE", certificate_number: null, notes: "Inconclusive reading — meter sent for factory service", calibrated_at: daysAgo(730), expires_at: daysAgo(365), created_at: now, updated_at: now, sync_status: "SYNCED" },
  ]);

  await db.insert(schema.aiSuggestions).values([
    { id: id("ai"), org_id: ORG, suggestion_type: "CODE_REFERENCE", status: "PENDING", payload: JSON.stringify({ code: "NFPA 25 §14.2.1.2", text: "Wet pipe systems shall be inspected per Table 5.1." }), context_type: "inspection_result", context_id: resultDraft, accepted_at: null, rejected_at: null, model_version: "gpt-4o-mini", created_at: now, updated_at: now, sync_status: "SYNCED" },
    { id: id("ai"), org_id: ORG, suggestion_type: "FINDING_AUTOFILL", status: "ACCEPTED", payload: JSON.stringify({ field: "deficiency_desc", suggested_text: "Corrosion observed on zone 3 sprinkler heads — pitting and scale buildup present." }), context_type: "inspection_result", context_id: resultQaReview, accepted_at: daysAgo(7), rejected_at: null, model_version: "gpt-4o-mini", created_at: now, updated_at: now, sync_status: "SYNCED" },
    { id: id("ai"), org_id: ORG, suggestion_type: "PHOTO_DEFICIENCY", status: "REJECTED", payload: JSON.stringify({ detected_issues: ["corrosion"], confidence: 0.87 }), context_type: "inspection_result", context_id: resultQaReview, accepted_at: null, rejected_at: daysAgo(6), model_version: "vision-v1", created_at: now, updated_at: now, sync_status: "SYNCED" },
    { id: id("ai"), org_id: ORG, suggestion_type: "QA_FLAG", status: "PENDING", payload: JSON.stringify({ flag: "MISSING_PRESSURE_READING", message: "Static pressure reading not recorded for zone 2." }), context_type: "inspection_result", context_id: resultQaReview, accepted_at: null, rejected_at: null, model_version: "gpt-4o", created_at: now, updated_at: now, sync_status: "SYNCED" },
    { id: id("ai"), org_id: ORG, suggestion_type: "FORM_GENERATION", status: "ACCEPTED", payload: JSON.stringify({ form_id: formAlarm, generated_sections: 2, token_count: 1280 }), context_type: "inspection_form", context_id: formAlarm, accepted_at: daysAgo(20), rejected_at: null, model_version: "gpt-4o", created_at: now, updated_at: now, sync_status: "SYNCED" },
  ]);

  await db.insert(schema.hubspotObjectCache).values([
    { id: id("hoc"), org_id: ORG, object_type: "asset", object_id: "hs_asset_001", payload: JSON.stringify({ id: "hs_asset_001", name: "Main Lobby Sprinkler System", system_type: "FIRE_SPRINKLER", lifecycle_status: "ACTIVE" }), fetched_at: daysAgo(1), expires_at: daysFromNow(14), created_at: now, updated_at: now, sync_status: "SYNCED" },
    { id: id("hoc"), org_id: ORG, object_type: "asset", object_id: "hs_asset_002", payload: JSON.stringify({ id: "hs_asset_002", name: "Kitchen Suppression Unit", system_type: "KITCHEN_HOOD", lifecycle_status: "ACTIVE" }), fetched_at: daysAgo(1), expires_at: daysFromNow(14), created_at: now, updated_at: now, sync_status: "SYNCED" },
    { id: id("hoc"), org_id: ORG, object_type: "asset", object_id: "hs_asset_003", payload: JSON.stringify({ id: "hs_asset_003", name: "Warehouse Alarm System", system_type: "FIRE_ALARM", lifecycle_status: "INACTIVE" }), fetched_at: daysAgo(1), expires_at: daysFromNow(14), created_at: now, updated_at: now, sync_status: "SYNCED" },
  ]);

  await db.insert(schema.integrationConnections).values([
    { id: "ic_hubspot", org_id: ORG, provider: "HUBSPOT", status: "ACTIVE", config: JSON.stringify({ portal_id: "HS_STUB_PORTAL", api_version: "v3" }), error_message: null, last_sync_at: daysAgo(1), created_at: now, updated_at: now, sync_status: "SYNCED" },
    { id: "ic_connecteam", org_id: ORG, provider: "CONNECTEAM", status: "INACTIVE", config: null, error_message: null, last_sync_at: null, created_at: now, updated_at: now, sync_status: "SYNCED" },
    { id: "ic_qbo", org_id: ORG, provider: "QBO", status: "ERROR", config: JSON.stringify({ realm_id: "QBO_STUB_REALM" }), error_message: "OAuth token expired — re-authentication required", last_sync_at: daysAgo(3), created_at: now, updated_at: now, sync_status: "SYNCED" },
  ]);

  await db.insert(schema.syncOutboxItems).values([
    { id: id("soi"), org_id: ORG, entity_type: "inspection_schedule", entity_id: schedDraft, operation: "CREATE", payload: JSON.stringify({ schedule_id: schedDraft, hubspot_asset_id: "hs_asset_001" }), target_provider: "HUBSPOT", client_uuid: id("cu"), status: "PENDING", sync_status: "SYNCED", attempts: 0, last_attempt_at: null, error: null, created_at: now, updated_at: now },
    { id: id("soi"), org_id: ORG, entity_type: "asset_compliance_link", entity_id: aclNonCompliant, operation: "UPDATE", payload: JSON.stringify({ compliance_status: "NON_COMPLIANT" }), target_provider: "HUBSPOT", client_uuid: id("cu"), status: "IN_FLIGHT", sync_status: "SYNCED", attempts: 1, last_attempt_at: nowIso(), error: null, created_at: now, updated_at: now },
    { id: id("soi"), org_id: ORG, entity_type: "inspection_result", entity_id: resultCompleted, operation: "UPDATE", payload: JSON.stringify({ status: "COMPLETED" }), target_provider: "HUBSPOT", client_uuid: id("cu"), status: "SYNCED", sync_status: "SYNCED", attempts: 1, last_attempt_at: daysAgo(28), error: null, created_at: now, updated_at: now },
    { id: id("soi"), org_id: ORG, entity_type: "maintenance_record", entity_id: id("mr"), operation: "CREATE", payload: JSON.stringify({ maintenance_type: "CORRECTIVE" }), target_provider: "CONNECTEAM", client_uuid: id("cu"), status: "FAILED", sync_status: "SYNCED", attempts: 5, last_attempt_at: daysAgo(1), error: "ConnecteamConnector: connection refused (INACTIVE)", created_at: now, updated_at: now },
    { id: id("soi"), org_id: ORG, entity_type: "invoice", entity_id: rptSent, operation: "CREATE", payload: JSON.stringify({ report_id: rptSent, total: 1800.00 }), target_provider: "QBO", client_uuid: id("cu"), status: "CONFLICT", sync_status: "SYNCED", attempts: 3, last_attempt_at: daysAgo(2), error: "QBO: duplicate invoice number detected", created_at: now, updated_at: now },
    { id: id("soi"), org_id: ORG, entity_type: "inspection_result", entity_id: resultVoid, operation: "DELETE", payload: JSON.stringify({ reason: "customer_cancelled" }), target_provider: "HUBSPOT", client_uuid: id("cu"), status: "SYNCED", sync_status: "SYNCED", attempts: 1, last_attempt_at: daysAgo(90), error: null, created_at: now, updated_at: now },
  ]);
}
