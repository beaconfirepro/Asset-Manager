---
name: ITM App — package versions for Expo SDK 54
description: Correct npm versions for Expo SDK 54 compatible packages
---

When running `pnpm add <package>` without a version, pnpm installs the latest which may be incompatible with Expo SDK 54. Always pin to SDK-54-compatible versions.

**Correct versions for Expo SDK 54 (itm-app):**
- expo-sqlite: ~16.0.10 (NOT 56.x which is for newer SDK)
- expo-auth-session: ~7.0.11
- expo-secure-store: ~15.0.8
- expo-crypto: ~15.0.8

**Why:** Expo Go app is pinned to a specific SDK version. Version mismatches cause "should be updated for best compatibility" warnings and may cause runtime crashes.

**How to apply:** Always run `pnpm add package@~X.Y.Z` with the exact version. Check expo version compatibility at https://docs.expo.dev/versions/latest/ or look at the Expo compatibility warning in Metro output.
