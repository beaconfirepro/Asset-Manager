import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { StatusBadge } from "@/components/ui/Badge";
import { SystemTypeBadge } from "./SystemTypeBadge";
import type { AssetWithOverlay } from "@/hooks/useAssets";

type Props = {
  asset: AssetWithOverlay;
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return iso.slice(0, 10);
}

export function AssetCard({ asset }: Props) {
  const colors = useColors();
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push(`/assets/${asset.id}` as any)}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
        pressed && { opacity: 0.85 },
      ]}
    >
      <View style={styles.top}>
        <View style={styles.titleRow}>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
            {asset.name}
          </Text>
          <StatusBadge status={asset.overallStatus} size="sm" />
        </View>
        <Text style={[styles.location, { color: colors.mutedForeground }]} numberOfLines={1}>
          <Feather name="map-pin" size={11} color={colors.mutedForeground} /> {asset.location || "No location"}
        </Text>
      </View>

      <View style={styles.footer}>
        <SystemTypeBadge systemType={asset.system_type} size="sm" />
        <View style={styles.dates}>
          <Text style={[styles.dateLabel, { color: colors.mutedForeground }]}>
            Last: <Text style={{ color: colors.foreground }}>{fmtDate(asset.lastInspectionAt)}</Text>
          </Text>
          <Text style={[styles.dateLabel, { color: colors.mutedForeground }]}>
            Next: <Text style={{ color: colors.foreground }}>{fmtDate(asset.nextInspectionAt)}</Text>
          </Text>
        </View>
        <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  top: { gap: 4 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  name: { flex: 1, fontSize: 15, fontFamily: "Inter_600SemiBold" },
  location: { fontSize: 12, fontFamily: "Inter_400Regular" },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  dates: { flex: 1, flexDirection: "row", gap: 12, justifyContent: "flex-end" },
  dateLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
