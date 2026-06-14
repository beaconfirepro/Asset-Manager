# Inspection, Testing & Maintenance (ITM) — UI Specification

**Document Type:** UI/UX Specification (To-Be)
**Module ID:** `itm`
**Module #:** 20
**GitHub Label:** `module/itm`
**Version:** 1.3
**Date:** 2026-06-13
**Status:** Build-Ready
**Companion:** `itm_SCOPE.md` (master, v1.3), `itm_LAYOUTS.html` (zone wireframes). Data-model detail is summarized in `itm_SCOPE.md` Section 6 and implemented in `api/prisma/schema.prisma`.

> This document is the authoritative UI specification for the Inspection, Testing & Maintenance module. It defines every page, component, layout zone, interaction, state, and animation. Use it for building and for maintaining. It is the companion frontend reference summarized in `itm_SCOPE.md` Section 8.

> **Integration architecture (v1.3, SCOPE Sections 1.1–1.5, 4, 6):** ITM is an orchestration and compliance layer over external systems of record. **HubSpot is the system of record** for Customer/Contact and the custom objects Location, Asset (nestable), and AHJ, and for the Inspection and Deficiency **Work Order tickets**. **Client scheduling, notifications, and the customer portal run on HubSpot** (tickets + customer portal), not ITM. **Connecteam handles internal crew dispatch only** (a crew shift created manually from a Work Order). **Proposals/quoting stay in HubSpot; invoicing stays in QBO** — ITM hands off but builds neither. ITM stores only HubSpot/Connecteam/QBO **object/ticket IDs plus an ephemeral read cache — never a duplicate authoritative copy** (SCOPE no-duplication rule, DD-09/DD-10). What ITM owns natively is the fire-protection execution and compliance content: inspection form schemas and results, the recurring series/cadence engine, tests, maintenance, compliance standards, branded reports, and the AI code layer.

> **Build target (SCOPE DD-11):** The app is built in **Replit** as a **standalone mobile/iPad-native app** that runs on its own and is designed to integrate with Helm later via the HubSpot system of record and Helm APIs. The `src/modules/itm/...` and `api/src/modules/itm/...` paths in this spec describe the eventual Helm-integration target; the Replit standalone build re-casts them into the native app structure (Section 6, DD-21).

> **Layout Reference:** `itm_LAYOUTS.html` is the authoritative visual layout reference. Open it in a browser to see the 5-zone app shell grid (Main Nav, Left Panel, Content Area, Right Panel, Footer) for every page. This spec defines behavior and data; the HTML wireframe defines layout and zone structure. There are no ASCII layout diagrams in this document by design — when a page references a zone, consult `itm_LAYOUTS.html`.

> **Field-name source of truth:** Per-page field inventories use the real Prisma field names from `api/prisma/schema.prisma` for **ITM-native** models (`InspectionForm`, inspection result records, `InspectionSchedule`, `SystemTest`, `MaintenanceRecord`, `ComplianceStandard`) and the new ITM models summarized in `itm_SCOPE.md` Section 6.2 (`InspectionSeries`, `AssetComplianceStandard`, `InspectionReport`, `InspectionReportItem`, `TestEquipment`, `CalibrationRecord`, `AiSuggestion`). **Customer/Contact, Location, Asset (nestable), AHJ, and the Inspection/Deficiency Work Order tickets are HubSpot system-of-record objects** (SCOPE 1.3, 6.2): ITM references them by HubSpot ID (`hubspotCustomerId`, `hubspotLocationId`, `hubspotAssetId`, `hubspotAhjId`, `hubspotInspectionTicketId`, `hubspotDeficiencyTicketId`) plus a read cache, and never stores a duplicate. Where this spec still shows legacy field names like `Asset.type` or `BuildingInspection.status`, treat them as the HubSpot-read or ITM-result equivalent under the v1.3 ownership split. Existing legacy ITM models use `snake_case` per SCOPE OQ-02; new models follow the same convention for intra-module consistency.

---

## 1. Design Decisions

Numbered for traceability. Reference these in code comments, PRs, and agent prompts. DD-01 through DD-08 mirror the DECIDED items in `itm_SCOPE.md` Section 13; DD-09 onward are UI-specific decisions established here. DD-21 through DD-24 capture the v1.3 integration-architecture decisions (SCOPE DD-09/DD-10/DD-11): HubSpot system of record, no-duplication, HubSpot client scheduling/portal, Connecteam internal dispatch, and the Replit standalone build target.

