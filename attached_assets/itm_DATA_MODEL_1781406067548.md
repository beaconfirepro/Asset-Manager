# ITM — Data Model & API

**Module ID:** `itm`
**Module #:** 20
**GitHub Label:** `module/itm`
**Version:** 1.0
**Date:** 2026-06-13
**Status:** Build-Ready

> Complete backend/data implementation spec for the ITM standalone app. An agent should be able to build the full local schema, the integration layer, and all endpoints from this document alone.
>
> **Companion:** `itm_SCOPE.md` (master, v1.3), `itm_SEED_DATA.md` (seed scripts — NOT in this file), `itm_UI_SPEC.md` (frontend), `itm_LAYOUTS.html` (zones).

---

## Section 0: Architecture Context

ITM is a **standalone React Native (Expo) app** (see SCOPE Sections 12, 15) that is **offline-first** and integrates with external systems of record. This document defines three data surfaces:

1. **ITM-native data** — the inspection execution and compliance content ITM owns. Stored locally on the device in **SQLite via Drizzle ORM** and synced to a thin ITM sync service (and later to Helm). These are the models in Section 2.1.
2. **HubSpot system-of-record objects** — Customer, Contact, Location, Asset (nestable), AHJ, and the Inspection and Deficiency Work Order **tickets**. ITM does **not** own these. It stores only the HubSpot ID plus an ephemeral read cache (Section 2.2 `HubspotObjectCache`). All authoritative reads/writes go through the HubSpot API (Section 3.7).
3. **Integration + platform data** — connection/auth/sync plumbing ITM owns to run against HubSpot, Connecteam, and QBO (Section 2.3).

**No-duplication rule:** ITM never persists a second authoritative copy of a HubSpot/Connecteam/QBO record. `HubspotObjectCache` is a read-through cache with a TTL, not a source of truth.

**Field conventions:** `snake_case` columns (consistent with the legacy Helm ITM models). Every ITM-native model includes `id` (cuid/uuid text PK), `org_id`, `created_at`, `updated_at`, a `sync_status` column, and is indexed on `org_id`. Types are given DB-agnostically (TEXT/INTEGER/REAL/BOOLEAN/TIMESTAMP/JSON) since the local store is SQLite/Drizzle and the sync service mirrors them.

---

## Section 1: Enums

ITM-native enums (stored as TEXT with a CHECK constraint locally; true enums in the sync service).

```
InspectionSeriesStatus   = ACTIVE | PAUSED | COMPLETED | CANCELED
InspectionResultStatus   = SCHEDULED | IN_PROGRESS | COMPLETED | SYNCED
InspectionFrequency      = WEEKLY | MONTHLY | QUARTERLY | SEMI_ANNUAL | ANNUAL | FIVE_YEAR | CUSTOM
InspectionFormType       = NFPA_10 | NFPA_13 | NFPA_25 | NFPA_72 | CUSTOM
InspectionReportStatus   = DRAFT | QA_REVIEW | APPROVED | SENT | ARCHIVED
InspectionReportFormat   = NFPA | JOINT_COMMISSION | DEFICIENCIES_ONLY | SERVICE_SUMMARY | FULL
QaReviewStatus           = NOT_REQUIRED | PENDING | APPROVED | REJECTED
TestType                 = HYDROSTATIC | FLOW | ALARM | SPRINKLER_FUNCTION | PUMP_CURVE | MAIN_DRAIN
MaintenanceType          = PREVENTIVE | CORRECTIVE | EMERGENCY
TestEquipmentStatus      = ACTIVE | OUT_FOR_CALIBRATION | RETIRED
CalibrationStatus        = VALID | DUE_SOON | EXPIRED
AiSuggestionType         = CHECKLIST_ITEM | CODE_REFERENCE | FINDING_AUTOFILL | PHOTO_DEFICIENCY | QA_FLAG | NOTE_CLEANUP | FORM_GENERATION
AiSuggestionStatus       = PENDING | ACCEPTED | REJECTED
SyncStatus               = LOCAL_ONLY | PENDING_SYNC | SYNCED | SYNC_ERROR
IntegrationProvider      = HUBSPOT | CONNECTEAM | QBO
IntegrationStatus        = CONNECTED | DISCONNECTED | ERROR | EXPIRED
AuthProvider             = MICROSOFT | GOOGLE | OKTA | CUSTOM_OIDC
OutboxOperation          = CREATE | UPDATE | DELETE
```

