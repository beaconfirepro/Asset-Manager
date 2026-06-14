# Inspection, Testing & Maintenance (ITM) — Module Scope

**Module ID:** `itm`
**Module #:** 20
**GitHub Label:** `module/itm`
**Version:** 1.4
**Date:** 2026-06-13
**Status:** Build-Ready (Scoped)

> This document is the master reference for the Inspection, Testing & Maintenance module. Read it before writing a single line of code. It provides context, summarizes all technical detail, and points to companion docs for implementation specifics.
>
> **Companion documents** (authoritative for their respective domains) — the full six-document set per `HOW_TO_CREATE_SCOPE_DOCS.md`:
> - `itm_DATA_MODEL.md` — Enums, models (ITM-native + integration + auth), full API surface
> - `itm_UI_SPEC.md` — Component layouts, page specs, animation specs, file structure
> - `itm_SEED_DATA.md` — Seed scripts and test records
> - `itm_AGENT_PROMPTS.md` — Replit per-phase build prompts
> - `itm_LAYOUTS.html` — Structural zone wireframes for every page
>
> **Canon boundary:** This scope follows `PRODUCT_ARCHITECTURE.md` (Module #20) and `FEATURE_REFERENCE.md` Module 20. ITM owns features **20.1–20.5 only**. The broader "inspection-to-collection platform" capabilities (deficiency lifecycle, proposals, invoicing, payments, customer portal, fleet/GPS) belong to other modules and appear here as dependencies, not ITM features. See Section 4.

---

## 1. What This Module Does

ITM is the fire-protection compliance engine. After a system is installed, it must be inspected, tested, and maintained on a recurring schedule for the life of the building — annual sprinkler inspections (NFPA 25), fire alarm testing (NFPA 72), extinguisher checks (NFPA 10), standpipe and pump flow tests. ITM manages that ongoing compliance lifecycle: a registry of the fire protection systems installed at customer locations, recurring inspection series that auto-generate the work, NFPA-compliant inspection forms completed in the field (offline-capable), test and maintenance records, branded inspection reports delivered to building owners, and an AI layer that keeps the code library current and assists the inspector.

**Core principle:** ITM is an orchestration and compliance layer over external systems of record. The CRM objects (Customer, Contact, and the custom objects Location, Asset (nestable), and AHJ) live in **HubSpot**. Work Orders are **HubSpot tickets** — an Inspection is one ticket type and a Deficiency is another. Proposals and quoting stay in **HubSpot**; invoicing stays in **QuickBooks Online (QBO)**; scheduling and dispatch happen in **Connecteam**. ITM does not duplicate any of these. What ITM owns natively is the fire-protection execution and compliance content that those systems do not model: inspection form schemas and results, the recurring inspection series/cadence engine, test and maintenance records, compliance standards, branded inspection reports, and the AI code layer. The installed system (the HubSpot **Asset** object) is still the conceptual first-class record — inspections, tests, and maintenance reference it and accumulate a compliance history over years.

A typical workflow: A coordinator defines an inspection series — frequency, system scope, customer (referencing the HubSpot Customer and Asset objects). When a visit comes due, ITM creates an **Inspection** Work Order ticket in HubSpot; **HubSpot tickets + the customer portal handle the client-facing scheduling, notifications, and client view**. A dispatcher creates the corresponding **Connecteam** crew shift from that Work Order (manual for now). An inspector completes the NFPA-compliant form on a mobile device, fully offline if needed, capturing readings, photos, and signatures. A deficient answer creates a **Deficiency** Work Order ticket in HubSpot. Back in the office, a reviewer runs QA and generates a branded inspection report. Deficiencies flow into HubSpot proposals/quotes; completed service flows to QBO for invoicing. Tests (hydrostatic, flow, alarm) and maintenance events are logged against the asset over time. The AI layer (Feature 20.4, last to build) ingests NFPA codes, auto-generates checklists by system type, and assists the inspector.

### 1.1 Asset-Based Engine

The **Asset** is a HubSpot custom object representing a building fire protection system (suppression, alarm, standpipe, pump, extinguisher set), and it is **nestable** (a system can contain sub-assets/devices). It carries system type, install date, warranty, applicable compliance standards, and lifecycle status. Every inspection, test, and maintenance record references its HubSpot Asset by ID, building the compliance history that drives "what's due, what's overdue, what failed." ITM reads Assets through the HubSpot API and stores only the object ID plus an ephemeral read cache for speed — never a duplicate authoritative copy.

### 1.2 Recurring Series → Work Order Ticket → Shift

| Concept | Owner | Role |
|---------|-------|------|
| **Series** (contract-level) | ITM (native) | The recurring commitment: customer, location/asset scope, frequency, booked vs. unbooked revenue tracking |
| **Schedule** (per-asset cadence) | ITM (native) | The next-due record per HubSpot Location/Asset; generated under a series |
| **Client scheduling + notifications + portal** | HubSpot (tickets + portal) | HubSpot books the inspection time with the customer, sends reminders/confirmations, and exposes the client view |
| **Work Order** (the visit) | HubSpot ticket (Inspection type) | ITM creates the Inspection ticket when a schedule comes due |
| **Crew shift** (internal dispatch) | Connecteam | Created from the Work Order, manually for now |
| **Result** (execution) | ITM (native) | Inspection form responses, photos, signatures, pass/fail, QA — keyed to the HubSpot ticket ID |

The series/schedule engine is ITM-native because neither HubSpot nor Connecteam models recurring inspection cadences. A series generates schedules; a due schedule creates a HubSpot Inspection ticket; a dispatcher creates the Connecteam shift; the inspector's results live in ITM keyed to the ticket.

### 1.3 Integration Architecture (Systems of Record)

| Concern | System of record | ITM's role |
|---------|-----------------|-----------|
| Customer, Contact | HubSpot | Reference by ID; read via API |
| Location, Asset (nestable), AHJ | HubSpot custom objects | Reference by ID; read via API |
| Work Order — Inspection | HubSpot ticket | ITM creates/updates via API; owns the execution result keyed to the ticket |
| Work Order — Deficiency | HubSpot ticket | ITM creates the ticket from a deficient finding via API |
| Proposals / Quoting | HubSpot | Handoff only (deficiency → proposal); ITM does not build proposals |
| Invoicing | QuickBooks Online | Handoff only; ITM provides report/service data |
| Client scheduling, notifications & portal | HubSpot (tickets + customer portal) | HubSpot books the appointment, notifies the client, and exposes the client view off the Inspection/Deficiency tickets |
| Internal crew dispatch (shifts) | Connecteam | ITM creates a crew shift from a Work Order (manual for now) |
| Inspection forms/results, series/schedules, tests, maintenance, reports, compliance standards, AI | ITM (Helm-native) | Owned — HubSpot/Connecteam/QBO do not model these |

**No-duplication rule:** Helm persists only the external system's identifier (HubSpot object/ticket ID, Connecteam shift ID, QBO/HubSpot references) plus a short-lived read cache for performance. It never stores a second authoritative copy of a HubSpot/Connecteam/QBO record.

### 1.4 Free Tier vs. Paid Tier

| Tier | What's Available |
|------|-----------------|
| **Free (Tower)** | None. ITM is a paid module; it requires the HubSpot (CRM, objects, Work Order tickets) and Connecteam (scheduling) integrations. |
| **Paid (Module)** | Asset registry, recurring inspection series, NFPA form engine, offline mobile inspection, test & maintenance records, branded reports, AI code intelligence. |

### 1.5 What ITM Is Not

- **Not the CRM.** Customer, Contact, Location, Asset, and AHJ live in **HubSpot**. ITM references them by ID and does not own or duplicate them.
- **Not the proposal or invoicing system.** Proposals/quoting stay in **HubSpot**; invoicing stays in **QBO**. ITM hands off (deficiency → proposal, completed service → invoice data) but builds neither.
- **Not the client scheduler or portal.** Client-facing scheduling, notifications, and the customer portal run on **HubSpot tickets + the HubSpot customer portal** (the Inspection/Deficiency tickets ITM creates). Internal crew dispatch (shifts) lives in **Connecteam**, created from a Work Order (manual for now). ITM owns neither the client scheduling/portal nor crew dispatch — it owns the inspection execution and compliance content.
- **Not project-based installation inspections.** Rough-in, final, and AHJ walkthrough inspections during a construction project belong to **Field Operations**. ITM is recurring building inspections after a system is in service.
- **Not company-owned equipment.** Vehicles, pipe threaders, and schedulable tools are **Equipment** (#8). ITM assets are customer-site fire protection systems. (Test *instruments* used during testing are a narrow exception tracked here for calibration — see Section 13, PARKED.)

---

## 2. The Problem Today

Beacon tracks recurring fire protection inspections across spreadsheets, a shared calendar, and paper forms. There is no asset registry, so "what systems are installed where, and when were they last inspected" lives in technicians' heads and filing cabinets. Recurring inspection due dates are tracked manually; missed inspections surface only when a customer or AHJ complains. Inspectors carry paper NFPA forms or rigid PDF apps that do not work offline in a mechanical room with no signal, force re-entry of building and asset data already on file, and produce a flat PDF that cannot be reshaped (deficiencies-only, NFPA vs. Joint Commission format, service summary). Deficiencies found during inspection are written on the form and re-keyed later, if at all, with no link back to the originating system. Test readings (hydrostatic, flow, alarm) and maintenance events are logged inconsistently. Reports are assembled by hand and emailed one at a time. There is no current, code-accurate form library and no way to flag when a new NFPA edition changes an inspection requirement.

---

## 3. Users & Permissions

| Role | Access Level | What They Do |
|------|-------------|-------------|
| Tenant Admin | Full | Configure inspection forms (JSON schema), compliance standards, AI code library, report branding/cover letters |
| Coordinator / Scheduler | Operational | Register assets, define inspection series, manage recurring schedules, review and finalize reports, send to owners |
| Inspector (Field) | Field | Complete inspections on mobile (offline), capture readings/photos/signatures/deficiencies, log tests and maintenance |
| QA Reviewer / Field Manager | Review | QA review inspections before finalization, compare against history, approve reports |
| Office / Back-office | Operational | Generate and deliver reports, monitor compliance dashboard, manage asset records |
| Owner / Exec | Read | View compliance dashboard, asset health, booked vs. unbooked recurring revenue |

---

## 4. Module Dependencies

### Consumes From

| Source | What | How |
|--------|------|-----|
| HubSpot (CRM) | Customer, Contact, and custom objects Location, Asset (nestable), AHJ | Read via HubSpot API; ITM stores object IDs + ephemeral read cache, no duplicate |
| HubSpot (Work Orders) | Inspection and Deficiency tickets | Read/write ticket state via HubSpot API; ITM keys its execution results to the ticket ID |
| AI Capability Layer (`ai`, #30) | Transcription, photo analysis, NFPA code intelligence | Consumed by Feature 20.4 and inspection voice notes |

### Provides To

| Consumer | What | How |
|----------|------|-----|
| HubSpot | Inspection & Deficiency Work Order tickets; inspection report attachments; deficiency → proposal handoff | ITM creates/updates tickets and attaches reports via the HubSpot API |
| HubSpot (client) | Inspection/Deficiency tickets that drive client scheduling, notifications, and the customer portal | ITM creates the ticket; HubSpot schedules, notifies, and exposes the client view |
| Connecteam | Internal crew shifts created from Work Orders | ITM pushes a crew shift from a Work Order ticket (manual trigger for now) |
| QuickBooks Online | Completed-service and report data for invoicing | Handoff; ITM does not invoice |

### External Integrations

| System | Direction | Purpose | Status |
|--------|-----------|---------|--------|
| HubSpot | Bidirectional | CRM (Customer/Contact), custom objects (Location/Asset/AHJ), Work Order tickets (Inspection, Deficiency), proposals | Core — Phase 1+ |
| Connecteam | Outbound (status sync back: future) | Internal crew shifts/dispatch from Work Orders | Manual for now |
| QuickBooks Online | Handoff | Invoicing source data | Existing |
| AI Capability Layer (internal #30) | Bidirectional | NFPA code ingestion, checklist generation, photo deficiency detection, voice-to-text | Phase 6 |
| AHJ / Compliance platforms (The Compliance Engine/BRYCER, IROL) | Outbound | Submit inspection reports / deficiency status to jurisdictional platforms | 🔮 Future — not in this scope |

> **System-of-record rule:** HubSpot is authoritative for CRM objects and Work Order tickets; Connecteam for shifts; HubSpot for proposals; QBO for invoicing. ITM holds only their identifiers plus a short-lived read cache and owns the native execution/compliance content (Section 6). This supersedes the `PRODUCT_ARCHITECTURE.md` model in which Helm owned CRM, Work Orders, and Scheduling natively — see Section 13 DD-09.

---

## 5. Feature Registry

Feature numbers match `FEATURE_REFERENCE.md` Module 20 and `PRODUCT_ARCHITECTURE.md` (Module #20) exactly.

| # | Feature | Phase | Status | Agent | Notes |
|---|---------|-------|--------|-------|-------|
| 20.1 | Asset Registry | 0, 1 | 📋 Scoped | — | Building fire protection systems as first-class records; lifecycle; compliance standards. |
| 20.2 | Inspection Scheduling | 0, 2 | 📋 Scoped | — | Recurring series engine, per-asset cadence, auto-generated work orders, calendar, overdue alerts, booked vs. unbooked revenue. |
| 20.3 | Inspection Forms | 0, 3, 4 | 📋 Scoped | — | JSON-schema NFPA forms, offline mobile completion, photos/signatures, history comparison, QA review, report generation & delivery. |
| 20.4 | AI Code Intelligence | 6 | 🔮 Future (scoped) | — | NFPA ingestion, checklist auto-generation, inspection assistant. Depends on AI capability layer (#30). Sequenced last. |
| 20.5 | Testing & Maintenance | 0, 5 | 📋 Scoped | — | Test records (hydrostatic/flow/alarm), calibration tracking, preventive/corrective/emergency maintenance, work order linkage. |

Status key: ⬜ Not Started · 📋 Scoped · 🔨 In Progress · ✅ Complete · 🚫 Blocked · 🔮 Future.

---

## 6. Data Model (Summary Only)

> **See `itm_DATA_MODEL.md` for complete field specifications, enum values, and the integration/sync/auth models.** This section is the module-level summary only.

### 6.1 Enums

**New (ITM-owned, Prisma enums):** `InspectionSeriesStatus`, `InspectionReportStatus`, `InspectionReportFormat`, `QaReviewStatus`, `TestEquipmentStatus`, `CalibrationStatus`, `AiSuggestionType`, `AiSuggestionStatus`.

**Existing (retained as String value-sets on legacy ITM models):** asset `type`/`status`, inspection `status`/`result`, schedule `frequency`, form `type`, test `test_type`/`passed`, maintenance `maintenance_type`. Migration of these String fields to Prisma enums is an OPEN decision (Section 13).

> **Note:** The field-level model is intentionally deferred to the future DATA_MODEL doc. This section states only the ownership split that the architecture (Section 1.3) implies. Existing Prisma models (`Asset`, `BuildingInspection`, `Deficiency`) are superseded as authoritative records by HubSpot; their remodeling into reference + result records is a DATA_MODEL task.

### 6.2 Ownership Split

**ITM-native (Helm owns the data):** inspection form schemas (`InspectionForm`), inspection **result/execution** records (form responses, photos, signatures, pass/fail, QA — keyed to the HubSpot Inspection ticket ID), the recurring `InspectionSeries` and `InspectionSchedule` cadence engine, `SystemTest`, `MaintenanceRecord`, `ComplianceStandard`, `InspectionReport` (+ report items), `TestEquipment`, `CalibrationRecord`, `AiSuggestion`.

**HubSpot system of record (referenced by ID, not owned, never duplicated):** Customer/Company, Contact, Location, Asset (nestable), AHJ, Inspection Work Order ticket, Deficiency Work Order ticket.

**Other external references:** Connecteam shift ID, QBO invoice reference, HubSpot proposal reference.

**Reference identifiers ITM stores:** `hubspotCustomerId`, `hubspotLocationId`, `hubspotAssetId`, `hubspotAhjId`, `hubspotInspectionTicketId`, `hubspotDeficiencyTicketId`, `connecteamShiftId` (field-level definitions deferred to DATA_MODEL).

### 6.3 Key Relationships

`InspectionSeries` (ITM) references a HubSpot Customer + Asset/Location scope and generates `InspectionSchedule` (ITM). A due `InspectionSchedule` creates a HubSpot **Inspection** ticket; ITM stores the inspection **result** record keyed to `hubspotInspectionTicketId` and linked to `InspectionForm`. A deficient result creates a HubSpot **Deficiency** ticket (`hubspotDeficiencyTicketId`). A Connecteam shift is created from the Inspection ticket (`connecteamShiftId`, manual). `SystemTest` and `MaintenanceRecord` reference `hubspotAssetId`; `SystemTest.testEquipmentId` → `TestEquipment` → many `CalibrationRecord`. `ComplianceStandard` applies to assets (by `hubspotAssetId`) and to tests. `InspectionReport` (+ `InspectionReportItem`) aggregates inspection results and is delivered to the HubSpot Customer. `AiSuggestion` references an inspection result / `InspectionForm`.

---

## 7. API Endpoints (Summary Only)

> **See `itm_DATA_MODEL.md` Section 3 for the full API surface** (ITM endpoints, integration endpoints, and pluggable auth). This section summarizes the route surface only.

### 7.1 Route File Organization

| File | Mounts at | Endpoint Count | Covers |
|------|-----------|----------------|--------|
| `api/src/modules/itm/routes.ts` | `/itm` | 3 | Module dashboard, compliance summary, KPI rollups |
| `api/src/modules/itm/assets.ts` | `/itm/assets` | 8 | Asset CRUD, lifecycle, compliance-standard links, history rollup |
| `api/src/modules/itm/series.ts` | `/itm/series` | 7 | Inspection series CRUD, generate schedules, booked/unbooked revenue |
| `api/src/modules/itm/schedules.ts` | `/itm/schedules` | 6 | Recurring schedules, due/overdue queries, reschedule with auto-shift, calendar feed |
| `api/src/modules/itm/inspections.ts` | `/itm/inspections` | 9 | Inspection lifecycle, offline sync, form submission, deficiency creation, QA review, history comparison |
| `api/src/modules/itm/forms.ts` | `/itm/forms` | 6 | Inspection form (JSON schema) CRUD, versioning, activation |
| `api/src/modules/itm/reports.ts` | `/itm/reports` | 7 | Report build/shape, preview, PDF generation, send/deliver, status |
| `api/src/modules/itm/testing.ts` | `/itm/testing` | 10 | Test records, maintenance records, test equipment + calibration |
| `api/src/modules/itm/ai.ts` | `/itm/ai` | 6 | Code library, checklist generation, AI suggestion accept/reject (Phase 6) |

All routes require `requireSession` with `orgId` sourced **only** from `req.session!.orgId`. Add `/itm` to the Vite proxy prefixes in `vite.config.js`.

---

## 8. UI Specifications (Summary Only)

> **See `itm_UI_SPEC.md` for page layouts, component specs, interaction patterns, animation specs, and file structure.**
> **See `itm_LAYOUTS.html` for structural zone wireframes.**

### 8.1 Page Inventory

| Page | Route | Layout | Description |
|------|-------|--------|-------------|
| ITM Dashboard | `/itm` | 3-col + LP + RP | Compliance health, upcoming/overdue inspections, recurring-revenue snapshot, action queue |
| Asset Registry | `/itm/assets` | Content + LP + RP | Asset list by location/type/status; right panel asset snapshot |
| Asset Detail | `/itm/assets/:id` | Content + LP + RP | System info, inspection/test/maintenance history, compliance standards, lifecycle |
| Inspection Series List | `/itm/series` | Content + LP | Recurring series with booked vs. unbooked, upcoming/overdue rollups |
| Inspection Series Detail | `/itm/series/:id` | Content + LP + RP | Series config, generated schedules, visit history, revenue panel |
| Inspection Calendar | `/itm/calendar` | Content + LP + RP | Upcoming inspections across locations; overdue highlighting; click-to-schedule |
| Inspection Workspace | `/itm/inspections/:id` | Mobile full-screen | Offline-capable form completion: question set, deficiency capture, photos, signatures |
| Inspection Review | `/itm/inspections/:id/review` | Content + LP + RP | QA review, previous-inspection comparison, finalize |
| Inspection Reports List | `/itm/reports` | Content + LP | Generated reports, status, delivery tracking |
| Report Builder | `/itm/reports/:id` | Content + LP + RP | Shape output (system-type filter, deficiencies-only, NFPA/JC format), preview, send |
| Testing & Maintenance | `/itm/testing` | Content + LP + RP | Test records + maintenance log (tabbed); PM schedule |
| Test Equipment & Calibration | `/itm/testing/equipment` | Content + LP | Instruments, calibration due, calibration history |
| Admin: Inspection Forms | `/admin` (tab) or `/itm/forms` | Admin shell | JSON-schema form definitions (NFPA 13/25/72/custom), versions |
| AI Code Intelligence | `/itm/ai` | Content + LP + RP | Code library, checklist generation, suggestion review (Phase 6) |

Plus modals: Asset Create/Edit, Series Create/Edit, Reschedule, Send Report, Test Record, Maintenance, Calibration, Form Schema Editor, AI Suggestion Review.

### 8.2 Five-Zone Layout

The module uses the standard Helm five-zone app shell grid: Main Nav (Col 1), Left Panel (Col 2, toggleable), Content Area (Col 3), Right Panel (Col 4, toggleable), Footer (Row 6). The Inspection Workspace uses a mobile full-screen form layout (PWA, dark-mode-friendly for field crews) per Field Operations conventions. The Inspection Forms admin uses the admin shell with left tabs.

### 8.3 Component Count

~40 shared components (C-01 through C-40), 14 pages/views, ~11 hooks. See `itm_UI_SPEC.md` Section 3 for the complete inventory and the component × page matrix.

### 8.4 Navigation

Main Nav parent: **ITM** (tenant-renameable; default "Inspections"). Left Panel items: Dashboard, Assets, Series, Calendar, Reports, Testing & Maintenance. Inspection Forms config lives on the Administration page. AI Code Intelligence appears in the left panel only when Feature 20.4 is enabled.

---

## 9. Seed Data (Summary Only)

> **See `itm_SEED_DATA.md` for the complete seed scripts.** The record matrix below is the summary.

| Category | Records | Coverage |
|----------|---------|----------|
| ComplianceStandards | 5 | NFPA-10, NFPA-13, NFPA-25, NFPA-72, NFPA-72-prior-edition (code-update test case) |
| InspectionForms | 4 | NFPA 13, NFPA 25, NFPA 72, custom; 1 inactive prior version |
| Assets | 6 | Suppression (13), suppression (13D), alarm, standpipe, pump, extinguisher set; statuses active/inactive/decommissioned |
| AssetComplianceStandard | 9 | Each asset linked to applicable standards |
| InspectionSeries | 2 | One ACTIVE (multi-location, semi-annual), one PAUSED |
| InspectionSchedules | 6 | Due, due-soon, overdue, inactive; under and outside a series |
| BuildingInspections | 5 | scheduled, in_progress, completed-passed, completed-failed, awaiting QA |
| Deficiencies (created by ITM) | 3 | Low/high/critical, linked to a failed building inspection |
| InspectionReports | 3 | DRAFT, QA_REVIEW, SENT; one deficiencies-only format |
| SystemTests | 4 | hydrostatic pass, flow pass, alarm fail, pump curve |
| TestEquipment + CalibrationRecord | 3 + 3 | VALID, DUE_SOON, EXPIRED calibration states |
| MaintenanceRecords | 3 | preventive, corrective, emergency |
| AiSuggestions | 3 | PENDING, ACCEPTED, REJECTED (Phase 6 coverage) |

All seed data scoped to `org_beacon_test_001`.

---

## 10. Build Phases

Each phase leaves the app in a deployable, testable state. Do not start the next phase until the current one passes its exit criteria.

### Phase 0: Schema Migration & Seed Data

**Status:** ⬜ Not Started
**Agent:** —
**Branch:** —
**PR:** —

**Goal:** Database schema matches Section 6 and seed data exercises every ITM model and enum state.

**Builds features:** 20.1, 20.2, 20.3, 20.5 (foundation); 20.4 (AI models stubbed)

**Tasks:**
1. Audit existing schema — read `Asset`, `BuildingInspection`, `InspectionSchedule`, `InspectionForm`, `SystemTest`, `MaintenanceRecord`, `ComplianceStandard` in `api/prisma/schema.prisma`
2. Apply additive migrations per Section 6.2 (new fields on existing models — e.g. `Asset.warranty_expiry`, `BuildingInspection.qaStatus`, `BuildingInspection.seriesId`)
3. Add new enums per Section 6.1
4. Create new models: `InspectionSeries`, `AssetComplianceStandard`, `InspectionReport`, `InspectionReportItem`, `TestEquipment`, `CalibrationRecord`, `AiSuggestion`
5. Wire relations (Asset↔ComplianceStandard, Series→Schedule, Inspection→Report, Test→Equipment)
6. Run `npx prisma validate` then `npx prisma db push`
7. Implement seed data per the record matrix in Section 9 in `api/prisma/seed.ts`
8. Verify `cd api && npm run seed` completes without errors

**Exit Criteria:**
- [ ] `npx prisma validate` passes
- [ ] `npx prisma db push` applies cleanly
- [ ] `npm run seed` creates all records per Section 9
- [ ] Every enum state has at least one seed record
- [ ] Browser console: zero errors on app startup
- [ ] Server console: no unhandled rejections

**Files Created:** (new models + seed in existing files)
**Files Modified:** `api/prisma/schema.prisma`, `api/prisma/seed.ts`

**Completion Notes:** _Blank until complete._

---

### Phase 1: Asset Registry + Dashboard Shell

**Status:** ⬜ Not Started
**Agent:** —
**Branch:** —
**PR:** —

**Goal:** Users can register, view, edit, and lifecycle fire protection assets, see compliance standards per asset, and land on an ITM dashboard.

**Builds features:** 20.1

**Tasks:**
1. Create `api/src/modules/itm/assets.ts` and `api/src/modules/itm/routes.ts` per the route surface in Section 7
2. Register `/itm` in the Vite proxy and mount routers in `api/src/server.ts`
3. Create `ITMDashboard.jsx` page (compliance health, upcoming/overdue, action queue)
4. Create `AssetRegistry.jsx` (C-04 AssetTable, C-05 AssetCard, filters) and `AssetDetail.jsx` (C-06 AssetDetailPanel, history tabs)
5. Create `AssetFormModal` (C-07), `AssetLifecycleBadge` (C-08), `SystemTypeBadge` (C-09), `ComplianceStandardChips` (C-10)
6. Register ITM in sidebar nav and left-panel secondary nav
7. Create hooks `useAssets.js`, `useComplianceStandards.js`

**Exit Criteria:**
- [ ] Asset CRUD works; assets list by location/type/status
- [ ] Asset detail shows inspection/test/maintenance history and compliance standards
- [ ] Lifecycle transitions (active → decommissioned/replaced) persist
- [ ] Dashboard renders compliance health and upcoming/overdue counts from API
- [ ] Browser console: zero errors, zero 401s, zero 404s
- [ ] Server console: no unhandled rejections
- [ ] `npm run build` passes

**Files Created:** `api/src/modules/itm/assets.ts`, `api/src/modules/itm/routes.ts`, `src/modules/itm/pages/ITMDashboard.jsx`, `src/modules/itm/pages/AssetRegistry.jsx`, `src/modules/itm/pages/AssetDetail.jsx`, `src/modules/itm/components/*` (C-01..C-10), `src/modules/itm/hooks/useAssets.js`, `src/modules/itm/hooks/useComplianceStandards.js`, `src/modules/itm/index.js`
**Files Modified:** `api/src/server.ts`, `vite.config.js`, sidebar nav config, `src/pages.config.js`

**Completion Notes:** _Blank until complete._

---

### Phase 2: Inspection Scheduling & Recurring Series

**Status:** ⬜ Not Started
**Agent:** —
**Branch:** —
**PR:** —

**Goal:** Coordinators define recurring inspection series that auto-generate per-asset schedules and work orders, see upcoming vs. overdue on a calendar, reschedule with future auto-shift, and track booked vs. unbooked recurring revenue.

**Builds features:** 20.2

**Tasks:**
1. Create `api/src/modules/itm/series.ts` and `api/src/modules/itm/schedules.ts` per the route surface in Section 7
2. Implement series → schedule generation and schedule due-date → `WorkOrderRequest` via the Trigger Engine (Automation)
3. Implement reschedule with future-visit auto-shift to keep the series aligned
4. Create `InspectionSeriesList.jsx`, `InspectionSeriesDetail.jsx`, `InspectionCalendar.jsx`
5. Create `InspectionSeriesTable` (C-11), `InspectionSeriesFormModal` (C-12), `SeriesRevenuePanel` (C-13), `InspectionCalendar` (C-14), `InspectionScheduleRow` (C-15), `RescheduleModal` (C-16)
6. Create hooks `useInspectionSeries.js`, `useInspectionSchedules.js`

**Exit Criteria:**
- [ ] Create a series → schedules and work orders auto-generate
- [ ] Calendar shows upcoming inspections across locations; overdue highlighted
- [ ] Reschedule a visit → future visits auto-shift
- [ ] Booked vs. unbooked recurring revenue computed and displayed
- [ ] Browser console: zero errors, zero 401s, zero 404s
- [ ] Server console: no unhandled rejections
- [ ] `npm run build` passes

**Files Created:** `api/src/modules/itm/series.ts`, `api/src/modules/itm/schedules.ts`, `src/modules/itm/pages/InspectionSeriesList.jsx`, `src/modules/itm/pages/InspectionSeriesDetail.jsx`, `src/modules/itm/pages/InspectionCalendar.jsx`, components C-11..C-16, hooks `useInspectionSeries.js`, `useInspectionSchedules.js`
**Files Modified:** Router config, `src/pages.config.js`, left-panel nav

**Completion Notes:** _Blank until complete._

---

### Phase 3: Inspection Forms — Offline Mobile Completion

**Status:** ⬜ Not Started
**Agent:** —
**Branch:** —
**PR:** —

**Goal:** Admins define NFPA-compliant JSON-schema forms; inspectors complete them on mobile fully offline, capturing readings, photos, signatures, and deficiencies that auto-create deficiency records.

**Builds features:** 20.3 (Epic 20.3.1)

**Tasks:**
1. Create `api/src/modules/itm/forms.ts` and the form-submission endpoints in `api/src/modules/itm/inspections.ts` per the route surface in Section 7
2. Implement offline-first sync (IndexedDB queue, sync-on-reconnect) for inspection submissions
3. Implement deficient-answer → auto-create `Deficiency` linked to `BuildingInspection`
4. Create `InspectionWorkspace.jsx` (mobile full-screen) with `QuestionSetRenderer` (C-18), `DeficiencyCaptureCard` (C-19), `PhotoAnnotator` (C-20), `SignaturePad` (C-21), `OfflineSyncIndicator` (C-22)
5. Create `InspectionFormBuilder` (C-35) + `FormSchemaFieldEditor` (C-36) admin UI
6. Pre-populate form context from building/asset/history to reduce re-entry
7. Create hooks `useInspections.js`, `useInspectionForms.js`

**Exit Criteria:**
- [ ] Inspector completes an inspection fully offline; it syncs on reconnect
- [ ] Correct question set served by system type + form
- [ ] Deficient answers auto-create deficiency records linked to the inspection
- [ ] Photos and signatures attach to the inspection
- [ ] Admin can build/version a JSON-schema form
- [ ] Browser console: zero errors, zero 401s, zero 404s
- [ ] Server console: no unhandled rejections
- [ ] `npm run build` passes

**Files Created:** `api/src/modules/itm/forms.ts`, `api/src/modules/itm/inspections.ts`, `src/modules/itm/pages/InspectionWorkspace.jsx`, `src/modules/itm/components/admin/InspectionFormBuilder.jsx`, components C-17..C-23, C-35..C-36, hooks `useInspections.js`, `useInspectionForms.js`
**Files Modified:** Router config, `src/pages.config.js`, Administration page (form-builder tab), service worker / offline cache config

**Completion Notes:** _Blank until complete._

---

### Phase 4: Inspection Review & Branded Reports

**Status:** ⬜ Not Started
**Agent:** —
**Branch:** —
**PR:** —

**Goal:** Reviewers QA-review inspections against history, generate branded reports shaped from the same data set, and deliver them to building owners.

**Builds features:** 20.3 (Epic 20.3.2)

**Tasks:**
1. Create `api/src/modules/itm/reports.ts` and QA-review/history endpoints in `inspections.ts` per the route surface in Section 7
2. Create `InspectionReview.jsx` with `QaReviewPanel` (C-24) and `InspectionHistoryCompare` (C-23)
3. Create `InspectionReportsList.jsx` and `ReportBuilder.jsx` with `InspectionReportTable` (C-25), `ReportBuilderPanel` (C-26), `ReportPreview` (C-27), `SendReportModal` (C-28)
4. Implement report shaping (system-type filter, deficiencies-only, NFPA vs. Joint Commission format, service summary) from one data set
5. Implement branded PDF generation (logo, DBA, cover letter) and delivery; store via Documents
6. Create hook `useReports.js`

**Exit Criteria:**
- [ ] QA review blocks finalize until approved; compares to previous inspection
- [ ] One-click branded report; reshape by filter/format from the same data
- [ ] Report delivered to owner and stored centrally
- [ ] Report status lifecycle (DRAFT → QA_REVIEW → APPROVED → SENT) enforced
- [ ] Browser console: zero errors, zero 401s, zero 404s
- [ ] Server console: no unhandled rejections
- [ ] `npm run build` passes

**Files Created:** `api/src/modules/itm/reports.ts`, `src/modules/itm/pages/InspectionReview.jsx`, `src/modules/itm/pages/InspectionReportsList.jsx`, `src/modules/itm/pages/ReportBuilder.jsx`, components C-23..C-28, hook `useReports.js`
**Files Modified:** Router config, `src/pages.config.js`

**Completion Notes:** _Blank until complete._

---

### Phase 5: Testing & Maintenance

**Status:** ⬜ Not Started
**Agent:** —
**Branch:** —
**PR:** —

**Goal:** Inspectors log tests (hydrostatic, flow, alarm, pump curve) with pass/fail against standards, track test-equipment calibration, and record preventive/corrective/emergency maintenance with work-order linkage.

**Builds features:** 20.5

**Tasks:**
1. Create `api/src/modules/itm/testing.ts` per the route surface in Section 7 (tests, maintenance, equipment, calibration)
2. Create `TestingMaintenance.jsx` (tabbed: Tests / Maintenance / PM Schedule) and `TestEquipmentCalibration.jsx`
3. Create `TestRecordTable` (C-29), `TestRecordModal` (C-30), `MaintenanceTable` (C-31), `MaintenanceModal` (C-32), `TestEquipmentTable` (C-33), `CalibrationModal` (C-34)
4. Implement pass/fail determination against `ComplianceStandard`; failed test → surface to Service
5. Implement PM scheduling per asset and work-order linkage
6. Create hooks `useTests.js`, `useMaintenance.js`, `useTestEquipment.js`

**Exit Criteria:**
- [ ] Test records logged with readings; pass/fail computed against standards
- [ ] Calibration states (VALID/DUE_SOON/EXPIRED) tracked per instrument
- [ ] Maintenance records (preventive/corrective/emergency) with WO linkage
- [ ] PM scheduling generates upcoming maintenance
- [ ] Browser console: zero errors, zero 401s, zero 404s
- [ ] Server console: no unhandled rejections
- [ ] `npm run build` passes

**Files Created:** `api/src/modules/itm/testing.ts`, `src/modules/itm/pages/TestingMaintenance.jsx`, `src/modules/itm/pages/TestEquipmentCalibration.jsx`, components C-29..C-34, hooks `useTests.js`, `useMaintenance.js`, `useTestEquipment.js`
**Files Modified:** Router config, `src/pages.config.js`

**Completion Notes:** _Blank until complete._

---

### Phase 6: AI Code Intelligence

**Status:** ⬜ Not Started
**Agent:** —
**Branch:** —
**PR:** —

**Goal:** ITM consumes the AI capability layer to keep the NFPA code library current, auto-generate inspection checklists by system type and code, and assist inspectors (code references, finding auto-fill, photo deficiency detection, QA flags).

**Builds features:** 20.4 — **depends on AI capability layer (#30); build only after #30 services exist.**

**Tasks:**
1. Create `api/src/modules/itm/ai.ts` per the route surface in Section 7; integrate AI layer services (code KB, photo analysis, voice-to-text)
2. Implement checklist auto-generation from system type + applicable NFPA code → draft `InspectionForm`
3. Implement code-update detection → flag affected forms
4. Create `AICodeIntelligence.jsx` with `AiSuggestionPanel` (C-37) and `CodeReferenceDrawer` (C-38)
5. Surface AI suggestions in the Inspection Workspace (accept/reject by the inspector; every output logged)
6. Create hook `useAiSuggestions.js`

**Exit Criteria:**
- [ ] Checklist auto-generated from system type + code, editable before save
- [ ] Code-update detection flags affected forms
- [ ] AI suggestions in workspace are accept/reject and fully logged (`AiSuggestion`)
- [ ] No AI output is auto-applied without inspector confirmation
- [ ] Browser console: zero errors, zero 401s, zero 404s
- [ ] Server console: no unhandled rejections
- [ ] `npm run build` passes

**Files Created:** `api/src/modules/itm/ai.ts`, `src/modules/itm/pages/AICodeIntelligence.jsx`, components C-37..C-38, hook `useAiSuggestions.js`
**Files Modified:** `InspectionWorkspace.jsx` (suggestion surface), left-panel nav (AI item gated)

**Completion Notes:** _Blank until complete._

---

## 11. Testing Checklist

### Phase 0
- [ ] Schema validates and pushes cleanly; seed creates all records; every enum state has a record; app starts clean.

### Phase 1
- [ ] Asset CRUD and lifecycle; asset detail history tabs; compliance standards render; dashboard counts match data.

### Phase 2
- [ ] Series creation generates schedules + work orders; calendar upcoming/overdue; reschedule auto-shifts; booked/unbooked revenue correct.

### Phase 3
- [ ] Offline completion + sync; correct question set; deficiency auto-creation; photos/signatures attach; form builder versions.

### Phase 4
- [ ] QA gate blocks finalize; history comparison; report reshaping by filter/format; branded PDF; delivery + storage; status lifecycle.

### Phase 5
- [ ] Test records + pass/fail vs. standards; calibration states; maintenance with WO linkage; PM scheduling.

### Phase 6
- [ ] Checklist auto-gen; code-update flags; accept/reject logging; no silent auto-apply.

---

## 12. Agent Assignment

The ITM app is built in **Replit** as a standalone, mobile/iPad-native application (see DD-11). Each phase is one self-contained Replit build prompt rather than a split across Claude/Cursor/Copilot agents.

| Phase | Build Agent | Deliverable |
|-------|-------------|-------------|
| Phase 0 | Replit | Data layer + seed (native app store / API contracts) |
| Phase 1 | Replit | Asset registry (HubSpot Asset objects) + dashboard |
| Phase 2 | Replit | Inspection series/cadence engine → creates HubSpot Inspection tickets (HubSpot owns client scheduling/portal) |
| Phase 3 | Replit | Offline-first inspection workspace + NFPA forms |
| Phase 4 | Replit | QA review + branded reports |
| Phase 5 | Replit | Testing & maintenance |
| Phase 6 | Replit | AI code intelligence (after AI layer) |

The build target is a standalone app that runs on its own and is designed to integrate with Helm later (shared data via the HubSpot system of record and Helm APIs). Per-phase Replit prompts live in `itm_AGENT_PROMPTS.md` when authored (Section 15).

---

## 13. Open Questions & Decisions

### DECIDED
- **DD-01:** ITM scope is strictly canon features 20.1–20.5. Deficiency lifecycle, proposals, invoicing, payments, customer portal, and fleet are other modules; ITM consumes/provides only. (Confirmed with product owner, 2026-06-13.)
- **DD-02:** Feature 20.4 (AI Code Intelligence) is fully scoped but sequenced as the final phase, dependent on the AI capability layer (#30). Earlier phases ship without it.
- **DD-03:** ITM is asset-based. The `Asset` is the first-class record; inspections/tests/maintenance hang off it.
- **DD-04:** Recurring work is two-tier: `InspectionSeries` (contract-level) generates `InspectionSchedule` (asset-level) which spawns `BuildingInspection` visits and work orders.
- **DD-05:** ITM creates `Deficiency` rows from inspection findings but does not own the deficiency lifecycle (Module #28 owns it).
- **DD-06:** `BuildingInspection` (recurring) is distinct from `FieldInspection` (project installation, Module #19). They are separate models and must not be conflated.
- **DD-07:** Inspection Workspace is mobile full-screen, PWA, offline-first (IndexedDB queue + sync-on-reconnect), following Field Operations conventions.
- **DD-08:** Reports are reshapeable from one data set (system-type filter, deficiencies-only, NFPA vs. Joint Commission, service summary) rather than fixed PDFs.
- **DD-09 (v1.1):** External systems of record. HubSpot owns CRM (Customer/Contact) and the custom objects Location, Asset (nestable), and AHJ, plus Work Orders as tickets (Inspection and Deficiency ticket types). Connecteam owns **internal crew dispatch** — crew shifts are created from Work Orders **manually for now** (ITM owns client-facing scheduling, see DD-10). HubSpot owns proposals/quoting; QBO owns invoicing. ITM holds only reference IDs plus a short-lived read cache (no duplication) and owns the native execution/compliance layer (Section 6.2). This supersedes the `PRODUCT_ARCHITECTURE.md` model where Helm owned CRM, Work Orders, and Scheduling natively; the product owner is updating canon accordingly.
- **DD-10 (v1.3, supersedes the v1.2 position):** Client scheduling, notifications, and the customer portal run on **HubSpot** (the Inspection/Deficiency tickets + HubSpot customer portal + Meetings/automation), not ITM. ITM creates the ticket and HubSpot handles the client-facing scheduling, reminders/confirmations, and client view. **Connecteam handles internal crew dispatch only.** ITM owns the inspection execution and compliance layer; it builds no native client-scheduling or portal UI. (The v1.2 "ITM owns client scheduling" position is withdrawn.)
- **DD-11 (v1.2):** Build target and agent. The ITM app is built in **Replit** as a **standalone mobile/iPad-native app** that runs on its own and is designed to integrate with Helm later via the HubSpot system of record and Helm APIs. Agent prompts (Section 15) are Replit prompts, one per phase. The Helm-integrated file paths in the build phases (`src/modules/itm/...`, `api/src/modules/itm/...`) describe the eventual Helm integration target; the Replit standalone build re-casts these into the native app structure — to be detailed when `itm_AGENT_PROMPTS.md` is authored.

### OPEN
- **OQ-01: String → enum migration.** Existing ITM models (`Asset`, `BuildingInspection`, `InspectionSchedule`, `InspectionForm`, `SystemTest`, `MaintenanceRecord`) use `String` fields with inline value comments. New models use Prisma enums. Decision: migrate legacy fields to enums for type safety (favored by Helm design principles) vs. retain strings to avoid touching shared patterns. Default for v1.0: retain strings; revisit before Phase 3.
- **OQ-02: Snake_case vs. camelCase.** Existing ITM models use `snake_case` field names (`install_date`, `next_inspection`) and `created_at`/`updated_at`. The doc-standard Rule 11 specifies `createdAt`/`updatedAt`. New ITM models follow the existing `snake_case` convention for intra-module consistency; flag for a future schema-wide normalization.
- **OQ-03: Series generation cadence.** How far ahead a series materializes schedules/work orders (rolling 90 days vs. full year). Needs a coordinator decision before Phase 2.
- **OQ-04: Report delivery channel.** Email vs. Customer Portal vs. both. Portal is a Reporting/Portal concern; ITM provides the finalized report. Confirm channel before Phase 4.

### PARKED
- **Test equipment vs. Equipment module.** Calibration of test instruments is tracked in ITM (`TestEquipment`) per Feature 20.5.1, overlapping conceptually with Equipment (#8). Kept in ITM for now; consolidation is a future consideration.
- **AHJ / compliance-platform submission** (The Compliance Engine/BRYCER, IROL). Belongs to Integrations (#11); not in this scope.
- **Multi-tech crew on a single inspection.** Single-inspector model for v1.0; multi-tech crew is a future enhancement.

---

## 14. Revision Log

| Date | Version | Author | What Changed |
|------|---------|--------|-------------|
| 2026-06-13 | 1.0 | Deb + AI Support | Initial ITM module scope created from `ITM-Platform-Epic-List.md`, canonical `PRODUCT_ARCHITECTURE.md` (Module #20) and `FEATURE_REFERENCE.md` Module 20, existing Prisma ITM models, and the partner_network six-doc exemplar. Strict-canon scope (20.1–20.5); AI Code Intelligence (20.4) sequenced last. |
| 2026-06-13 | 1.1 | Deb + AI Support | Re-architected to external systems of record (DD-09): HubSpot CRM + custom objects (Location, Asset nestable, AHJ) + Work Order tickets (Inspection, Deficiency); HubSpot proposals; QBO invoicing; Connecteam scheduling (manual shift-from-Work-Order). Rewrote Sections 1 (mental model + new 1.3 Integration Architecture), 4 (dependencies), 6 (ownership split). No-duplication rule: reference IDs + read cache only. UI_SPEC, LAYOUTS, and build phases not yet propagated — pending owner go-ahead. |
| 2026-06-13 | 1.2 | Deb + AI Support | DD-10: ITM owns client-facing scheduling + notifications; Connecteam handles internal crew dispatch only. DD-11: build target is Replit, a standalone mobile/iPad-native app designed to integrate with Helm later; agent prompts (Section 15) are Replit prompts, one per phase. Updated Sections 1.2/1.3/1.5, 4, 12, 15. |
| 2026-06-13 | 1.3 | Deb + AI Support | DD-10 revised: client scheduling, notifications, and the customer portal move to **HubSpot** (tickets + customer portal), not ITM. ITM creates the Inspection/Deficiency ticket; HubSpot handles the client-facing side. Removes native client-scheduling/portal build from ITM (Phase 2 becomes cadence engine → HubSpot tickets). Updated Sections 1.2/1.3/1.5, 4, 12, 15. |
| 2026-06-13 | 1.4 | Deb + AI Support | Completed the full six-document set per HOW_TO_CREATE_SCOPE_DOCS: added `itm_DATA_MODEL.md` (ITM-native local SQLite/Drizzle models, HubSpot read cache, integration/sync/outbox, pluggable OAuth with Microsoft Entra), `itm_SEED_DATA.md`, and `itm_AGENT_PROMPTS.md` (Replit prompts ITM-P0..P6). Restored companion cross-references in the header and Sections 6/7/9/15. AI scope spans on-site assist and AI form generation; integration is built by us (workflow stays in HubSpot/Connecteam/QBO). |

---

## 15. Agent Prompts

Build prompts target **Replit** (DD-11) and live in the companion doc **`itm_AGENT_PROMPTS.md`** (prompts ITM-P0 through ITM-P6, one per phase). Each prompt is written so that:

- Replit builds a **standalone mobile/iPad-native app** — offline-first inspection workspace, asset/inspection/test/maintenance/report flows, recurring-series cadence — that runs on its own. (Client scheduling, notifications, and the customer portal are HubSpot, not built here.)
- The build is **designed to integrate with Helm later**: HubSpot is the shared system of record (CRM objects + Work Order tickets), Connecteam handles internal crew dispatch, QBO handles invoicing, and Helm APIs carry the native execution/compliance data. Each prompt states the integration contract (HubSpot object/ticket IDs, Connecteam shift handoff) so the standalone app and the future Helm integration share one interface.

**Phase quick reference (Replit, one prompt per phase):**

| Phase | Description | Build Agent |
|-------|-------------|-------------|
| 0 | Data layer + seed | Replit |
| 1 | Asset Registry + Dashboard | Replit |
| 2 | Series/cadence engine (creates HubSpot Inspection tickets) | Replit |
| 3 | Offline inspection workspace + NFPA forms | Replit |
| 4 | Review & Reports | Replit |
| 5 | Testing & Maintenance | Replit |
| 6 | AI Code Intelligence | Replit |

---

*REF-ITM-2001 • v1.4*
