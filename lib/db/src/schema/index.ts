import {
  boolean,
  doublePrecision,
  integer,
  pgTable,
  text,
} from "drizzle-orm/pg-core";

function syncStatusCol() {
  return text("sync_status").notNull().default("SYNCED");
}

function baseColumns() {
  return {
    id: text("id").primaryKey(),
    org_id: text("org_id").notNull(),
    created_at: text("created_at").notNull(),
    updated_at: text("updated_at").notNull(),
    sync_status: syncStatusCol(),
  };
}

export const complianceStandards = pgTable("compliance_standards", {
  ...baseColumns(),
  name: text("name").notNull(),
  code: text("code").notNull(),
  authority: text("authority").notNull(),
  system_type: text("system_type").notNull(),
  version: text("version").notNull(),
  description: text("description"),
  effective_date: text("effective_date"),
});
export type ComplianceStandard = typeof complianceStandards.$inferSelect;
export type NewComplianceStandard = typeof complianceStandards.$inferInsert;

export const assetComplianceLinks = pgTable("asset_compliance_links", {
  ...baseColumns(),
  hubspot_asset_id: text("hubspot_asset_id").notNull(),
  compliance_standard_id: text("compliance_standard_id").notNull(),
  compliance_status: text("compliance_status").notNull().default("PENDING"),
  last_inspection_at: text("last_inspection_at"),
  next_inspection_at: text("next_inspection_at"),
  notes: text("notes"),
});
export type AssetComplianceLink = typeof assetComplianceLinks.$inferSelect;
export type NewAssetComplianceLink = typeof assetComplianceLinks.$inferInsert;

export const inspectionSeries = pgTable("inspection_series", {
  ...baseColumns(),
  name: text("name").notNull(),
  hubspot_asset_id: text("hubspot_asset_id").notNull(),
  system_type: text("system_type").notNull(),
  frequency_days: integer("frequency_days").notNull(),
  generation_horizon_days: integer("generation_horizon_days").notNull().default(180),
  starts_at: text("starts_at").notNull(),
  ends_at: text("ends_at"),
  hubspot_service_team_id: text("hubspot_service_team_id"),
  is_booked: boolean("is_booked").notNull().default(false),
  contracted_amount: doublePrecision("contracted_amount"),
  notes: text("notes"),
});
export type InspectionSeries = typeof inspectionSeries.$inferSelect;
export type NewInspectionSeries = typeof inspectionSeries.$inferInsert;

export const inspectionSchedules = pgTable("inspection_schedules", {
  ...baseColumns(),
  series_id: text("series_id").notNull(),
  hubspot_asset_id: text("hubspot_asset_id").notNull(),
  scheduled_date: text("scheduled_date").notNull(),
  status: text("status").notNull().default("DRAFT"),
  hubspot_inspection_ticket_id: text("hubspot_inspection_ticket_id"),
  rescheduled_from: text("rescheduled_from"),
  notes: text("notes"),
});
export type InspectionSchedule = typeof inspectionSchedules.$inferSelect;
export type NewInspectionSchedule = typeof inspectionSchedules.$inferInsert;

export const inspectionForms = pgTable("inspection_forms", {
  ...baseColumns(),
  name: text("name").notNull(),
  system_type: text("system_type").notNull(),
  version: text("version").notNull().default("1.0"),
  form_schema: text("form_schema").notNull(),
  is_active: boolean("is_active").notNull().default(false),
  ai_generated: boolean("ai_generated").notNull().default(false),
  deficiency_triggers: text("deficiency_triggers"),
  compliance_standard_id: text("compliance_standard_id"),
});
export type InspectionForm = typeof inspectionForms.$inferSelect;
export type NewInspectionForm = typeof inspectionForms.$inferInsert;