> **AI note (v1.3):** `AiSuggestionType.FORM_GENERATION` covers AI-assisted creation of code-reliant inspection forms/checklists (web form builder), in addition to the on-site inspector assist types. See SCOPE DD-02 and the approved web/mobile split.

---

## Section 2: Models

### 2.1 ITM-Native Models (local SQLite/Drizzle + sync service)

#### `InspectionSeries`
Contract-level recurring commitment; generates schedules; tracks recurring revenue.

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | TEXT | PK | cuid | |
| `org_id` | TEXT | index | — | Tenant |
| `name` | TEXT | — | — | |
| `hubspot_customer_id` | TEXT | index, nullable | null | HubSpot Customer reference |
| `frequency` | TEXT | enum InspectionFrequency | — | |
| `system_scope` | JSON | nullable | null | Asset types/HubSpot asset IDs in scope |
| `location_scope` | JSON | nullable | null | HubSpot location IDs in scope |
| `status` | TEXT | enum InspectionSeriesStatus, index | ACTIVE | |
| `start_date` | TIMESTAMP | — | — | |
| `end_date` | TIMESTAMP | nullable | null | |
| `contract_value` | REAL | nullable | null | Booked recurring revenue |
| `generation_horizon_days` | INTEGER | — | 90 | How far ahead to materialize |
| `notes` | TEXT | nullable | null | |
| `sync_status` | TEXT | enum SyncStatus | LOCAL_ONLY | |
| `created_at` | TIMESTAMP | — | now | |
| `updated_at` | TIMESTAMP | — | now | |

Relations: many `InspectionSchedule`. Indexes: `org_id`, `status`, `hubspot_customer_id`.

#### `InspectionSchedule`
Per-asset/location cadence record generated under a series; spawns visits (HubSpot Inspection tickets).

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | TEXT | PK | cuid | |
| `org_id` | TEXT | index | — | |
| `series_id` | TEXT | FK→InspectionSeries, index, nullable | null | Parent series (null = standalone) |
| `hubspot_location_id` | TEXT | index | — | HubSpot Location reference |
| `hubspot_asset_id` | TEXT | index, nullable | null | HubSpot Asset reference |
| `inspection_form_id` | TEXT | FK→InspectionForm, nullable | null | Default form for generated visits |
| `frequency` | TEXT | enum InspectionFrequency | — | |
| `next_due_date` | TIMESTAMP | index | — | |
| `last_inspection` | TIMESTAMP | nullable | null | |
| `is_active` | BOOLEAN | index | true | |
| `notes` | TEXT | nullable | null | |
| `sync_status` | TEXT | enum SyncStatus | LOCAL_ONLY | |
| `created_at` | TIMESTAMP | — | now | |
| `updated_at` | TIMESTAMP | — | now | |

Relations: many `InspectionResult`. Indexes: `org_id`, `series_id`, `hubspot_location_id`, `hubspot_asset_id`, `next_due_date`, `is_active`.

#### `InspectionForm`
NFPA-compliant JSON-schema form definition.

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | TEXT | PK | cuid | |
| `org_id` | TEXT | index | — | |
| `name` | TEXT | — | — | |
| `type` | TEXT | enum InspectionFormType, index | — | |
| `version` | TEXT | nullable | null | |
| `form_schema` | JSON | — | — | Field/question definitions |
| `compliance_standard_id` | TEXT | FK→ComplianceStandard, nullable | null | Primary standard |
| `is_active` | BOOLEAN | index | true | |
| `ai_generated` | BOOLEAN | — | false | True if produced by AI form generation |
| `sync_status` | TEXT | enum SyncStatus | LOCAL_ONLY | |
| `created_at` | TIMESTAMP | — | now | |
| `updated_at` | TIMESTAMP | — | now | |

Unique: (`org_id`, `name`, `version`). Relations: many `InspectionResult`, many `AiSuggestion`.

