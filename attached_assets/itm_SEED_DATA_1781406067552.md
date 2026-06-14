# ITM — Seed Data

**Module ID:** `itm`
**Module #:** 20
**GitHub Label:** `module/itm`
**Version:** 1.0
**Date:** 2026-06-13
**Status:** Build-Ready

> Ready-to-paste seed records for the ITM **standalone app** (React Native / Expo) local store. The app persists ITM-native data in **SQLite via Drizzle ORM** and syncs through a thin ITM sync service.
>
> **Companion:** `itm_DATA_MODEL.md` (authoritative enums/models/API — this file must **NOT** contain schema or API specs), `itm_SCOPE.md` (master, v1.3; Section 9 is the seed matrix this file implements).
>
> **Hard boundary:** This document contains **only** seed scripts/records and brief run notes. No table definitions, no migration DDL, no endpoint contracts. The Drizzle table objects referenced below (`inspectionSeries`, `inspectionSchedule`, etc.) are defined in the app schema, not here.

---

## Architecture facts that shape this seed

- **Local-first store:** All ITM-native records are inserted into the device SQLite store through Drizzle (`await db.insert(table).values([...])`). When the standalone app later syncs to Helm/HubSpot, the same rows replay through the outbox.
- **HubSpot owns the CRM + tickets.** ITM stores only `hubspot_*_id` references on its native rows. Realistic placeholder HubSpot IDs are used throughout (`hs_customer_0001`, `hs_location_0001`, `hs_asset_0001`, `hs_inspection_ticket_0001`, `hs_deficiency_ticket_0001`, `hs_ahj_0001`). A handful of `HubspotObjectCache` rows represent the transient read-cache of those external objects.
- **Org scope:** Every row is scoped to `org_beacon_test_001`.
- **Snake_case columns** matching `itm_DATA_MODEL.md` Section 2. Timestamps use ISO-8601 strings (SQLite has no native date type; Drizzle stores them as TEXT/INTEGER per the column mode).
- **Enum coverage:** At least one row per enum state where applicable, per SCOPE Section 9.

> **Date anchor:** "today" for this seed is **2026-06-13**. Relative dates (overdue, due-soon, calibration expiry) are computed from that anchor so the dashboard renders meaningful states.

---

## Seed file structure

```
db/
├── schema.ts        # Drizzle table definitions (see itm_DATA_MODEL.md — NOT in this file)
├── client.ts        # Drizzle SQLite client (expo-sqlite / op-sqlite)
└── seed.ts          # <-- this document
```

`db/seed.ts` is organized into clearly separated sections, one per model, inserted in dependency order so foreign-key references resolve:

1. ComplianceStandard
2. InspectionForm
3. HubspotObjectCache
4. AssetComplianceLink
5. InspectionSeries
6. InspectionSchedule
7. InspectionResult
8. TestEquipment
9. CalibrationRecord
10. SystemTest
11. MaintenanceRecord
12. InspectionReport
13. InspectionReportItem
14. AiSuggestion
15. IntegrationConnection
16. SyncOutboxItem
17. AppUser
18. AuthProviderConfig

---

## `db/seed.ts`

