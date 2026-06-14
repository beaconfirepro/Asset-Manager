import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Slot, Tabs, usePathname, useRouter } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useResponsive } from "@/hooks/useResponsive";
import { FEATURES } from "@/lib/featureFlags";

const RAIL_BG = "#18181B";
const RAIL_WIDTH = 72;

type SFSymbolName = React.ComponentProps<typeof SymbolView>["name"];

type RailItem = {
  name: string;
  route: string;
  label: string;
  featherIcon: React.ComponentProps<typeof Feather>["name"];
  sfIcon?: SFSymbolName;
};

function getRailItems(): RailItem[] {
  const items: RailItem[] = [
    { name: "index", route: "/(tabs)", label: "Dashboard", featherIcon: "grid", sfIcon: "square.grid.2x2" },
    { name: "assets", route: "/(tabs)/assets", label: "Assets", featherIcon: "box", sfIcon: "building.2" },
    { name: "contracts", route: "/(tabs)/contracts", label: "Contracts", featherIcon: "repeat", sfIcon: "repeat" },
    { name: "calendar", route: "/(tabs)/calendar", label: "Calendar", featherIcon: "calendar", sfIcon: "calendar" },
    { name: "reports", route: "/(tabs)/reports", label: "Reports", featherIcon: "file-text", sfIcon: "doc.text" },
    { name: "testing", route: "/(tabs)/testing", label: "Testing", featherIcon: "activity", sfIcon: "flask" },
  ];

  if (FEATURES.AI_CODE_INTELLIGENCE) {
    items.push({ name: "ai", route: "/(tabs)/ai", label: "AI", featherIcon: "cpu", sfIcon: "sparkles" });
  }

  return items;
}

function SideRailLayout() {
  const colors = useColors();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const isIOS = Platform.OS === "ios";
  const items = getRailItems();

  const isActive = (item: RailItem) => {
    if (item.name === "index") return pathname === "/" || pathname === "";
    return pathname.startsWith(`/${item.name}`);
  };

  return (
    <View style={railStyles.container}>
      <View
        style={[
          railStyles.rail,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 },
        ]}
      >
        {items.map((item) => {
          const active = isActive(item);
          const iconColor = active ? colors.tint : "#71717A";

          return (
            <Pressable
              key={item.name}
              onPress={() => router.push(item.route as never)}
              style={[
                railStyles.railItem,
                active && { backgroundColor: "rgba(255,255,255,0.08)" },
              ]}
            >
              {isIOS && item.sfIcon ? (
                <SymbolView name={item.sfIcon} tintColor={iconColor} size={22} />
              ) : (
                <Feather name={item.featherIcon} size={20} color={iconColor} />
              )}
              <Text
                style={[
                  railStyles.railLabel,
                  { color: active ? colors.tint : "#71717A" },
                ]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={railStyles.content}>
        <Slot />
      </View>
    </View>
  );
}

function NativeTabLayout() {
  const triggers = [
    <NativeTabs.Trigger key="index" name="index">
      <Icon sf={{ default: "square.grid.2x2", selected: "square.grid.2x2.fill" }} />
      <Label>Dashboard</Label>
    </NativeTabs.Trigger>,
    <NativeTabs.Trigger key="assets" name="assets">
      <Icon sf={{ default: "building.2", selected: "building.2.fill" }} />
      <Label>Assets</Label>
    </NativeTabs.Trigger>,
    <NativeTabs.Trigger key="contracts" name="contracts">
      <Icon sf={{ default: "repeat", selected: "repeat.1" }} />
      <Label>Contracts</Label>
    </NativeTabs.Trigger>,
    <NativeTabs.Trigger key="calendar" name="calendar">
      <Icon sf={{ default: "calendar", selected: "calendar" }} />
      <Label>Calendar</Label>
    </NativeTabs.Trigger>,
    <NativeTabs.Trigger key="reports" name="reports">
      <Icon sf={{ default: "doc.text", selected: "doc.text.fill" }} />
      <Label>Reports</Label>
    </NativeTabs.Trigger>,
    <NativeTabs.Trigger key="testing" name="testing">
      <Icon sf={{ default: "flask", selected: "flask.fill" }} />
      <Label>Testing</Label>
    </NativeTabs.Trigger>,
  ];

  if (FEATURES.AI_CODE_INTELLIGENCE) {
    triggers.push(
      <NativeTabs.Trigger key="ai" name="ai">
        <Icon sf={{ default: "sparkles", selected: "sparkles" }} />
        <Label>AI</Label>
      </NativeTabs.Trigger>,
    );
  }

  return <NativeTabs>{triggers}</NativeTabs>;
}

function ClassicTabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarShowLabel: false,
        headerShown: true,
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { color: colors.foreground, fontFamily: "Inter_600SemiBold" },
        headerShadowVisible: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View
              style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]}
            />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          headerShown: false,
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="square.grid.2x2" tintColor={color} size={24} />
            ) : (
              <Feather name="grid" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="assets"
        options={{
          title: "Assets",
          headerShown: false,
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="building.2" tintColor={color} size={24} />
            ) : (
              <Feather name="box" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="contracts"
        options={{
          title: "Contracts",
          headerShown: false,
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="repeat" tintColor={color} size={24} />
            ) : (
              <Feather name="repeat" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: "Calendar",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="calendar" tintColor={color} size={24} />
            ) : (
              <Feather name="calendar" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: "Reports",
          headerShown: false,
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="doc.text" tintColor={color} size={24} />
            ) : (
              <Feather name="file-text" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="testing"
        options={{
          title: "Testing",
          headerShown: false,
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="flask" tintColor={color} size={24} />
            ) : (
              <Feather name="activity" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="ai"
        options={{
          title: "AI",
          headerShown: false,
          href: FEATURES.AI_CODE_INTELLIGENCE ? undefined : null,
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="sparkles" tintColor={color} size={24} />
            ) : (
              <Feather name="cpu" size={22} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  const { isTablet } = useResponsive();

  if (isTablet) {
    return <SideRailLayout />;
  }

  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}

const railStyles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
  },
  rail: {
    width: RAIL_WIDTH,
    backgroundColor: RAIL_BG,
    alignItems: "center",
    paddingHorizontal: 4,
    gap: 4,
  },
  railItem: {
    alignItems: "center",
    justifyContent: "center",
    width: 64,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 4,
  },
  railLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
  content: {
    flex: 1,
  },
});
