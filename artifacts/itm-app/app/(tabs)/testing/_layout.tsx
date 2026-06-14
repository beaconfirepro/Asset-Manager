import React from "react";
import { Stack } from "expo-router";
import { useColors } from "@/hooks/useColors";

export default function TestingLayout() {
  const colors = useColors();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { color: colors.foreground, fontFamily: "Inter_600SemiBold" },
        headerTintColor: colors.primary,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: "Testing & Maintenance" }} />
      <Stack.Screen name="equipment" options={{ title: "Equipment & Calibration" }} />
    </Stack>
  );
}