```ts
/**
 * ITM standalone app — local SQLite seed (Drizzle ORM).
 * Module 20 (itm) • v1.0 • 2026-06-13
 *
 * Inserts realistic fire-protection test data scoped to org_beacon_test_001.
 * Run: tsx db/seed.ts   (or: npx expo run db/seed.ts in the Expo project)
 *
 * Field names are snake_case per itm_DATA_MODEL.md Section 2.
 * HubSpot objects are referenced by placeholder hs_* IDs; ITM never duplicates them.
 */

import { db } from "./client";
import {
  complianceStandard,
  inspectionForm,
  hubspotObjectCache,
  assetComplianceLink,
  inspectionSeries,
  inspectionSchedule,
  inspectionResult,
  testEquipment,
  calibrationRecord,
  systemTest,
  maintenanceRecord,
  inspectionReport,
  inspectionReportItem,
  aiSuggestion,
  integrationConnection,
  syncOutboxItem,
  appUser,
  authProviderConfig,
} from "./schema";

const ORG = "org_beacon_test_001";
const NOW = "2026-06-13T08:00:00.000Z";

// HubSpot placeholder IDs (system-of-record references — not owned by ITM) ------
const HS = {
  customer: "hs_customer_0001",
  contact: "hs_contact_0001",
  location: "hs_location_0001",
  location2: "hs_location_0002",
  ahj: "hs_ahj_0001",
  asset: {
    suppression13: "hs_asset_0001",      // wet-pipe sprinkler (NFPA 13)
    suppression13d: "hs_asset_0002",      // residential sprinkler (NFPA 13D)
    alarm: "hs_asset_0003",               // fire alarm panel (NFPA 72)
    standpipe: "hs_asset_0004",           // class I standpipe
    pump: "hs_asset_0005",                // electric fire pump
    extinguisherSet: "hs_asset_0006",     // extinguisher set (NFPA 10)
    extinguisherUnitA: "hs_asset_0007",   // nested sub-asset under the set
  },
  inspectionTicket: "hs_inspection_ticket_0001",
  deficiencyTicket: "hs_deficiency_ticket_0001",
  workorderTicket: "hs_workorder_ticket_0001",
};

async function seed() {
  console.log("Seeding ITM local store for", ORG);

  // ─────────────────────────────────────────────────────────────────────────
  // 1. ComplianceStandard (5) — NFPA-10, 13, 25, 72 + prior NFPA-72 edition
  // ─────────────────────────────────────────────────────────────────────────
  await db.insert(complianceStandard).values([
    {
      id: "cs_nfpa10",
      org_id: ORG,
      code: "NFPA-10",
      name: "Standard for Portable Fire Extinguishers",
      version: "2022",
      description: "Selection, installation, inspection, maintenance, and testing of portable fire extinguishers.",
      effective_date: "2022-01-01T00:00:00.000Z",
      url: "https://www.nfpa.org/codes-and-standards/nfpa-10",
      sync_status: "SYNCED",
      created_at: NOW,
      updated_at: NOW,
    },
    {
      id: "cs_nfpa13",
      org_id: ORG,
      code: "NFPA-13",
      name: "Standard for the Installation of Sprinkler Systems",
      version: "2022",
      description: "Design and installation requirements for automatic fire sprinkler systems.",
      effective_date: "2022-01-01T00:00:00.000Z",
      url: "https://www.nfpa.org/codes-and-standards/nfpa-13",
      sync_status: "SYNCED",
      created_at: NOW,
      updated_at: NOW,
    },
    {
      id: "cs_nfpa25",
      org_id: ORG,
      code: "NFPA-25",
      name: "Inspection, Testing, and Maintenance of Water-Based Fire Protection Systems",
      version: "2023",
      description: "ITM requirements for sprinkler, standpipe, fire pump, and water-based suppression systems.",
      effective_date: "2023-01-01T00:00:00.000Z",
      url: "https://www.nfpa.org/codes-and-standards/nfpa-25",
      sync_status: "SYNCED",
      created_at: NOW,
      updated_at: NOW,
    },
    {
      id: "cs_nfpa72_current",
      org_id: ORG,
      code: "NFPA-72",
      name: "National Fire Alarm and Signaling Code",
      version: "2022",
      description: "Application, installation, performance, and ITM of fire alarm and signaling systems.",
      effective_date: "2022-01-01T00:00:00.000Z",
      url: "https://www.nfpa.org/codes-and-standards/nfpa-72",
      sync_status: "SYNCED",
      created_at: NOW,
      updated_at: NOW,
    },
    {
      // Prior edition retained for AI code-update / version-comparison testing.
      id: "cs_nfpa72_prior",
      org_id: ORG,
      code: "NFPA-72",
      name: "National Fire Alarm and Signaling Code (prior edition)",
      version: "2019",
      description: "Superseded 2019 edition; kept to exercise code-update detection against the 2022 edition.",
      effective_date: "2019-01-01T00:00:00.000Z",
      url: "https://www.nfpa.org/codes-and-standards/nfpa-72",
      sync_status: "SYNCED",
      created_at: NOW,
      updated_at: NOW,
    },
  ]);

  // ─────────────────────────────────────────────────────────────────────────
  // 2. InspectionForm (4 active: NFPA 13/25/72/custom) + 1 inactive prior ver.
  //    One form flagged ai_generated.
  // ─────────────────────────────────────────────────────────────────────────
  await db.insert(inspectionForm).values([
    {
      id: "form_nfpa13",
      org_id: ORG,
      name: "NFPA 13 Sprinkler System Inspection",
      type: "NFPA_13",
      version: "1.0",
      form_schema: {
        sections: [
          {
            key: "control_valves",
            title: "Control Valves",
            questions: [
              { key: "cv_open", label: "All control valves open and sealed?", type: "boolean", deficient_if: false },
              { key: "cv_supervised", label: "Valves supervised?", type: "boolean", deficient_if: false },
            ],
          },
          {
            key: "gauges",
            title: "Gauges",
            questions: [{ key: "system_psi", label: "System pressure (PSI)", type: "number", unit: "psi" }],
          },
        ],
      },
      compliance_standard_id: "cs_nfpa13",
      is_active: true,
      ai_generated: false,
      sync_status: "SYNCED",
      created_at: NOW,
      updated_at: NOW,
    },
    {
      id: "form_nfpa25",
      org_id: ORG,
      name: "NFPA 25 Water-Based ITM",
      type: "NFPA_25",
      version: "2.0",
      form_schema: {
        sections: [
          {
            key: "main_drain",
            title: "Main Drain Test",
            questions: [
              { key: "static_psi", label: "Static pressure (PSI)", type: "number", unit: "psi" },
              { key: "residual_psi", label: "Residual pressure (PSI)", type: "number", unit: "psi" },
            ],
          },
          {
            key: "alarms",
            title: "Waterflow Alarms",
            questions: [{ key: "waterflow_ok", label: "Waterflow alarm operates within 90s?", type: "boolean", deficient_if: false }],
          },
        ],
      },
      compliance_standard_id: "cs_nfpa25",
      is_active: true,
      ai_generated: false,
      sync_status: "SYNCED",
      created_at: NOW,
      updated_at: NOW,
    },
    {
      id: "form_nfpa72",
      org_id: ORG,
      name: "NFPA 72 Fire Alarm Functional Test",
      type: "NFPA_72",
      version: "1.0",
      form_schema: {
        sections: [
          {
            key: "initiating",
            title: "Initiating Devices",
            questions: [
              { key: "smoke_detectors_ok", label: "All smoke detectors functional?", type: "boolean", deficient_if: false },
              { key: "pull_stations_ok", label: "All pull stations functional?", type: "boolean", deficient_if: false },
            ],
          },
          {
            key: "notification",
            title: "Notification Appliances",
            questions: [{ key: "av_ok", label: "Audible/visible appliances operate?", type: "boolean", deficient_if: false }],
          },
        ],
      },
      compliance_standard_id: "cs_nfpa72_current",
      is_active: true,
      ai_generated: true, // produced by AI form generation (FORM_GENERATION)
      sync_status: "SYNCED",
      created_at: NOW,
      updated_at: NOW,
    },
    {
      id: "form_custom_extinguisher",
      org_id: ORG,
      name: "Beacon Custom Extinguisher Walk",
      type: "CUSTOM",
      version: "1.0",
      form_schema: {
        sections: [
          {
            key: "extinguishers",
            title: "Portable Extinguishers",
            questions: [
              { key: "tag_current", label: "Service tag current?", type: "boolean", deficient_if: false },
              { key: "gauge_green", label: "Gauge in green?", type: "boolean", deficient_if: false },
              { key: "obstructed", label: "Access obstructed?", type: "boolean", deficient_if: true },
            ],
          },
        ],
      },
      compliance_standard_id: "cs_nfpa10",
      is_active: true,
      ai_generated: false,
      sync_status: "SYNCED",
      created_at: NOW,
      updated_at: NOW,
    },
    {
      // Inactive prior version of the NFPA 25 form (superseded by 2.0 above).
      id: "form_nfpa25_v1",
      org_id: ORG,
      name: "NFPA 25 Water-Based ITM",
      type: "NFPA_25",
      version: "1.0",
      form_schema: { sections: [{ key: "main_drain", title: "Main Drain Test", questions: [] }] },
      compliance_standard_id: "cs_nfpa25",
      is_active: false,
      ai_generated: false,
      sync_status: "SYNCED",
      created_at: NOW,
      updated_at: NOW,
    },
  ]);

  // ─────────────────────────────────────────────────────────────────────────
  // 3. HubspotObjectCache — transient read-cache of HubSpot objects/tickets.
  //    Customer, location, two nested assets, AHJ, 1 inspection + 1 deficiency
  //    ticket. expires_at set ~24h ahead of the date anchor.
  // ─────────────────────────────────────────────────────────────────────────
  const EXPIRES = "2026-06-14T08:00:00.000Z";
  await db.insert(hubspotObjectCache).values([
    {
      id: "hoc_customer_0001",
      org_id: ORG,
      object_type: "customer",
      hubspot_id: HS.customer,
      parent_hubspot_id: null,
      payload: { name: "Lakeside Medical Center", phone: "+1-208-555-0142", domain: "lakesidemed.example" },
      fetched_at: NOW,
      expires_at: EXPIRES,
    },
    {
      id: "hoc_location_0001",
      org_id: ORG,
      object_type: "location",
      hubspot_id: HS.location,
      parent_hubspot_id: HS.customer,
      payload: { name: "Lakeside Medical — Main Tower", address: "1200 Harbor Dr, Coeur d'Alene, ID 83814", floors: 6 },
      fetched_at: NOW,
      expires_at: EXPIRES,
    },
    {
      // Parent asset (the extinguisher set).
      id: "hoc_asset_0006",
      org_id: ORG,
      object_type: "asset",
      hubspot_id: HS.asset.extinguisherSet,
      parent_hubspot_id: HS.location,
      payload: { name: "Extinguisher Set — Main Tower", system_type: "extinguisher", status: "active", count: 24 },
      fetched_at: NOW,
      expires_at: EXPIRES,
    },
    {
      // Nested sub-asset under the extinguisher set (parent_hubspot_id = set).
      id: "hoc_asset_0007",
      org_id: ORG,
      object_type: "asset",
      hubspot_id: HS.asset.extinguisherUnitA,
      parent_hubspot_id: HS.asset.extinguisherSet,
      payload: { name: "Extinguisher Unit A — Lobby", system_type: "extinguisher", status: "active", model: "ABC 10lb" },
      fetched_at: NOW,
      expires_at: EXPIRES,
    },
    {
      id: "hoc_ahj_0001",
      org_id: ORG,
      object_type: "ahj",
      hubspot_id: HS.ahj,
      parent_hubspot_id: null,
      payload: { name: "Coeur d'Alene Fire Marshal", jurisdiction: "City of Coeur d'Alene", contact: "fire@cdaid.example" },
      fetched_at: NOW,
      expires_at: EXPIRES,
    },
    {
      id: "hoc_inspection_ticket_0001",
      org_id: ORG,
      object_type: "inspection_ticket",
      hubspot_id: HS.inspectionTicket,
      parent_hubspot_id: HS.location,
      payload: { pipeline: "inspection", stage: "scheduled", subject: "Semi-annual NFPA 25 — Main Tower" },
      fetched_at: NOW,
      expires_at: EXPIRES,
    },
    {
      id: "hoc_deficiency_ticket_0001",
      org_id: ORG,
      object_type: "deficiency_ticket",
      hubspot_id: HS.deficiencyTicket,
      parent_hubspot_id: HS.inspectionTicket,
      payload: { pipeline: "deficiency", stage: "open", subject: "Waterflow alarm failed — Main Tower", severity: "high" },
      fetched_at: NOW,
      expires_at: EXPIRES,
    },
  ]);

  // ─────────────────────────────────────────────────────────────────────────
  // 4. AssetComplianceLink — applicable standards per HubSpot asset (6 assets).
  //    suppression13 → NFPA-13 + NFPA-25; 13D → NFPA-13 + NFPA-25;
  //    alarm → NFPA-72; standpipe → NFPA-25; pump → NFPA-25;
  //    extinguisher set → NFPA-10.
  // ─────────────────────────────────────────────────────────────────────────
  await db.insert(assetComplianceLink).values([
    { id: "acl_0001", org_id: ORG, hubspot_asset_id: HS.asset.suppression13, compliance_standard_id: "cs_nfpa13", sync_status: "SYNCED", created_at: NOW, updated_at: NOW },
    { id: "acl_0002", org_id: ORG, hubspot_asset_id: HS.asset.suppression13, compliance_standard_id: "cs_nfpa25", sync_status: "SYNCED", created_at: NOW, updated_at: NOW },
    { id: "acl_0003", org_id: ORG, hubspot_asset_id: HS.asset.suppression13d, compliance_standard_id: "cs_nfpa13", sync_status: "SYNCED", created_at: NOW, updated_at: NOW },
    { id: "acl_0004", org_id: ORG, hubspot_asset_id: HS.asset.suppression13d, compliance_standard_id: "cs_nfpa25", sync_status: "SYNCED", created_at: NOW, updated_at: NOW },
    { id: "acl_0005", org_id: ORG, hubspot_asset_id: HS.asset.alarm, compliance_standard_id: "cs_nfpa72_current", sync_status: "SYNCED", created_at: NOW, updated_at: NOW },
    { id: "acl_0006", org_id: ORG, hubspot_asset_id: HS.asset.standpipe, compliance_standard_id: "cs_nfpa25", sync_status: "SYNCED", created_at: NOW, updated_at: NOW },
    { id: "acl_0007", org_id: ORG, hubspot_asset_id: HS.asset.pump, compliance_standard_id: "cs_nfpa25", sync_status: "SYNCED", created_at: NOW, updated_at: NOW },
    { id: "acl_0008", org_id: ORG, hubspot_asset_id: HS.asset.extinguisherSet, compliance_standard_id: "cs_nfpa10", sync_status: "SYNCED", created_at: NOW, updated_at: NOW },
    { id: "acl_0009", org_id: ORG, hubspot_asset_id: HS.asset.extinguisherUnitA, compliance_standard_id: "cs_nfpa10", sync_status: "SYNCED", created_at: NOW, updated_at: NOW },
  ]);

  // ─────────────────────────────────────────────────────────────────────────
  // 5. InspectionSeries (2) — one ACTIVE multi-location semi-annual, one PAUSED.
  // ─────────────────────────────────────────────────────────────────────────
  await db.insert(inspectionSeries).values([
    {
      id: "series_active_semi",
      org_id: ORG,
      name: "Lakeside Medical — Semi-Annual Water-Based ITM",
      hubspot_customer_id: HS.customer,
      frequency: "SEMI_ANNUAL",
      system_scope: { asset_types: ["suppression", "standpipe", "pump"], hubspot_asset_ids: [HS.asset.suppression13, HS.asset.standpipe, HS.asset.pump] },
      location_scope: { hubspot_location_ids: [HS.location, HS.location2] },
      status: "ACTIVE",
      start_date: "2026-01-15T00:00:00.000Z",
      end_date: null,
      contract_value: 18500.0,
      generation_horizon_days: 90,
      notes: "Multi-location semi-annual contract covering sprinkler, standpipe, and fire pump.",
      sync_status: "SYNCED",
      created_at: NOW,
      updated_at: NOW,
    },
    {
      id: "series_paused_annual",
      org_id: ORG,
      name: "Harbor Plaza — Annual Fire Alarm ITM (paused pending renewal)",
      hubspot_customer_id: HS.customer,
      frequency: "ANNUAL",
      system_scope: { asset_types: ["alarm"], hubspot_asset_ids: [HS.asset.alarm] },
      location_scope: { hubspot_location_ids: [HS.location2] },
      status: "PAUSED",
      start_date: "2025-03-01T00:00:00.000Z",
      end_date: null,
      contract_value: 6200.0,
      generation_horizon_days: 90,
      notes: "Paused while the customer renews the alarm-monitoring agreement.",
      sync_status: "SYNCED",
      created_at: NOW,
      updated_at: NOW,
    },
  ]);

  // ─────────────────────────────────────────────────────────────────────────
  // 6. InspectionSchedule (6) — due, due-soon, overdue, inactive; under and
  //    outside a series. Dates relative to the 2026-06-13 anchor.
  // ─────────────────────────────────────────────────────────────────────────
  await db.insert(inspectionSchedule).values([
    {
      // DUE today, under the active series.
      id: "sched_due",
      org_id: ORG,
      series_id: "series_active_semi",
      hubspot_location_id: HS.location,
      hubspot_asset_id: HS.asset.suppression13,
      inspection_form_id: "form_nfpa25",
      frequency: "SEMI_ANNUAL",
      next_due_date: "2026-06-13T00:00:00.000Z",
      last_inspection: "2025-12-13T00:00:00.000Z",
      is_active: true,
      notes: "Due today — semi-annual sprinkler ITM.",
      sync_status: "SYNCED",
      created_at: NOW,
      updated_at: NOW,
    },
    {
      // DUE-SOON (within ~2 weeks), under the active series.
      id: "sched_due_soon",
      org_id: ORG,
      series_id: "series_active_semi",
      hubspot_location_id: HS.location,
      hubspot_asset_id: HS.asset.standpipe,
      inspection_form_id: "form_nfpa25",
      frequency: "SEMI_ANNUAL",
      next_due_date: "2026-06-25T00:00:00.000Z",
      last_inspection: "2025-12-25T00:00:00.000Z",
      is_active: true,
      notes: "Standpipe flow test due soon.",
      sync_status: "SYNCED",
      created_at: NOW,
      updated_at: NOW,
    },
    {
      // OVERDUE, under the active series.
      id: "sched_overdue",
      org_id: ORG,
      series_id: "series_active_semi",
      hubspot_location_id: HS.location2,
      hubspot_asset_id: HS.asset.pump,
      inspection_form_id: "form_nfpa25",
      frequency: "SEMI_ANNUAL",
      next_due_date: "2026-05-10T00:00:00.000Z",
      last_inspection: "2025-11-10T00:00:00.000Z",
      is_active: true,
      notes: "Fire pump churn test OVERDUE since mid-May.",
      sync_status: "PENDING_SYNC",
      created_at: NOW,
      updated_at: NOW,
    },
    {
      // INACTIVE schedule (paused/retired), under the paused series.
      id: "sched_inactive",
      org_id: ORG,
      series_id: "series_paused_annual",
      hubspot_location_id: HS.location2,
      hubspot_asset_id: HS.asset.alarm,
      inspection_form_id: "form_nfpa72",
      frequency: "ANNUAL",
      next_due_date: "2026-09-01T00:00:00.000Z",
      last_inspection: "2025-09-01T00:00:00.000Z",
      is_active: false,
      notes: "Inactive — series paused pending renewal.",
      sync_status: "SYNCED",
      created_at: NOW,
      updated_at: NOW,
    },
    {
      // Standalone schedule (series_id null) — extinguisher walk, due-soon.
      id: "sched_standalone_ext",
      org_id: ORG,
      series_id: null,
      hubspot_location_id: HS.location,
      hubspot_asset_id: HS.asset.extinguisherSet,
      inspection_form_id: "form_custom_extinguisher",
      frequency: "MONTHLY",
      next_due_date: "2026-06-20T00:00:00.000Z",
      last_inspection: "2026-05-20T00:00:00.000Z",
      is_active: true,
      notes: "Standalone monthly extinguisher walk (no series).",
      sync_status: "SYNCED",
      created_at: NOW,
      updated_at: NOW,
    },
    {
      // Standalone schedule (series_id null) — 13D residential, annual, future.
      id: "sched_standalone_13d",
      org_id: ORG,
      series_id: null,
      hubspot_location_id: HS.location,
      hubspot_asset_id: HS.asset.suppression13d,
      inspection_form_id: "form_nfpa13",
      frequency: "ANNUAL",
      next_due_date: "2027-01-15T00:00:00.000Z",
      last_inspection: "2026-01-15T00:00:00.000Z",
      is_active: true,
      notes: "Standalone annual 13D residential sprinkler check.",
      sync_status: "SYNCED",
      created_at: NOW,
      updated_at: NOW,
    },
  ]);

  // ─────────────────────────────────────────────────────────────────────────
  // 7. InspectionResult (5) — SCHEDULED, IN_PROGRESS, COMPLETED-passed,
  //    COMPLETED-failed, COMPLETED-awaiting-QA. Varied sync_status incl.
  //    PENDING_SYNC and SYNCED. Each carries a client_uuid for offline idem.
  // ─────────────────────────────────────────────────────────────────────────
  await db.insert(inspectionResult).values([
    {
      // SCHEDULED — not yet started; keyed to the cached HubSpot inspection ticket.
      id: "result_scheduled",
      org_id: ORG,
      hubspot_inspection_ticket_id: HS.inspectionTicket,
      inspection_schedule_id: "sched_due",
      series_id: "series_active_semi",
      hubspot_asset_id: HS.asset.suppression13,
      hubspot_location_id: HS.location,
      inspection_form_id: "form_nfpa25",
      inspection_date: "2026-06-13T00:00:00.000Z",
      inspector_name: "Marco Reyes",
      inspector_user_id: "appuser_inspector",
      status: "SCHEDULED",
      passed: null,
      form_data: null,
      photo_urls: null,
      signature_inspector: null,
      signature_representative: null,
      gps_lat: null,
      gps_lng: null,
      qa_status: "NOT_REQUIRED",
      qa_reviewed_by: null,
      qa_reviewed_at: null,
      client_uuid: "cuuid-result-0001",
      sync_status: "SYNCED",
      created_at: NOW,
      updated_at: NOW,
    },
    {
      // IN_PROGRESS — partially filled, offline, not yet synced.
      id: "result_in_progress",
      org_id: ORG,
      hubspot_inspection_ticket_id: null,
      inspection_schedule_id: "sched_due_soon",
      series_id: "series_active_semi",
      hubspot_asset_id: HS.asset.standpipe,
      hubspot_location_id: HS.location,
      inspection_form_id: "form_nfpa25",
      inspection_date: "2026-06-13T00:00:00.000Z",
      inspector_name: "Marco Reyes",
      inspector_user_id: "appuser_inspector",
      status: "IN_PROGRESS",
      passed: null,
      form_data: { main_drain: { static_psi: 142 } },
      photo_urls: null,
      signature_inspector: null,
      signature_representative: null,
      gps_lat: 47.6777,
      gps_lng: -116.7805,
      qa_status: "NOT_REQUIRED",
      qa_reviewed_by: null,
      qa_reviewed_at: null,
      client_uuid: "cuuid-result-0002",
      sync_status: "LOCAL_ONLY",
      created_at: NOW,
      updated_at: NOW,
    },
    {
      // COMPLETED — passed, QA approved, synced.
      id: "result_completed_pass",
      org_id: ORG,
      hubspot_inspection_ticket_id: "hs_inspection_ticket_0002",
      inspection_schedule_id: "sched_standalone_13d",
      series_id: null,
      hubspot_asset_id: HS.asset.suppression13d,
      hubspot_location_id: HS.location,
      inspection_form_id: "form_nfpa13",
      inspection_date: "2026-01-15T00:00:00.000Z",
      inspector_name: "Marco Reyes",
      inspector_user_id: "appuser_inspector",
      status: "COMPLETED",
      passed: true,
      form_data: { control_valves: { cv_open: true, cv_supervised: true }, gauges: { system_psi: 165 } },
      photo_urls: ["file://itm/photos/result_pass_1.jpg"],
      signature_inspector: "file://itm/sig/marco.png",
      signature_representative: "file://itm/sig/rep_kowalski.png",
      gps_lat: 47.6779,
      gps_lng: -116.7801,
      qa_status: "APPROVED",
      qa_reviewed_by: "appuser_coordinator",
      qa_reviewed_at: "2026-01-16T15:00:00.000Z",
      client_uuid: "cuuid-result-0003",
      sync_status: "SYNCED",
      created_at: "2026-01-15T00:00:00.000Z",
      updated_at: NOW,
    },
    {
      // COMPLETED — failed; deficient waterflow answer enqueues a HubSpot
      // deficiency ticket (see SyncOutboxItem + deficiency cache row).
      id: "result_completed_fail",
      org_id: ORG,
      hubspot_inspection_ticket_id: HS.inspectionTicket,
      inspection_schedule_id: "sched_due",
      series_id: "series_active_semi",
      hubspot_asset_id: HS.asset.suppression13,
      hubspot_location_id: HS.location,
      inspection_form_id: "form_nfpa25",
      inspection_date: "2026-06-12T00:00:00.000Z",
      inspector_name: "Marco Reyes",
      inspector_user_id: "appuser_inspector",
      status: "COMPLETED",
      passed: false,
      form_data: { main_drain: { static_psi: 138, residual_psi: 96 }, alarms: { waterflow_ok: false } },
      photo_urls: ["file://itm/photos/result_fail_waterflow.jpg"],
      signature_inspector: "file://itm/sig/marco.png",
      signature_representative: null,
      gps_lat: 47.6781,
      gps_lng: -116.7799,
      qa_status: "PENDING",
      qa_reviewed_by: null,
      qa_reviewed_at: null,
      client_uuid: "cuuid-result-0004",
      sync_status: "PENDING_SYNC",
      created_at: "2026-06-12T00:00:00.000Z",
      updated_at: NOW,
    },
    {
      // COMPLETED — awaiting QA (qa_status PENDING), synced result.
      id: "result_awaiting_qa",
      org_id: ORG,
      hubspot_inspection_ticket_id: "hs_inspection_ticket_0003",
      inspection_schedule_id: "sched_standalone_ext",
      series_id: null,
      hubspot_asset_id: HS.asset.extinguisherSet,
      hubspot_location_id: HS.location,
      inspection_form_id: "form_custom_extinguisher",
      inspection_date: "2026-05-20T00:00:00.000Z",
      inspector_name: "Marco Reyes",
      inspector_user_id: "appuser_inspector",
      status: "COMPLETED",
      passed: true,
      form_data: { extinguishers: { tag_current: true, gauge_green: true, obstructed: false } },
      photo_urls: ["file://itm/photos/result_ext_set.jpg"],
      signature_inspector: "file://itm/sig/marco.png",
      signature_representative: "file://itm/sig/rep_kowalski.png",
      gps_lat: 47.6779,
      gps_lng: -116.7802,
      qa_status: "PENDING",
      qa_reviewed_by: null,
      qa_reviewed_at: null,
      client_uuid: "cuuid-result-0005",
      sync_status: "SYNCED",
      created_at: "2026-05-20T00:00:00.000Z",
      updated_at: NOW,
    },
  ]);

  // ─────────────────────────────────────────────────────────────────────────
  // 8. TestEquipment (3) — feeds the three calibration states below.
  // ─────────────────────────────────────────────────────────────────────────
  await db.insert(testEquipment).values([
    {
      id: "equip_gauge",
      org_id: ORG,
      name: "Ashcroft Test Gauge 0-300 PSI",
      serial_number: "AG-300-7781",
      equipment_type: "gauge",
      status: "ACTIVE",
      calibration_due: "2027-02-01T00:00:00.000Z",
      calibration_status: "VALID",
      notes: "Primary pressure gauge for main drain tests.",
      sync_status: "SYNCED",
      created_at: NOW,
      updated_at: NOW,
    },
    {
      id: "equip_flowmeter",
      org_id: ORG,
      name: "Pitot Flow Meter",
      serial_number: "FM-PT-2210",
      equipment_type: "flow_meter",
      status: "ACTIVE",
      calibration_due: "2026-07-05T00:00:00.000Z",
      calibration_status: "DUE_SOON",
      notes: "Used for standpipe and pump flow tests.",
      sync_status: "SYNCED",
      created_at: NOW,
      updated_at: NOW,
    },
    {
      id: "equip_soundmeter",
      org_id: ORG,
      name: "Decibel Sound Level Meter",
      serial_number: "SM-DB-0098",
      equipment_type: "sound_meter",
      status: "OUT_FOR_CALIBRATION",
      calibration_due: "2026-04-01T00:00:00.000Z",
      calibration_status: "EXPIRED",
      notes: "Out for recalibration — alarm dB readings on hold.",
      sync_status: "SYNCED",
      created_at: NOW,
      updated_at: NOW,
    },
  ]);

  // ─────────────────────────────────────────────────────────────────────────
  // 9. CalibrationRecord (3) — VALID, DUE_SOON, EXPIRED states per instrument.
  // ─────────────────────────────────────────────────────────────────────────
  await db.insert(calibrationRecord).values([
    {
      id: "cal_gauge_valid",
      org_id: ORG,
      test_equipment_id: "equip_gauge",
      calibration_date: "2026-02-01T00:00:00.000Z",
      next_due_date: "2027-02-01T00:00:00.000Z",
      performed_by: "Cascade Calibration Lab",
      certificate_url: "file://itm/certs/gauge_2026.pdf",
      passed: true,
      notes: "Annual calibration — within tolerance.",
      sync_status: "SYNCED",
      created_at: NOW,
      updated_at: NOW,
    },
    {
      id: "cal_flow_due_soon",
      org_id: ORG,
      test_equipment_id: "equip_flowmeter",
      calibration_date: "2025-07-05T00:00:00.000Z",
      next_due_date: "2026-07-05T00:00:00.000Z",
      performed_by: "Cascade Calibration Lab",
      certificate_url: "file://itm/certs/flowmeter_2025.pdf",
      passed: true,
      notes: "Due for recalibration in ~3 weeks.",
      sync_status: "SYNCED",
      created_at: NOW,
      updated_at: NOW,
    },
    {
      id: "cal_sound_expired",
      org_id: ORG,
      test_equipment_id: "equip_soundmeter",
      calibration_date: "2025-04-01T00:00:00.000Z",
      next_due_date: "2026-04-01T00:00:00.000Z",
      performed_by: "Cascade Calibration Lab",
      certificate_url: "file://itm/certs/soundmeter_2025.pdf",
      passed: true,
      notes: "Calibration EXPIRED 2026-04-01 — instrument pulled from service.",
      sync_status: "SYNCED",
      created_at: NOW,
      updated_at: NOW,
    },
  ]);

  // ─────────────────────────────────────────────────────────────────────────
  // 10. SystemTest (4) — hydrostatic pass, flow pass, alarm fail, pump_curve.
  //     Tied to test equipment + a compliance standard. client_uuid for idem.
  // ─────────────────────────────────────────────────────────────────────────
  await db.insert(systemTest).values([
    {
      id: "test_hydro_pass",
      org_id: ORG,
      hubspot_asset_id: HS.asset.standpipe,
      test_type: "HYDROSTATIC",
      test_date: "2026-05-30T00:00:00.000Z",
      performed_by: "Marco Reyes",
      passed: true,
      results: { test_psi: 200, hold_minutes: 120, pressure_drop_psi: 0 },
      notes: "Standpipe hydrostatic test held 200 PSI for 2 hours, no drop.",
      report_url: "file://itm/tests/hydro_standpipe.pdf",
      test_equipment_id: "equip_gauge",
      compliance_standard_id: "cs_nfpa25",
      client_uuid: "cuuid-test-0001",
      sync_status: "SYNCED",
      created_at: NOW,
      updated_at: NOW,
    },
    {
      id: "test_flow_pass",
      org_id: ORG,
      hubspot_asset_id: HS.asset.standpipe,
      test_type: "FLOW",
      test_date: "2026-05-30T00:00:00.000Z",
      performed_by: "Marco Reyes",
      passed: true,
      results: { static_psi: 142, residual_psi: 98, flow_gpm: 500 },
      notes: "Standpipe flow test met required residual pressure at 500 GPM.",
      report_url: "file://itm/tests/flow_standpipe.pdf",
      test_equipment_id: "equip_flowmeter",
      compliance_standard_id: "cs_nfpa25",
      client_uuid: "cuuid-test-0002",
      sync_status: "SYNCED",
      created_at: NOW,
      updated_at: NOW,
    },
    {
      id: "test_alarm_fail",
      org_id: ORG,
      hubspot_asset_id: HS.asset.alarm,
      test_type: "ALARM",
      test_date: "2026-06-01T00:00:00.000Z",
      performed_by: "Marco Reyes",
      passed: false,
      results: { device: "zone_3_horn_strobe", measured_db: 62, required_db: 75 },
      notes: "Zone 3 notification appliance below required dB — flagged for Service.",
      report_url: null,
      test_equipment_id: "equip_soundmeter",
      compliance_standard_id: "cs_nfpa72_current",
      client_uuid: "cuuid-test-0003",
      sync_status: "PENDING_SYNC",
      created_at: NOW,
      updated_at: NOW,
    },
    {
      id: "test_pump_curve",
      org_id: ORG,
      hubspot_asset_id: HS.asset.pump,
      test_type: "PUMP_CURVE",
      test_date: "2026-05-31T00:00:00.000Z",
      performed_by: "Marco Reyes",
      passed: true,
      results: {
        points: [
          { gpm: 0, psi: 145 },
          { gpm: 500, psi: 130 },
          { gpm: 750, psi: 118 },
          { gpm: 1000, psi: 100 },
        ],
        rated_gpm: 750,
        rated_psi: 115,
      },
      notes: "Fire pump curve within rated performance at 100% and 150% flow.",
      report_url: "file://itm/tests/pump_curve.pdf",
      test_equipment_id: "equip_gauge",
      compliance_standard_id: "cs_nfpa25",
      client_uuid: "cuuid-test-0004",
      sync_status: "SYNCED",
      created_at: NOW,
      updated_at: NOW,
    },
  ]);

  // ─────────────────────────────────────────────────────────────────────────
  // 11. MaintenanceRecord (3) — preventive, corrective, emergency.
  //     The corrective record links a Connecteam shift + HubSpot work order.
  // ─────────────────────────────────────────────────────────────────────────
  await db.insert(maintenanceRecord).values([
    {
      id: "maint_preventive",
      org_id: ORG,
      hubspot_asset_id: HS.asset.pump,
      maintenance_type: "PREVENTIVE",
      maintenance_date: "2026-04-15T00:00:00.000Z",
      performed_by: "Marco Reyes",
      description: "Quarterly fire pump PM — lubricated bearings, checked packing, ran weekly churn.",
      parts_replaced: [],
      labor_hours: 2.5,
      cost: 275.0,
      next_maintenance: "2026-07-15T00:00:00.000Z",
      notes: "All within spec.",
      hubspot_workorder_ticket_id: null,
      connecteam_shift_id: null,
      client_uuid: "cuuid-maint-0001",
      sync_status: "SYNCED",
      created_at: NOW,
      updated_at: NOW,
    },
    {
      id: "maint_corrective",
      org_id: ORG,
      hubspot_asset_id: HS.asset.suppression13,
      maintenance_type: "CORRECTIVE",
      maintenance_date: "2026-06-05T00:00:00.000Z",
      performed_by: "Dana Whitfield",
      description: "Replaced failed waterflow alarm switch found during semi-annual ITM.",
      parts_replaced: [{ part: "Potter VSR-2 waterflow switch", qty: 1 }],
      labor_hours: 1.5,
      cost: 410.0,
      next_maintenance: null,
      notes: "Corrective work dispatched from HubSpot work order via Connecteam shift.",
      hubspot_workorder_ticket_id: HS.workorderTicket,
      connecteam_shift_id: "ct_shift_55012",
      client_uuid: "cuuid-maint-0002",
      sync_status: "SYNCED",
      created_at: NOW,
      updated_at: NOW,
    },
    {
      id: "maint_emergency",
      org_id: ORG,
      hubspot_asset_id: HS.asset.standpipe,
      maintenance_type: "EMERGENCY",
      maintenance_date: "2026-03-22T00:00:00.000Z",
      performed_by: "Dana Whitfield",
      description: "Emergency repair of leaking standpipe riser coupling after freeze event.",
      parts_replaced: [{ part: "2.5in grooved coupling", qty: 2 }, { part: "EPDM gasket", qty: 2 }],
      labor_hours: 4.0,
      cost: 1180.0,
      next_maintenance: null,
      notes: "After-hours emergency call-out.",
      hubspot_workorder_ticket_id: null,
      connecteam_shift_id: null,
      client_uuid: "cuuid-maint-0003",
      sync_status: "SYNCED",
      created_at: NOW,
      updated_at: NOW,
    },
  ]);

  // ─────────────────────────────────────────────────────────────────────────
  // 12. InspectionReport (3) — DRAFT, QA_REVIEW, SENT; one DEFICIENCIES_ONLY.
  // ─────────────────────────────────────────────────────────────────────────
  await db.insert(inspectionReport).values([
    {
      id: "report_draft",
      org_id: ORG,
      title: "Lakeside Medical — Semi-Annual ITM Report (Draft)",
      hubspot_customer_id: HS.customer,
      hubspot_location_id: HS.location,
      format: "NFPA",
      filter_config: { system_types: ["suppression", "standpipe"] },
      status: "DRAFT",
      pdf_url: null,
      cover_letter: null,
      delivery_channel: null,
      sent_at: null,
      sent_to: null,
      created_by: "appuser_coordinator",
      sync_status: "LOCAL_ONLY",
      created_at: NOW,
      updated_at: NOW,
    },
    {
      id: "report_qa_review",
      org_id: ORG,
      title: "Lakeside Medical — Deficiencies Summary",
      hubspot_customer_id: HS.customer,
      hubspot_location_id: HS.location,
      format: "DEFICIENCIES_ONLY",
      filter_config: { deficiencies_only: true },
      status: "QA_REVIEW",
      pdf_url: "file://itm/reports/deficiencies_draft.pdf",
      cover_letter: "Please find attached the open deficiencies identified during the June ITM visit.",
      delivery_channel: null,
      sent_at: null,
      sent_to: null,
      created_by: "appuser_coordinator",
      sync_status: "PENDING_SYNC",
      created_at: NOW,
      updated_at: NOW,
    },
    {
      id: "report_sent",
      org_id: ORG,
      title: "Lakeside Medical — 13D Residential Sprinkler Report",
      hubspot_customer_id: HS.customer,
      hubspot_location_id: HS.location,
      format: "FULL",
      filter_config: null,
      status: "SENT",
      pdf_url: "file://itm/reports/13d_residential_final.pdf",
      cover_letter: "Your annual residential sprinkler inspection passed with no deficiencies.",
      delivery_channel: "hubspot_portal",
      sent_at: "2026-01-17T16:30:00.000Z",
      sent_to: "facilities@lakesidemed.example",
      created_by: "appuser_coordinator",
      sync_status: "SYNCED",
      created_at: "2026-01-16T00:00:00.000Z",
      updated_at: NOW,
    },
  ]);

  // ─────────────────────────────────────────────────────────────────────────
  // 13. InspectionReportItem — link reports to their source inspection results.
  // ─────────────────────────────────────────────────────────────────────────
  await db.insert(inspectionReportItem).values([
    { id: "ri_0001", org_id: ORG, inspection_report_id: "report_draft", inspection_result_id: "result_awaiting_qa", sort_order: 0, include_photos: true, created_at: NOW, updated_at: NOW },
    { id: "ri_0002", org_id: ORG, inspection_report_id: "report_qa_review", inspection_result_id: "result_completed_fail", sort_order: 0, include_photos: true, created_at: NOW, updated_at: NOW },
    { id: "ri_0003", org_id: ORG, inspection_report_id: "report_sent", inspection_result_id: "result_completed_pass", sort_order: 0, include_photos: true, created_at: NOW, updated_at: NOW },
  ]);

  // ─────────────────────────────────────────────────────────────────────────
  // 14. AiSuggestion (4) — PENDING, ACCEPTED, REJECTED + one FORM_GENERATION.
  // ─────────────────────────────────────────────────────────────────────────
  await db.insert(aiSuggestion).values([
    {
      // PENDING — on-site finding autofill suggestion.
      id: "ai_pending",
      org_id: ORG,
      type: "FINDING_AUTOFILL",
      status: "PENDING",
      inspection_result_id: "result_completed_fail",
      inspection_form_id: null,
      payload: { suggested_finding: "Waterflow alarm did not actuate within 90 seconds; recommend switch replacement." },
      source_reference: "NFPA 25 (2023) §5.3.3.1",
      confidence: 0.88,
      reviewed_by: null,
      reviewed_at: null,
      sync_status: "PENDING_SYNC",
      created_at: NOW,
      updated_at: NOW,
    },
    {
      // ACCEPTED — code reference suggestion accepted by the inspector.
      id: "ai_accepted",
      org_id: ORG,
      type: "CODE_REFERENCE",
      status: "ACCEPTED",
      inspection_result_id: "result_completed_pass",
      inspection_form_id: null,
      payload: { code_reference: "NFPA 13 (2022) §8.3 — sprinkler spacing for light hazard." },
      source_reference: "NFPA 13 (2022) §8.3",
      confidence: 0.94,
      reviewed_by: "appuser_inspector",
      reviewed_at: "2026-01-15T11:20:00.000Z",
      sync_status: "SYNCED",
      created_at: "2026-01-15T11:00:00.000Z",
      updated_at: NOW,
    },
    {
      // REJECTED — photo deficiency detection rejected as a false positive.
      id: "ai_rejected",
      org_id: ORG,
      type: "PHOTO_DEFICIENCY",
      status: "REJECTED",
      inspection_result_id: "result_awaiting_qa",
      inspection_form_id: null,
      payload: { detected: "Possible corrosion on extinguisher bracket", bounding_box: [120, 88, 210, 160] },
      source_reference: "vision-model-v2",
      confidence: 0.51,
      reviewed_by: "appuser_inspector",
      reviewed_at: "2026-05-20T14:05:00.000Z",
      sync_status: "SYNCED",
      created_at: "2026-05-20T14:00:00.000Z",
      updated_at: NOW,
    },
    {
      // FORM_GENERATION — AI-generated NFPA 72 form/checklist (links the form).
      id: "ai_form_generation",
      org_id: ORG,
      type: "FORM_GENERATION",
      status: "ACCEPTED",
      inspection_result_id: null,
      inspection_form_id: "form_nfpa72",
      payload: { generated_sections: ["Initiating Devices", "Notification Appliances"], system_type: "alarm", code: "NFPA-72 (2022)" },
      source_reference: "NFPA 72 (2022) Chapter 14",
      confidence: 0.9,
      reviewed_by: "appuser_coordinator",
      reviewed_at: "2026-06-10T09:30:00.000Z",
      sync_status: "SYNCED",
      created_at: "2026-06-10T09:00:00.000Z",
      updated_at: NOW,
    },
  ]);

  // ─────────────────────────────────────────────────────────────────────────
  // 15. IntegrationConnection (3) — HUBSPOT, CONNECTEAM, QBO all CONNECTED.
  //     Tokens are placeholders; config carries pipeline/account refs.
  // ─────────────────────────────────────────────────────────────────────────
  await db.insert(integrationConnection).values([
    {
      id: "conn_hubspot",
      org_id: ORG,
      provider: "HUBSPOT",
      status: "CONNECTED",
      access_token: "enc::placeholder_hubspot_access",
      refresh_token: "enc::placeholder_hubspot_refresh",
      token_expires_at: "2026-06-13T14:00:00.000Z",
      config: {
        portal_id: "hs_portal_4815162",
        inspection_pipeline_id: "pl_inspection_01",
        deficiency_pipeline_id: "pl_deficiency_01",
        asset_object_type_id: "2-12345",
      },
      last_sync_at: "2026-06-13T07:55:00.000Z",
      last_error: null,
      created_at: NOW,
      updated_at: NOW,
    },
    {
      id: "conn_connecteam",
      org_id: ORG,
      provider: "CONNECTEAM",
      status: "CONNECTED",
      access_token: "enc::placeholder_connecteam_key",
      refresh_token: null,
      token_expires_at: null,
      config: { scheduler_id: "ct_sched_9001", dispatch_board: "Field Crews" },
      last_sync_at: "2026-06-12T18:00:00.000Z",
      last_error: null,
      created_at: NOW,
      updated_at: NOW,
    },
    {
      id: "conn_qbo",
      org_id: ORG,
      provider: "QBO",
      status: "CONNECTED",
      access_token: "enc::placeholder_qbo_access",
      refresh_token: "enc::placeholder_qbo_refresh",
      token_expires_at: "2026-06-13T15:00:00.000Z",
      config: { realm_id: "qbo_realm_900200300", invoice_item_ref: "Inspection Services" },
      last_sync_at: "2026-06-11T20:00:00.000Z",
      last_error: null,
      created_at: NOW,
      updated_at: NOW,
    },
  ]);

  // ─────────────────────────────────────────────────────────────────────────
  // 16. SyncOutboxItem (3) — one PENDING_SYNC deficiency_ticket CREATE
  //     (from the failed result), one SYNC_ERROR, one queued system_test.
  // ─────────────────────────────────────────────────────────────────────────
  await db.insert(syncOutboxItem).values([
    {
      id: "outbox_deficiency_create",
      org_id: ORG,
      entity_type: "deficiency_ticket",
      entity_id: "result_completed_fail",
      operation: "CREATE",
      target_provider: "HUBSPOT",
      payload: {
        subject: "Waterflow alarm failed — Main Tower",
        severity: "high",
        hubspot_inspection_ticket_id: HS.inspectionTicket,
        hubspot_asset_id: HS.asset.suppression13,
      },
      attempts: 0,
      last_attempt_at: null,
      status: "PENDING_SYNC",
      error: null,
      created_at: NOW,
      updated_at: NOW,
    },
    {
      id: "outbox_test_error",
      org_id: ORG,
      entity_type: "system_test",
      entity_id: "test_alarm_fail",
      operation: "CREATE",
      target_provider: "HUBSPOT",
      payload: { test_type: "ALARM", passed: false, hubspot_asset_id: HS.asset.alarm },
      attempts: 3,
      last_attempt_at: "2026-06-13T07:50:00.000Z",
      status: "SYNC_ERROR",
      error: "429 Too Many Requests from HubSpot; will retry with backoff.",
      created_at: NOW,
      updated_at: NOW,
    },
    {
      id: "outbox_result_sync",
      org_id: ORG,
      entity_type: "inspection_result",
      entity_id: "result_in_progress",
      operation: "UPDATE",
      target_provider: null, // null = syncs to the ITM service, not an external provider
      payload: { status: "IN_PROGRESS", client_uuid: "cuuid-result-0002" },
      attempts: 0,
      last_attempt_at: null,
      status: "PENDING_SYNC",
      error: null,
      created_at: NOW,
      updated_at: NOW,
    },
  ]);

  // ─────────────────────────────────────────────────────────────────────────
  // 17. AppUser (2) — an INSPECTOR and a COORDINATOR, both via Microsoft Entra.
  // ─────────────────────────────────────────────────────────────────────────
  await db.insert(appUser).values([
    {
      id: "appuser_inspector",
      org_id: ORG,
      auth_provider: "MICROSOFT",
      external_subject: "entra-oid-inspector-7781",
      email: "marco.reyes@beaconfire.example",
      display_name: "Marco Reyes",
      roles: ["INSPECTOR"],
      is_active: true,
      created_at: NOW,
      updated_at: NOW,
    },
    {
      id: "appuser_coordinator",
      org_id: ORG,
      auth_provider: "MICROSOFT",
      external_subject: "entra-oid-coordinator-4412",
      email: "dana.whitfield@beaconfire.example",
      display_name: "Dana Whitfield",
      roles: ["COORDINATOR", "QA_REVIEWER"],
      is_active: true,
      created_at: NOW,
      updated_at: NOW,
    },
  ]);

  // ─────────────────────────────────────────────────────────────────────────
  // 18. AuthProviderConfig (2) — MICROSOFT enabled; GOOGLE disabled (shows the
  //     pluggable provider model without code changes).
  // ─────────────────────────────────────────────────────────────────────────
  await db.insert(authProviderConfig).values([
    {
      id: "authcfg_microsoft",
      org_id: ORG,
      provider: "MICROSOFT",
      display_name: "Sign in with Microsoft",
      client_id: "entra-client-id-placeholder",
      client_secret: "enc::placeholder_entra_secret",
      issuer_url: "https://login.microsoftonline.com/beacon-tenant/v2.0",
      scopes: ["openid", "profile", "email"],
      redirect_uri: "itm://auth/microsoft/callback",
      is_enabled: true,
      sort_order: 0,
      created_at: NOW,
      updated_at: NOW,
    },
    {
      id: "authcfg_google",
      org_id: ORG,
      provider: "GOOGLE",
      display_name: "Sign in with Google",
      client_id: "google-client-id-placeholder",
      client_secret: "enc::placeholder_google_secret",
      issuer_url: "https://accounts.google.com",
      scopes: ["openid", "profile", "email"],
      redirect_uri: "itm://auth/google/callback",
      is_enabled: false, // disabled — demonstrates provider pluggability
      sort_order: 1,
      created_at: NOW,
      updated_at: NOW,
    },
  ]);

  console.log("ITM seed complete.");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("ITM seed failed:", err);
    process.exit(1);
  });
```

