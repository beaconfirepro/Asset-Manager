import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { StatusBadge } from "@/components/ui/Badge";
import type { inspectionSchedules } from "@/db/schema";

type Schedule = typeof inspectionSchedules.$inferSelect;

type Props = {
  schedule: Schedule;
};

export function InspectionScheduleRow({ schedule }: Props) {
  const colors = useColors();
  const isPast = schedule.scheduled_date < new Date().toISOString();
  const dateColor = isPast && schedule.status === "DRAFT" ? colors.destructive : colors.foreground;

  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <View style={[styles.iconBox, { backgroundColor: colors.muted }]}>
        <Feather name="calendar" size={14} color={colors.primary} />
      </View>
      <View style={styles.info}>
        <Text style={[styles.date, { color: dateColor }]}>
          {schedule.scheduled_date.slice(0, 10)}
        </Text>
        {schedule.hubspot_inspection_ticket_id && (
          <Text style={[styles.ticket, { color: colors.mutedForeground }]}>
            Ticket: {schedule.hubspot_inspection_ticket_id}
          </Text>
        )}
      </View>
      <StatusBadge status={schedule.status} size="sm" />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  iconBox: { width: 28, height: 28, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  info: { flex: 1 },
  date: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  ticket: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
});