| # | Decision | Rationale |
|---|----------|-----------|
| DD-01 | ITM uses the standard Helm five-zone app shell on all desktop pages | Consistency with the rest of Helm. Main Nav (Col 1), Left Panel (Col 2, toggleable), Content Area (Col 3), Right Panel (Col 4, toggleable), Footer (Row 6). See `itm_LAYOUTS.html`. The only exception is the Inspection Workspace (DD-04). |
| DD-02 | Asset-based navigation over HubSpot-backed reference views, not form-based | The installed system (the HubSpot **Asset** object) is the conceptual first-class record (SCOPE DD-03, 1.1). Assets are reachable from the Left Panel and from the Dashboard. The Asset Registry and Asset Detail pages are **HubSpot-backed reference/overlay views**: core Asset/Location data is read from HubSpot via API (ITM holds only the object ID + read cache, never a duplicate), and ITM overlays its own compliance status (next/last inspection, overdue, standards, test/maintenance history). Inspections, tests, maintenance, and compliance history are presented as tabs/sections hanging off the asset, never as top-level flat lists detached from their system. ITM does **not** own Asset CRUD — the core record is created/edited in HubSpot; ITM edits only ITM-owned compliance/overlay fields (DD-21). |
| DD-03 | Two-tier recurring model surfaces as Series → Schedule → Visit (SCOPE DD-04) | `InspectionSeries` (contract-level) is shown on its own list/detail pages. `InspectionSchedule` (asset-level next-due) renders as rows (C-15) inside the series detail and on the calendar. The `BuildingInspection` visit is what the inspector opens in the Workspace. The UI never collapses these three into one screen. |
| DD-04 | The Inspection Workspace is a mobile full-screen, offline-first PWA, not a five-zone page (SCOPE DD-07) | Inspectors work in mechanical rooms with no signal. The Workspace drops the app shell entirely: a single-column, dark-mode-friendly, large-tap-target form with an offline queue (IndexedDB) and sync-on-reconnect. One-thumb reachability per Design Guide Section 10.2. |
| DD-05 | Offline state is always visible but never blocking | `OfflineSyncIndicator` (C-22) shows a persistent, non-blocking banner/chip: ONLINE (synced), OFFLINE (queued N), SYNCING (progress), SYNC ERROR (retry). Captured data is written to IndexedDB immediately; the inspector is never stopped by connectivity (Design Guide Section 10.2). |
| DD-06 | Reports are reshaped from one data set, not regenerated as fixed PDFs (SCOPE DD-08) | The Report Builder (`ReportBuilderPanel`, C-26) filters and reshapes the same `InspectionReportItem` set: system-type filter, deficiencies-only, NFPA vs. Joint Commission format, service summary. The live preview (C-27) reflects the current shape; no separate report variants are stored. |
| DD-07 | Compliance health uses traffic-light badges (green / amber / red), not percentage bars | Fire-protection compliance is a binary-ish "are you current" question. Traffic lights are instantly readable at a distance, matching the construction-industry convention used elsewhere in Helm. Tokens: `--green` current/passed, `--orange`/`--accent` due-soon/expiring, `--red` overdue/expired/failed. |
| DD-08 | Inspection status and result use distinct badge families | `InspectionStatusBadge`/`StatusBadge` (C-40) maps lifecycle: scheduled=`--blue`, in_progress=`--accent`, completed=`--green` (with passed) or `--red` (with failed), awaiting QA=`--purple`. The `passed` boolean drives the pass/fail color on completed records. Result and status are separate visual signals so a "completed-failed" inspection is unmistakable. |
| DD-09 | Calendar is the internal operations cockpit; overdue is the loudest signal | `InspectionCalendar` (C-14) is an **internal operations view only** (upcoming/overdue inspections across the portfolio). It is **not** client booking — client-facing scheduling, reminders/confirmations, and the customer portal happen in **HubSpot** off the Inspection/Deficiency ticket (DD-23, SCOPE DD-10). The calendar highlights overdue (`next_due_date` in the past, `is_active` true) in `--red`, due-soon in `--orange`, on-track in `--blue`. Clicking a day or a schedule cell opens reschedule (C-16) of the ITM-native cadence or drills to the visit. The calendar reads from the ITM schedule feed, not from work orders directly. |
| DD-10 | Booked vs. unbooked recurring revenue is a first-class panel, not a buried metric | `SeriesRevenuePanel` (C-13) renders on the Series Detail Right Panel and the Series List, showing booked (scheduled + work-ordered) vs. unbooked (committed by series but not yet generated) recurring revenue in `font-mono` per Design Guide Section 3.3. |
| DD-11 | AI suggestions surface as accept/reject cards, never auto-applied (SCOPE Phase 6 exit criteria) | `AiSuggestionPanel` (C-37) and the in-Workspace suggestion surface present every AI output (`AiSuggestion`) as a discrete card the inspector or admin explicitly accepts or rejects. Every decision is logged (`AiSuggestionStatus`). No AI output is written to an inspection, form, or deficiency without confirmation. |
| DD-12 | AI Code Intelligence UI is gated behind Feature 20.4 | The AI Code Intelligence page and the Left Panel "AI Code Intelligence" item render only when the module flag for Feature 20.4 is enabled (SCOPE 8.4). The `CodeReferenceDrawer` (C-38) and in-Workspace AI surface are likewise gated. Phases 1–5 ship with zero AI surface. |
| DD-13 | Inspection Forms admin lives on the Administration page, not the ITM Left Panel | Form schema authoring is a tenant-admin, role-gated function. `InspectionFormBuilder` (C-35) and `FormSchemaFieldEditor` (C-36) render inside the admin shell (left-tab pattern) under `/admin`, with a secondary route alias `/itm/forms`. This separates day-to-day operational navigation from configuration. |
| DD-14 | Module-first file layout | All frontend code lives under `src/modules/itm/` (pages, components, components/admin, hooks). Backend under `api/src/modules/itm/`. No `src/components/` or `src/pages/` placement. See Section 6. |
| DD-15 | Dark-first desktop, dark-first mobile (high contrast for sunlight) | Per Design Guide Sections 1 and 10.2. Field crews read in direct sunlight; dark surfaces with bright accents are the primary experience. The Workspace is explicitly tuned for outdoor legibility. |
| DD-16 | All numeric/financial/reading values use `font-mono` (JetBrains Mono) | Per Design Guide Section 3.3. Test readings (pressure, flow GPM), revenue figures, counts, percentages, due-in-days, and IDs render in monospace for alignment and precision. |
| DD-17 | anime.js entrance animations play on first load, suppressed on repeat visits in the same session | Per Design Guide rule 7.5. The signature staggered `fadeUp` plays when a page first mounts with data; navigating back within the session does not replay it. The Workspace and any data-entry surface are animation-light (Design Guide 7.5). |
| DD-18 | Empty, loading, and error states are designed for every view | Per Design Guide Sections 6 and 9. `EmptyState` (C-39) handles zero-data; skeleton/shimmer tiers handle loading; toasts and inline messages handle errors. No blank pages, no silent waits (Design Guide Section 6 cardinal rule). |
| DD-19 | History comparison is inline in QA review, not a separate report | `InspectionHistoryCompare` (C-23) renders the current inspection against the previous inspection of the same asset side by side inside the Review page, so the reviewer sees regressions (new deficiencies, changed readings) in context before finalizing. |
| DD-20 | Failed tests and overdue compliance are pushed to the Dashboard action queue | The Dashboard Right Panel surfaces operationally urgent ITM items — overdue inspections, failed tests, expiring calibration, awaiting-QA inspections, due-soon series — so a coordinator lands on "what needs attention" without hunting across pages. |
| DD-21 | HubSpot is the system of record; ITM stores IDs + read cache, never a duplicate (SCOPE DD-09, no-duplication rule) | Customer/Contact and the custom objects Location, Asset (nestable), and AHJ, plus the Inspection and Deficiency Work Order tickets, live in **HubSpot**. ITM persists only the HubSpot object/ticket ID (`hubspotCustomerId`, `hubspotLocationId`, `hubspotAssetId`, `hubspotAhjId`, `hubspotInspectionTicketId`, `hubspotDeficiencyTicketId`) plus a short-lived read cache for speed. Every page that shows Customer/Location/Asset data reads it through the HubSpot API and overlays ITM-native compliance content. Asset CRUD and Deficiency tickets are HubSpot writes, not local ITM records: the Asset Form modal (C-07) edits only ITM-owned overlay fields or opens HubSpot for the core record; deficiency capture (C-19) creates a HubSpot Deficiency ticket via the API. |
| DD-22 | Client scheduling, notifications, and the customer portal are HubSpot, not ITM (SCOPE DD-10) | ITM builds **no** client-scheduling, reminder/notification, or customer-portal UI. When a schedule comes due, ITM creates a HubSpot **Inspection** ticket; HubSpot books the appointment with the customer, sends reminders/confirmations, and exposes the client view off the ticket. The Inspection Calendar (P-06) is internal operations only (DD-09). Report delivery to the client is via HubSpot / the customer portal (DD-24). |
| DD-23 | Connecteam is internal crew dispatch only; ITM offers a manual "Create crew shift" action, not a dispatch board | ITM does **not** run a crew dispatch board or crew calendar. Where a Work Order / inspection is actionable, a manual **[Create crew shift]** action pushes a shift to **Connecteam** (`connecteamShiftId` stored as a reference; manual for now, SCOPE DD-10). Crew scheduling, routing, and timekeeping live in Connecteam. |
| DD-24 | Reports hand off to HubSpot (proposals, delivery) and QBO (invoicing); ITM owns only the report content | The Report Builder's "deficiency → proposal" is a **handoff button to HubSpot** (proposals live in HubSpot); ITM does not build proposals. Report **delivery to the client** is via HubSpot / the customer portal, and **invoicing** is a QBO handoff. The Send Report modal (C-28) records ITM-side delivery state and triggers the HubSpot/QBO handoff; it does not itself email the customer outside the HubSpot channel. |

---

## 2. Page Inventory & Navigation

### 2.1 Page Map

Fourteen pages/views plus modals, reproduced from `itm_SCOPE.md` Section 8.1. Layout type indicates the zones used (see `itm_LAYOUTS.html`).

| # | Page | Route | Layout | Description |
|---|------|-------|--------|-------------|
| P-01 | ITM Dashboard | `/itm` | 3-col + LP + RP | Compliance health, upcoming/overdue inspections, recurring-revenue snapshot, action queue |
| P-02 | Asset Registry | `/itm/assets` | Content + LP + RP | HubSpot-backed Asset list (read via API) with ITM compliance overlay, by location/type/status; right panel asset snapshot |
| P-03 | Asset Detail | `/itm/assets/:id` | Content + LP + RP | HubSpot Asset reference view + ITM compliance overlay: inspection/test/maintenance history, compliance standards, lifecycle |
| P-04 | Inspection Series List | `/itm/series` | Content + LP | Recurring series (ITM-native) with booked vs. unbooked, upcoming/overdue rollups |
| P-05 | Inspection Series Detail | `/itm/series/:id` | Content + LP + RP | Series config, generated schedules, visit history, revenue panel |
| P-06 | Inspection Calendar | `/itm/calendar` | Content + LP + RP | Internal ops view: upcoming/overdue inspections across the portfolio. Not client booking (HubSpot owns that) |
| P-07 | Inspection Workspace | `/itm/inspections/:id` | Mobile full-screen (PWA, offline) | Offline-capable form completion: question set, deficiency capture, photos, signatures |
| P-08 | Inspection Review | `/itm/inspections/:id/review` | Content + LP + RP | QA review, previous-inspection comparison, finalize |
| P-09 | Inspection Reports List | `/itm/reports` | Content + LP | Generated reports, status, delivery tracking |
| P-10 | Report Builder | `/itm/reports/:id` | Content + LP + RP | Shape output (system-type filter, deficiencies-only, NFPA/JC format), preview; deficiency→proposal handoff to HubSpot; deliver via HubSpot/portal |
| P-11 | Testing & Maintenance | `/itm/testing` | Content + LP + RP | Test records + maintenance log (tabbed); PM schedule |
| P-12 | Test Equipment & Calibration | `/itm/testing/equipment` | Content + LP | Instruments, calibration due, calibration history |
| P-13 | Admin: Inspection Forms | `/admin` (tab) or `/itm/forms` | Admin shell (left tabs) | JSON-schema form definitions (NFPA 13/25/72/custom), versions |
| P-14 | AI Code Intelligence | `/itm/ai` | Content + LP + RP | Code library, checklist generation, suggestion review (Phase 6, gated) |

**Modals** (covered in Section 4): Asset Edit (C-07, ITM overlay fields / opens HubSpot for the core record), Series Create/Edit (C-12), Reschedule (C-16), Send Report (C-28, HubSpot/portal delivery + handoff), Test Record (C-30), Maintenance (C-32), Calibration (C-34), Form Schema Editor (C-36 within builder), AI Suggestion Review (C-37 surface). Deficiency capture (C-19) writes a HubSpot Deficiency ticket, not a local record.

### 2.2 Main Nav & Left Panel

**Main Nav parent (Col 1):** **ITM** — tenant-renameable, default label **"Inspections"** (SCOPE 8.4). One icon (Lucide `ShieldCheck` or `ClipboardCheck`) opens the module; the Dashboard is the default content area, not a Left Panel item.

**Left Panel items (Col 2, toggleable):**

```
[icon: LayoutDashboard]  Dashboard
[icon: Boxes]            Assets
[icon: Repeat]           Series
[icon: Calendar]         Calendar
[icon: FileText]         Reports
[icon: Wrench]           Testing & Maintenance
[icon: Sparkles]        AI Code Intelligence   ← gated: visible only when Feature 20.4 enabled (DD-12)
```

- The Left Panel does **not** change when navigating into a detail page (Asset Detail, Series Detail). Module-level items remain visible for consistent cross-context navigation.
- **Inspection Forms** is **not** a Left Panel item — it lives on the Administration page (DD-13).
- **Test Equipment & Calibration** (P-12) is reached from within Testing & Maintenance (P-11) via a tab/link, and also has a direct route; it is not a separate top-level Left Panel item.

