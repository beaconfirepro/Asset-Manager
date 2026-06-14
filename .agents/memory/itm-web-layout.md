---
name: ITM web layout / headers / scrollbars
description: How headers, top padding, and scrollbars are handled across the ITM Expo app on web vs native; the double-header trap.
---

# ITM web layout conventions

The ITM Expo app renders on web inside a narrow proxied iframe. Two navigator layers
can each draw a native header: the `(tabs)` Tabs navigator AND each tab's nested Stack
(`assets/_layout`, `series/_layout`, etc.).

**The double-header trap:** a screen that renders its OWN rich in-screen header (title +
subtitle + action buttons, e.g. Dashboard "ITM Dashboard", Assets "Asset Registry")
must NOT also show a native header, or you get two stacked titles plus a large empty gap.
Rule: if a screen owns its header, set `headerShown: false` for that screen (at whichever
navigator level draws it — Tabs for `index`/`calendar`, the nested Stack for `assets/index`).
Screens that rely on the native title (Series, Testing, AI, Calendar) keep their native header.

**Top padding:** never hardcode a magic web offset (there used to be `topPad = Platform.OS === "web" ? 67 : 0`
to "clear the header" — it created empty gaps on screens that had no header). Use
`useSafeAreaInsets()` → `paddingTop: insets.top + 16`. insets.top is 0 on web, real on iPad.
Screens that DO keep a native header should use just `paddingTop: 16` (the navigator already
offsets content below the header).

**Bottom clearance:** the tab bar is `position: absolute` (height 84 on web), so scroll
content must pad past it: `paddingBottom: insets.bottom + (Platform.OS === "web" ? 96 : 40)`.

**Scrollbars:** hidden globally on web via a `<style id="itm-web-overrides">` injected once
in `app/_layout.tsx` (web-only effect): sets `html,body,#root { height:100%; overflow:hidden }`
and zeroes `::-webkit-scrollbar` + `scrollbar-width:none`. Inner ScrollViews/FlatLists still scroll.

**Web preview auth:** to screenshot inner (authed) screens, the app normally needs the
dev-bypass login button (in-memory session, lost on reload). A temporary query-param-gated
auto-login can be added to AuthProvider for diagnostics, but REMOVE it after — it is not
production behavior.
