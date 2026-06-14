# ITM — Agent Prompts (Replit Build)

**Module ID:** `itm`
**Module #:** 20
**GitHub Label:** `module/itm`
**Version:** 1.0
**Date:** 2026-06-13
**Status:** Build-Ready
**Build agent:** Replit (Replit AI / Replit Agent)
**Companion:** `itm_SCOPE.md` (master, v1.3), `itm_DATA_MODEL.md` (schema/enums/API, v1.0), `itm_UI_SPEC.md` (frontend, v1.3), `itm_LAYOUTS.html` (zone wireframes).

> This file contains one self-contained, copy-paste-ready Replit prompt per build phase (Phases 0 through 6 from `itm_SCOPE.md` Section 10). The ITM app is built in **Replit** as a **standalone React Native (Expo) app** for iPad/mobile (SCOPE DD-11), offline-first, designed to integrate with Helm later through the HubSpot system of record and Helm APIs.
>
> Each phase is a **solo** Replit build (no Claude/Cursor/Copilot split). Paste the whole phase block into Replit. Do not start a phase until the previous one passes its Exit Criteria.

---

## Standalone App Structure (shared by every prompt)

Replit builds a single Expo project. File ownership in each prompt is relative to this root. This re-casts the Helm-integrated `src/modules/itm/...` and `api/src/modules/itm/...` paths (SCOPE Section 10, DD-11) into the standalone native-app layout.

```
itm-app/
├── app/                         # Expo Router routes (file-based)
│   ├── _layout.tsx              # root layout, providers, auth gate
│   ├── (auth)/                  # login / provider picker
│   ├── (tabs)/                  # dashboard, assets, series, calendar, reports, testing
│   │   ├── index.tsx            # ITM Dashboard (P-01)
│   │   ├── assets/              # Asset Registry + [id] detail (P-02, P-03)
│   │   ├── series/              # Series list + [id] detail (P-04, P-05)
│   │   ├── calendar.tsx         # Inspection Calendar (P-06)
│   │   ├── reports/             # Reports list + [id] builder (P-09, P-10)
│   │   └── testing/             # Testing & Maintenance + equipment (P-11, P-12)
│   ├── inspections/[id]/        # Workspace (P-07) + review (P-08)
│   ├── admin/forms/             # Inspection Forms builder (P-13)
│   └── ai/                      # AI Code Intelligence (P-14, gated)
├── components/                  # gluestack-ui-based shared kit (C-01..C-40)
│   └── admin/                   # InspectionFormBuilder, FormSchemaFieldEditor (C-35, C-36)
├── db/                          # expo-sqlite + Drizzle
│   ├── schema.ts                # Drizzle schema (DATA_MODEL Section 2)
│   ├── client.ts                # db handle + migrations
│   └── seed.ts                  # seed data (org_beacon_test_001)
├── lib/
│   ├── auth/                    # pluggable OAuth (AuthProviderConfig, Microsoft Entra)
│   ├── sync/                    # sync outbox engine + reconnect drain
│   ├── integrations/
│   │   ├── hubspot/             # HubSpot connector (objects, tickets, proposal handoff)
│   │   ├── connecteam/          # Connecteam connector (crew shift push)
│   │   └── qbo/                 # QBO connector (invoice handoff)
│   ├── session.ts               # session + org_id resolver (never from request body)
│   └── api.ts                   # thin ITM sync/integration service client
├── hooks/                       # TanStack Query hooks (useAssets, useInspections, ...)
├── theme/                       # NativeWind v4 tokens (dark-first, sunlight contrast)
└── app.config.ts                # Expo + EAS Build config (iPad target)
```

**Tech stack every prompt must use:** Expo (React Native) + Expo Router + NativeWind v4 + gluestack-ui v2 (shadcn-equivalent primitives), TanStack Query, react-hook-form + zod, expo-sqlite + Drizzle ORM (offline-first local store + sync outbox), expo-camera / expo-image-picker / expo-location / react-native-signature-canvas (inspection workspace), expo-print (reports), pluggable OAuth with **Microsoft Entra ID** behind an `AuthProviderConfig` abstraction (no Supabase), EAS Build for iPad. Preview via **Expo Go** inside Replit.

**Test org ID:** `org_beacon_test_001`.

---

## Phase 0 — Foundation (Replit, Prompt ITM-P0)

