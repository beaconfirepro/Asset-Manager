---
name: Expo NativeTabs reject boolean children
description: Conditional tab triggers must not render bare false/null inside expo-router NativeTabs or classic Tabs
---

# Expo Router tab layouts and conditional children

`expo-router/unstable-native-tabs` (`<NativeTabs>`) is used on real iOS devices when `isLiquidGlassAvailable()` returns true. The classic `<Tabs>` (from `expo-router`) is used everywhere else (web preview, older iOS).

**Rule:** Never put a bare conditional like `{FLAG && <NativeTabs.Trigger .../>}` directly inside `<NativeTabs>`. When the flag is false the expression renders the boolean `false` as a child. NativeTabs reads `child.props.name` while building the native tab structure, so a `false` child throws and the app crashes immediately on load (iOS only).

**Why:** The web preview uses classic `<Tabs>`, which only emits the warning "Layout children must be of type Screen, all other children are ignored" and keeps working. So a boolean-child bug is invisible on web but a hard crash on a physical iPhone/iPad — easy to ship unnoticed.

**How to apply:**
- For NativeTabs: build an array of `<NativeTabs.Trigger>` elements and conditionally `.push()` the optional ones, then render `<NativeTabs>{triggers}</NativeTabs>`.
- For classic Tabs: always render the `<Tabs.Screen>` and hide it with `options={{ href: FLAG ? undefined : null }}`. This also prevents Expo Router from auto-registering an untriggered route folder (e.g. `app/(tabs)/ai/`) as an unstyled visible tab.
