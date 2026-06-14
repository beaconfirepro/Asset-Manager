import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useOffline } from "@/context/OfflineContext";
import { useColors } from "@/hooks/useColors";

type Props = {
  compact?: boolean;
};

export function OfflineSyncIndicator({ compact = false }: Props) {
  const { isOnline, pendingCount } = useOffline();
  const colors = useColors();

  const bgColor = isOnline ? colors.success + "22" : colors.warning + "22";
  const borderColor = isOnline ? colors.success + "55" : colors.warning + "55";
  const textColor = isOnline ? colors.success : colors.warning;
  const icon = isOnline ? "wifi" : "wifi-off";

  if (compact) {
    return (
      <View style={[styles.dot, { backgroundColor: isOnline ? colors.success : colors.warning }]} />
    );
  }

  return (
    <View style={[styles.banner, { backgroundColor: bgColor, borderColor }]}>
      <Feather name={icon} size={13} color={textColor} />
      <Text style={[styles.text, { color: textColor }]}>
        {isOnline
          ? pendingCount > 0
            ? `Online · Syncing ${pendingCount} item${pendingCount !== 1 ? "s" : ""}…`
            : "Online · All data synced"
          : pendingCount > 0
          ? `Offline · ${pendingCount} pending — will sync on reconnect`
          : "Offline · Working locally"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  text: { fontSize: 12, fontFamily: "Inter_500Medium", flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