```
## Context
You are building the foundation of the ITM (Inspection, Testing & Maintenance) app for Beacon Fire Protection: a standalone, offline-first React Native (Expo) app for iPad/mobile, built entirely in Replit and previewed in Expo Go. ITM is a fire-protection compliance engine that orchestrates over external systems of record. This phase scaffolds the project, the local data layer, the sync outbox, pluggable auth, and the integration connector stubs. No feature screens yet.

## Before Writing Code
Read these, in order, before writing anything:
1. itm_SCOPE.md — Sections 1.3 (integration architecture / systems of record), 4 (dependencies), 6 (ownership split), 10 Phase 0, 12 (Replit build agent), 15 (Replit prompt intent). This is the master context.
2. itm_DATA_MODEL.md — Section 0 (architecture context), Section 1 (all enums), Section 2 (every model: 2.1 ITM-native, 2.2 HubspotObjectCache, 2.3 integration/sync/auth, 2.4 referenced-not-owned), Section 3.7 + 3.9 (integration + auth API surface). This is the authoritative schema and API contract; do not invent fields.

## Architecture Rules (non-negotiable)
- org_id comes from the authenticated session only, never from a request body, query, or param. Resolve it in lib/session.ts and thread it through every query and outbox write.
- No duplication of HubSpot/Connecteam/QBO data. ITM stores only external IDs (hubspot_*_id, connecteam_shift_id, qbo refs) plus the TTL-bound HubspotObjectCache. Never persist a second authoritative copy of an external record.
- All external writes go through the integration layer (lib/integrations/*) and the sync outbox (lib/sync). Nothing writes to HubSpot/Connecteam/QBO directly from a screen or hook.
- Every ITM-native table includes id, org_id, created_at, updated_at, sync_status, and is indexed on org_id. Use snake_case columns per DATA_MODEL Section 0.
- Auth is pluggable via AuthProviderConfig; Microsoft Entra ID is the initial provider. No Supabase.

## Task
Reference itm_SCOPE.md Section 10 Phase 0 for the full task list. Deliver:
1. Expo project scaffold with Expo Router, NativeWind v4, gluestack-ui v2, TanStack Query provider, react-hook-form + zod. App boots to a placeholder authed shell. EAS Build config targets iPad.
2. Drizzle schema in db/schema.ts implementing every model in DATA_MODEL Section 2 (2.1 ITM-native, 2.2 HubspotObjectCache, 2.3 IntegrationConnection / SyncOutboxItem / AppUser / AuthProviderConfig) with all enums from Section 1 as TEXT + CHECK constraints. db/client.ts wires expo-sqlite + migrations.
3. db/seed.ts implementing the record matrix in SCOPE Section 9, scoped to org_beacon_test_001, with at least one record per enum state (including the new ITM enums and the integration/auth tables).
4. Sync outbox skeleton in lib/sync: enqueue (CREATE/UPDATE/DELETE), a drain runner keyed off connectivity, idempotency by client_uuid, and SyncStatus transitions. Outbox replays to a target_provider or the ITM service.
5. Pluggable OAuth in lib/auth: AuthProviderConfig-driven login, Microsoft Entra ID provider, AppUser upsert on callback, session + org_id resolver in lib/session.ts. Implement /auth endpoints per DATA_MODEL Section 3.9 against the thin ITM service client (lib/api.ts).
6. Integration connector stubs in lib/integrations/{hubspot,connecteam,qbo}: typed client interfaces with method signatures for the writes in DATA_MODEL Section 3.7 (HubSpot objects/tickets/proposal-handoff, Connecteam shift push, QBO invoice handoff) plus HubspotObjectCache read-through. Stubs return typed mock data but route through the outbox where they write.
7. Shared component kit in components/: the gluestack-based near-match of shadcn primitives the later phases need (Button, Card, Badge/StatusBadge C-40, Table, Modal/Sheet, Input, Tabs, EmptyState C-39), dark-first NativeWind tokens in theme/ tuned for sunlight contrast.

## Exit Criteria
- [ ] App runs in Expo Go on iPad with zero console errors.
- [ ] Drizzle migrations apply cleanly on a fresh device DB; seed populates every model and every enum state per SCOPE Section 9.
- [ ] An offline write (e.g. a seeded local edit) persists to SQLite immediately and enqueues a SyncOutboxItem; the drain runner flushes it when connectivity returns (simulate online/offline).
- [ ] Login via the Microsoft Entra provider resolves a session and upserts an AppUser; org_id is read from the session, never from a request.
- [ ] Integration connector stubs compile and route writes through the outbox; HubspotObjectCache read-through returns cached payloads with a TTL.
- [ ] Zero console errors; Phase 0 outcome: data layer + sync outbox + auth + integration stubs + component kit in place.

## File Ownership
YOU OWN: the entire scaffold — app/_layout.tsx, app/(auth)/*, db/* (schema.ts, client.ts, seed.ts), lib/auth/*, lib/sync/*, lib/integrations/{hubspot,connecteam,qbo}/*, lib/session.ts, lib/api.ts, components/* (shared kit + C-39, C-40), theme/*, app.config.ts.
YOU MAY MODIFY: nothing else exists yet.
DO NOT TOUCH: nothing yet — this is the first phase. Do NOT build feature screens (assets, series, inspections, reports, testing, AI) — those are Phases 1-6.

## Constraints
- This is the only phase that may create the project scaffold. Later phases extend it; they must not re-scaffold.
- Keep external connectors as stubs — real OAuth credentials and live HubSpot/Connecteam/QBO calls are wired per-tenant later. The interfaces must be stable so Phases 1-6 code against them.
- Commit: git add . && git commit -m "feat: phase 0 — foundation (expo scaffold, drizzle schema + seed, sync outbox, pluggable auth, integration stubs, component kit)"

Test org ID: org_beacon_test_001
```

