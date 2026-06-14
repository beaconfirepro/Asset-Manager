---
name: Expo route/file renames need a Metro cache clear
description: Why tsc passes but the running Expo app shows stale routes / unresolved-module errors after renaming dirs or files.
---

After renaming route directories or files in the Expo app (e.g. `app/(tabs)/series` ->
`app/(tabs)/contracts`, or a hook file), `tsc --noEmit` can pass clean while the running
app still throws `UnableToResolveError Unable to resolve module @/hooks/...`, `Platform is
not defined`, or `[Layout children]: No route named "X"` warnings that list BOTH the old and
new route names.

**Why:** Metro keeps a disk file-map / haste cache. After a rename it serves a stale module
graph (the log shows `Error while reading cache, falling back to a full crawl`) and may
briefly resolve against the old tree during the crawl.

**How to apply:** after any dir/file rename in the Expo artifact, clear Metro/Expo caches and
restart the workflow, then warm a bundle before trusting screenshots/logs:
`rm -rf artifacts/itm-app/.expo/cache node_modules/.cache "$TMPDIR"/metro-* "$TMPDIR"/haste-map-*`
then restart the expo workflow and `curl https://$REPLIT_DEV_DOMAIN/` to force a fresh bundle.
A clean re-bundle should show no resolution/route errors — only the usual deprecation warnings.

**Companion:** renaming an exported symbol in `lib/db` also needs a declarations rebuild
(`tsc -b lib/db --force`) for the api-server typecheck — see monorepo-composite-declarations.md.

**Native SQLite schema rename:** `artifacts/itm-app/db/client.ts` builds the local DB with
`CREATE TABLE IF NOT EXISTS` against a fixed `DB_NAME` (e.g. `itm_v2.db`). Renaming a table or
column does NOT migrate an existing on-device DB — the old table/column persists and inserts
using the new name fail (`no column named ...`). On any table/column rename, bump `DB_NAME`
(`itm_vN.db` -> `itm_v(N+1).db`) so existing installs get a fresh, correctly-shaped DB. Safe
because cloud Postgres is the source of truth and local data re-seeds/re-syncs on launch.