#### `InspectionResult`
The execution record for a single inspection visit, keyed to the HubSpot Inspection ticket. Replaces the legacy `BuildingInspection` as the ITM-owned record (HubSpot owns the ticket).

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | TEXT | PK | cuid | |
| `org_id` | TEXT | index | — | |
| `hubspot_inspection_ticket_id` | TEXT | unique, index, nullable | null | The HubSpot Inspection Work Order ticket |
| `inspection_schedule_id` | TEXT | FK→InspectionSchedule, index, nullable | null | Originating schedule |
| `series_id` | TEXT | FK→InspectionSeries, index, nullable | null | Denormalized for rollups |
| `hubspot_asset_id` | TEXT | index, nullable | null | Asset inspected |
| `hubspot_location_id` | TEXT | index | — | Building/site |
| `inspection_form_id` | TEXT | FK→InspectionForm, nullable | null | Form used |
| `inspection_date` | TIMESTAMP | index | — | |
| `inspector_name` | TEXT | nullable | null | |
| `inspector_user_id` | TEXT | nullable | null | ITM auth user |
| `status` | TEXT | enum InspectionResultStatus, index | SCHEDULED | |
| `passed` | BOOLEAN | nullable | null | Overall pass/fail |
| `form_data` | JSON | nullable | null | Question responses |
| `photo_urls` | JSON | nullable | null | Captured photo references |
| `signature_inspector` | TEXT | nullable | null | Signature blob/URL |
| `signature_representative` | TEXT | nullable | null | Building rep signature |
| `gps_lat` | REAL | nullable | null | |
| `gps_lng` | REAL | nullable | null | |
| `qa_status` | TEXT | enum QaReviewStatus | NOT_REQUIRED | |
| `qa_reviewed_by` | TEXT | nullable | null | |
| `qa_reviewed_at` | TIMESTAMP | nullable | null | |
| `client_uuid` | TEXT | unique | — | Client-generated id for idempotent offline sync |
| `sync_status` | TEXT | enum SyncStatus, index | LOCAL_ONLY | |
| `created_at` | TIMESTAMP | — | now | |
| `updated_at` | TIMESTAMP | — | now | |

Relations: many `AiSuggestion`, many `InspectionReportItem`. On submit, deficient answers enqueue a HubSpot Deficiency ticket create (Outbox). Indexes: `org_id`, `hubspot_inspection_ticket_id`, `inspection_schedule_id`, `series_id`, `hubspot_asset_id`, `hubspot_location_id`, `status`, `inspection_date`, `sync_status`.

#### `ComplianceStandard`
NFPA/code standard reference.

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | TEXT | PK | cuid | |
| `org_id` | TEXT | index | — | |
| `code` | TEXT | index | — | e.g. NFPA-25 |
| `name` | TEXT | — | — | |
| `version` | TEXT | nullable | null | Edition/year |
| `description` | TEXT | nullable | null | |
| `effective_date` | TIMESTAMP | nullable | null | |
| `url` | TEXT | nullable | null | |
| `sync_status` | TEXT | enum SyncStatus | LOCAL_ONLY | |
| `created_at` | TIMESTAMP | — | now | |
| `updated_at` | TIMESTAMP | — | now | |

Unique: (`org_id`, `code`, `version`). Relations: many `AssetComplianceLink`, many `SystemTest`.

#### `AssetComplianceLink`
Applicable compliance standards per HubSpot Asset (ITM owns the applicability mapping; the Asset itself is HubSpot).

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | TEXT | PK | cuid | |
| `org_id` | TEXT | index | — | |
| `hubspot_asset_id` | TEXT | index | — | HubSpot Asset |
| `compliance_standard_id` | TEXT | FK→ComplianceStandard, index | — | |
| `sync_status` | TEXT | enum SyncStatus | LOCAL_ONLY | |
| `created_at` | TIMESTAMP | — | now | |
| `updated_at` | TIMESTAMP | — | now | |

Unique: (`hubspot_asset_id`, `compliance_standard_id`).

#### `SystemTest`
Test record against an asset.

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | TEXT | PK | cuid | |
| `org_id` | TEXT | index | — | |
| `hubspot_asset_id` | TEXT | index | — | Asset tested |
| `test_type` | TEXT | enum TestType, index | — | |
| `test_date` | TIMESTAMP | index | — | |
| `performed_by` | TEXT | nullable | null | |
| `passed` | BOOLEAN | — | — | |
| `results` | JSON | nullable | null | Readings (PSI, GPM, residual, pump curve points) |
| `notes` | TEXT | nullable | null | |
| `report_url` | TEXT | nullable | null | |
| `test_equipment_id` | TEXT | FK→TestEquipment, index, nullable | null | Instrument used |
| `compliance_standard_id` | TEXT | FK→ComplianceStandard, nullable | null | Standard tested against |
| `client_uuid` | TEXT | unique | — | Offline idempotency |
| `sync_status` | TEXT | enum SyncStatus | LOCAL_ONLY | |
| `created_at` | TIMESTAMP | — | now | |
| `updated_at` | TIMESTAMP | — | now | |

