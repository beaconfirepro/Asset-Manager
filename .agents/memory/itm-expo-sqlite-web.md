---
name: ITM App — expo-sqlite web stub
description: expo-sqlite WASM bundling fails on Metro web; fix with platform-specific file
---

expo-sqlite imports `wa-sqlite.wasm` in its web worker which Metro cannot resolve, crashing web bundling. This is a known limitation.

**Fix:** Create `db/client.web.ts` alongside `db/client.ts`. Metro auto-resolves `.web.ts` on web and `.ts` on native. The web stub throws a descriptive error so the app degrades gracefully.

**Why:** The ITM app is iPad-native-first. Web preview is secondary. The stub lets the login screen render on web without a bundle crash, while native gets the full SQLite functionality.

**How to apply:** Any file that imports expo-sqlite should either:
- Use this platform-specific file pattern (`file.ts` for native, `file.web.ts` for web stub)
- Or be guarded by `Platform.OS !== 'web'` before any SQLite call
