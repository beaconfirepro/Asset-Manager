import React from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import type { TestEquipment } from "@/db/schema";

type Props = {
  equipment: TestEquipment[];
  onLogCalibration?: (eq: TestEquipment) => void;
};

export function TestEquipmentTable({ equipment, onLogCalibration }: Props) {
  const colors = useColors();

  if (equipment.length === 0) {
    return (
      <EmptyState
        icon="tool"
        title="No test equipment"
        description="Tap + to add an instrument"
      />
    );
  }

  const sorted = [...equipment].sort((a, b) => {
    const order = { OVERDUE: 0, EXPIRED: 1, DUE_SOON: 2, VALID: 3 };
    return (order[a.calibration_status as keyof typeof order] ?? 4) -
           (order[b.calibration_status as keyof typeof order] ?? 4);
  });

  return (
    <View style={styles.table}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.hCell, { color: colors.mutedForeground, flex: 2.5 }]}>Instrument</Text>
        <Text style={[styles.hCell, { color: colors.mutedForeground, flex: 1.5 }]}>Serial</Text>
        <Text style={[styles.hCell, { color: colors.mutedForeground, flex: 1.5 }]}>Next Cal.</Text>
        <Text style={[styles.hCell, { color: colors.mutedForeground, flex: 1.2 }]}>Status</Text>
        {onLogCalibration && <View style={{ width: 32 }} />}
      </View>
      {sorted.map((eq, idx) => (
        <View
          key={eq.id}
          style={[
            styles.row,
            {
              borderBottomColor: colors.border,
              borderBottomWidth: idx < sorted.length - 1 ? 1 : 0,
              backgroundColor:
                eq.calibration_status === "OVERDUE" || eq.calibration_status === "EXPIRED"
                  ? colors.destructive + "0A"
                  : eq.calibration_status === "DUE_SOON"
                  ? colors.warning + "0A"
                  : "transparent",
            },
          ]}
        >
          <View style={{ flex: 2.5, paddingRight: 6 }}>
            <Text style={[styles.cell, { color: colors.foreground }]} numberOfLines={1}>
              {eq.name}
            </Text>
            {eq.model && (
              <Text style={[styles.subCell, { color: colors.mutedForeground }]} numberOfLines={1}>
                {eq.manufacturer ? `${eq.manufacturer} — ` : ""}{eq.model}
              </Text>
            )}
          </View>
          <Text style={[styles.cell, { color: colors.mutedForeground, flex: 1.5 }]} numberOfLines={1}>
            {eq.serial_number ?? "—"}
          </Text>
          <Text
            style={[
              styles.cell,
              {
                color:
                  eq.calibration_status === "OVERDUE" || eq.calibration_status === "EXPIRED"
                    ? colors.destructive
                    : eq.calibration_status === "DUE_SOON"
                    ? colors.warning
                    : colors.foreground,
                flex: 1.5,
              },
            ]}
          >
            {eq.next_calibration_at ? eq.next_calibration_at.slice(0, 10) : "—"}
          </Text>
          <View style={{ flex: 1.2 }}>
            <StatusBadge status={eq.calibration_status} size="sm" />
          </View>
          {onLogCalibration && (
            <Pressable
              onPress={() => onLogCalibration(eq)}
              hitSlop={10}
              style={[styles.calBtn, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "44" }]}
            >
              <Feather name="check-circle" size={12} color={colors.primary} />
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
  calBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
