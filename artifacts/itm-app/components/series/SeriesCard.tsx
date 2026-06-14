import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { Badge } from "@/components/ui/Badge";
import { SystemTypeBadge } from "@/components/assets/SystemTypeBadge";
import type { InspectionSeries } from "@/db/schema";

type Props = {
  series: InspectionSeries;
  nextDate?: string | null;
  scheduleCount?: number;
};

function freqLabel(days: number) {
  if (days === 30) return "Monthly";
  if (days === 90) return "Quarterly";
  if (days === 180) return "Semi-Annual";
  if (days === 365) return "Annual";
  return `Every ${days}d`;
}

export function SeriesCard({ series, nextDate, scheduleCount }: Props) {
  const colors = useColors();
  const router = useRouter();

  const today = new Date().toISOString().slice(0, 10);
  const isOverdue = nextDate && nextDate < today;

  return (
    <Pressable
      onPress={() => router.push(`/series/${series.id}` as any)}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
        pressed && { opacity: 0.85 },
      ]}
    >
      <View style={styles.top}>
        <View style={styles.titleRow}>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={2}>
            {series.name}
          </Text>
          <Badge
            label={series.is_booked ? "Booked" : "Unbooked"}
            variant={series.is_booked ? "success" : "muted"}
            size="sm"
          />
        </View>
        <SystemTypeBadge systemType={series.system_type} size="sm" />
      </View>

      <View style={styles.meta}>
        <View style={styles.metaItem}>
          <Feather name="repeat" size={11} color={colors.mutedForeground} />
          <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
            {freqLabel(series.frequency_days)}
          </Text>
        </View>
        {scheduleCount !== undefined && (
          <View style={styles.metaItem}>
            <Feather name="calendar" size={11} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
              {scheduleCount} visit{scheduleCount !== 1 ? "s" : ""}
            </Text>
          </View>
        )}
        {nextDate && (
          <View style={styles.metaItem}>
            <Feather
              name="clock"
              size={11}
              color={isOverdue ? colors.destructive : colors.mutedForeground}
            />
            <Text style={[styles.metaText, { color: isOverdue ? colors.destructive : colors.mutedForeground }]}>
              {isOverdue ? `Overdue: ${nextDate}` : `Next: ${nextDate}`}
            </Text>
          </View>
        )}
        {series.contracted_amount != null && (
          <View style={styles.metaItem}>
            <Feather name="dollar-sign" size={11} color={colors.success} />
            <Text style={[styles.metaText, { color: colors.success }]}>
              ${series.contracted_amount.toLocaleString()}
            </Text>
          </View>
        )}
      </View>

      <Feather name="chevron-right" size={16} color={colors.mutedForeground} style={styles.chevron} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  top: { gap: 6 },
  titleRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  name: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold", lineHeight: 19 },
  meta: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  chevron: { position: "absolute", right: 14, top: 14 },
});