#### `MaintenanceRecord`

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | TEXT | PK | cuid | |
| `org_id` | TEXT | index | — | |
| `hubspot_asset_id` | TEXT | index | — | |
| `maintenance_type` | TEXT | enum MaintenanceType, index | — | |
| `maintenance_date` | TIMESTAMP | — | — | |
| `performed_by` | TEXT | nullable | null | |
| `description` | TEXT | — | — | |
| `parts_replaced` | JSON | nullable | null | |
| `labor_hours` | REAL | nullable | null | |
| `cost` | REAL | nullable | null | |
| `next_maintenance` | TIMESTAMP | nullable | null | PM next due |
| `notes` | TEXT | nullable | null | |
| `hubspot_workorder_ticket_id` | TEXT | nullable | null | Linked HubSpot Work Order ticket |
| `connecteam_shift_id` | TEXT | nullable | null | Linked crew shift |
| `client_uuid` | TEXT | unique | — | Offline idempotency |
| `sync_status` | TEXT | enum SyncStatus | LOCAL_ONLY | |
| `created_at` | TIMESTAMP | — | now | |
| `updated_at` | TIMESTAMP | — | now | |

#### `TestEquipment`

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | TEXT | PK | cuid | |
| `org_id` | TEXT | index | — | |
| `name` | TEXT | — | — | |
| `serial_number` | TEXT | nullable | null | |
| `equipment_type` | TEXT | nullable | null | gauge, flow_meter, sound_meter |
| `status` | TEXT | enum TestEquipmentStatus, index | ACTIVE | |
| `calibration_due` | TIMESTAMP | index, nullable | null | |
| `calibration_status` | TEXT | enum CalibrationStatus | VALID | Derived |
| `notes` | TEXT | nullable | null | |
| `sync_status` | TEXT | enum SyncStatus | LOCAL_ONLY | |
| `created_at` | TIMESTAMP | — | now | |
| `updated_at` | TIMESTAMP | — | now | |

Relations: many `CalibrationRecord`, many `SystemTest`.

#### `CalibrationRecord`

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | TEXT | PK | cuid | |
| `org_id` | TEXT | index | — | |
| `test_equipment_id` | TEXT | FK→TestEquipment, index | — | |
| `calibration_date` | TIMESTAMP | — | — | |
| `next_due_date` | TIMESTAMP | nullable | null | |
| `performed_by` | TEXT | nullable | null | |
| `certificate_url` | TEXT | nullable | null | |
| `passed` | BOOLEAN | — | true | |
| `notes` | TEXT | nullable | null | |
| `sync_status` | TEXT | enum SyncStatus | LOCAL_ONLY | |
| `created_at` | TIMESTAMP | — | now | |
| `updated_at` | TIMESTAMP | — | now | |

#### `InspectionReport`
Branded, reshapeable report assembled from one or more inspection results.

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | TEXT | PK | cuid | |
| `org_id` | TEXT | index | — | |
| `title` | TEXT | — | — | |
| `hubspot_customer_id` | TEXT | index, nullable | null | Recipient (building owner) |
| `hubspot_location_id` | TEXT | nullable | null | Primary location |
| `format` | TEXT | enum InspectionReportFormat | NFPA | |
| `filter_config` | JSON | nullable | null | System-type / deficiencies-only filters |
| `status` | TEXT | enum InspectionReportStatus, index | DRAFT | |
| `pdf_url` | TEXT | nullable | null | Generated PDF (expo-print + file storage) |
| `cover_letter` | TEXT | nullable | null | |
| `delivery_channel` | TEXT | nullable | null | hubspot_portal | email |
| `sent_at` | TIMESTAMP | nullable | null | |
| `sent_to` | TEXT | nullable | null | |
| `created_by` | TEXT | nullable | null | |
| `sync_status` | TEXT | enum SyncStatus | LOCAL_ONLY | |
| `created_at` | TIMESTAMP | — | now | |
| `updated_at` | TIMESTAMP | — | now | |

Relations: many `InspectionReportItem`.

