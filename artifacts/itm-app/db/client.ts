import * as SQLite from "expo-sqlite";
import { drizzle } from "drizzle-orm/expo-sqlite";
import * as schema from "./schema";

// Bumped v1 -> v2 with the series->contracts rename: tables/columns changed
// (inspection_series -> inspection_contracts, series_id -> contract_id) and the
// schema is created with CREATE TABLE IF NOT EXISTS, so an existing v1 file would
// keep the stale schema. Bumping the DB name gives existing installs a fresh,
// correctly-shaped DB (re-seeded on launch; cloud Postgres is the source of truth).
const DB_NAME = "itm_v2.db";

let dbInstance: ReturnType<typeof drizzle> | null = null;
let initPromise: Promise<ReturnType<typeof drizzle>> | null = null;

const SS = "'PENDING','IN_FLIGHT','SYNCED','FAILED','CONFLICT'";
const SYNC_STATUS_CHECK = (col: string) => `CHECK (${col} IN (${SS}))`;
const SYSTEM_TYPES = "'FIRE_SPRINKLER','FIRE_ALARM','SUPPRESSION','KITCHEN_HOOD','SPECIAL_HAZARD','EMERGENCY_LIGHTING'";
const INSPECTION_STATUSES = "'DRAFT','IN_PROGRESS','SUBMITTED','QA_REVIEW','APPROVED','COMPLETED','VOID'";
const COMPLIANCE_STATUSES = "'COMPLIANT','NON_COMPLIANT','PENDING','EXEMPT'";
const REPORT_STATUSES = "'DRAFT','QA_REVIEW','APPROVED','SENT'";
const TEST_RESULTS = "'PASS','FAIL','INCONCLUSIVE'";
const MAINTENANCE_TYPES = "'PREVENTIVE','CORRECTIVE','EMERGENCY'";
const MAINTENANCE_STATUSES = "'SCHEDULED','IN_PROGRESS','COMPLETED','CANCELLED'";
const CALIBRATION_STATUSES = "'VALID','DUE_SOON','EXPIRED','OVERDUE'";
const INTEGRATION_PROVIDERS = "'HUBSPOT','CONNECTEAM','QBO'";
const INTEGRATION_STATUSES = "'ACTIVE','INACTIVE','ERROR'";
const OPERATIONS = "'CREATE','UPDATE','DELETE'";
const AUTH_PROVIDERS = "'MICROSOFT_ENTRA'";
const USER_ROLES = "'ADMIN','INSPECTOR','REVIEWER','VIEWER'";
const AI_SUGGESTION_TYPES = "'CODE_REFERENCE','FINDING_AUTOFILL','PHOTO_DEFICIENCY','QA_FLAG','FORM_GENERATION'";
const AI_SUGGESTION_STATUSES = "'PENDING','ACCEPTED','REJECTED'";
const QA_REVIEW_STATUSES = "'PENDING','APPROVED','REJECTED'";
const OUTBOX_PROVIDERS = "'HUBSPOT','CONNECTEAM','QBO','ITM'";

const BASE_COLS = (tbl: string) => `
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'SYNCED' ${SYNC_STATUS_CHECK(`${tbl}.sync_status`)}
`;