### 2.3 Navigation Flow

```
Dashboard (/itm)
  ├─ Compliance card / overdue item ─→ Asset Detail or Calendar
  ├─ Action queue: awaiting-QA item ─→ Inspection Review (/itm/inspections/:id/review)
  ├─ Action queue: failed test ──────→ Testing & Maintenance (/itm/testing)
  └─ Action queue: due-soon series ──→ Series Detail (/itm/series/:id)

Asset Registry (/itm/assets)  [HubSpot-backed read + ITM overlay]
  └─ Asset row/card click ─→ Asset Detail (/itm/assets/:id)
       ├─ History tab inspection row ─→ Inspection Review or Workspace
       ├─ History tab test row ───────→ Testing & Maintenance (filtered)
       ├─ [Edit Asset] ───────────────→ HubSpot (core record) / ITM overlay-field modal (C-07)
       └─ [+ New Inspection Series]  ─→ Series Create modal (C-12)

Series List (/itm/series)
  └─ Series row click ─→ Series Detail (/itm/series/:id)
       ├─ Generated schedule row ─→ Reschedule modal (C-16) or visit
       └─ Revenue panel (C-13)

Calendar (/itm/calendar)
  ├─ Schedule cell click ─→ visit (Workspace) or Reschedule modal (C-16)
  └─ Empty day click ────→ schedule a visit

Inspection Workspace (/itm/inspections/:id)  [mobile full-screen, offline]
  ├─ Deficient answer ─→ Deficiency capture (C-19) ─→ creates HubSpot Deficiency ticket (API)
  └─ Submit ─→ syncs ─→ Inspection Review (when reviewer opens it)

Work Order / Inspection (HubSpot Inspection ticket)
  └─ [Create crew shift] ─→ pushes a Connecteam shift (manual, DD-23)

Inspection Review (/itm/inspections/:id/review)
  ├─ History compare (C-23)
  └─ Approve ─→ Report Builder (/itm/reports/:id) seeded from this inspection

Reports List (/itm/reports)
  └─ Report row ─→ Report Builder (/itm/reports/:id)
       ├─ Reshape (C-26) ─→ live Preview (C-27)
       ├─ [Create proposal] ─→ deficiency → proposal handoff to HubSpot (DD-24)
       └─ [Send] ─→ Send Report modal (C-28) ─→ deliver via HubSpot / customer portal; invoicing handoff to QBO

Testing & Maintenance (/itm/testing)
  ├─ tab: Tests / Maintenance / PM Schedule
  └─ [Equipment] ─→ Test Equipment & Calibration (/itm/testing/equipment)

Administration (/admin) ─ ITM tab ─→ Inspection Forms (P-13)
AI Code Intelligence (/itm/ai)  [gated]
```

---

## 3. Shared Components

### 3.1 Component Inventory

Forty components, C-01 through C-40. Names match `itm_SCOPE.md` Section 10 phase task lists exactly. Location is relative to `src/modules/itm/`.

| ID | Component | Location | Description |
|----|-----------|----------|-------------|
| C-01 | `ComplianceHealthCard` | `components/` | Dashboard KPI card with traffic-light compliance health (DD-07): % current, # overdue, # due-soon. `font-mono` values, 3px accent bar. |
| C-02 | `UpcomingInspectionsCard` | `components/` | Dashboard card listing the next due inspections across locations with due-in-days and overdue flagging. |
| C-03 | `RecurringRevenueCard` | `components/` | Dashboard card summarizing booked vs. unbooked recurring revenue across active series (`font-mono`). |
| C-04 | `AssetTable` | `components/` | Data table of `Asset` rows: name, system type, location, status, last/next inspection. Filter, sort, row-click to detail. |
| C-05 | `AssetCard` | `components/` | Card variant of an asset for grid view and Right Panel snapshots: name, `SystemTypeBadge`, `AssetLifecycleBadge`, next-due. |
| C-06 | `AssetDetailPanel` | `components/` | Asset Detail content host: system info header + tabbed history (Inspections / Tests / Maintenance / Compliance). |
| C-07 | `AssetFormModal` | `components/` | Asset overlay editor. The core Asset record lives in **HubSpot** (DD-21) — this modal edits only ITM-owned compliance/overlay fields (compliance-standard links, ITM lifecycle/compliance status) or opens HubSpot for the core identity/system-type/install-warranty/location fields. ITM does not own Asset CRUD. |
| C-08 | `AssetLifecycleBadge` | `components/` | Badge for `Asset.status`: active=`--green`, inactive=`--text-muted`, decommissioned=`--red`. |
| C-09 | `SystemTypeBadge` | `components/` | Badge for `Asset.type` with icon: fire_suppression_13/13d=`Droplets`, fire_alarm=`BellRing`, standpipe=`PipeIcon`, pump=`Gauge`, extinguisher=`FireExtinguisher`. |
| C-10 | `ComplianceStandardChips` | `components/` | Chip row of applicable `ComplianceStandard` codes (NFPA-13, NFPA-25, NFPA-72, NFPA-10) linked via `AssetComplianceStandard`. |
| C-11 | `InspectionSeriesTable` | `components/` | List table of `InspectionSeries`: name, customer, scope, frequency, status, booked/unbooked, next/overdue rollup. |
| C-12 | `InspectionSeriesFormModal` | `components/` | Create/Edit modal for a series: company, location scope, system scope, frequency, generation horizon. |
| C-13 | `SeriesRevenuePanel` | `components/` | Right Panel / inline panel showing booked vs. unbooked recurring revenue for a series (DD-10, `font-mono`). |
| C-14 | `InspectionCalendar` | `components/` | Month/week calendar of inspection schedules; overdue/due-soon/on-track color coding (DD-09); click-to-schedule. |
| C-15 | `InspectionScheduleRow` | `components/` | Row representing an `InspectionSchedule`: location/asset, frequency, `next_due_date`, due-in-days, reschedule action. |
| C-16 | `RescheduleModal` | `components/` | Modal to move a visit's date with optional future auto-shift of the series cadence. |
| C-17 | `InspectionWorkspace` | `components/` | The mobile full-screen offline workspace host (DD-04): header, question set, capture controls, sync indicator, submit. |
| C-18 | `QuestionSetRenderer` | `components/` | Renders the `InspectionForm.form_schema` JSON into a question set; reads/writes `BuildingInspection.form_data`. |
| C-19 | `DeficiencyCaptureCard` | `components/` | Inline card to capture a deficiency from a deficient answer: title, description, severity, location notes, photos. **Creates a HubSpot Deficiency Work Order ticket via the API** (DD-21), not a local ITM record; ITM stores only `hubspotDeficiencyTicketId`. Offline: queued and written on reconnect. |
| C-20 | `PhotoAnnotator` | `components/` | Camera/photo capture with markup; stores `photo_urls`; offline-buffered. |
| C-21 | `SignaturePad` | `components/` | Touch signature capture for inspector and/or owner; stored on the inspection. |
| C-22 | `OfflineSyncIndicator` | `components/` | Persistent non-blocking sync chip/banner (DD-05): ONLINE / OFFLINE (queued N) / SYNCING / SYNC ERROR. |
| C-23 | `InspectionHistoryCompare` | `components/` | Side-by-side current-vs-previous inspection comparison for the same asset (DD-19). Used in Review. |
| C-24 | `QaReviewPanel` | `components/` | QA review controls: `QaReviewStatus`, reviewer notes, blocks finalize until approved. |
| C-25 | `InspectionReportTable` | `components/` | List table of `InspectionReport`: title, recipient, format, status, delivery date. |
| C-26 | `ReportBuilderPanel` | `components/` | Report shaping controls (DD-06): system-type filter, deficiencies-only, NFPA/JC format, service summary, section toggles over `InspectionReportItem`. Includes a **[Create proposal]** handoff button that pushes the deficiency set to **HubSpot** (proposals live in HubSpot, DD-24); ITM does not build proposals. |
| C-27 | `ReportPreview` | `components/` | Live rendered preview of the shaped report; reflects builder state in real time. |
| C-28 | `SendReportModal` | `components/` | Modal to deliver a finalized report to the building owner **via HubSpot / the customer portal** (DD-24): recipient (HubSpot Customer), message; records ITM-side delivery state and triggers the HubSpot delivery and QBO invoicing handoff. ITM does not email the customer outside the HubSpot channel. |
| C-29 | `TestRecordTable` | `components/` | Table of `SystemTest` rows: test type, date, performed by, pass/fail vs. standard, report link. |
| C-30 | `TestRecordModal` | `components/` | Create/Edit modal for a `SystemTest`: type, readings JSON, performed by, equipment link, pass/fail. |
| C-31 | `MaintenanceTable` | `components/` | Table of `MaintenanceRecord` rows: type, date, performed by, parts, labor hours, cost, next due. |
| C-32 | `MaintenanceModal` | `components/` | Create/Edit modal for a `MaintenanceRecord` with work-order linkage. |
| C-33 | `TestEquipmentTable` | `components/` | Table of `TestEquipment` with calibration status (VALID/DUE_SOON/EXPIRED) and next-cal date. |
| C-34 | `CalibrationModal` | `components/` | Create/Edit modal for a `CalibrationRecord` against an instrument. |
| C-35 | `InspectionFormBuilder` | `components/admin/` | Admin form-schema builder: define/version NFPA forms, drag-order question sets, activate. |
| C-36 | `FormSchemaFieldEditor` | `components/admin/` | Field-level editor within the builder: field type, label, options, deficiency triggers, required. |
| C-37 | `AiSuggestionPanel` | `components/` | Accept/reject card list of `AiSuggestion` records (DD-11). Used on AI page and surfaced in Workspace. Gated (DD-12). |
| C-38 | `CodeReferenceDrawer` | `components/` | Slide-over reference of NFPA code context for the current question/asset. Gated (DD-12). |
| C-39 | `EmptyState` | `components/` | Reusable zero-data state per Design Guide Section 9: icon + title + description + CTA. |
| C-40 | `StatusBadge` | `components/` | Generic status/result badge family (DD-08): inspection status, report status, schedule due-state, test pass/fail. |

