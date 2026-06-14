import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import type { maintenanceRecords } from "@/db/schema";

type Maintenance = typeof maintenanceRecords.$inferSelect;

type Props = {
  records: Maintenance[];
};

export function MaintenanceTable({ records }: Props) {
  const colors = useColors();

  if (records.length === 0) {
    return <EmptyState icon="tool" title="No maintenance records" description="Maintenance history will appear here" />;
  }

  return (
    <View style={styles.table}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.hCell, { color: colors.mutedForeground, flex: 2 }]}>Type</Text>
        <Text style={[styles.hCell, { color: colors.mutedForeground, flex: 2 }]}>Description</Text>
        <Text style={[styles.hCell, { color: colors.mutedForeground, flex: 1.5 }]}>Date</Text>
        <Text style={[styles.hCell, { color: colors.mutedForeground, flex: 1.2 }]}>Status</Text>
      </View>
      {records.map((rec, idx) => (
        <View
          key={rec.id}
          style={[
            styles.row,
            { borderBottomColor: colors.border, borderBottomWidth: idx < records.length - 1 ? 1 : 0 },
          ]}
        >
          <Text style={[styles.cell, { color: colors.foreground, flex: 2 }]} numberOfLines={1}>
            {rec.maintenance_type.replace(/_/g, " ")}
          </Text>
          <Text style={[styles.cell, { color: colors.mutedForeground, flex: 2 }]} numberOfLines={2}>
            {rec.description || "—"}
          </Text>
          <Text style={[styles.cell, { color: colors.foreground, flex: 1.5 }]}>
            {rec.completed_at ? rec.completed_at.slice(0, 10) : rec.scheduled_at?.slice(0, 10) ?? "—"}
          </Text>
          <View style={{ flex: 1.2 }}>
            <StatusBadge status={rec.status} size="sm" />
          </View>
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
});