const CREATE_TABLES_SQL = `
PRAGMA journal_mode=WAL;

CREATE TABLE IF NOT EXISTS compliance_standards (
  ${BASE_COLS("compliance_standards")},
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  authority TEXT NOT NULL,
  system_type TEXT NOT NULL CHECK (compliance_standards.system_type IN (${SYSTEM_TYPES})),
  version TEXT NOT NULL,
  description TEXT,
  effective_date TEXT
);
CREATE INDEX IF NOT EXISTS idx_cs_org ON compliance_standards(org_id);

CREATE TABLE IF NOT EXISTS asset_compliance_links (
  ${BASE_COLS("asset_compliance_links")},
  hubspot_asset_id TEXT NOT NULL,
  compliance_standard_id TEXT NOT NULL,
  compliance_status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (asset_compliance_links.compliance_status IN (${COMPLIANCE_STATUSES})),
  last_inspection_at TEXT,
  next_inspection_at TEXT,
  notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_acl_org ON asset_compliance_links(org_id);

CREATE TABLE IF NOT EXISTS inspection_contracts (
  ${BASE_COLS("inspection_contracts")},
  name TEXT NOT NULL,
  hubspot_asset_id TEXT NOT NULL,
  system_type TEXT NOT NULL CHECK (inspection_contracts.system_type IN (${SYSTEM_TYPES})),
  frequency_days INTEGER NOT NULL,
  generation_horizon_days INTEGER NOT NULL DEFAULT 180,
  starts_at TEXT NOT NULL,
  ends_at TEXT,
  hubspot_service_team_id TEXT,
  is_booked INTEGER NOT NULL DEFAULT 0,
  contracted_amount REAL,
  notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_is_org ON inspection_contracts(org_id);

CREATE TABLE IF NOT EXISTS inspection_schedules (
  ${BASE_COLS("inspection_schedules")},
  contract_id TEXT NOT NULL,
  hubspot_asset_id TEXT NOT NULL,
  scheduled_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (inspection_schedules.status IN (${INSPECTION_STATUSES})),
  hubspot_inspection_ticket_id TEXT,
  rescheduled_from TEXT,
  notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_isch_org ON inspection_schedules(org_id);

CREATE TABLE IF NOT EXISTS inspection_forms (
  ${BASE_COLS("inspection_forms")},
  name TEXT NOT NULL,
  system_type TEXT NOT NULL CHECK (inspection_forms.system_type IN (${SYSTEM_TYPES})),
  version TEXT NOT NULL DEFAULT '1.0',
  form_schema TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 0,
  ai_generated INTEGER NOT NULL DEFAULT 0,
  deficiency_triggers TEXT,
  compliance_standard_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_if_org ON inspection_forms(org_id);

CREATE TABLE IF NOT EXISTS inspection_results (
  ${BASE_COLS("inspection_results")},
  schedule_id TEXT,
  form_id TEXT NOT NULL,
  inspector_id TEXT NOT NULL,
  hubspot_asset_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (inspection_results.status IN (${INSPECTION_STATUSES})),
  form_data TEXT NOT NULL DEFAULT '{}',
  gps_lat REAL,
  gps_lng REAL,
  photo_urls TEXT,
  signature_url TEXT,
  started_at TEXT,
  submitted_at TEXT,
  client_uuid TEXT NOT NULL,
  hubspot_deficiency_ticket_id TEXT,
  qa_status TEXT CHECK (inspection_results.qa_status IS NULL OR inspection_results.qa_status IN (${QA_REVIEW_STATUSES})),
  qa_reviewer_id TEXT,
  qa_reviewed_at TEXT,
  qa_notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_ir_org ON inspection_results(org_id);

CREATE TABLE IF NOT EXISTS inspection_reports (
  ${BASE_COLS("inspection_reports")},
  result_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (inspection_reports.status IN (${REPORT_STATUSES})),
  pdf_url TEXT,
  hubspot_customer_id TEXT,
  sent_at TEXT,
  report_config TEXT,
  title TEXT
);
CREATE INDEX IF NOT EXISTS idx_irep_org ON inspection_reports(org_id);

CREATE TABLE IF NOT EXISTS inspection_report_items (
  ${BASE_COLS("inspection_report_items")},
  report_id TEXT NOT NULL,
  item_type TEXT NOT NULL,
  content TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_visible INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_iri_org ON inspection_report_items(org_id);

CREATE TABLE IF NOT EXISTS system_tests (
  ${BASE_COLS("system_tests")},
  hubspot_asset_id TEXT NOT NULL,
  compliance_standard_id TEXT,
  inspector_id TEXT NOT NULL,
  test_type TEXT NOT NULL,
  result TEXT NOT NULL CHECK (system_tests.result IN (${TEST_RESULTS})),
  readings TEXT,
  notes TEXT,
  tested_at TEXT NOT NULL,
  hubspot_work_order_ticket_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_st_org ON system_tests(org_id);

CREATE TABLE IF NOT EXISTS maintenance_records (
  ${BASE_COLS("maintenance_records")},
  hubspot_asset_id TEXT NOT NULL,
  maintenance_type TEXT NOT NULL CHECK (maintenance_records.maintenance_type IN (${MAINTENANCE_TYPES})),
  status TEXT NOT NULL DEFAULT 'SCHEDULED'
    CHECK (maintenance_records.status IN (${MAINTENANCE_STATUSES})),
  description TEXT,
  technician_id TEXT,
  connecteam_shift_id TEXT,
  hubspot_work_order_ticket_id TEXT,
  scheduled_at TEXT,
  completed_at TEXT,
  next_maintenance_at TEXT,
  cost REAL,
  notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_mr_org ON maintenance_records(org_id);

CREATE TABLE IF NOT EXISTS test_equipment (
  ${BASE_COLS("test_equipment")},
  name TEXT NOT NULL,
  model TEXT,
  serial_number TEXT,
  manufacturer TEXT,
  calibration_status TEXT NOT NULL DEFAULT 'VALID'
    CHECK (test_equipment.calibration_status IN (${CALIBRATION_STATUSES})),
  last_calibration_at TEXT,
  next_calibration_at TEXT,
  notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_te_org ON test_equipment(org_id);

CREATE TABLE IF NOT EXISTS calibration_records (
  ${BASE_COLS("calibration_records")},
  equipment_id TEXT NOT NULL,
  technician TEXT,
  result TEXT NOT NULL DEFAULT 'PASS' CHECK (calibration_records.result IN (${TEST_RESULTS})),
  certificate_number TEXT,
  notes TEXT,
  calibrated_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cr_org ON calibration_records(org_id);

CREATE TABLE IF NOT EXISTS ai_suggestions (
  ${BASE_COLS("ai_suggestions")},
  suggestion_type TEXT NOT NULL CHECK (ai_suggestions.suggestion_type IN (${AI_SUGGESTION_TYPES})),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (ai_suggestions.status IN (${AI_SUGGESTION_STATUSES})),
  payload TEXT NOT NULL,
  context_type TEXT,
  context_id TEXT,
  accepted_at TEXT,
  rejected_at TEXT,
  model_version TEXT
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
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'SYNCED' ${SYNC_STATUS_CHECK("hubspot_object_cache.sync_status")}
);
CREATE INDEX IF NOT EXISTS idx_hoc_org ON hubspot_object_cache(org_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_hoc_obj ON hubspot_object_cache(org_id, object_type, object_id);

CREATE TABLE IF NOT EXISTS integration_connections (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (integration_connections.provider IN (${INTEGRATION_PROVIDERS})),
  status TEXT NOT NULL DEFAULT 'INACTIVE'
    CHECK (integration_connections.status IN (${INTEGRATION_STATUSES})),
  config TEXT,
  error_message TEXT,
  last_sync_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'SYNCED' ${SYNC_STATUS_CHECK("integration_connections.sync_status")}
);
CREATE INDEX IF NOT EXISTS idx_ic_org ON integration_connections(org_id);

CREATE TABLE IF NOT EXISTS sync_outbox_items (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (sync_outbox_items.operation IN (${OPERATIONS})),
  payload TEXT NOT NULL,
  target_provider TEXT CHECK (sync_outbox_items.target_provider IS NULL OR sync_outbox_items.target_provider IN (${OUTBOX_PROVIDERS})),
  client_uuid TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' ${SYNC_STATUS_CHECK("sync_outbox_items.status")},
  sync_status TEXT NOT NULL DEFAULT 'SYNCED' ${SYNC_STATUS_CHECK("sync_outbox_items.sync_status")},
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TEXT,
  error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_soi_org ON sync_outbox_items(org_id);
CREATE INDEX IF NOT EXISTS idx_soi_status ON sync_outbox_items(org_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_soi_cuuid ON sync_outbox_items(client_uuid);

CREATE TABLE IF NOT EXISTS app_users (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  external_id TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (app_users.provider IN (${AUTH_PROVIDERS})),
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'INSPECTOR' CHECK (app_users.role IN (${USER_ROLES})),
  avatar_url TEXT,
  last_login_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'SYNCED' ${SYNC_STATUS_CHECK("app_users.sync_status")}
);
CREATE INDEX IF NOT EXISTS idx_au_org ON app_users(org_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_au_ext ON app_users(external_id, provider);

CREATE TABLE IF NOT EXISTS auth_provider_configs (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (auth_provider_configs.provider IN (${AUTH_PROVIDERS})),
  client_id TEXT NOT NULL,
  tenant_id TEXT,
  scopes TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'SYNCED' ${SYNC_STATUS_CHECK("auth_provider_configs.sync_status")}
);
CREATE INDEX IF NOT EXISTS idx_apc_org ON auth_provider_configs(org_id);
`;

async function initDatabase(): Promise<ReturnType<typeof drizzle>> {
  const sqlite = SQLite.openDatabaseSync(DB_NAME);
  await sqlite.execAsync(CREATE_TABLES_SQL);
  return drizzle(sqlite, { schema });
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