---

## Phase 1 — Asset Registry + Dashboard (Replit, Prompt ITM-P1)

```
## Context
You are extending the ITM Expo app with the Asset Registry and the compliance Dashboard. The Asset is a HubSpot custom object (nestable). ITM does NOT own Asset CRUD — it reads assets from HubSpot through the integration layer and overlays its own compliance content. Charts are web-only, so the mobile dashboard shows non-chart summary cards.

## Before Writing Code
1. itm_SCOPE.md — Sections 1.1 (asset-based engine), 1.3 (systems of record), 6.2 (ownership split), 10 Phase 1.
2. itm_DATA_MODEL.md — Section 2.1 (ComplianceStandard, AssetComplianceLink), 2.2 (HubspotObjectCache), Section 3.1 (/itm/dashboard), Section 3.2 (/itm/assets — HubSpot-backed overlay), Section 3.7 (HubSpot read proxy). The API contract source for this phase is DATA_MODEL Sections 3.1 + 3.2 + 3.7.
3. itm_UI_SPEC.md — Sections 4.1 (P-01 Dashboard), 4.2 (P-02 Asset Registry), 4.3 (P-03 Asset Detail), component rows C-01..C-10, C-15, C-31, C-39, C-40 in Section 3.1, and DD-02 / DD-07 / DD-20 / DD-21.
4. itm_LAYOUTS.html — P-01, P-02, P-03 zone structure.

## Architecture Rules (non-negotiable)
- org_id from session only, never from request.
- No duplicate of HubSpot data: assets are read via lib/integrations/hubspot and cached in HubspotObjectCache (TTL). ITM persists only hubspot_asset_id + the compliance overlay (AssetComplianceLink, last/next inspection rollups). The [New Asset] action opens HubSpot; ITM never creates a core Asset locally.
- All external writes (e.g. compliance-overlay edits that must reach HubSpot, or future ticket writes) go through the integration layer + sync outbox.
- Reads work offline against the local cache; writes enqueue.

## Task
Reference itm_SCOPE.md Section 10 Phase 1 for the full task list. Deliver:
1. ITM Dashboard (P-01): ComplianceHealthCard (C-01, traffic-light), UpcomingInspectionsCard (C-02), RecurringRevenueCard (C-03), AssetCard row (C-05), Right-Panel/scroll action queue (DD-20: overdue, awaiting-QA, failed tests, expiring calibration, due-soon series). Mobile shows non-chart summary cards only.
2. Asset Registry (P-02): AssetTable (C-04) / AssetCard (C-05) over HubSpot-read assets + ITM overlay, filter facets (location/type/status), SystemTypeBadge (C-09), AssetLifecycleBadge (C-08), ComplianceStandardChips (C-10), AssetFormModal (C-07, overlay-only edit / open-HubSpot for core).
3. Asset Detail (P-03): AssetDetailPanel (C-06) with tabbed history (Inspections / Tests / Maintenance / Compliance / Schedules), InspectionScheduleRow (C-15), MaintenanceTable (C-31), [Create crew shift] manual Connecteam handoff (DD-23).
4. Hooks: hooks/useAssets.js (HubSpot read + cache + overlay), hooks/useComplianceStandards.js, hooks/useDashboard.js — all TanStack Query.
5. Register the ITM tab nav and left-panel secondary nav per UI_SPEC Section 2.2.

## Exit Criteria
- [ ] Asset list/detail render from the HubSpot read + ITM overlay; filter by location/type/status works; assets read offline from cache.
- [ ] Asset detail shows inspection/test/maintenance history and compliance standards; compliance-overlay edits persist and enqueue.
- [ ] Lifecycle status reflects the HubSpot record; ITM overlay (last/next inspection) renders.
- [ ] Dashboard renders compliance health and upcoming/overdue counts; action queue deep-links per UI_SPEC Section 2.3.
- [ ] Runs in Expo Go on iPad; offline writes persist and sync via the outbox; zero console errors.

## File Ownership
YOU OWN: app/(tabs)/index.tsx (Dashboard), app/(tabs)/assets/* (registry + [id] detail), components/ C-01..C-10, C-15, C-31 (plus reuse C-39/C-40 from Phase 0), hooks/useAssets.js, hooks/useComplianceStandards.js, hooks/useDashboard.js, nav registration in app/(tabs)/_layout.tsx.
YOU MAY MODIFY: lib/integrations/hubspot/* (add the asset read + HubspotObjectCache wiring only — keep the Phase 0 interface stable), theme/* (add tokens only), components/StatusBadge (extend variants only).
DO NOT TOUCH: db/schema.ts (schema is frozen after Phase 0 unless a field is missing — if so, add additively and note it), lib/auth/*, lib/sync/* (use as-is), other phases' screens (series, inspections, reports, testing, ai).

## Constraints
- Do not implement series, scheduling, inspection forms, reports, testing, or AI — later phases.
- Commit: git add . && git commit -m "feat: phase 1 — asset registry (hubspot-backed + itm overlay) + compliance dashboard"

Test org ID: org_beacon_test_001
```