#### `InspectionReportItem`

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | TEXT | PK | cuid | |
| `org_id` | TEXT | index | — | |
| `inspection_report_id` | TEXT | FK→InspectionReport, index | — | |
| `inspection_result_id` | TEXT | FK→InspectionResult, index | — | |
| `sort_order` | INTEGER | — | 0 | |
| `include_photos` | BOOLEAN | — | true | |
| `created_at` | TIMESTAMP | — | now | |
| `updated_at` | TIMESTAMP | — | now | |

Unique: (`inspection_report_id`, `inspection_result_id`).

#### `AiSuggestion`
Logged AI output for governance (every output traceable, accept/reject). Covers on-site assist and AI form generation.

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | TEXT | PK | cuid | |
| `org_id` | TEXT | index | — | |
| `type` | TEXT | enum AiSuggestionType, index | — | |
| `status` | TEXT | enum AiSuggestionStatus, index | PENDING | |
| `inspection_result_id` | TEXT | FK→InspectionResult, index, nullable | null | On-site assist context |
| `inspection_form_id` | TEXT | FK→InspectionForm, index, nullable | null | Form-generation context |
| `payload` | JSON | — | — | Suggested content |
| `source_reference` | TEXT | nullable | null | NFPA section / source data trace |
| `confidence` | REAL | nullable | null | |
| `reviewed_by` | TEXT | nullable | null | |
| `reviewed_at` | TIMESTAMP | nullable | null | |
| `sync_status` | TEXT | enum SyncStatus | LOCAL_ONLY | |
| `created_at` | TIMESTAMP | — | now | |
| `updated_at` | TIMESTAMP | — | now | |

### 2.2 HubSpot Reference / Read Cache

#### `HubspotObjectCache`
Read-through cache of HubSpot objects/tickets. TTL-bound; not a source of truth.

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | TEXT | PK | cuid | |
| `org_id` | TEXT | index | — | |
| `object_type` | TEXT | index | — | customer | contact | location | asset | ahj | inspection_ticket | deficiency_ticket |
| `hubspot_id` | TEXT | index | — | HubSpot object/ticket ID |
| `parent_hubspot_id` | TEXT | nullable | null | For nested Assets and ticket associations |
| `payload` | JSON | — | — | Cached HubSpot fields |
| `fetched_at` | TIMESTAMP | — | now | |
| `expires_at` | TIMESTAMP | index | — | TTL |

Unique: (`org_id`, `object_type`, `hubspot_id`). This is the only place HubSpot field data is stored, and only transiently.

### 2.3 Integration, Sync & Auth Models

#### `IntegrationConnection`
Per-tenant connection state for each external provider.

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | TEXT | PK | cuid | |
| `org_id` | TEXT | index | — | |
| `provider` | TEXT | enum IntegrationProvider, index | — | HUBSPOT, CONNECTEAM, QBO |
| `status` | TEXT | enum IntegrationStatus | DISCONNECTED | |
| `access_token` | TEXT | encrypted, nullable | null | |
| `refresh_token` | TEXT | encrypted, nullable | null | |
| `token_expires_at` | TIMESTAMP | nullable | null | |
| `config` | JSON | nullable | null | Pipeline IDs, portal config, account refs |
| `last_sync_at` | TIMESTAMP | nullable | null | |
| `last_error` | TEXT | nullable | null | |
| `created_at` | TIMESTAMP | — | now | |
| `updated_at` | TIMESTAMP | — | now | |

Unique: (`org_id`, `provider`).

#### `SyncOutboxItem`
Offline write queue. Local writes enqueue here; the sync engine replays them to HubSpot/Connecteam/QBO/Helm when online.

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | TEXT | PK | cuid | |
| `org_id` | TEXT | index | — | |
| `entity_type` | TEXT | index | — | inspection_result, deficiency_ticket, connecteam_shift, system_test, ... |
| `entity_id` | TEXT | index | — | Local record id |
| `operation` | TEXT | enum OutboxOperation | — | |
| `target_provider` | TEXT | enum IntegrationProvider, nullable | null | Where it syncs (null = ITM service) |
| `payload` | JSON | — | — | Serialized change |
| `attempts` | INTEGER | — | 0 | |
| `last_attempt_at` | TIMESTAMP | nullable | null | |
| `status` | TEXT | enum SyncStatus | PENDING_SYNC | |
| `error` | TEXT | nullable | null | |
| `created_at` | TIMESTAMP | — | now | |
| `updated_at` | TIMESTAMP | — | now | |