### 3.2 Component × Page Matrix

Rows = pages/views (P-01..P-14). Columns = components. A check means the component renders on that page (including its Right Panel and modals invoked from it).

| Page / View | C-01 | C-02 | C-03 | C-04 | C-05 | C-06 | C-07 | C-08 | C-09 | C-10 | C-11 | C-12 | C-13 | C-14 | C-15 | C-16 | C-17 | C-18 | C-19 | C-20 | C-21 | C-22 | C-23 | C-24 | C-25 | C-26 | C-27 | C-28 | C-29 | C-30 | C-31 | C-32 | C-33 | C-34 | C-35 | C-36 | C-37 | C-38 | C-39 | C-40 |
|-------------|------|------|------|------|------|------|------|------|------|------|------|------|------|------|------|------|------|------|------|------|------|------|------|------|------|------|------|------|------|------|------|------|------|------|------|------|------|------|------|------|
| P-01 ITM Dashboard | ✓ | ✓ | ✓ | | ✓ | | | ✓ | ✓ | | | | ✓ | | ✓ | | | | | | | | | | | | | | | | | | | | | | | | ✓ | ✓ |
| P-02 Asset Registry | | | | ✓ | ✓ | | ✓ | ✓ | ✓ | ✓ | | | | | | | | | | | | | | | | | | | | | | | | | | | | | ✓ | ✓ |
| P-03 Asset Detail | | | | | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | | | | | ✓ | | | | | | | | | | | | | | | | ✓ | | | | | | | | ✓ | ✓ |
| P-04 Series List | | | ✓ | | | | | ✓ | | | ✓ | ✓ | ✓ | | | | | | | | | | | | | | | | | | | | | | | | | | ✓ | ✓ |
| P-05 Series Detail | | | | | | | | | ✓ | | | ✓ | ✓ | | ✓ | ✓ | | | | | | | | | | | | | | | | | | | | | | | ✓ | ✓ |
| P-06 Calendar | | ✓ | | | | | | | ✓ | | | | | ✓ | ✓ | ✓ | | | | | | | | | | | | | | | | | | | | | | | ✓ | ✓ |
| P-07 Workspace | | | | | | | | | ✓ | ✓ | | | | | | | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | | | | | | | | | | | | | | | ✓ | ✓ | ✓ | ✓ |
| P-08 Inspection Review | | | | | ✓ | | | | ✓ | | | | | | | | | ✓ | ✓ | ✓ | ✓ | | ✓ | ✓ | | | | | | | | | | | | | | | ✓ | ✓ |
| P-09 Reports List | | | | | | | | | | | | | | | | | | | | | | | | | ✓ | | | ✓ | | | | | | | | | | | ✓ | ✓ |
| P-10 Report Builder | | | | | | | | | ✓ | | | | | | | | | | | | | | | | | ✓ | ✓ | ✓ | | | | | | | | | | | ✓ | ✓ |
| P-11 Testing & Maintenance | | | | | | | | | ✓ | | | | | | | | | | | | | | | | | | | | | ✓ | ✓ | ✓ | | | | | | | ✓ | ✓ |
| P-12 Test Equipment & Calibration | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | | ✓ | ✓ | | | | | ✓ | ✓ |
| P-13 Admin: Inspection Forms | | | | | | | | | ✓ | ✓ | | | | | | | | | | | | | | | | | | | | | | | | | ✓ | ✓ | | | ✓ | ✓ |
| P-14 AI Code Intelligence | | | | | | | | | ✓ | ✓ | | | | | | | | | | | | | | | | | | | | | | | | | | | ✓ | ✓ | ✓ | ✓ |

---

## 4. Page Specifications

For each page: purpose, the zone it occupies (consult `itm_LAYOUTS.html`), field inventory (real schema field names), interaction patterns, and empty/loading/error states. No ASCII layouts — the wireframe file is authoritative for zone structure.

### 4.1 ITM Dashboard (P-01)

**Route:** `/itm` — **File:** `src/modules/itm/pages/ITMDashboard.jsx` — **Components:** C-01, C-02, C-03, C-05, C-08, C-09, C-13, C-15, C-39, C-40
**Layout:** Five-zone. Left Panel = module nav. Content Area = a KPI/cards grid. Right Panel = action queue (DD-20). See `itm_LAYOUTS.html` P-01.

**Purpose.** The coordinator/exec landing surface. Answers "is the portfolio compliant, what is due or overdue, how much recurring revenue is booked, and what needs my attention now."

**Content Area.** A responsive card grid (4-across desktop, 2-across tablet, stacked mobile per Design Guide Section 4.4):
- `ComplianceHealthCard` (C-01): aggregate compliance health from `Asset` next/last-inspection rollups and overdue `InspectionSchedule` counts. Traffic-light header (DD-07), `font-mono` counts.
- `UpcomingInspectionsCard` (C-02): next-due inspections from `InspectionSchedule.next_due_date`, each row with location, asset (`SystemTypeBadge` C-09), due-in-days. Overdue rows in `--red`.
- `RecurringRevenueCard` (C-03): booked vs. unbooked recurring revenue across `InspectionSeries`.
- Optional compact `AssetCard` (C-05) row for recently touched assets.

**Right Panel — Action Queue.** Sectioned, sections hidden when empty: Overdue Inspections, Awaiting QA (`BuildingInspection.status` completed + `QaReviewStatus` pending), Failed Tests (`SystemTest.passed=false`), Expiring Calibration (`TestEquipment` DUE_SOON/EXPIRED), Due-Soon Series. Each item is a clickable row (C-15 / C-40 badges) that deep-links per the navigation flow (Section 2.3).

**Field inventory (read-only rollups).** Asset identity (`type`, `status`) is HubSpot-read by `hubspotAssetId` (cached); ITM overlays `last_inspection`/`next_inspection`. ITM-native: `InspectionSchedule.next_due_date`, `InspectionSchedule.is_active`; `InspectionSeries` booked/unbooked (see SCOPE Section 6); inspection result `status`/`passed`; `SystemTest.passed`; `TestEquipment` calibration status.

**States.** Loading: Tier 2 section shimmer for each card, Tier 1 skeleton for queue rows (Design Guide 6.1). Empty: if the org has no assets, `EmptyState` (C-39) with "Register your first fire protection asset" CTA → Asset Registry. Error: card-level inline error with retry; a failed action-queue fetch shows a toast and a retry chip, never a blank panel.

### 4.2 Asset Registry (P-02)

**Route:** `/itm/assets` — **File:** `src/modules/itm/pages/AssetRegistry.jsx` — **Components:** C-04, C-05, C-07, C-08, C-09, C-10, C-39, C-40
**Layout:** Five-zone. Content = `AssetTable` (C-04). Left Panel = module nav with filter facets (location / system type / status). Right Panel = selected-asset snapshot (C-05). See `itm_LAYOUTS.html` P-02.

**Purpose.** A **HubSpot-backed reference/overlay view** of installed fire-protection systems (DD-02, DD-21). The core Asset records live in HubSpot and are read via the HubSpot API (ITM holds only `hubspotAssetId` + an ephemeral read cache, never a duplicate); ITM overlays its own compliance status. List, filter, and jump into an asset's full history. **Creating a new Asset happens in HubSpot**, not here.

**Content Area.** `AssetTable` columns blend HubSpot-read identity with ITM overlay: `name`, `SystemTypeBadge` (`type`), location (`hubspotLocationId` → HubSpot Location name), `system_id`, `manufacturer`/`model`, `AssetLifecycleBadge` (`status`), `last_inspection`, `next_inspection` (ITM compliance overlay, with due-in-days, `font-mono`). The page button is **[Open in HubSpot]** to add a new core Asset; ITM-owned overlay edits open `AssetFormModal` (C-07). Row click → Asset Detail (P-03). Selecting a row populates the Right Panel `AssetCard` snapshot with `ComplianceStandardChips` (C-10).

**Field inventory.** HubSpot-read (reference, by `hubspotAssetId`): `name`, `type`, `system_id`, `manufacturer`, `model`, `install_date`, `status`, `specifications` (JSON), `custom_fields` (JSON), `hubspotLocationId`. ITM overlay (owned): `last_inspection`/`next_inspection` rollups, compliance links via `AssetComplianceStandard`. ITM persists only the HubSpot ID + read cache (no duplicate).

