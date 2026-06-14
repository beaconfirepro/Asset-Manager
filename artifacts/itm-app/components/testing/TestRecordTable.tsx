import React from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import type { SystemTest } from "@/db/schema";

type Props = {
  tests: SystemTest[];
  onDelete?: (id: string) => void;
};

function readingsSummary(readings: string | null | undefined): string {
  if (!readings) return "—";
  try {
    const parsed = JSON.parse(readings) as Record<string, unknown>;
    const pairs = Object.entries(parsed)
      .slice(0, 2)
      .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`)
      .join(", ");
    return pairs || "—";
  } catch {
    return readings.slice(0, 40);
  }
}

export function TestRecordTable({ tests, onDelete }: Props) {
  const colors = useColors();

  if (tests.length === 0) {
    return (
      <EmptyState
        icon="activity"
        title="No test records"
        description="Tap + to log a system test"
      />
    );
  }

  const sorted = [...tests].sort((a, b) => b.tested_at.localeCompare(a.tested_at));

  const handleDelete = (t: SystemTest) => {
    if (!onDelete) return;
    Alert.alert(
      "Delete Test Record?",
      "This record will be removed and the change queued for sync.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => onDelete(t.id) },
      ],
    );
  };

  return (
    <View style={styles.table}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.hCell, { color: colors.mutedForeground, flex: 2 }]}>Asset / Type</Text>
        <Text style={[styles.hCell, { color: colors.mutedForeground, flex: 2 }]}>Readings</Text>
        <Text style={[styles.hCell, { color: colors.mutedForeground, flex: 1.2 }]}>Date</Text>
        <Text style={[styles.hCell, { color: colors.mutedForeground, flex: 1 }]}>Result</Text>
        {onDelete && <View style={{ width: 24 }} />}
      </View>
      {sorted.map((t, idx) => (
        <View
          key={t.id}
          style={[
            styles.row,
            {
              borderBottomColor: colors.border,
              borderBottomWidth: idx < sorted.length - 1 ? 1 : 0,
              backgroundColor: t.result === "FAIL" ? colors.destructive + "0A" : "transparent",
            },
          ]}
        >
          <View style={{ flex: 2, paddingRight: 6 }}>
            <Text style={[styles.cell, { color: colors.foreground }]} numberOfLines={1}>
              {t.hubspot_asset_id}
            </Text>
            <Text style={[styles.subCell, { color: colors.mutedForeground }]} numberOfLines={1}>
              {t.test_type.replace(/_/g, " ")}
            </Text>
          </View>
          <Text style={[styles.cell, { color: colors.mutedForeground, flex: 2 }]} numberOfLines={2}>
            {readingsSummary(t.readings)}
          </Text>
          <Text style={[styles.cell, { color: colors.foreground, flex: 1.2 }]}>
            {t.tested_at.slice(0, 10)}
          </Text>
          <View style={{ flex: 1 }}>
            <StatusBadge status={t.result} size="sm" />
          </View>
          {onDelete && (
            <Pressable onPress={() => handleDelete(t)} hitSlop={10} style={{ width: 24, alignItems: "center" }}>
              <Feather name="trash-2" size={14} color={colors.destructive} />
            </Pressable>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  table: {},
  header: { flexDirection: "row", paddingVertical: 6, borderBottomWidth: 1 },
  hCell: { fontSize: 10, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  row: { flexDirection: "row", paddingVertical: 10, alignItems: "flex-start" },
  cell: { fontSize: 12, fontFamily: "Inter_400Regular", paddingRight: 6 },
  subCell: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 2 },
});
