import { Stack } from "expo-router";
import React from "react";
import { useColors } from "@/hooks/useColors";

export default function AdminFormsLayout() {
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
      <Stack.Screen name="index" options={{ title: "Inspection Forms" }} />
      <Stack.Screen name="[id]" options={{ title: "Form Builder" }} />
      <Stack.Screen name="new" options={{ title: "New Form" }} />
    </Stack>
  );
}