---

## Phase 2 — Inspection Series & Cadence Engine (Replit, Prompt ITM-P2)

```
## Context
You are adding the recurring inspection series/cadence engine to the ITM Expo app. This is ITM-native: neither HubSpot nor Connecteam models recurring inspection cadences. A series generates per-asset schedules; a due schedule creates a HubSpot Inspection Work Order ticket via the integration layer. HubSpot owns client scheduling, notifications, and the customer portal — ITM's calendar is an internal operations view only.

## Before Writing Code
1. itm_SCOPE.md — Sections 1.2 (series → ticket → shift), 1.3, 6.3 (key relationships), 10 Phase 2, DD-09/DD-10 (client scheduling is HubSpot; calendar is internal ops).
2. itm_DATA_MODEL.md — Section 2.1 (InspectionSeries, InspectionSchedule, InspectionResult), Section 3.3 (/itm/series), Section 3.4 (/itm/schedules), Section 3.7 (HubSpot ticket create). The API contract source is DATA_MODEL Sections 3.3 + 3.4 + 3.7.
3. itm_UI_SPEC.md — Sections 4.4 (P-04 Series List), 4.5 (P-05 Series Detail), 4.6 (P-06 Calendar), components C-11..C-16, C-13 (revenue), DD-03 / DD-09 / DD-10 / DD-22.
4. itm_LAYOUTS.html — P-04, P-05, P-06.

## Architecture Rules (non-negotiable)
- org_id from session only, never from request.
- No duplicate of HubSpot data: series/schedules are ITM-native; the visit (Inspection Work Order) is a HubSpot ticket. ITM stores only hubspot_inspection_ticket_id; it never duplicates the ticket.
- All external writes go through the integration layer + sync outbox: schedule-due → HubSpot Inspection ticket create is enqueued (lib/integrations/hubspot + lib/sync), not a direct call. Offline generation queues and flushes on reconnect.
- The calendar (P-06) is internal ops only — no client messaging, no booking; that is HubSpot off the ticket (DD-22).

## Task
Reference itm_SCOPE.md Section 10 Phase 2 for the full task list. Deliver:
1. Series CRUD + InspectionSeriesTable (C-11), InspectionSeriesFormModal (C-12), SeriesRevenuePanel (C-13, booked vs. unbooked, font-mono).
2. Series → schedule generation (respecting generation_horizon_days) and schedule-due → enqueue a HubSpot Inspection ticket create through the outbox.
3. Reschedule with future-visit auto-shift to keep the series aligned: RescheduleModal (C-16), InspectionScheduleRow (C-15).
4. InspectionCalendar (C-14) internal ops view: overdue (red) / due-soon (orange) / on-track (blue) coding; click-to-reschedule or drill to visit.
5. Pages: app/(tabs)/series/* (list + [id] detail), app/(tabs)/calendar.tsx.
6. Hooks: hooks/useInspectionSeries.js, hooks/useInspectionSchedules.js.

## Exit Criteria
- [ ] Create a series → schedules generate and a due schedule enqueues a HubSpot Inspection ticket create (verify the outbox item + stubbed HubSpot write).
- [ ] Calendar shows upcoming inspections across locations; overdue highlighted; calendar is internal-ops only (no client booking).
- [ ] Reschedule a visit → future visits auto-shift.
- [ ] Booked vs. unbooked recurring revenue computed and displayed.
- [ ] Runs in Expo Go on iPad; offline writes (series, schedule generation, reschedule) persist and sync via the outbox; zero console errors.

## File Ownership
YOU OWN: app/(tabs)/series/*, app/(tabs)/calendar.tsx, components/ C-11..C-16, hooks/useInspectionSeries.js, hooks/useInspectionSchedules.js.
YOU MAY MODIFY: lib/integrations/hubspot/* (add the Inspection-ticket create call only — keep the interface stable), lib/sync/* (register the new outbox entity_type only; do not change the engine), app/(tabs)/_layout.tsx (add the Series + Calendar nav entries only).
DO NOT TOUCH: db/schema.ts (frozen; add additively only if a field is missing), Phase 1 asset screens/hooks beyond reading them, lib/auth/*, inspections/reports/testing/ai screens.

## Constraints
- Do not build the inspection workspace, forms, reports, testing, or AI — later phases.
- Do not build any client-facing scheduling/notification/portal UI; that is HubSpot (DD-10/DD-22).
- Commit: git add . && git commit -m "feat: phase 2 — inspection series/cadence engine (creates hubspot inspection tickets) + internal calendar"

Test org ID: org_beacon_test_001
```

