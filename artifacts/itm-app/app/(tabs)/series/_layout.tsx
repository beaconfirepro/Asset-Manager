import { Stack } from "expo-router";
import React from "react";
import { useColors } from "@/hooks/useColors";

export default function SeriesLayout() {
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
      <Stack.Screen name="index" options={{ title: "ITM Contracts" }} />
      <Stack.Screen name="[id]" options={{ title: "Contract Detail" }} />
    </Stack>
  );
}
