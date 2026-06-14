import React from "react";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import { useColors } from "@/hooks/useColors";

const SYSTEM_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  FIRE_SPRINKLER: { label: "Fire Sprinkler", color: "#E85D2F" },
  FIRE_ALARM: { label: "Fire Alarm", color: "#DC2626" },
  SUPPRESSION: { label: "Suppression", color: "#7C3AED" },
  KITCHEN_HOOD: { label: "Kitchen Hood", color: "#D97706" },
  SPECIAL_HAZARD: { label: "Special Hazard", color: "#0891B2" },
  EMERGENCY_LIGHTING: { label: "Emergency Lighting", color: "#16A34A" },
};

type Props = {
  systemType: string;
  size?: "sm" | "md";
  style?: ViewStyle;
};

export function SystemTypeBadge({ systemType, size = "md", style }: Props) {
  const cfg = SYSTEM_TYPE_CONFIG[systemType] ?? { label: systemType.replace(/_/g, " "), color: "#64748B" };
  const paddingH = size === "sm" ? 6 : 10;
  const paddingV = size === "sm" ? 2 : 5;
  const fontSize = size === "sm" ? 10 : 12;

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: cfg.color + "22", paddingHorizontal: paddingH, paddingVertical: paddingV },
        style,
      ]}
    >
      <View style={[styles.dot, { backgroundColor: cfg.color }]} />
      <Text style={[styles.label, { color: cfg.color, fontSize }]}>{cfg.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 100, alignSelf: "flex-start" },
  dot: { width: 6, height: 6, borderRadius: 3 },
  label: { fontFamily: "Inter_600SemiBold", letterSpacing: 0.2 },
});