---

## Phase 3 — Offline Inspection Workspace + NFPA Forms (Replit, Prompt ITM-P3)

```
## Context
You are building the offline-first inspection workspace and the NFPA JSON-schema form engine — the heart of the field app. Inspectors work in mechanical rooms with no signal: everything writes to local SQLite first and syncs on reconnect. A deficient answer enqueues a HubSpot Deficiency Work Order ticket. Admins define/version forms.

## Before Writing Code
1. itm_SCOPE.md — Sections 1.2, 1.3, 10 Phase 3, DD-05 (ITM creates Deficiency tickets, does not own the lifecycle), DD-07 (offline-first PWA/mobile).
2. itm_DATA_MODEL.md — Section 2.1 (InspectionForm, InspectionResult), Section 3.5 (/itm/forms), Section 3.6 (/itm/inspections incl. /sync idempotent by client_uuid and /submit), Section 3.7 (HubSpot Deficiency ticket create). The API contract source is DATA_MODEL Sections 3.5 + 3.6 + 3.7.
3. itm_UI_SPEC.md — Sections 4.7 (P-07 Workspace), 4.13 (P-13 Admin Forms), components C-17..C-22, C-35, C-36, DD-04 / DD-05 / DD-21.
4. itm_LAYOUTS.html — P-07 (mobile full-screen form), P-13.

## Architecture Rules (non-negotiable)
- org_id from session only, never from request.
- No duplicate of HubSpot data: the Deficiency is a HubSpot Work Order ticket. ITM stores only hubspot_deficiency_ticket_id keyed to the inspection result; it never stores a local deficiency authoritative record.
- All external writes go through the integration layer + sync outbox: a deficient answer enqueues a HubSpot Deficiency ticket create; offline it queues in SQLite and flushes on reconnect. The inspection submit is idempotent by client_uuid.
- Offline state is always visible, never blocking (DD-05). The inspector can complete and submit fully offline.

## Task
Reference itm_SCOPE.md Section 10 Phase 3 for the full task list. Deliver:
1. InspectionWorkspace (C-17, mobile full-screen, NOT the app shell): header, progress, OfflineSyncIndicator (C-22).
2. QuestionSetRenderer (C-18) rendering InspectionForm.form_schema; answers persist to InspectionResult.form_data local-first.
3. DeficiencyCaptureCard (C-19): a deficient answer enqueues a HubSpot Deficiency ticket create via lib/integrations/hubspot + outbox; store only hubspot_deficiency_ticket_id.
4. PhotoAnnotator (C-20, expo-camera/expo-image-picker, offline-buffered), SignaturePad (C-21, react-native-signature-canvas), GPS capture (expo-location) into gps_lat/gps_lng.
5. Offline-first sync for inspection submissions: local write → outbox → /itm/inspections/sync idempotent by client_uuid; conflicts surface as retry cards, never data loss.
6. Pre-populate form context from building/asset/history to reduce re-entry.
7. Admin form builder: InspectionFormBuilder (C-35) + FormSchemaFieldEditor (C-36) under app/admin/forms — define/version/activate JSON-schema forms, map deficiency triggers.
8. Hooks: hooks/useInspections.js, hooks/useInspectionForms.js.

## Exit Criteria
- [ ] Inspector completes an inspection fully offline; it syncs on reconnect (idempotent by client_uuid).
- [ ] Correct question set served by system type + form.
- [ ] Deficient answers enqueue a HubSpot Deficiency ticket create (verify the outbox item + stubbed write); ITM stores only hubspot_deficiency_ticket_id.
- [ ] Photos, signatures, and GPS attach to the inspection result.
- [ ] Admin can build/version a JSON-schema form.
- [ ] Runs in Expo Go on iPad; offline writes persist and sync via the outbox; zero console errors.

## File Ownership
YOU OWN: app/inspections/[id]/index.tsx (Workspace), app/admin/forms/*, components/ C-17..C-22, C-35, C-36, hooks/useInspections.js, hooks/useInspectionForms.js.
YOU MAY MODIFY: lib/integrations/hubspot/* (add the Deficiency-ticket create call only), lib/sync/* (register inspection_result + deficiency_ticket entity_types only), app/_layout.tsx (offline cache config only).
DO NOT TOUCH: db/schema.ts (frozen; additive only), lib/auth/*, Phase 1/2 screens beyond reading, reports/testing/ai screens, the Review page (P-08) — that is Phase 4.

## Constraints
- Do not build QA review, reports, testing, or AI — later phases. The AI suggestion surface (C-37/C-38) in the Workspace is gated and stubbed off until Phase 6.
- Commit: git add . && git commit -m "feat: phase 3 — offline inspection workspace + nfpa forms (deficient answer enqueues hubspot deficiency ticket)"

Test org ID: org_beacon_test_001
```

---

## Phase 4 — QA Review + Branded Reports (Replit, Prompt ITM-P4)

