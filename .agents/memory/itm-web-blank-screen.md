---
name: ITM App — web blank screen (font gate)
description: Why the Expo web preview rendered fully blank and login was impossible
---

# Expo web preview rendered blank → "can't login"

Symptom: the web preview (canvas iframe) showed a pure white screen, no login
screen, no JS errors. Login was impossible because the login screen never
rendered.

Root cause: the root layout gated ALL rendering on Google fonts loading
(`if (!fontsLoaded && !fontError) return null;`). On web, `useFonts` from
`@expo-google-fonts/inter` may never resolve/error, so the app stayed on
`return null` forever → blank.

**Fix:** never block the initial render on fonts on web — gate only on native:
`if (!fontsLoaded && !fontError && Platform.OS !== "web") return null;`
react-native-web falls back to system fonts and swaps when ready.

**How to apply:** any time an Expo web screen is blank with no error and a dark
theme that should be visible, suspect a `return null` gate (fonts, or an
`isLoading` flag that never flips on web), not a thrown error — a thrown error
would show the ErrorBoundary fallback (dark bg), not white.

# Dev login on web without SQLite

expo-sqlite is stubbed on web (see itm-expo-sqlite-web.md), so any login path
that calls `getDb()` fails silently on web (`Alert.alert` is also a near-no-op
on react-native-web, so the error never surfaces). The Dev Bypass button must
create an in-memory session on web (skip the DB entirely) and use
`window.alert` for web error visibility.