**Interactions.** Left Panel facets filter the table client-side over the loaded page and re-query on change. Sort by next-due to triage. Bulk select for future bulk reschedule (parked). 

**States.** Loading: Tier 1 row skeletons (8 rows) while the HubSpot read resolves. Empty: `EmptyState` (C-39) "No assets yet — add a fire protection system in HubSpot to start tracking compliance" with [Open in HubSpot]. Error: inline table error band with retry; a HubSpot read failure shows a "Couldn't reach HubSpot" retry band, not a blank page; overlay-save errors show inline field validation + error toast (Design Guide 6.3).

### 4.3 Asset Detail (P-03)

**Route:** `/itm/assets/:id` — **File:** `src/modules/itm/pages/AssetDetail.jsx` — **Components:** C-05, C-06, C-07, C-08, C-09, C-10, C-15, C-31, C-39, C-40
**Layout:** Five-zone. Content = `AssetDetailPanel` (C-06) with a tabbed history. Right Panel = compliance/lifecycle snapshot. See `itm_LAYOUTS.html` P-03. **Context:** `assetId` from route param.

**Purpose.** The asset's compliance home: a **HubSpot Asset reference view with an ITM compliance overlay** (DD-02, DD-21). System identity is read from HubSpot via API (by `hubspotAssetId`, cached only); ITM contributes the accumulated inspection/test/maintenance history that drives "what's due, what's overdue, what failed." The core Asset record is edited in HubSpot.

**Content Area — `AssetDetailPanel`.** Header (HubSpot-read identity + ITM overlay): `name`, `SystemTypeBadge`, `AssetLifecycleBadge`, `system_id`, `manufacturer`/`model`, `install_date`, `warranty_expiry`, `ComplianceStandardChips` (ITM-owned). Tabbed history (ITM-native):
- **Inspections:** `BuildingInspection` rows (`inspection_date`, `inspector_name`, `status`, `passed`) with `StatusBadge` (C-40). Row → Review (P-08) or Workspace (P-07).
- **Tests:** `SystemTest` rows (`test_type`, `test_date`, `performed_by`, `passed`). Row → Testing & Maintenance filtered.
- **Maintenance:** `MaintenanceTable` (C-31) of `MaintenanceRecord` (`maintenance_type`, `maintenance_date`, `cost`, `next_maintenance`).
- **Compliance:** `AssetComplianceStandard` links with effective standard versions; lifecycle controls.
- **Schedules:** `InspectionScheduleRow` (C-15) showing the asset's recurring cadence.

**Header actions.** **[Edit in HubSpot]** for the core record / **[Edit overlay]** (C-07) for ITM compliance fields, **[+ New Series]** (C-12), and a **[Create crew shift]** action that pushes a Connecteam shift from the related Work Order (manual, DD-23). Core lifecycle transitions (active → decommissioned/replaced) are HubSpot writes; ITM reflects the resulting `status` in its overlay.

**States.** Loading: header skeleton + tab shimmer while the HubSpot read resolves. Empty per tab: e.g. "No inspections recorded for this asset yet" (C-39). Error: a HubSpot read failure shows a full-panel "Couldn't reach HubSpot" retry (not a blank page); ITM-overlay load failure shows a section-level retry.

### 4.4 Inspection Series List (P-04)

**Route:** `/itm/series` — **File:** `src/modules/itm/pages/InspectionSeriesList.jsx` — **Components:** C-03, C-08, C-11, C-12, C-13, C-39, C-40
**Layout:** Content + LP (no Right Panel; revenue summarized inline). See `itm_LAYOUTS.html` P-04.

**Purpose.** Manage contract-level recurring commitments. See which series are active/paused, what they have booked vs. unbooked, and what is upcoming or overdue.

**Content Area.** `InspectionSeriesTable` (C-11): series name, customer (`hubspotCustomerId` → HubSpot Customer), location/system scope (HubSpot references), frequency, `InspectionSeriesStatus` (C-40), upcoming/overdue rollup, booked vs. unbooked revenue (`font-mono`, DD-10). Header **[+ New Series]** opens `InspectionSeriesFormModal` (C-12). Row → Series Detail (P-05). An inline `RecurringRevenueCard`/`SeriesRevenuePanel` strip totals booked vs. unbooked across all series.

**Field inventory (`InspectionSeries`, ITM-native, see SCOPE Section 6):** name, `hubspotCustomerId` (reference), location/asset scope (HubSpot references), system scope, frequency, `InspectionSeriesStatus`, generation horizon, booked/unbooked revenue.

**States.** Loading: Tier 1 row skeletons. Empty: `EmptyState` (C-39) "No inspection series yet — define a recurring commitment to auto-generate work" with [+ New Series]. Error: inline retry band.

### 4.5 Inspection Series Detail (P-05)

**Route:** `/itm/series/:id` — **File:** `src/modules/itm/pages/InspectionSeriesDetail.jsx` — **Components:** C-09, C-12, C-13, C-15, C-16, C-39, C-40
**Layout:** Five-zone. Content = series config + generated schedules + visit history. Right Panel = `SeriesRevenuePanel` (C-13). See `itm_LAYOUTS.html` P-05. **Context:** `seriesId` from route.

**Purpose.** Operate one recurring series: review its config, see the `InspectionSchedule` records it generated, drill into visit history, and track its revenue.

**Content Area.** Config summary (customer, scope, frequency, horizon, status) with **[Edit Series]** (C-12). Generated schedules section: `InspectionScheduleRow` (C-15) per `InspectionSchedule` (`next_due_date`, due-in-days, `is_active`), each with a reschedule action (C-16) that can auto-shift future visits (SCOPE Phase 2). Visit history: `BuildingInspection` rows produced under this series with `StatusBadge` (C-40).

**Right Panel — `SeriesRevenuePanel` (C-13).** Booked (scheduled + work-ordered) vs. unbooked (committed but not yet generated) recurring revenue, `font-mono`.

**States.** Loading: config skeleton + schedule shimmer. Empty: "No schedules generated yet" with a [Generate Schedules] action (SCOPE Phase 2). Error: section-level retry.

### 4.6 Inspection Calendar (P-06)

**Route:** `/itm/calendar` — **File:** `src/modules/itm/pages/InspectionCalendar.jsx` — **Components:** C-02, C-09, C-14, C-15, C-16, C-39, C-40
**Layout:** Five-zone. Content = `InspectionCalendar` (C-14). Left Panel = location/system/series filters. Right Panel = selected-day list. See `itm_LAYOUTS.html` P-06.

**Purpose.** The **internal operations** cockpit (DD-09, DD-22). See upcoming and overdue inspections across the portfolio on a calendar, with overdue as the loudest signal. This is **not** client booking — client-facing scheduling, reminders/confirmations, and the customer portal happen in **HubSpot** off the Inspection ticket. Use this view to triage ITM cadence and reschedule the ITM-native schedule, not to book the customer.

**Content Area.** `InspectionCalendar` (C-14) month/week grid. Each cell shows scheduled visits from `InspectionSchedule`/`BuildingInspection` with color by due-state (overdue `--red`, due-soon `--orange`, on-track `--blue`, completed `--green`). `SystemTypeBadge` (C-09) on each entry. Clicking a populated cell opens the visit or `RescheduleModal` (C-16) for the ITM cadence; clicking an empty day starts an internal schedule. (When a schedule comes due, ITM creates the HubSpot Inspection ticket and HubSpot runs the client booking; this calendar does not message the customer.)

**Right Panel.** Selected-day list of `InspectionScheduleRow` (C-15) entries with quick reschedule.

**Field inventory:** `InspectionSchedule.next_due_date`, `frequency`, `is_active`, `locationId`, `assetId`; `BuildingInspection.inspection_date`, `status`.

**States.** Loading: calendar grid shimmer. Empty: month with no scheduled work shows an inline "Nothing scheduled this month" hint (not a full empty page since the grid itself is the content). Error: toast + retry; the grid retains last-good data where possible.

### 4.7 Inspection Workspace (P-07)

**Route:** `/itm/inspections/:id` — **File:** `src/modules/itm/pages/InspectionWorkspace.jsx` — **Components:** C-09, C-10, C-17, C-18, C-19, C-20, C-21, C-22, C-37 (gated), C-38 (gated), C-39, C-40
**Layout:** **Mobile full-screen PWA — NOT the five-zone shell** (DD-04). Single column, dark-mode-friendly, large tap targets, one-thumb reachable. See `itm_LAYOUTS.html` P-07 (mobile full-screen form). **Context:** inspection `id` from route. **OFFLINE-FIRST** (DD-05).

**Purpose.** The field inspector completes the NFPA-compliant inspection on a phone, fully offline if needed, capturing readings, photos, signatures, and deficiencies.

**Offline-first behavior (DD-05).** On open, the inspection record, its `InspectionForm.form_schema`, and prior asset context are cached to IndexedDB. All edits write to the local store immediately. `OfflineSyncIndicator` (C-22) shows ONLINE / OFFLINE (queued N) / SYNCING / SYNC ERROR. On reconnect, queued submissions sync automatically; conflicts surface as a retry card, never as data loss. The inspector can complete and "submit" entirely offline — submission enqueues and flushes when connectivity returns (SCOPE Phase 3 exit criteria).

