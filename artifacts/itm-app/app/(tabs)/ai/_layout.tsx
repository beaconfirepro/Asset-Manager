import { Stack } from "expo-router";
import { useColors } from "@/hooks/useColors";

export default function AiLayout() {
  const colors = useColors();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { color: colors.foreground, fontFamily: "Inter_600SemiBold" },
        headerShadowVisible: false,
        headerBackTitle: "AI",
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: "AI Code Intelligence" }} />
    </Stack>
  );
}