Indexes: `org_id`, `status`, `entity_type`, `entity_id`.

#### `AppUser`
ITM app user (authenticated via a pluggable OAuth provider).

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | TEXT | PK | cuid | |
| `org_id` | TEXT | index | — | |
| `auth_provider` | TEXT | enum AuthProvider, index | MICROSOFT | Pluggable; Microsoft Entra for Beacon testing |
| `external_subject` | TEXT | index | — | Provider subject/oid |
| `email` | TEXT | index | — | |
| `display_name` | TEXT | nullable | null | |
| `roles` | JSON | — | — | e.g. ["INSPECTOR","COORDINATOR"] |
| `is_active` | BOOLEAN | — | true | |
| `created_at` | TIMESTAMP | — | now | |
| `updated_at` | TIMESTAMP | — | now | |

Unique: (`org_id`, `auth_provider`, `external_subject`).

#### `AuthProviderConfig`
Plug-and-play OAuth/OIDC provider configuration (so a tenant can swap Microsoft for Google/Okta/custom OIDC without code changes).

| Field | Type | Constraints | Default | Description |
|-------|------|-------------|---------|-------------|
| `id` | TEXT | PK | cuid | |
| `org_id` | TEXT | index | — | |
| `provider` | TEXT | enum AuthProvider | MICROSOFT | |
| `display_name` | TEXT | — | — | Button label |
| `client_id` | TEXT | — | — | |
| `client_secret` | TEXT | encrypted, nullable | null | |
| `issuer_url` | TEXT | — | — | OIDC discovery/issuer |
| `scopes` | JSON | — | — | Requested scopes |
| `redirect_uri` | TEXT | — | — | |
| `is_enabled` | BOOLEAN | index | true | |
| `sort_order` | INTEGER | — | 0 | |
| `created_at` | TIMESTAMP | — | now | |
| `updated_at` | TIMESTAMP | — | now | |

Unique: (`org_id`, `provider`).

### 2.4 Referenced, Not Owned (HubSpot system of record)

Customer/Company, Contact, Location, Asset (nestable), AHJ, Inspection Work Order ticket, Deficiency Work Order ticket. ITM references these by `hubspot_*_id` and caches via `HubspotObjectCache`. Connecteam shift and QBO invoice are referenced by `connecteam_shift_id` / QBO id. The vendor products own the proposal, invoice, dispatch board, client scheduling, and customer portal workflows; ITM owns the integration to them (Section 3.7).

---

## Section 3: API Endpoints

The app talks to a thin ITM sync/integration service. All routes require a valid session (pluggable OAuth, Section 3.9) and resolve `org_id` from the session, never from the request. Errors: 400 validation, 401 no session, 403 role, 404 not found/cross-org, 409 conflict.

### 3.1 `/itm/dashboard` (3)
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/itm/dashboard` | Compliance health, upcoming/overdue, action queue (charts surface on web only) |
| GET | `/itm/summary` | KPI rollups (assets, inspections this period, open deficiencies via HubSpot) |
| GET | `/itm/recurring-revenue` | Booked vs. unbooked across series |

### 3.2 `/itm/assets` (4) — HubSpot-backed overlay
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/itm/assets` | List assets from HubSpot (cached) + ITM compliance overlay (`?hubspotLocationId&type&status&q`) |
| GET | `/itm/assets/:hubspotAssetId` | Asset detail from HubSpot + ITM history (inspections, tests, maintenance, standards) |
| POST | `/itm/assets/:hubspotAssetId/standards` | Link compliance standards (ITM `AssetComplianceLink`) |
| DELETE | `/itm/assets/:hubspotAssetId/standards/:standardId` | Unlink |

> Core Asset CRUD is HubSpot (write via Section 3.7). ITM owns only the compliance overlay.

### 3.3 `/itm/series` (7)
GET list; POST create; GET `:id`; PATCH `:id`; POST `:id/generate` (materialize schedules + enqueue HubSpot Inspection ticket creates); POST `:id/pause`; GET `:id/revenue`.

