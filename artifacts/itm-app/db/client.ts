import * as SQLite from "expo-sqlite";
import { drizzle } from "drizzle-orm/expo-sqlite";
import * as schema from "./schema";

const DB_NAME = "itm_v1.db";

let dbInstance: ReturnType<typeof drizzle> | null = null;
let initPromise: Promise<ReturnType<typeof drizzle>> | null = null;

const CREATE_TABLES_SQL = `
PRAGMA journal_mode=WAL;

CREATE TABLE IF NOT EXISTS compliance_standards (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  authority TEXT NOT NULL,
  system_type TEXT NOT NULL,
  version TEXT NOT NULL,
  description TEXT,
  effective_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'SYNCED'
);
CREATE INDEX IF NOT EXISTS idx_cs_org ON compliance_standards(org_id);

CREATE TABLE IF NOT EXISTS asset_compliance_links (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  hubspot_asset_id TEXT NOT NULL,
  compliance_standard_id TEXT NOT NULL,
  compliance_status TEXT NOT NULL DEFAULT 'PENDING',
  last_inspection_at TEXT,
  next_inspection_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'SYNCED'
);
CREATE INDEX IF NOT EXISTS idx_acl_org ON asset_compliance_links(org_id);

CREATE TABLE IF NOT EXISTS inspection_series (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  hubspot_asset_id TEXT NOT NULL,
  system_type TEXT NOT NULL,
  frequency_days INTEGER NOT NULL,
  generation_horizon_days INTEGER NOT NULL DEFAULT 180,
  starts_at TEXT NOT NULL,
  ends_at TEXT,
  hubspot_service_team_id TEXT,
  is_booked INTEGER NOT NULL DEFAULT 0,
  contracted_amount REAL,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'SYNCED'
);
CREATE INDEX IF NOT EXISTS idx_is_org ON inspection_series(org_id);

CREATE TABLE IF NOT EXISTS inspection_schedules (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  series_id TEXT NOT NULL,
  hubspot_asset_id TEXT NOT NULL,
  scheduled_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  hubspot_inspection_ticket_id TEXT,
  rescheduled_from TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'SYNCED'
);
CREATE INDEX IF NOT EXISTS idx_isch_org ON inspection_schedules(org_id);

CREATE TABLE IF NOT EXISTS inspection_forms (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  system_type TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0',
  form_schema TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 0,
  ai_generated INTEGER NOT NULL DEFAULT 0,
  deficiency_triggers TEXT,
  compliance_standard_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'SYNCED'
);
CREATE INDEX IF NOT EXISTS idx_if_org ON inspection_forms(org_id);

CREATE TABLE IF NOT EXISTS inspection_results (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  schedule_id TEXT,
  form_id TEXT NOT NULL,
  inspector_id TEXT NOT NULL,
  hubspot_asset_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  form_data TEXT NOT NULL DEFAULT '{}',
  gps_lat REAL,
  gps_lng REAL,
  photo_urls TEXT,
  signature_url TEXT,
  started_at TEXT,
  submitted_at TEXT,
  client_uuid TEXT NOT NULL,
  hubspot_deficiency_ticket_id TEXT,
  qa_status TEXT,
  qa_reviewer_id TEXT,
  qa_reviewed_at TEXT,
  qa_notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'SYNCED'
);
CREATE INDEX IF NOT EXISTS idx_ir_org ON inspection_results(org_id);

CREATE TABLE IF NOT EXISTS inspection_reports (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  result_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  pdf_url TEXT,
  hubspot_customer_id TEXT,
  sent_at TEXT,
  report_config TEXT,
  title TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'SYNCED'
);
CREATE INDEX IF NOT EXISTS idx_irep_org ON inspection_reports(org_id);

CREATE TABLE IF NOT EXISTS inspection_report_items (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  report_id TEXT NOT NULL,
  item_type TEXT NOT NULL,
  content TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_visible INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'SYNCED'
);
CREATE INDEX IF NOT EXISTS idx_iri_org ON inspection_report_items(org_id);

CREATE TABLE IF NOT EXISTS system_tests (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  hubspot_asset_id TEXT NOT NULL,
  compliance_standard_id TEXT,
  inspector_id TEXT NOT NULL,
  test_type TEXT NOT NULL,
  result TEXT NOT NULL,
  readings TEXT,
  notes TEXT,
  tested_at TEXT NOT NULL,
  hubspot_work_order_ticket_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'SYNCED'
);
CREATE INDEX IF NOT EXISTS idx_st_org ON system_tests(org_id);

CREATE TABLE IF NOT EXISTS maintenance_records (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  hubspot_asset_id TEXT NOT NULL,
  maintenance_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'SCHEDULED',
  description TEXT,
  technician_id TEXT,
  connecteam_shift_id TEXT,
  hubspot_work_order_ticket_id TEXT,
  scheduled_at TEXT,
  completed_at TEXT,
  next_maintenance_at TEXT,
  cost REAL,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'SYNCED'
);
CREATE INDEX IF NOT EXISTS idx_mr_org ON maintenance_records(org_id);

CREATE TABLE IF NOT EXISTS test_equipment (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  model TEXT,
  serial_number TEXT,
  manufacturer TEXT,
  calibration_status TEXT NOT NULL DEFAULT 'VALID',
  last_calibration_at TEXT,
  next_calibration_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'SYNCED'
);
CREATE INDEX IF NOT EXISTS idx_te_org ON test_equipment(org_id);

CREATE TABLE IF NOT EXISTS calibration_records (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  equipment_id TEXT NOT NULL,
  technician TEXT,
  result TEXT NOT NULL DEFAULT 'PASS',
  certificate_number TEXT,
  notes TEXT,
  calibrated_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'SYNCED'
);
CREATE INDEX IF NOT EXISTS idx_cr_org ON calibration_records(org_id);

CREATE TABLE IF NOT EXISTS ai_suggestions (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  suggestion_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  payload TEXT NOT NULL,
  context_type TEXT,
  context_id TEXT,
  accepted_at TEXT,
  rejected_at TEXT,
  model_version TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'SYNCED'
);
CREATE INDEX IF NOT EXISTS idx_ai_org ON ai_suggestions(org_id);

CREATE TABLE IF NOT EXISTS hubspot_object_cache (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  object_type TEXT NOT NULL,
  object_id TEXT NOT NULL,
  payload TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_hoc_org ON hubspot_object_cache(org_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_hoc_obj ON hubspot_object_cache(org_id, object_type, object_id);

CREATE TABLE IF NOT EXISTS integration_connections (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'INACTIVE',
  config TEXT,
  error_message TEXT,
  last_sync_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ic_org ON integration_connections(org_id);

CREATE TABLE IF NOT EXISTS sync_outbox_items (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  payload TEXT NOT NULL,
  target_provider TEXT,
  client_uuid TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TEXT,
  error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_soi_org ON sync_outbox_items(org_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_soi_cuuid ON sync_outbox_items(client_uuid);

CREATE TABLE IF NOT EXISTS app_users (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  external_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'INSPECTOR',
  avatar_url TEXT,
  last_login_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_au_org ON app_users(org_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_au_ext ON app_users(external_id, provider);

CREATE TABLE IF NOT EXISTS auth_provider_configs (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  client_id TEXT NOT NULL,
  tenant_id TEXT,
  scopes TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_apc_org ON auth_provider_configs(org_id);
`;

async function initDatabase(): Promise<ReturnType<typeof drizzle>> {
  const sqlite = SQLite.openDatabaseSync(DB_NAME);
  await sqlite.execAsync(CREATE_TABLES_SQL);
  const db = drizzle(sqlite, { schema });
  return db;
}

export async function getDb(): Promise<ReturnType<typeof drizzle>> {
  if (dbInstance) return dbInstance;
  if (!initPromise) {
    initPromise = initDatabase().then((db) => {
      dbInstance = db;
      return db;
    });
  }
  return initPromise;
}