---

## How to run

From the Expo project root (the standalone ITM app):

```bash
# Ensure the local SQLite schema is applied first (Drizzle migrations / push):
npx drizzle-kit push        # or: npx drizzle-kit migrate

# Then run the seed:
tsx db/seed.ts
```

Notes:
- `tsx db/seed.ts` runs the seed against the device/dev SQLite store via the Drizzle client in `db/client.ts`.
- Re-running is safe to repeat after a reset: clear the local DB (delete the SQLite file or run a `db.delete(...)` teardown) before re-seeding, since fixed `id` values will collide on a second insert.
- All HubSpot/Connecteam/QBO IDs here are placeholders. No external API calls are made by the seed; the `HubspotObjectCache` rows stand in for cached reads, and the `SyncOutboxItem` rows stand in for queued writes that the sync engine would later replay.

---

## Models seeded (18)

ComplianceStandard, InspectionForm, HubspotObjectCache, AssetComplianceLink, InspectionSeries, InspectionSchedule, InspectionResult, TestEquipment, CalibrationRecord, SystemTest, MaintenanceRecord, InspectionReport, InspectionReportItem, AiSuggestion, IntegrationConnection, SyncOutboxItem, AppUser, AuthProviderConfig.

---

## Revision Log

| Date | Version | Author | What Changed |
|------|---------|--------|-------------|
| 2026-06-13 | 1.0 | Deb + AI Support | Initial ITM seed-data spec for the standalone Expo app (local SQLite via Drizzle). Companion to `itm_DATA_MODEL.md` (no schema/API here). Seeds all 18 ITM-native + integration/auth models scoped to `org_beacon_test_001`: 5 ComplianceStandards (incl. prior NFPA-72 edition), 5 InspectionForms (1 inactive, 1 ai_generated), 7 HubspotObjectCache rows (customer, location, 2 nested assets, AHJ, inspection + deficiency tickets), 9 AssetComplianceLinks across 6 assets (incl. nested sub-asset), 2 InspectionSeries (ACTIVE/PAUSED), 6 InspectionSchedules (due/due-soon/overdue/inactive, in/out of series), 5 InspectionResults (every status + varied sync_status + client_uuid), 3 TestEquipment + 3 CalibrationRecords (VALID/DUE_SOON/EXPIRED), 4 SystemTests (hydrostatic/flow/alarm-fail/pump_curve), 3 MaintenanceRecords (preventive/corrective/emergency, one with Connecteam + HubSpot WO refs), 3 InspectionReports (DRAFT/QA_REVIEW/SENT, one DEFICIENCIES_ONLY) + items, 4 AiSuggestions (PENDING/ACCEPTED/REJECTED + FORM_GENERATION), 3 IntegrationConnections (HubSpot/Connecteam/QBO CONNECTED), 3 SyncOutboxItems (deficiency CREATE PENDING_SYNC, SYNC_ERROR, ITM-service UPDATE), 2 AppUsers (INSPECTOR/COORDINATOR via Microsoft), 2 AuthProviderConfigs (Microsoft enabled, Google disabled). Cross-referenced IDs throughout (series→schedule→result→report; equipment→calibration; asset→standards→tests). |

---

*REF-ITM-2001-SEED • v1.0*