### 3.4 `/itm/schedules` (6)
GET list (`?hubspotLocationId&hubspotAssetId&seriesId&due=overdue|soon`); POST create; GET `/calendar` (`?from&to`, internal ops view); PATCH `:id`; POST `:id/reschedule` (`{next_due_date, shiftFuture}`); POST `:id/generate-visit` (creates `InspectionResult` + enqueues HubSpot Inspection ticket).

### 3.5 `/itm/forms` (7)
GET list; POST create; GET `:id`; PATCH `:id`; POST `:id/version`; POST `:id/activate`; POST `/ai-generate` (AI form/checklist generation from system type + NFPA code → draft `InspectionForm`, logs `AiSuggestion` FORM_GENERATION).

### 3.6 `/itm/inspections` (9)
GET list; POST create; GET `:id` (form schema + prior-inspection context); PATCH `:id`; POST `:id/submit` (set status, compute pass/fail, enqueue HubSpot Deficiency ticket creates for deficient answers); POST `/sync` (offline batch, idempotent by `client_uuid`); GET `:id/history`; POST `:id/qa` (`{qa_status, notes}`); POST `:id/photos`.

### 3.7 Integrations (3.7) — `/integrations` (the integration WE build)
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/integrations` | Connection status for HUBSPOT, CONNECTEAM, QBO (`IntegrationConnection`) |
| POST | `/integrations/:provider/connect` | OAuth connect flow for a provider |
| POST | `/integrations/:provider/disconnect` | Disconnect |
| GET | `/integrations/hubspot/objects` | Proxy read of HubSpot objects (`?objectType&id`), caches to `HubspotObjectCache` |
| POST | `/integrations/hubspot/assets` | Create/update HubSpot Asset (nestable via `parent_hubspot_id`) |
| POST | `/integrations/hubspot/tickets` | Create/update Inspection or Deficiency Work Order ticket |
| POST | `/integrations/hubspot/proposal-handoff` | Deficiency → HubSpot proposal handoff |
| POST | `/integrations/connecteam/shifts` | Push a crew shift from a Work Order (manual) |
| POST | `/integrations/qbo/invoice-handoff` | Completed-service/report data → QBO invoice handoff |
| GET | `/integrations/sync/outbox` | Inspect the sync outbox |
| POST | `/integrations/sync/run` | Drain the outbox (replay queued writes) |

### 3.8 `/itm/testing` (10)
GET `/tests`; POST `/tests` (compute pass/fail vs. standard; if failed, flag for Service); GET `/tests/:id`; PATCH `/tests/:id`; GET `/maintenance`; POST `/maintenance` (optional `hubspot_workorder_ticket_id`/`connecteam_shift_id`); GET `/equipment`; POST `/equipment`; POST `/equipment/:id/calibration`; GET `/pm-due`.

### 3.9 `/auth` (5) — pluggable OAuth
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/auth/providers` | Enabled `AuthProviderConfig` list (drives login buttons) |
| GET | `/auth/:provider/start` | Begin OAuth/OIDC (Microsoft Entra for Beacon testing) |
| GET | `/auth/:provider/callback` | OAuth callback → session + `AppUser` upsert |
| POST | `/auth/refresh` | Refresh session token |
| POST | `/auth/logout` | End session |

### 3.10 `/itm/reports` (7) + `/itm/ai` (6)
Reports: GET list; POST create; GET `:id`; PATCH `:id` (reshape); POST `:id/generate` (expo-print PDF); POST `:id/send` (HubSpot portal/email delivery, requires APPROVED); GET `:id/preview`.
AI: GET `/ai/code-library`; POST `/ai/generate-checklist`; POST `/ai/code-updates/scan`; GET `/ai/suggestions`; POST `/ai/suggestions/:id/review`; POST `/ai/assist` (voice-to-text, finding autofill, photo deficiency detect → `AiSuggestion[]`).

---

## Section 4: Revision Log

| Date | Version | Author | What Changed |
|------|---------|--------|-------------|
| 2026-06-13 | 1.0 | Deb + AI Support | Initial data model & API for the ITM standalone app (v1.3 architecture). ITM-native models on local SQLite/Drizzle with sync; HubSpot system-of-record objects referenced by ID + read cache (no duplication); integration/sync/outbox models; pluggable OAuth (Microsoft Entra default) via `AuthProviderConfig`/`AppUser`; integration API surface (HubSpot, Connecteam, QBO) that ITM builds. AI form generation (`FORM_GENERATION`) added. Seed content excluded — see `itm_SEED_DATA.md`. |
