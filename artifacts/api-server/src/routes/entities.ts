import { Router, type IRouter } from "express";
import { and, eq, getTableColumns } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import {
  db,
  aiSuggestions,
  appUsers,
  assetComplianceLinks,
  authProviderConfigs,
  calibrationRecords,
  complianceStandards,
  hubspotObjectCache,
  inspectionForms,
  inspectionReportItems,
  inspectionReports,
  inspectionResults,
  inspectionSchedules,
  inspectionContracts,
  integrationConnections,
  maintenanceRecords,
  syncOutboxItems,
  systemTests,
  testEquipment,
} from "@workspace/db";

const router: IRouter = Router();

// Allowlist of entity types the generic API may touch. Keys are the
// canonical snake_case table names used by both the web client and the
// device sync outbox.
const TABLES: Record<string, PgTable> = {
  compliance_standards: complianceStandards,
  asset_compliance_links: assetComplianceLinks,
  inspection_contracts: inspectionContracts,
  inspection_schedules: inspectionSchedules,
  inspection_forms: inspectionForms,
  inspection_results: inspectionResults,
  inspection_reports: inspectionReports,
  inspection_report_items: inspectionReportItems,
  system_tests: systemTests,
  maintenance_records: maintenanceRecords,
  test_equipment: testEquipment,
  calibration_records: calibrationRecords,
  ai_suggestions: aiSuggestions,
  hubspot_object_cache: hubspotObjectCache,
  integration_connections: integrationConnections,
  sync_outbox_items: syncOutboxItems,
  app_users: appUsers,
  auth_provider_configs: authProviderConfigs,
};

function resolveTable(type: string): PgTable | null {
  return TABLES[type] ?? null;
}

// Keep only keys that correspond to real columns on the table.
function pickColumns(
  table: PgTable,
  row: Record<string, unknown>,
): Record<string, unknown> {
  const cols = getTableColumns(table);
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(cols)) {
    if (key in row && row[key] !== undefined) out[key] = row[key];
  }
  return out;
}

// GET /api/itm/entities/:type?org_id=  -> { data: rows[] }
router.get("/itm/entities/:type", async (req, res) => {
  const table = resolveTable(req.params.type);
  if (!table) {
    res.status(404).json({ error: `unknown entity type: ${req.params.type}` });
    return;
  }
  const orgId = req.query.org_id;
  if (typeof orgId !== "string" || orgId.length === 0) {
    res.status(400).json({ error: "org_id query param is required" });
    return;
  }
  try {
    const cols = getTableColumns(table);
    const rows = await db.select().from(table).where(eq(cols.org_id, orgId));
    res.json({ data: rows });
  } catch (err) {
    req.log.error({ err }, "entity list failed");
    res.status(500).json({ error: "failed to list entities" });
  }
});

// POST /api/itm/entities/:type  body: row | row[]  -> { data: rows[] }
// Upserts on primary key (id). Used by both web writes and device sync push.
router.post("/itm/entities/:type", async (req, res) => {
  const table = resolveTable(req.params.type);
  if (!table) {
    res.status(404).json({ error: `unknown entity type: ${req.params.type}` });
    return;
  }
  const cols = getTableColumns(table);
  const body = req.body as unknown;
  const incoming = Array.isArray(body) ? body : [body];
  if (incoming.length === 0) {
    res.json({ data: [] });
    return;
  }
  for (const raw of incoming) {
    if (!raw || typeof raw !== "object") {
      res.status(400).json({ error: "each row must be an object" });
      return;
    }
    const row = raw as Record<string, unknown>;
    if (typeof row.id !== "string" || row.id.length === 0) {
      res.status(400).json({ error: "each row requires a string id" });
      return;
    }
    if (typeof row.org_id !== "string" || row.org_id.length === 0) {
      res.status(400).json({ error: "each row requires a string org_id" });
      return;
    }
  }
  try {
    const saved: unknown[] = [];
    for (const raw of incoming) {
      const values = pickColumns(table, raw as Record<string, unknown>);
      const rowOrgId = values.org_id as string;
      const setValues = { ...values };
      // id, org_id, and created_at are immutable on update: an upsert must never
      // be able to move a row to a different org or rewrite its identity.
      delete setValues.id;
      delete setValues.org_id;
      delete setValues.created_at;
      const [out] = await db
        .insert(table)
        .values(values as never)
        .onConflictDoUpdate({
          target: cols.id,
          set: setValues,
          // Only update the existing row if it belongs to the same org. This
          // blocks cross-tenant overwrite when a caller supplies a known id.
          where: eq(cols.org_id, rowOrgId),
        })
        .returning();
      // out is undefined when the conflict row belongs to another org (where
      // clause blocked the update). Skip those rather than returning null rows.
      if (out) saved.push(out);
    }
    res.json({ data: saved });
  } catch (err) {
    req.log.error({ err }, "entity upsert failed");
    res.status(500).json({ error: "failed to save entity" });
  }
});

// DELETE /api/itm/entities/:type/:id?org_id=  -> { ok: true }
router.delete("/itm/entities/:type/:id", async (req, res) => {
  const table = resolveTable(req.params.type);
  if (!table) {
    res.status(404).json({ error: `unknown entity type: ${req.params.type}` });
    return;
  }
  const orgId = req.query.org_id;
  if (typeof orgId !== "string" || orgId.length === 0) {
    res.status(400).json({ error: "org_id query param is required" });
    return;
  }
  try {
    const cols = getTableColumns(table);
    await db
      .delete(table)
      .where(and(eq(cols.id, req.params.id), eq(cols.org_id, orgId)));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "entity delete failed");
    res.status(500).json({ error: "failed to delete entity" });
  }
});

export default router;