export const inspectionResults = pgTable("inspection_results", {
  ...baseColumns(),
  schedule_id: text("schedule_id"),
  form_id: text("form_id").notNull(),
  inspector_id: text("inspector_id").notNull(),
  hubspot_asset_id: text("hubspot_asset_id").notNull(),
  status: text("status").notNull().default("DRAFT"),
  form_data: text("form_data").notNull().default("{}"),
  gps_lat: doublePrecision("gps_lat"),
  gps_lng: doublePrecision("gps_lng"),
  photo_urls: text("photo_urls"),
  signature_url: text("signature_url"),
  started_at: text("started_at"),
  submitted_at: text("submitted_at"),
  client_uuid: text("client_uuid").notNull(),
  hubspot_deficiency_ticket_id: text("hubspot_deficiency_ticket_id"),
  qa_status: text("qa_status"),
  qa_reviewer_id: text("qa_reviewer_id"),
  qa_reviewed_at: text("qa_reviewed_at"),
  qa_notes: text("qa_notes"),
});
export type InspectionResult = typeof inspectionResults.$inferSelect;
export type NewInspectionResult = typeof inspectionResults.$inferInsert;

export const inspectionReports = pgTable("inspection_reports", {
  ...baseColumns(),
  result_id: text("result_id").notNull(),
  status: text("status").notNull().default("DRAFT"),
  pdf_url: text("pdf_url"),
  hubspot_customer_id: text("hubspot_customer_id"),
  sent_at: text("sent_at"),
  report_config: text("report_config"),
  title: text("title"),
});
export type InspectionReport = typeof inspectionReports.$inferSelect;
export type NewInspectionReport = typeof inspectionReports.$inferInsert;

export const inspectionReportItems = pgTable("inspection_report_items", {
  ...baseColumns(),
  report_id: text("report_id").notNull(),
  item_type: text("item_type").notNull(),
  content: text("content").notNull(),
  sort_order: integer("sort_order").notNull().default(0),
  is_visible: boolean("is_visible").notNull().default(true),
});
export type InspectionReportItem = typeof inspectionReportItems.$inferSelect;
export type NewInspectionReportItem = typeof inspectionReportItems.$inferInsert;

export const systemTests = pgTable("system_tests", {
  ...baseColumns(),
  hubspot_asset_id: text("hubspot_asset_id").notNull(),
  compliance_standard_id: text("compliance_standard_id"),
  inspector_id: text("inspector_id").notNull(),
  test_type: text("test_type").notNull(),
  result: text("result").notNull(),
  readings: text("readings"),
  notes: text("notes"),
  tested_at: text("tested_at").notNull(),
  hubspot_work_order_ticket_id: text("hubspot_work_order_ticket_id"),
});
export type SystemTest = typeof systemTests.$inferSelect;
export type NewSystemTest = typeof systemTests.$inferInsert;

export const maintenanceRecords = pgTable("maintenance_records", {
  ...baseColumns(),
  hubspot_asset_id: text("hubspot_asset_id").notNull(),
  maintenance_type: text("maintenance_type").notNull(),
  status: text("status").notNull().default("SCHEDULED"),
  description: text("description"),
  technician_id: text("technician_id"),
  connecteam_shift_id: text("connecteam_shift_id"),
  hubspot_work_order_ticket_id: text("hubspot_work_order_ticket_id"),
  scheduled_at: text("scheduled_at"),
  completed_at: text("completed_at"),
  next_maintenance_at: text("next_maintenance_at"),
  cost: doublePrecision("cost"),
  notes: text("notes"),
});
export type MaintenanceRecord = typeof maintenanceRecords.$inferSelect;
export type NewMaintenanceRecord = typeof maintenanceRecords.$inferInsert;

export const testEquipment = pgTable("test_equipment", {
  ...baseColumns(),
  name: text("name").notNull(),
  model: text("model"),
  serial_number: text("serial_number"),
  manufacturer: text("manufacturer"),
  calibration_status: text("calibration_status").notNull().default("VALID"),
  last_calibration_at: text("last_calibration_at"),
  next_calibration_at: text("next_calibration_at"),
  notes: text("notes"),
});
export type TestEquipment = typeof testEquipment.$inferSelect;
export type NewTestEquipment = typeof testEquipment.$inferInsert;

export const calibrationRecords = pgTable("calibration_records", {
  ...baseColumns(),
  equipment_id: text("equipment_id").notNull(),
  technician: text("technician"),
  result: text("result").notNull().default("PASS"),
  certificate_number: text("certificate_number"),
  notes: text("notes"),
  calibrated_at: text("calibrated_at").notNull(),
  expires_at: text("expires_at").notNull(),
});
export type CalibrationRecord = typeof calibrationRecords.$inferSelect;
export type NewCalibrationRecord = typeof calibrationRecords.$inferInsert;