```
## Context
You are adding QA review and branded report generation/delivery to the ITM Expo app. Reviewers compare a completed inspection against history before finalizing; reports are reshaped from one data set (not fixed PDFs) and delivered via HubSpot / the customer portal. Deficiency → proposal is a HubSpot handoff; invoicing is a QBO handoff. PDFs are generated with expo-print.

## Before Writing Code
1. itm_SCOPE.md — Sections 1.3, 10 Phase 4, DD-08 (reshapeable reports), DD-10 (HubSpot delivery/portal).
2. itm_DATA_MODEL.md — Section 2.1 (InspectionReport, InspectionReportItem), Section 3.6 (QA-review/history endpoints on /itm/inspections), Section 3.10 (/itm/reports), Section 3.7 (HubSpot proposal handoff, QBO invoice handoff). The API contract source is DATA_MODEL Sections 3.6 + 3.10 + 3.7.
3. itm_UI_SPEC.md — Sections 4.8 (P-08 Review), 4.9 (P-09 Reports List), 4.10 (P-10 Report Builder), components C-23..C-28, DD-06 / DD-19 / DD-24.
4. itm_LAYOUTS.html — P-08, P-09, P-10.

## Architecture Rules (non-negotiable)
- org_id from session only, never from request.
- No duplicate of HubSpot data: report delivery, the proposal handoff, and invoicing route to HubSpot/QBO via the integration layer; ITM owns only the report content and ITM-side delivery state. Recipient is referenced by hubspot_customer_id.
- All external writes go through the integration layer + sync outbox: send-report (HubSpot/portal delivery), deficiency → proposal handoff, and QBO invoice handoff are enqueued, not direct calls.
- Reports reshape from one InspectionReportItem set (DD-06); no separate stored variants.

## Task
Reference itm_SCOPE.md Section 10 Phase 4 for the full task list. Deliver:
1. Inspection Review (P-08): QaReviewPanel (C-24) with QaReviewStatus and a finalize gate (blocked until approved), InspectionHistoryCompare (C-23) current-vs-previous side by side.
2. Reports List (P-09): InspectionReportTable (C-25) with status lifecycle (DRAFT → QA_REVIEW → APPROVED → SENT).
3. Report Builder (P-10): ReportBuilderPanel (C-26) shaping (system-type filter, deficiencies-only, NFPA vs. Joint Commission, service summary, section toggles) + [Create proposal] HubSpot handoff; ReportPreview (C-27) live; SendReportModal (C-28) delivery via HubSpot/portal + QBO invoice handoff, gated on APPROVED.
4. Branded PDF via expo-print (logo, DBA, cover letter); store the pdf_url.
5. Hook: hooks/useReports.js.

## Exit Criteria
- [ ] QA review blocks finalize until approved; compares to the previous inspection.
- [ ] One-click branded report; reshape by filter/format from the same data set; expo-print PDF generates.
- [ ] Report delivered to owner via HubSpot/portal and stored; proposal/invoicing handoffs enqueue to HubSpot/QBO.
- [ ] Report status lifecycle (DRAFT → QA_REVIEW → APPROVED → SENT) enforced.
- [ ] Runs in Expo Go on iPad; offline writes persist and sync via the outbox; zero console errors.

## File Ownership
YOU OWN: app/inspections/[id]/review.tsx (Review), app/(tabs)/reports/* (list + [id] builder), components/ C-23..C-28, hooks/useReports.js.
YOU MAY MODIFY: lib/integrations/hubspot/* (add proposal-handoff + report-delivery calls only), lib/integrations/qbo/* (add invoice-handoff call only), lib/sync/* (register inspection_report + handoff entity_types only), app/(tabs)/_layout.tsx (Reports nav entry only).
DO NOT TOUCH: db/schema.ts (frozen; additive only), lib/auth/*, the Workspace (P-07, Phase 3) beyond reading its output, testing/ai screens.

## Constraints
- Do not build testing/maintenance or AI — later phases. Do not email the customer outside the HubSpot channel (DD-24).
- Commit: git add . && git commit -m "feat: phase 4 — qa review + branded reports (expo-print) + hubspot/qbo handoffs"

Test org ID: org_beacon_test_001
```

---

## Phase 5 — Testing & Maintenance (Replit, Prompt ITM-P5)