**Structure.**
- Workspace header (`InspectionWorkspace` C-17): asset name, `SystemTypeBadge` (C-09), `ComplianceStandardChips` (C-10), `OfflineSyncIndicator` (C-22), progress.
- `QuestionSetRenderer` (C-18): renders `InspectionForm.form_schema` into the question set; answers persist to `BuildingInspection.form_data` (local first). Question set is served by system `type` + selected form. Context (building/asset/history) pre-populates to reduce re-entry (SCOPE Phase 3 task 6).
- `DeficiencyCaptureCard` (C-19): a deficient answer auto-prompts deficiency capture → **creates a HubSpot Deficiency Work Order ticket** (`title`, `description`, `severity`, `category`, `location_notes`, `photo_urls`) via the HubSpot API, linked to this inspection result by `hubspotInspectionTicketId`; ITM stores only `hubspotDeficiencyTicketId` (DD-21, SCOPE DD-05/1.3). Offline: the ticket write is queued in IndexedDB and flushed to HubSpot on reconnect.
- `PhotoAnnotator` (C-20): photo capture + markup, offline-buffered, stored as `photo_urls`.
- `SignaturePad` (C-21): inspector/owner signature.
- Gated AI surface: when Feature 20.4 is enabled, `AiSuggestionPanel` (C-37) inline suggestions (accept/reject only, DD-11) and `CodeReferenceDrawer` (C-38) for code context.

**Field inventory (inspection result, ITM-native keyed to the HubSpot ticket):** `inspection_date`, `inspector_name`, `status` (scheduled → in_progress → completed), `passed`, `form_data` (JSON), `report_url`, `hubspotAssetId`, `inspectionScheduleId`, `inspectionFormId`, `hubspotLocationId`, `hubspotInspectionTicketId`. Created deficiency → HubSpot ticket (`hubspotDeficiencyTicketId`) with the fields above.

**States.** Loading: full-screen logo pulse with "Loading inspection…" (Tier 3, Design Guide 6.1) while caching for offline. Empty: if no form is assigned, a guard screen "No inspection form configured for this system type" with a contact-admin note. Error: offline is a normal state (banner, not error); a true submit failure shows a non-blocking retry card and keeps local data. **Animation-light** per Design Guide 7.5 — no entrance animation on data entry.

### 4.8 Inspection Review (P-08)

**Route:** `/itm/inspections/:id/review` — **File:** `src/modules/itm/pages/InspectionReview.jsx` — **Components:** C-05, C-09, C-18, C-19, C-20, C-21, C-23, C-24, C-39, C-40
**Layout:** Five-zone. Content = completed answers + history compare. Right Panel = QA controls. See `itm_LAYOUTS.html` P-08. **Context:** inspection `id` from route.

**Purpose.** A QA reviewer/field manager validates a completed inspection against the prior inspection of the same asset before it can be finalized and reported (DD-19).

**Content Area.** Read view of the submitted `QuestionSetRenderer` answers (`form_data`), captured deficiencies (C-19), photos (C-20), and signatures (C-21). `InspectionHistoryCompare` (C-23) shows current vs. previous inspection of the same asset side by side — new deficiencies, changed readings, status deltas highlighted.

**Right Panel — `QaReviewPanel` (C-24).** `QaReviewStatus` control, reviewer notes, and a finalize gate: finalize is blocked until QA is approved (SCOPE Phase 4 exit). Approving seeds a `InspectionReport` and routes to Report Builder (P-10).

**Field inventory:** `BuildingInspection.form_data`, `passed`, `status`, `inspector_name`, `inspection_date`; `Deficiency` rows; `QaReviewStatus` (new enum).

**States.** Loading: content skeleton + Right Panel shimmer. Empty: if there is no prior inspection, the compare pane shows "No previous inspection to compare" (C-39 inline). Error: review fetch failure → full-panel retry. QA action errors → toast, gate stays closed.

### 4.9 Inspection Reports List (P-09)

**Route:** `/itm/reports` — **File:** `src/modules/itm/pages/InspectionReportsList.jsx` — **Components:** C-25, C-28, C-39, C-40
**Layout:** Content + LP (no Right Panel). See `itm_LAYOUTS.html` P-09.

**Purpose.** Track generated reports and their delivery to building owners (delivery itself runs through HubSpot / the customer portal, DD-24).

**Content Area.** `InspectionReportTable` (C-25): report title, recipient (`hubspotCustomerId` → HubSpot Customer), `InspectionReportFormat` (NFPA/JC/service summary/deficiencies-only), `InspectionReportStatus` (DRAFT → QA_REVIEW → APPROVED → SENT, C-40), created date, delivery date. Row → Report Builder (P-10). A **[Send]** action on an APPROVED report opens `SendReportModal` (C-28), which delivers via HubSpot / the portal.

**Field inventory (`InspectionReport`, ITM-native, see SCOPE Section 6):** title, `hubspotCustomerId` (reference, recipient), `InspectionReportFormat`, `InspectionReportStatus`, generated PDF URL (via Documents), sent date, delivery channel (HubSpot/portal).

**States.** Loading: row skeletons. Empty: `EmptyState` (C-39) "No reports yet — approve an inspection to build its report." Error: inline retry band.

### 4.10 Report Builder (P-10)

**Route:** `/itm/reports/:id` — **File:** `src/modules/itm/pages/ReportBuilder.jsx` — **Components:** C-09, C-26, C-27, C-28, C-39, C-40
**Layout:** Five-zone. Content = `ReportPreview` (C-27). Right Panel = `ReportBuilderPanel` (C-26) shaping controls. See `itm_LAYOUTS.html` P-10. **Context:** report `id` from route.

**Purpose.** Shape one branded report from a single data set and deliver it (DD-06).

**Content Area — `ReportPreview` (C-27).** Live, branded preview (logo, DBA, cover letter) that re-renders as the builder controls change. Reflects the current shape in real time.

**Right Panel — `ReportBuilderPanel` (C-26).** Reshaping controls over the report's `InspectionReportItem` set: system-type filter, deficiencies-only toggle, format switch (NFPA vs. Joint Commission), service-summary mode, per-section include/exclude. Branding fields (cover letter text). **[Create proposal]** is a **handoff button to HubSpot** — it pushes the deficiency set to HubSpot, where proposals live (DD-24); ITM does not build proposals. **[Send]** opens `SendReportModal` (C-28) to deliver via HubSpot / the customer portal; send is gated on `InspectionReportStatus` = APPROVED. Invoicing for completed service is a QBO handoff, not done here.

**Field inventory:** `InspectionReport` (format, status, branding, recipient), `InspectionReportItem` (per-section config + linked `BuildingInspection`).

**States.** Loading: preview shimmer + control skeleton. Empty: a report with no items shows "No inspections attached to this report." Error: PDF generation failure → toast with retry, preview keeps last-good render; delivery failure → modal-level error, status not advanced.

### 4.11 Testing & Maintenance (P-11)

**Route:** `/itm/testing` — **File:** `src/modules/itm/pages/TestingMaintenance.jsx` — **Components:** C-09, C-29, C-30, C-31, C-32, C-39, C-40
**Layout:** Five-zone, tabbed content (Tests / Maintenance / PM Schedule). Right Panel = asset/PM context. See `itm_LAYOUTS.html` P-11.

**Purpose.** Log tests with pass/fail against standards, record maintenance with work-order linkage, and manage the preventive-maintenance schedule.

**Content Area — tabs.**
- **Tests:** `TestRecordTable` (C-29) of `SystemTest` (`test_type`, `test_date`, `performed_by`, `passed`, `results` JSON, `report_url`). **[+ Test Record]** opens `TestRecordModal` (C-30). Pass/fail is computed against the applicable `ComplianceStandard`; a failed test is surfaced to Service (SCOPE Phase 5) and to the Dashboard queue (DD-20).
- **Maintenance:** `MaintenanceTable` (C-31) of `MaintenanceRecord` (`maintenance_type`, `maintenance_date`, `performed_by`, `description`, `parts_replaced` JSON, `labor_hours`, `cost`, `next_maintenance`). **[+ Maintenance]** opens `MaintenanceModal` (C-32) with work-order linkage.
- **PM Schedule:** upcoming preventive maintenance per asset from `next_maintenance`, generating upcoming maintenance work.

**Link.** **[Test Equipment & Calibration →]** navigates to P-12.

**States.** Loading: tab content skeleton. Empty per tab: e.g. "No test records yet" / "No maintenance logged" (C-39). Error: inline retry per tab; modal save errors inline + toast.

### 4.12 Test Equipment & Calibration (P-12)

**Route:** `/itm/testing/equipment` — **File:** `src/modules/itm/pages/TestEquipmentCalibration.jsx` — **Components:** C-33, C-34, C-39, C-40
**Layout:** Content + LP (no Right Panel). See `itm_LAYOUTS.html` P-12.

**Purpose.** Track test instruments and keep their calibration current so test results are defensible.

**Content Area.** `TestEquipmentTable` (C-33) of `TestEquipment` with `CalibrationStatus` (VALID `--green` / DUE_SOON `--orange` / EXPIRED `--red`, C-40), next-cal date, and last `CalibrationRecord`. **[+ Calibration]** opens `CalibrationModal` (C-34). Expanding a row reveals calibration history.

