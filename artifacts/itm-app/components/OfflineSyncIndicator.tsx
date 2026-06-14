import React from "react";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useOffline } from "@/context/OfflineContext";

type OfflineSyncIndicatorProps = {
  style?: ViewStyle;
  compact?: boolean;
};

export function OfflineSyncIndicator({ style, compact = false }: OfflineSyncIndicatorProps) {
  const colors = useColors();
  const { isOnline, pendingCount } = useOffline();

  if (isOnline && pendingCount === 0) return null;

  const bgColor = isOnline ? colors.warning + "22" : colors.destructive + "22";
  const iconColor = isOnline ? colors.warning : colors.destructive;
  const icon = isOnline ? "upload-cloud" : "wifi-off";

  const label = isOnline
    ? compact
      ? `${pendingCount} pending`
      : `Syncing ${pendingCount} item${pendingCount !== 1 ? "s" : ""}…`
    : compact
      ? "Offline"
      : "Working offline — changes will sync when connected";

  return (
    <View style={[styles.container, { backgroundColor: bgColor, borderColor: iconColor + "44" }, style]}>
      <Feather name={icon as never} size={compact ? 12 : 14} color={iconColor} />
      <Text style={[styles.label, { color: iconColor, fontSize: compact ? 11 : 12 }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
    borderWidth: 1,
  },
  label: { fontFamily: "Inter_500Medium" },
});