```
## Context
You are adding test records, calibration tracking, and maintenance to the ITM Expo app. Tests are scored pass/fail against ComplianceStandard; failed tests surface to Service and the Dashboard queue. Maintenance can hand off a crew shift to Connecteam. All offline-first.

## Before Writing Code
1. itm_SCOPE.md — Sections 1.3, 10 Phase 5, Section 13 PARKED (test instruments vs. Equipment module).
2. itm_DATA_MODEL.md — Section 2.1 (SystemTest, MaintenanceRecord, TestEquipment, CalibrationRecord), Section 3.8 (/itm/testing), Section 3.7 (Connecteam shift push). The API contract source is DATA_MODEL Sections 3.8 + 3.7.
3. itm_UI_SPEC.md — Sections 4.11 (P-11 Testing & Maintenance), 4.12 (P-12 Equipment & Calibration), components C-29..C-34, DD-20 / DD-23.
4. itm_LAYOUTS.html — P-11, P-12.

## Architecture Rules (non-negotiable)
- org_id from session only, never from request.
- No duplicate of HubSpot data: SystemTest/MaintenanceRecord reference hubspot_asset_id; the crew shift is a Connecteam reference (connecteam_shift_id) and the work order is a HubSpot ticket reference. ITM owns only the test/maintenance/calibration content.
- All external writes go through the integration layer + sync outbox: the Connecteam crew-shift push is a manual handoff through lib/integrations/connecteam + outbox.
- Pass/fail is computed against the applicable ComplianceStandard; calibration status (VALID/DUE_SOON/EXPIRED) is derived.

## Task
Reference itm_SCOPE.md Section 10 Phase 5 for the full task list. Deliver:
1. Testing & Maintenance (P-11), tabbed (Tests / Maintenance / PM Schedule): TestRecordTable (C-29), TestRecordModal (C-30, readings JSON), MaintenanceTable (C-31), MaintenanceModal (C-32, work-order linkage).
2. Pass/fail determination against ComplianceStandard; a failed test surfaces to Service and the Dashboard queue (DD-20).
3. PM scheduling per asset (next_maintenance) generating upcoming maintenance.
4. Test Equipment & Calibration (P-12): TestEquipmentTable (C-33, calibration status), CalibrationModal (C-34); manual [Create crew shift] handoff to Connecteam where a maintenance work order is actionable (DD-23).
5. Hooks: hooks/useTests.js, hooks/useMaintenance.js, hooks/useTestEquipment.js.

## Exit Criteria
- [ ] Test records logged with readings; pass/fail computed against standards.
- [ ] Calibration states (VALID/DUE_SOON/EXPIRED) tracked per instrument.
- [ ] Maintenance records (preventive/corrective/emergency) with work-order linkage; Connecteam crew-shift push enqueues.
- [ ] PM scheduling generates upcoming maintenance.
- [ ] Runs in Expo Go on iPad; offline writes persist and sync via the outbox; zero console errors.

## File Ownership
YOU OWN: app/(tabs)/testing/* (testing + equipment), components/ C-29..C-34, hooks/useTests.js, hooks/useMaintenance.js, hooks/useTestEquipment.js.
YOU MAY MODIFY: lib/integrations/connecteam/* (add the crew-shift push call only), lib/sync/* (register system_test / maintenance / connecteam_shift entity_types only), app/(tabs)/_layout.tsx (Testing nav entry only), the Dashboard action queue (add failed-test + expiring-calibration sources only).
DO NOT TOUCH: db/schema.ts (frozen; additive only), lib/auth/*, Phase 1-4 screens beyond reading, the ai screens (Phase 6).

## Constraints
- Do not build AI — Phase 6. Test instruments stay in ITM for now (SCOPE PARKED); do not consolidate with the Equipment module.
- Commit: git add . && git commit -m "feat: phase 5 — testing & maintenance (pass/fail vs standards, calibration, connecteam crew-shift handoff)"

Test org ID: org_beacon_test_001
```

---

## Phase 6 — AI Code Intelligence (Replit, Prompt ITM-P6)

