import { eq } from "drizzle-orm";
import { getDb } from "./client";
import * as schema from "./schema";

const ORG_ID = "org_beacon_test_001";

function nowIso() { return new Date().toISOString(); }
function daysFromNow(n: number) {
  return new Date(Date.now() + n * 86_400_000).toISOString();
}
function daysAgo(n: number) {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}
function genId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
}

export async function seedDatabase(): Promise<void> {
  const db = await getDb();
  const now = nowIso();

  const existing = await db.select().from(schema.authProviderConfigs)
    .where(eq(schema.authProviderConfigs.org_id, ORG_ID));
  if (existing.length > 0) {
    console.log("[Seed] Already seeded for org_beacon_test_001, skipping.");
    return;
  }

  console.log("[Seed] Seeding org_beacon_test_001...");

  await db.insert(schema.authProviderConfigs).values({
    id: "apc_beacon_entra",
    org_id: ORG_ID,
    provider: "MICROSOFT_ENTRA",
    client_id: "STUB_CLIENT_ID_REPLACE_IN_PRODUCTION",
    tenant_id: "STUB_TENANT_ID_REPLACE_IN_PRODUCTION",
    scopes: "openid,profile,email,User.Read",
    is_active: true,
    created_at: now,
    updated_at: now,
  });

  await db.insert(schema.integrationConnections).values([
    {
      id: "ic_hubspot_beacon",
      org_id: ORG_ID,
      provider: "HUBSPOT",
      status: "ACTIVE",
      config: JSON.stringify({ portal_id: "stub_12345" }),
      last_sync_at: now,
      created_at: now,
      updated_at: now,
    },
    {
      id: "ic_connecteam_beacon",
      org_id: ORG_ID,
      provider: "CONNECTEAM",
      status: "ACTIVE",
      config: JSON.stringify({ api_key: "stub_ct_key" }),
      last_sync_at: now,
      created_at: now,
      updated_at: now,
    },
    {
      id: "ic_qbo_beacon",
      org_id: ORG_ID,
      provider: "QBO",
      status: "INACTIVE",
      config: null,
      error_message: "OAuth not yet authorized",
      created_at: now,
      updated_at: now,
    },
  ]);

  const std1 = genId("std");
  const std2 = genId("std");
  const std3 = genId("std");
  const std4 = genId("std");

  await db.insert(schema.complianceStandards).values([
    {
      id: std1,
      org_id: ORG_ID,
      name: "NFPA 25 — Wet Sprinkler Inspection",
      code: "NFPA25",
      authority: "NFPA",
      system_type: "FIRE_SPRINKLER",
      version: "2023",
      description: "Standard for the inspection, testing, and maintenance of water-based fire protection systems.",
      effective_date: "2023-01-01",
      created_at: now, updated_at: now, sync_status: "SYNCED",
    },
    {
      id: std2,
      org_id: ORG_ID,
      name: "NFPA 72 — Fire Alarm Systems",
      code: "NFPA72",
      authority: "NFPA",
      system_type: "FIRE_ALARM",
      version: "2022",
      description: "National Fire Alarm and Signaling Code.",
      effective_date: "2022-01-01",
      created_at: now, updated_at: now, sync_status: "SYNCED",
    },
    {
      id: std3,
      org_id: ORG_ID,
      name: "NFPA 96 — Kitchen Hood Systems",
      code: "NFPA96",
      authority: "NFPA",
      system_type: "KITCHEN_HOOD",
      version: "2021",
      description: "Standard for Ventilation Control and Fire Protection of Commercial Cooking Operations.",
      effective_date: "2021-01-01",
      created_at: now, updated_at: now, sync_status: "SYNCED",
    },
    {
      id: std4,
      org_id: ORG_ID,
      name: "NFPA 10 — Portable Fire Extinguishers",
      code: "NFPA10",
      authority: "NFPA",
      system_type: "SPECIAL_HAZARD",
      version: "2022",
      description: "Standard for Portable Fire Extinguishers.",
      effective_date: "2022-06-01",
      created_at: now, updated_at: now, sync_status: "SYNCED",
    },
  ]);

  const acl1 = genId("acl"); const acl2 = genId("acl"); const acl3 = genId("acl");
  await db.insert(schema.assetComplianceLinks).values([
    { id: acl1, org_id: ORG_ID, hubspot_asset_id: "hs_asset_001", compliance_standard_id: std1, compliance_status: "COMPLIANT", last_inspection_at: daysAgo(45), next_inspection_at: daysFromNow(320), created_at: now, updated_at: now, sync_status: "SYNCED" },
    { id: acl2, org_id: ORG_ID, hubspot_asset_id: "hs_asset_002", compliance_standard_id: std3, compliance_status: "NON_COMPLIANT", last_inspection_at: daysAgo(200), next_inspection_at: daysFromNow(-15), created_at: now, updated_at: now, sync_status: "SYNCED" },
    { id: acl3, org_id: ORG_ID, hubspot_asset_id: "hs_asset_003", compliance_standard_id: std2, compliance_status: "PENDING", last_inspection_at: null, next_inspection_at: daysFromNow(30), created_at: now, updated_at: now, sync_status: "SYNCED" },
  ]);

  const ser1 = genId("ser"); const ser2 = genId("ser");
  await db.insert(schema.inspectionSeries).values([
    { id: ser1, org_id: ORG_ID, name: "Beacon HQ — Annual Sprinkler", hubspot_asset_id: "hs_asset_001", system_type: "FIRE_SPRINKLER", frequency_days: 365, generation_horizon_days: 180, starts_at: daysAgo(400), ends_at: null, hubspot_service_team_id: "hs_team_001", is_booked: true, contracted_amount: 4500.00, notes: "Annual NFPA 25 inspection", created_at: now, updated_at: now, sync_status: "SYNCED" },
    { id: ser2, org_id: ORG_ID, name: "Beacon Kitchen — Semi-Annual Hood", hubspot_asset_id: "hs_asset_002", system_type: "KITCHEN_HOOD", frequency_days: 182, generation_horizon_days: 90, starts_at: daysAgo(600), ends_at: null, is_booked: false, contracted_amount: null, notes: "Semi-annual NFPA 96 inspection", created_at: now, updated_at: now, sync_status: "SYNCED" },
  ]);

  const sch1 = genId("sch"); const sch2 = genId("sch"); const sch3 = genId("sch");
  await db.insert(schema.inspectionSchedules).values([
    { id: sch1, org_id: ORG_ID, series_id: ser1, hubspot_asset_id: "hs_asset_001", scheduled_date: daysAgo(45), status: "COMPLETED", hubspot_inspection_ticket_id: "hs_insp_tkt_001", created_at: now, updated_at: now, sync_status: "SYNCED" },
    { id: sch2, org_id: ORG_ID, series_id: ser1, hubspot_asset_id: "hs_asset_001", scheduled_date: daysFromNow(320), status: "DRAFT", hubspot_inspection_ticket_id: null, created_at: now, updated_at: now, sync_status: "SYNCED" },
    { id: sch3, org_id: ORG_ID, series_id: ser2, hubspot_asset_id: "hs_asset_002", scheduled_date: daysFromNow(-15), status: "DRAFT", hubspot_inspection_ticket_id: null, created_at: now, updated_at: now, sync_status: "PENDING" },
  ]);

  const form1 = genId("frm");
  const formSchema = JSON.stringify({
    sections: [
      {
        id: "visual",
        title: "Visual Inspection",
        fields: [
          { id: "q1", type: "select", label: "Sprinkler heads — condition?", options: ["OK", "CORRODED", "MISSING", "OBSTRUCTED"], deficiency_on: ["CORRODED", "MISSING", "OBSTRUCTED"] },
          { id: "q2", type: "select", label: "Main drain test — result?", options: ["PASS", "FAIL"], deficiency_on: ["FAIL"] },
          { id: "q3", type: "text", label: "Water pressure (PSI)", placeholder: "Enter PSI reading" },
          { id: "q4", type: "boolean", label: "Signage and labeling correct?", deficiency_on: [false] },
        ],
      },
      {
        id: "testing",
        title: "Flow Testing",
        fields: [
          { id: "q5", type: "select", label: "Flow test — result?", options: ["PASS", "FAIL"], deficiency_on: ["FAIL"] },
          { id: "q6", type: "text", label: "Notes", placeholder: "Additional observations" },
        ],
      },
    ],
  });
  await db.insert(schema.inspectionForms).values({
    id: form1, org_id: ORG_ID, name: "NFPA 25 — Wet Sprinkler Annual", system_type: "FIRE_SPRINKLER", version: "2.1", form_schema: formSchema, is_active: true, ai_generated: false, deficiency_triggers: JSON.stringify(["CORRODED", "MISSING", "FAIL"]), compliance_standard_id: std1, created_at: now, updated_at: now, sync_status: "SYNCED",
  });

  const res1 = genId("res"); const res2 = genId("res");
  await db.insert(schema.inspectionResults).values([
    {
      id: res1, org_id: ORG_ID, schedule_id: sch1, form_id: form1, inspector_id: "user_seed_inspector",
      hubspot_asset_id: "hs_asset_001", status: "APPROVED",
      form_data: JSON.stringify({ q1: "OK", q2: "PASS", q3: "72", q4: true, q5: "PASS", q6: "All systems nominal." }),
      gps_lat: 37.7749, gps_lng: -122.4194, photo_urls: null, signature_url: null,
      started_at: daysAgo(45), submitted_at: daysAgo(45), client_uuid: `cuuid_${genId("r1")}`,
      hubspot_deficiency_ticket_id: null, qa_status: "APPROVED", qa_reviewer_id: "user_seed_reviewer", qa_reviewed_at: daysAgo(44), qa_notes: "Reviewed and approved.",
      created_at: now, updated_at: now, sync_status: "SYNCED",
    },
    {
      id: res2, org_id: ORG_ID, schedule_id: sch3, form_id: form1, inspector_id: "user_seed_inspector",
      hubspot_asset_id: "hs_asset_002", status: "IN_PROGRESS",
      form_data: JSON.stringify({ q1: "CORRODED" }),
      gps_lat: null, gps_lng: null, photo_urls: null, signature_url: null,
      started_at: nowIso(), submitted_at: null, client_uuid: `cuuid_${genId("r2")}`,
      hubspot_deficiency_ticket_id: null, qa_status: null, qa_reviewer_id: null, qa_reviewed_at: null, qa_notes: null,
      created_at: now, updated_at: now, sync_status: "PENDING",
    },
  ]);

  const rep1 = genId("rep");
  await db.insert(schema.inspectionReports).values({
    id: rep1, org_id: ORG_ID, result_id: res1, status: "SENT",
    pdf_url: null, hubspot_customer_id: "hs_cust_beacon_001", sent_at: daysAgo(43),
    report_config: JSON.stringify({ include_deficiencies: false, format: "NFPA" }),
    title: "Beacon HQ Sprinkler Inspection Report — Annual 2025",
    created_at: now, updated_at: now, sync_status: "SYNCED",
  });

  const eq1 = genId("eq"); const eq2 = genId("eq"); const eq3 = genId("eq");
  await db.insert(schema.testEquipment).values([
    { id: eq1, org_id: ORG_ID, name: "Fluke 1625-2 Advanced GEO Earth Ground Tester", model: "1625-2", serial_number: "SN-FLK-001", manufacturer: "Fluke", calibration_status: "VALID", last_calibration_at: daysAgo(60), next_calibration_at: daysFromNow(305), notes: null, created_at: now, updated_at: now, sync_status: "SYNCED" },
    { id: eq2, org_id: ORG_ID, name: "Pitot Gauge — Flow Test Kit", model: "PG-4000", serial_number: "SN-PG-002", manufacturer: "FireTest Co.", calibration_status: "DUE_SOON", last_calibration_at: daysAgo(330), next_calibration_at: daysFromNow(35), notes: "Schedule calibration soon", created_at: now, updated_at: now, sync_status: "SYNCED" },
    { id: eq3, org_id: ORG_ID, name: "Sound Level Meter SL-4023", model: "SL-4023", serial_number: "SN-SL-003", manufacturer: "Reed Instruments", calibration_status: "EXPIRED", last_calibration_at: daysAgo(400), next_calibration_at: daysFromNow(-35), notes: "EXPIRED — do not use until recalibrated", created_at: now, updated_at: now, sync_status: "SYNCED" },
  ]);

  const cal1 = genId("cal"); const cal2 = genId("cal");
  await db.insert(schema.calibrationRecords).values([
    { id: cal1, org_id: ORG_ID, equipment_id: eq1, technician: "National Calibration Lab", result: "PASS", certificate_number: "CERT-2025-001", notes: null, calibrated_at: daysAgo(60), expires_at: daysFromNow(305), created_at: now, updated_at: now, sync_status: "SYNCED" },
    { id: cal2, org_id: ORG_ID, equipment_id: eq3, technician: "FireTest Calibration Services", result: "PASS", certificate_number: "CERT-2024-003", notes: null, calibrated_at: daysAgo(400), expires_at: daysFromNow(-35), created_at: now, updated_at: now, sync_status: "SYNCED" },
  ]);

  const st1 = genId("stt"); const st2 = genId("stt");
  await db.insert(schema.systemTests).values([
    { id: st1, org_id: ORG_ID, hubspot_asset_id: "hs_asset_001", compliance_standard_id: std1, inspector_id: "user_seed_inspector", test_type: "MAIN_DRAIN", result: "PASS", readings: JSON.stringify({ static_psi: 72, residual_psi: 65, flow_gpm: 350 }), notes: "Within NFPA 25 acceptable range.", tested_at: daysAgo(45), hubspot_work_order_ticket_id: null, created_at: now, updated_at: now, sync_status: "SYNCED" },
    { id: st2, org_id: ORG_ID, hubspot_asset_id: "hs_asset_002", compliance_standard_id: std3, inspector_id: "user_seed_inspector", test_type: "SUPPRESSION_AGENT", result: "FAIL", readings: JSON.stringify({ agent_lbs: 8.2, required_lbs: 12.0 }), notes: "Agent level below minimum. Recharge required.", tested_at: daysAgo(10), hubspot_work_order_ticket_id: "hs_wo_tkt_001", created_at: now, updated_at: now, sync_status: "SYNCED" },
  ]);

  const mr1 = genId("mr"); const mr2 = genId("mr"); const mr3 = genId("mr");
  await db.insert(schema.maintenanceRecords).values([
    { id: mr1, org_id: ORG_ID, hubspot_asset_id: "hs_asset_001", maintenance_type: "PREVENTIVE", status: "COMPLETED", description: "Annual check and lubrication of OS&Y valves", technician_id: "user_seed_tech", connecteam_shift_id: null, hubspot_work_order_ticket_id: null, scheduled_at: daysAgo(45), completed_at: daysAgo(45), next_maintenance_at: daysFromNow(320), cost: 850.00, notes: null, created_at: now, updated_at: now, sync_status: "SYNCED" },
    { id: mr2, org_id: ORG_ID, hubspot_asset_id: "hs_asset_002", maintenance_type: "CORRECTIVE", status: "SCHEDULED", description: "Recharge suppression agent — below NFPA 96 minimum", technician_id: null, connecteam_shift_id: "ct_shift_stub_001", hubspot_work_order_ticket_id: "hs_wo_tkt_001", scheduled_at: daysFromNow(3), completed_at: null, next_maintenance_at: null, cost: null, notes: "Urgent — system is non-compliant", created_at: now, updated_at: now, sync_status: "SYNCED" },
    { id: mr3, org_id: ORG_ID, hubspot_asset_id: "hs_asset_003", maintenance_type: "EMERGENCY", status: "IN_PROGRESS", description: "Panel replacement after lightning surge", technician_id: "user_seed_tech", connecteam_shift_id: null, hubspot_work_order_ticket_id: "hs_wo_tkt_002", scheduled_at: daysAgo(2), completed_at: null, next_maintenance_at: null, cost: null, notes: "Parts ordered, awaiting delivery", created_at: now, updated_at: now, sync_status: "SYNCED" },
  ]);

  await db.insert(schema.syncOutboxItems).values([
    {
      id: genId("soi"),
      org_id: ORG_ID,
      entity_type: "inspection_schedule",
      entity_id: sch3,
      operation: "CREATE",
      payload: JSON.stringify({ schedule_id: sch3, hubspot_asset_id: "hs_asset_002", series_id: ser2, scheduled_date: daysFromNow(-15) }),
      target_provider: "HUBSPOT",
      client_uuid: genId("cuuid"),
      status: "PENDING",
      attempts: 0,
      last_attempt_at: null,
      error: null,
      created_at: now,
      updated_at: now,
    },
    {
      id: genId("soi"),
      org_id: ORG_ID,
      entity_type: "inspection_result",
      entity_id: res2,
      operation: "UPDATE",
      payload: JSON.stringify({ result_id: res2, status: "IN_PROGRESS" }),
      target_provider: "ITM",
      client_uuid: genId("cuuid"),
      status: "FAILED",
      attempts: 3,
      last_attempt_at: daysAgo(1),
      error: "Network timeout",
      created_at: now,
      updated_at: now,
    },
  ]);

  await db.insert(schema.aiSuggestions).values([
    {
      id: genId("ai"),
      org_id: ORG_ID,
      suggestion_type: "CODE_REFERENCE",
      status: "PENDING",
      payload: JSON.stringify({ code: "NFPA25-7.3.1", text: "Main drain tests shall be conducted at intervals specified in Table 5.1." }),
      context_type: "inspection_result",
      context_id: res2,
      accepted_at: null,
      rejected_at: null,
      model_version: "stub-v0",
      created_at: now,
      updated_at: now,
      sync_status: "SYNCED",
    },
    {
      id: genId("ai"),
      org_id: ORG_ID,
      suggestion_type: "FORM_GENERATION",
      status: "ACCEPTED",
      payload: JSON.stringify({ generated_form_id: form1, source_standard: "NFPA25-2023" }),
      context_type: "inspection_form",
      context_id: form1,
      accepted_at: daysAgo(30),
      rejected_at: null,
      model_version: "stub-v0",
      created_at: now,
      updated_at: now,
      sync_status: "SYNCED",
    },
  ]);

  console.log("[Seed] Done — org_beacon_test_001 seeded successfully.");
}