**Field inventory (`TestEquipment` / `CalibrationRecord`, see SCOPE Section 6):** instrument name/serial, `TestEquipmentStatus`, `CalibrationStatus`, last/next calibration dates, calibrating authority, certificate URL.

**States.** Loading: row skeletons. Empty: `EmptyState` (C-39) "No test equipment registered." Error: inline retry band; DUE_SOON/EXPIRED instruments also raised to the Dashboard queue (DD-20).

### 4.13 Admin: Inspection Forms (P-13)

**Route:** `/admin` (ITM tab) with alias `/itm/forms` — **File:** `src/modules/itm/components/admin/InspectionFormBuilder.jsx` (hosted in the admin shell) — **Components:** C-09, C-10, C-35, C-36, C-39, C-40
**Layout:** Admin shell with left tabs (DD-13). See `itm_LAYOUTS.html` P-13.

**Purpose.** Tenant admins author and version the NFPA-compliant JSON-schema inspection forms (NFPA 13/25/72/custom).

**Content Area.** `InspectionFormBuilder` (C-35): list of `InspectionForm` records (`name`, `type`, `version`, `is_active`) with create/version/activate actions; an editor canvas to build the question set. `FormSchemaFieldEditor` (C-36) edits each field: type, label, options, required, and deficiency-trigger mapping (which answers auto-create a `Deficiency`). Versioning preserves prior `version` rows as inactive; activation flips `is_active`.

**Field inventory (`InspectionForm`):** `name`, `type`, `version`, `form_schema` (JSON), `is_active`.

**States.** Loading: form list + canvas skeleton. Empty: "No inspection forms yet — start from an NFPA template or build a custom form" (C-39). Error: schema-save validation errors inline (invalid JSON schema blocks save) + toast.

### 4.14 AI Code Intelligence (P-14)

**Route:** `/itm/ai` — **File:** `src/modules/itm/pages/AICodeIntelligence.jsx` — **Components:** C-09, C-10, C-37, C-38, C-39, C-40
**Layout:** Five-zone. Content = code library + checklist generation. Right Panel = `AiSuggestionPanel` (C-37). See `itm_LAYOUTS.html` P-14. **GATED:** renders only when Feature 20.4 is enabled (DD-12).

**Purpose.** Keep the NFPA code library current, auto-generate inspection checklists by system type and code, and review AI suggestions — all human-confirmed (DD-11).

**Content Area.** NFPA code library browser (`CodeReferenceDrawer` C-38 for detail), a "generate checklist" action that drafts an `InspectionForm` from a system `type` + applicable NFPA `ComplianceStandard` (editable before save), and a code-update detector that flags affected forms.

**Right Panel — `AiSuggestionPanel` (C-37).** Accept/reject cards for `AiSuggestion` records (`AiSuggestionType`, `AiSuggestionStatus`). Nothing is applied without explicit acceptance; every decision is logged (SCOPE Phase 6 exit). Suggestions also surface inline in the Workspace (P-07).

**States.** Loading: library + suggestion shimmer. Empty: "No AI suggestions pending" (C-39). Error: AI-service failure → non-blocking notice; the page degrades to the static code library, no auto-apply ever.

### 4.15 Key Modals

Modals follow Design Guide Section 5.5 (backdrop `bg-black/60` + `backdrop-blur-sm`, `scaleIn` enter / `scaleOut` exit, top-right close). Layout per `itm_LAYOUTS.html` (single-cell modal tables).

- **Asset Edit — `AssetFormModal` (C-07).** ITM does not own Asset CRUD (DD-21). The core identity (`name`, `type`, `system_id`, `manufacturer`, `model`, `install_date`, warranty, `hubspotLocationId`, `specifications`/`custom_fields`) is edited in **HubSpot** — the modal links out / opens HubSpot for those. This modal edits only ITM-owned overlay fields: compliance-standard multi-select (`AssetComplianceStandard`) and ITM compliance status. Validation inline; overlay save → PATCH ITM overlay only.
- **Series Create/Edit — `InspectionSeriesFormModal` (C-12).** Fields: name, `hubspotCustomerId` (HubSpot Customer reference), location/asset scope (HubSpot references), system scope, frequency, generation horizon (SCOPE OQ-03). Save generates ITM-native schedules per horizon.
- **Reschedule — `RescheduleModal` (C-16).** New date for a visit on the ITM cadence, with an "auto-shift future visits" toggle to keep the series cadence aligned (SCOPE Phase 2). This reschedules the internal schedule; client-facing rebooking happens in HubSpot off the ticket (DD-22).
- **Send Report — `SendReportModal` (C-28).** Recipient (`hubspotCustomerId`), message; delivers **via HubSpot / the customer portal** (DD-24, SCOPE OQ-04), records ITM-side delivery, advances status to SENT, and triggers the QBO invoicing handoff. ITM does not email the customer outside the HubSpot channel.
- **Test Record — `TestRecordModal` (C-30).** `test_type`, `test_date`, `performed_by`, `results` (readings JSON, `font-mono`), test-equipment link, `passed` computed against standard, `report_url`.
- **Maintenance — `MaintenanceModal` (C-32).** `maintenance_type`, `maintenance_date`, `performed_by`, `description`, `parts_replaced`, `labor_hours`, `cost`, `next_maintenance`, work-order link.
- **Calibration — `CalibrationModal` (C-34).** Instrument, calibration date, next-due, authority, certificate URL → `CalibrationRecord`; updates `CalibrationStatus`.
- **AI Suggestion Review (C-37 surface).** Accept/reject a single `AiSuggestion` with rationale; logs `AiSuggestionStatus` (DD-11). Gated.

---

## 5. Animation Summary

Global rules per the HELM UI/UX Design Guide Section 7, applied to ITM. anime.js is the engine; durations and easings come from `ANIMATION` tokens in `designSystem.js`. Never animate layout properties — only `transform` and `opacity` (Design Guide 7.4.1). Respect `prefers-reduced-motion` (7.4.2). Stagger capped at 8–10 items (7.4.3).

### 5.1 Page-Level Animations

| Page | Animation | Details |
|------|-----------|---------|
| ITM Dashboard (P-01) | Staggered `fadeUp` | KPI cards (C-01/02/03) 80ms stagger → action-queue items 40ms stagger; KPI values count up (`duration.dramatic`, `easing.snap`) |
| Asset Registry (P-02) | `fadeUp` | Filter bar → `AssetTable` rows 50ms stagger (cap 8) |
| Asset Detail (P-03) | `fadeUp` | Header → active history tab content 80ms; tab swap = exit old `fadeOut` 150ms then enter new `fadeUp` (7.4.5) |
| Series List (P-04) | `fadeUp` | Revenue strip → table rows 50ms stagger (cap 10) |
| Series Detail (P-05) | `fadeUp` | Config → schedule rows 50ms stagger → Right Panel revenue (80ms delay); revenue figures count up |
| Calendar (P-06) | `fadeIn` | Grid fades in once; cell entries do not individually stagger (avoid 30+ stagger, 7.4.3); Right-Panel day list `fadeUp` 50ms |
| Inspection Workspace (P-07) | **Minimal** | Animation-light per 7.5 (data entry). Only the `OfflineSyncIndicator` state transitions animate (see 5.2) |
| Inspection Review (P-08) | `fadeUp` | Content → `InspectionHistoryCompare` columns slide in (`slideRight`) → Right Panel QA `fadeUp` (80ms delay) |
| Reports List (P-09) | `fadeUp` | Table rows 50ms stagger (cap 10) |
| Report Builder (P-10) | `fadeUp` | Preview `fadeIn`; on control change the preview re-renders without full re-animation (no flashing) |
| Testing & Maintenance (P-11) | `fadeUp` | Tab content rows 50ms stagger; tab swap exit-before-enter |
| Test Equipment & Calibration (P-12) | `fadeUp` | Rows 50ms stagger (cap 8) |
| Admin: Inspection Forms (P-13) | `fadeUp` | Header → form list (no row stagger on static config) |
| AI Code Intelligence (P-14) | `fadeUp` | Library → suggestion cards 60ms stagger |

### 5.2 Component-Level Animations

| Component | Animation | Details |
|-----------|-----------|---------|
| All modals (C-07/12/16/28/30/32/34) | Enter `scaleIn` 300ms `easing.snap`; exit `scaleOut` 200ms `easing.gentle` | Exit-before-enter on content swap |
| `OfflineSyncIndicator` (C-22) | State transitions: SYNCING shows a thin indeterminate accent line (Design Guide 6.4); ONLINE→OFFLINE fades the chip color, SYNC ERROR pulses once in `--red` | Never blocking; no looping distraction while OFFLINE (static chip) |
| `StatusBadge` live/pending (C-40) | Optional `scale [1,1.15]` + `opacity [1,0.7]` loop | Only on in_progress/awaiting-QA/SYNCING indicators (7.3) |
| KPI counters (C-01/03/13) | `innerHTML [0, target]` | 800ms `easing.snap`, `font-mono` |
| Toasts (errors/success) | `translateY [40,0]` + `opacity [0,1]` | 300ms, bottom-right desktop / bottom-center mobile (6.3) |
| Table row stagger | `fadeUp` 50ms | Cap 8–10; remainder appear instantly |
| `InspectionCalendar` (C-14) cell hover/select | Instant transform highlight | No entrance animation per cell |
| `ReportPreview` (C-27) update | Cross-content avoided; re-render in place | No animation on control-driven reshape (data clarity over motion) |
| `CodeReferenceDrawer` (C-38) | Slide-over `slideRight` 300ms `easing.smooth` | Gated; exit reverse |
| `AiSuggestionPanel` cards (C-37) | `fadeUp` 60ms stagger | Gated |