```
## Context
You are adding the AI layer to the ITM Expo app, spanning on-site assist (mobile, in the Workspace) and AI form/checklist generation from NFPA code (web/admin form builder). Every AI output is a discrete accept/reject suggestion, logged via AiSuggestion — nothing is auto-applied. This phase depends on the AI capability layer (#30); build only after those services exist.

## Before Writing Code
1. itm_SCOPE.md — Sections 1.3, 10 Phase 6, DD-02 (AI sequenced last), Feature 20.4 dependency on #30.
2. itm_DATA_MODEL.md — Section 2.1 (AiSuggestion, AiSuggestionType incl. FORM_GENERATION), Section 1 (AiSuggestionType/Status enums), Section 3.10 (/itm/ai + /itm/forms ai-generate). The API contract source is DATA_MODEL Sections 3.10 + 3.5.
3. itm_UI_SPEC.md — Section 4.14 (P-14 AI Code Intelligence), components C-37 (AiSuggestionPanel), C-38 (CodeReferenceDrawer), DD-11 (accept/reject, never auto-applied), DD-12 (gated behind Feature 20.4).
4. itm_LAYOUTS.html — P-14.

## Architecture Rules (non-negotiable)
- org_id from session only, never from request.
- No duplicate of HubSpot data: AI output that becomes an inspection/form/deficiency change still routes through the existing integration layer + sync outbox once accepted; the AI layer itself produces only AiSuggestion records.
- All external writes go through the integration layer + sync outbox; no AI output is written to an inspection, form, or deficiency without explicit inspector/admin confirmation, and every decision is logged (AiSuggestionStatus).
- The AI page and the in-Workspace AI surface are gated behind the Feature 20.4 flag (DD-12); Phases 1-5 ship with zero AI surface.

## Task
Reference itm_SCOPE.md Section 10 Phase 6 for the full task list. Deliver:
1. AI Code Intelligence page (P-14): NFPA code library browser, CodeReferenceDrawer (C-38), AiSuggestionPanel (C-37) accept/reject cards.
2. AI form/checklist generation (web/admin): from system type + applicable NFPA ComplianceStandard → draft InspectionForm (ai_generated=true), editable before save; logs AiSuggestion FORM_GENERATION (/itm/forms/ai-generate).
3. Code-update detection → flag affected forms.
4. On-site assist surfaced in the Inspection Workspace (P-07): inline AiSuggestionPanel (C-37) and CodeReferenceDrawer (C-38) for code references, finding autofill, photo deficiency detection, QA flags — accept/reject only, gated.
5. Integrate the AI capability layer (#30) services (code KB, photo analysis, voice-to-text) through lib/api.ts; every output logged.
6. Hook: hooks/useAiSuggestions.js.

## Exit Criteria
- [ ] Checklist auto-generated from system type + code, editable before save.
- [ ] Code-update detection flags affected forms.
- [ ] AI suggestions in the workspace are accept/reject and fully logged (AiSuggestion).
- [ ] No AI output is auto-applied without inspector confirmation; the AI surface is gated behind Feature 20.4.
- [ ] Runs in Expo Go on iPad; offline writes persist and sync via the outbox; zero console errors.

## File Ownership
YOU OWN: app/ai/* (P-14), components/ C-37, C-38, hooks/useAiSuggestions.js.
YOU MAY MODIFY: app/inspections/[id]/index.tsx (add the gated AI suggestion surface only — do not change the Phase 3 form/offline logic), app/admin/forms/* (add the AI-generate action only), lib/api.ts (add AI service calls only), app/(tabs)/_layout.tsx (gated AI nav entry only).
DO NOT TOUCH: db/schema.ts (frozen; additive only), lib/auth/*, lib/sync/* engine, Phase 1-5 screen logic beyond the gated additions above.

## Constraints
- Build only after the AI capability layer (#30) services exist (SCOPE DD-02). Gate everything behind Feature 20.4 (DD-12) so Phases 1-5 remain AI-free.
- Commit: git add . && git commit -m "feat: phase 6 — ai code intelligence (on-site assist + ai form generation, accept/reject logged)"

Test org ID: org_beacon_test_001
```

---

## Quick Reference

| Phase | Description | Build Agent (Replit) | Prompt ID |
|-------|-------------|----------------------|-----------|
| 0 | Foundation — Expo scaffold, Drizzle schema + seed, sync outbox, pluggable OAuth (Microsoft Entra) + AppUser, HubSpot/Connecteam/QBO connector stubs, shared component kit | Replit (solo) | ITM-P0 |
| 1 | Asset registry (HubSpot-backed read + ITM compliance overlay) + compliance dashboard (non-chart mobile summaries) | Replit (solo) | ITM-P1 |
| 2 | Inspection series/cadence engine → creates HubSpot Inspection tickets; internal upcoming/overdue calendar | Replit (solo) | ITM-P2 |
| 3 | Offline inspection workspace + NFPA forms (SQLite, photos, signatures, GPS; deficient answer enqueues a HubSpot Deficiency ticket) | Replit (solo) | ITM-P3 |
| 4 | QA review + branded reports (expo-print); proposal handoff + delivery via HubSpot; QBO invoice handoff | Replit (solo) | ITM-P4 |
| 5 | Testing & maintenance (tests pass/fail vs. standards, calibration, maintenance with Connecteam crew-shift handoff) | Replit (solo) | ITM-P5 |
| 6 | AI code intelligence — on-site assist (mobile) + AI form/checklist generation from NFPA code (web), accept/reject + logged | Replit (solo) | ITM-P6 |

---

## Revision Log

| Date | Version | Author | What Changed |
|------|---------|--------|-------------|
| 2026-06-13 | 1.0 | Deb + AI Support | Initial ITM Replit agent prompts: one self-contained prompt per phase (ITM-P0 through ITM-P6) for the standalone React Native (Expo) iPad app — Expo Router + NativeWind v4 + gluestack-ui v2, TanStack Query, react-hook-form + zod, expo-sqlite + Drizzle, expo-camera/image-picker/location + react-native-signature-canvas, expo-print, pluggable OAuth (Microsoft Entra) behind AuthProviderConfig, EAS Build for iPad, Expo Go preview. Architecture rules enforced per prompt: org_id from session never from request; no duplication of HubSpot/Connecteam/QBO data; all external writes through the integration layer + sync outbox. Each prompt references SCOPE Section 10 for full task lists and DATA_MODEL for contracts. |