export const aiSuggestions = pgTable("ai_suggestions", {
  ...baseColumns(),
  suggestion_type: text("suggestion_type").notNull(),
  status: text("status").notNull().default("PENDING"),
  payload: text("payload").notNull(),
  context_type: text("context_type"),
  context_id: text("context_id"),
  accepted_at: text("accepted_at"),
  rejected_at: text("rejected_at"),
  model_version: text("model_version"),
});
export type AiSuggestion = typeof aiSuggestions.$inferSelect;
export type NewAiSuggestion = typeof aiSuggestions.$inferInsert;

export const hubspotObjectCache = pgTable("hubspot_object_cache", {
  id: text("id").primaryKey(),
  org_id: text("org_id").notNull(),
  object_type: text("object_type").notNull(),
  object_id: text("object_id").notNull(),
  payload: text("payload").notNull(),
  fetched_at: text("fetched_at").notNull(),
  expires_at: text("expires_at").notNull(),
  created_at: text("created_at").notNull(),
  updated_at: text("updated_at").notNull(),
  sync_status: syncStatusCol(),
});
export type HubspotObjectCache = typeof hubspotObjectCache.$inferSelect;
export type NewHubspotObjectCache = typeof hubspotObjectCache.$inferInsert;

export const integrationConnections = pgTable("integration_connections", {
  id: text("id").primaryKey(),
  org_id: text("org_id").notNull(),
  provider: text("provider").notNull(),
  status: text("status").notNull().default("INACTIVE"),
  config: text("config"),
  error_message: text("error_message"),
  last_sync_at: text("last_sync_at"),
  created_at: text("created_at").notNull(),
  updated_at: text("updated_at").notNull(),
  sync_status: syncStatusCol(),
});
export type IntegrationConnection = typeof integrationConnections.$inferSelect;
export type NewIntegrationConnection = typeof integrationConnections.$inferInsert;

export const syncOutboxItems = pgTable("sync_outbox_items", {
  id: text("id").primaryKey(),
  org_id: text("org_id").notNull(),
  entity_type: text("entity_type").notNull(),
  entity_id: text("entity_id").notNull(),
  operation: text("operation").notNull(),
  payload: text("payload").notNull(),
  target_provider: text("target_provider"),
  client_uuid: text("client_uuid").notNull(),
  status: text("status").notNull().default("PENDING"),
  sync_status: text("sync_status").notNull().default("SYNCED"),
  attempts: integer("attempts").notNull().default(0),
  last_attempt_at: text("last_attempt_at"),
  error: text("error"),
  created_at: text("created_at").notNull(),
  updated_at: text("updated_at").notNull(),
});
export type SyncOutboxItem = typeof syncOutboxItems.$inferSelect;
export type NewSyncOutboxItem = typeof syncOutboxItems.$inferInsert;

export const appUsers = pgTable("app_users", {
  id: text("id").primaryKey(),
  org_id: text("org_id").notNull(),
  external_id: text("external_id").notNull(),
  provider: text("provider").notNull(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("INSPECTOR"),
  avatar_url: text("avatar_url"),
  last_login_at: text("last_login_at"),
  created_at: text("created_at").notNull(),
  updated_at: text("updated_at").notNull(),
  sync_status: syncStatusCol(),
});
export type AppUser = typeof appUsers.$inferSelect;
export type NewAppUser = typeof appUsers.$inferInsert;

export const authProviderConfigs = pgTable("auth_provider_configs", {
  id: text("id").primaryKey(),
  org_id: text("org_id").notNull(),
  provider: text("provider").notNull(),
  client_id: text("client_id").notNull(),
  tenant_id: text("tenant_id"),
  scopes: text("scopes").notNull(),
  is_active: boolean("is_active").notNull().default(true),
  created_at: text("created_at").notNull(),
  updated_at: text("updated_at").notNull(),
  sync_status: syncStatusCol(),
});
export type AuthProviderConfig = typeof authProviderConfigs.$inferSelect;
export type NewAuthProviderConfig = typeof authProviderConfigs.$inferInsert;
