---
name: ITM web cloud architecture
description: How the ITM Expo app serves data on web vs native, and the generic entity API's tenancy rules.
---

ITM (artifacts/itm-app) is offline-first on native (expo-sqlite + a sync outbox). On **web**,
`getDb()` throws ("SQLite is not available on web"), so the web build cannot touch SQLite.

**Rule:** every data hook must branch `if (isWeb) { cloud REST } else { sqlite }` *before* any
`getDb()`/`enqueue()`/HubSpot-cache call. `isWeb`/`cloudList`/`cloudUpsert`/`cloudDelete` live in
`lib/cloud/repo.ts` (wrap the ITM API client). On web, mutations write straight to Postgres and
set `sync_status: "SYNCED"` (no outbox). HubSpot ticket creation is skipped on web (see
`reconcileSchedulesCloud`).

**Cloud source of truth:** `artifacts/api-server` + Postgres (`@workspace/db`). One generic entity
REST API backs all entities: `GET/POST/DELETE /api/itm/entities/:type` (snake_case table names,
allowlisted). Web base URL resolves via `EXPO_PUBLIC_DOMAIN=$REPLIT_DEV_DOMAIN`.

**Entity API tenancy (entities.ts):** upsert conflict target is `id` (PK). On update, `id`,
`org_id`, and `created_at` are stripped from the set values (immutable), and the conflict update is
gated by `where org_id = <incoming>` so a known `id` from another org cannot be hijacked or moved.
List/delete are org-scoped via the `org_id` query param.

**Known limitation / Why it matters:** there is currently **no real server-side auth** — the app
uses a dev-bypass login and a hardcoded `ORG_ID` ("org_beacon_test_001"), and the API trusts the
client-supplied `org_id`. The immutability + org-scoped-update hardening prevents cross-tenant
*overwrite*, but true cross-tenant *read* protection requires authenticated org binding on the
server (a larger, separate task).