### 5.3 Mobile Animation Adjustments

Per Design Guide 7.4.6 and the offline-first Workspace (DD-04):
- Durations reduced ~30% on mobile (300ms → 200ms, 800ms → 560ms).
- No stagger on mobile — items appear together with a single `fadeUp`.
- The Inspection Workspace runs the lightest profile: only the sync indicator animates; question rendering and data entry are instant.
- `prefers-reduced-motion` always honored — skip all animation, show content immediately.

### 5.4 Animations NOT Used

Per Design Guide 7.5:
- No animation on form inputs, dropdowns, or selection UI (entire Workspace data-entry surface).
- No animation on error states (errors appear instantly).
- No continuous scroll animations, no parallax.
- Calendar cells and report preview re-render without motion to keep dense data legible.

---

## 6. File Structure

Module-first layout (DD-14). All paths relative to repo root.

> **Build-target note (DD-21 build target, SCOPE DD-11).** The `src/modules/itm/...` and `api/src/modules/itm/...` paths below are the **Helm-integration target**. The actual app is built in **Replit** as a **standalone mobile/iPad-native app** that runs on its own; the Replit build re-casts this tree into the native app structure (offline-first workspace, asset/inspection/test/maintenance/report flows, recurring-series cadence) and integrates with Helm later via the HubSpot system of record (CRM objects + Work Order tickets), Connecteam (crew dispatch), QBO (invoicing), and Helm APIs for the native execution/compliance data. The file tree is retained as the integration contract; per-phase Replit prompts (`itm_AGENT_PROMPTS.md`) restate it for the standalone structure.

```
src/modules/itm/
├── pages/
│   ├── ITMDashboard.jsx                  (P-01)
│   ├── AssetRegistry.jsx                 (P-02)
│   ├── AssetDetail.jsx                   (P-03)
│   ├── InspectionSeriesList.jsx          (P-04)
│   ├── InspectionSeriesDetail.jsx        (P-05)
│   ├── InspectionCalendar.jsx            (P-06)
│   ├── InspectionWorkspace.jsx           (P-07, mobile full-screen PWA)
│   ├── InspectionReview.jsx              (P-08)
│   ├── InspectionReportsList.jsx         (P-09)
│   ├── ReportBuilder.jsx                 (P-10)
│   ├── TestingMaintenance.jsx            (P-11)
│   ├── TestEquipmentCalibration.jsx      (P-12)
│   └── AICodeIntelligence.jsx            (P-14, gated)
│
├── components/
│   ├── ComplianceHealthCard.jsx          (C-01)
│   ├── UpcomingInspectionsCard.jsx       (C-02)
│   ├── RecurringRevenueCard.jsx          (C-03)
│   ├── AssetTable.jsx                     (C-04)
│   ├── AssetCard.jsx                      (C-05)
│   ├── AssetDetailPanel.jsx              (C-06)
│   ├── AssetFormModal.jsx                 (C-07)
│   ├── AssetLifecycleBadge.jsx           (C-08)
│   ├── SystemTypeBadge.jsx               (C-09)
│   ├── ComplianceStandardChips.jsx       (C-10)
│   ├── InspectionSeriesTable.jsx         (C-11)
│   ├── InspectionSeriesFormModal.jsx     (C-12)
│   ├── SeriesRevenuePanel.jsx            (C-13)
│   ├── InspectionCalendar.jsx            (C-14)
│   ├── InspectionScheduleRow.jsx         (C-15)
│   ├── RescheduleModal.jsx               (C-16)
│   ├── InspectionWorkspace.jsx           (C-17, workspace host)
│   ├── QuestionSetRenderer.jsx           (C-18)
│   ├── DeficiencyCaptureCard.jsx         (C-19)
│   ├── PhotoAnnotator.jsx                 (C-20)
│   ├── SignaturePad.jsx                   (C-21)
│   ├── OfflineSyncIndicator.jsx          (C-22)
│   ├── InspectionHistoryCompare.jsx      (C-23)
│   ├── QaReviewPanel.jsx                  (C-24)
│   ├── InspectionReportTable.jsx         (C-25)
│   ├── ReportBuilderPanel.jsx            (C-26)
│   ├── ReportPreview.jsx                 (C-27)
│   ├── SendReportModal.jsx               (C-28)
│   ├── TestRecordTable.jsx               (C-29)
│   ├── TestRecordModal.jsx               (C-30)
│   ├── MaintenanceTable.jsx              (C-31)
│   ├── MaintenanceModal.jsx              (C-32)
│   ├── TestEquipmentTable.jsx            (C-33)
│   ├── CalibrationModal.jsx              (C-34)
│   ├── AiSuggestionPanel.jsx             (C-37, gated)
│   ├── CodeReferenceDrawer.jsx           (C-38, gated)
│   ├── EmptyState.jsx                     (C-39)
│   ├── StatusBadge.jsx                    (C-40)
│   │
│   └── admin/
│       ├── InspectionFormBuilder.jsx     (C-35)
│       └── FormSchemaFieldEditor.jsx     (C-36)
│
├── hooks/
│   ├── useAssets.js
│   ├── useComplianceStandards.js
│   ├── useInspectionSeries.js
│   ├── useInspectionSchedules.js
│   ├── useInspections.js
│   ├── useInspectionForms.js
│   ├── useReports.js
│   ├── useTests.js
│   ├── useMaintenance.js
│   ├── useTestEquipment.js
│   └── useAiSuggestions.js
│
└── index.js                              (module registration)
```

**Backend (for reference, summarized in SCOPE Section 7):** `api/src/modules/itm/{routes.ts, assets.ts, series.ts, schedules.ts, inspections.ts, forms.ts, reports.ts, testing.ts, ai.ts}`.

**Notes.**
- `InspectionCalendar.jsx` and `InspectionWorkspace.jsx` exist as both a page and a component: the page is the route host; the component is the reusable body. The page imports the component.
- Admin components (C-35, C-36) live under `src/modules/itm/components/admin/` (DD-13/DD-14); the admin shell loads them via the app-shell tab-registration pattern (out of scope for this module, same convention as partner_network).
- AI files (C-37, C-38, `useAiSuggestions.js`, `AICodeIntelligence.jsx`, `CodeReferenceDrawer.jsx`) ship in Phase 6 and render only when Feature 20.4 is enabled (DD-12).
- The Inspection Workspace requires a service-worker / offline-cache registration (SCOPE Phase 3 "Files Modified"); the IndexedDB queue logic lives with `useInspections.js` and `OfflineSyncIndicator` (C-22).

---

## 7. Revision Log

| Date | Version | Author | What Changed |
|------|---------|--------|-------------|
| 2026-06-13 | 1.0 | Deb + AI Support | Initial ITM UI spec from `itm_SCOPE.md` and the `partner_network_UI_SPEC` exemplar. 20 design decisions (DD-01..DD-20), 14 pages (P-01..P-14) plus key modals specified, 40 shared components (C-01..C-40) with a component × page matrix, animation summary aligned to the HELM UI/UX Design Guide, and module-first file structure. Offline-first Inspection Workspace and gated AI surface documented. Layout zones reference `itm_LAYOUTS.html`; field inventories reference `api/prisma/schema.prisma` and SCOPE Section 6. |
| 2026-06-13 | 1.3 | Deb + AI Support | Aligned to SCOPE v1.3 integration architecture (DD-09/DD-10/DD-11). Added DD-21..DD-24: HubSpot is the system of record (Customer/Contact, Location, Asset nestable, AHJ, and the Inspection/Deficiency Work Order tickets) with a no-duplication rule (IDs + read cache only); HubSpot owns client scheduling, notifications, and the customer portal; Connecteam is internal crew dispatch only (manual "Create crew shift" action); reports hand off to HubSpot (proposals, delivery) and QBO (invoicing). Recast Asset Registry/Asset Detail (P-02/P-03) as HubSpot-backed reference/overlay views and `AssetFormModal` (C-07) as an ITM-overlay editor (Asset CRUD moves to HubSpot). Deficiency capture (C-19) now creates a HubSpot Deficiency ticket. Inspection Calendar (P-06) is explicitly internal operations only, not client booking. Report Builder/Send Report (P-10, C-26/C-28) reflect HubSpot proposal handoff and HubSpot/portal delivery + QBO invoicing. Updated field inventories to HubSpot reference IDs. Added the Replit standalone-build target note to the header and file-structure section; kept all 14 pages, C-01..C-40, the component×page matrix, the offline-first Workspace, animation section, and the file tree. |

---

*REF-ITM-2003 • v1.3 • Companion to itm_SCOPE.md (v1.3) and itm_LAYOUTS.html*
