import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import type { InspectionSchedule } from "@/db/schema";

type Props = {
  schedules: InspectionSchedule[];
  onSelectSchedule?: (schedule: InspectionSchedule) => void;
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getStatusColor(
  date: string,
  colors: ReturnType<typeof useColors>,
): "red" | "orange" | "blue" | null {
  const today = new Date().toISOString().slice(0, 10);
  const in14 = new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10);
  if (date < today) return "red";
  if (date <= in14) return "orange";
  return "blue";
}

export function InspectionCalendar({ schedules, onSelectSchedule }: Props) {
  const colors = useColors();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const todayStr = today.toISOString().slice(0, 10);

  const activeSchedules = useMemo(
    () => schedules.filter((s) => s.status !== "CANCELLED"),
    [schedules],
  );

  const schedulesByDate = useMemo(() => {
    const map: Record<string, InspectionSchedule[]> = {};
    for (const s of activeSchedules) {
      const d = s.scheduled_date.slice(0, 10);
      if (!map[d]) map[d] = [];
      map[d].push(s);
    }
    return map;
  }, [activeSchedules]);

  const selectedSchedules = selectedDate ? (schedulesByDate[selectedDate] ?? []) : [];

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <View>
      <View style={[styles.header, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Pressable onPress={prevMonth} style={styles.navBtn} hitSlop={12}>
          <Feather name="chevron-left" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.monthLabel, { color: colors.foreground }]}>
          {MONTHS[month]} {year}
        </Text>
        <Pressable onPress={nextMonth} style={styles.navBtn} hitSlop={12}>
          <Feather name="chevron-right" size={20} color={colors.foreground} />
        </Pressable>
      </View>

      <View style={[styles.grid, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {DAYS.map((d) => (
          <View key={d} style={styles.dayHeader}>
            <Text style={[styles.dayHeaderText, { color: colors.mutedForeground }]}>{d}</Text>
          </View>
        ))}

        {cells.map((day, idx) => {
          if (day === null) {
            return <View key={`empty-${idx}`} style={styles.cell} />;
          }

          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const daySchedules = schedulesByDate[dateStr] ?? [];
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;
          const hasSchedule = daySchedules.length > 0;
          const dotColor = hasSchedule
            ? getStatusColor(dateStr, colors) === "red"
              ? colors.destructive
              : getStatusColor(dateStr, colors) === "orange"
              ? colors.warning
              : colors.info
            : null;

          return (
            <Pressable
              key={dateStr}
              style={[
                styles.cell,
                isToday && { backgroundColor: colors.primary + "22" },
                isSelected && { backgroundColor: colors.primary + "44" },
              ]}
              onPress={() => setSelectedDate(isSelected ? null : dateStr)}
            >
              <Text
                style={[
                  styles.dayNum,
                  { color: isToday ? colors.primary : colors.foreground },
                  isToday && { fontFamily: "Inter_700Bold" },
                ]}
              >
                {day}
              </Text>
              {dotColor && (
                <View style={[styles.dot, { backgroundColor: dotColor }]} />
              )}
              {daySchedules.length > 1 && (
                <Text style={[styles.count, { color: dotColor ?? colors.mutedForeground }]}>
                  {daySchedules.length}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.legend, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {[
          { label: "Overdue", color: colors.destructive },
          { label: "Due soon (≤14d)", color: colors.warning },
          { label: "On track", color: colors.info },
        ].map((l) => (
          <View key={l.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: l.color }]} />
            <Text style={[styles.legendLabel, { color: colors.mutedForeground }]}>{l.label}</Text>
          </View>
        ))}
      </View>

      {selectedDate && selectedSchedules.length > 0 && (
        <View style={[styles.dayDetail, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.dayDetailHeader, { color: colors.foreground }]}>
            {selectedDate} — {selectedSchedules.length} inspection{selectedSchedules.length !== 1 ? "s" : ""}
          </Text>
          {selectedSchedules.map((s) => {
            const statusColor =
              getStatusColor(s.scheduled_date, colors) === "red"
                ? colors.destructive
                : getStatusColor(s.scheduled_date, colors) === "orange"
                ? colors.warning
                : colors.info;
            return (
              <Pressable
                key={s.id}
                onPress={() => onSelectSchedule?.(s)}
                style={[styles.scheduleRow, { borderBottomColor: colors.border }]}
              >
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                <View style={styles.scheduleInfo}>
                  <Text style={[styles.scheduleAsset, { color: colors.foreground }]}>
                    Asset: {s.hubspot_asset_id}
                  </Text>
                  {s.hubspot_inspection_ticket_id && (
                    <Text style={[styles.scheduleTicket, { color: colors.mutedForeground }]}>
                      Ticket: {s.hubspot_inspection_ticket_id}
                    </Text>
                  )}
                </View>
                <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 2,
  },
  monthLabel: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  navBtn: { padding: 4 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 2,
  },
  dayHeader: { width: `${100 / 7}%` as any, alignItems: "center", paddingVertical: 8 },
  dayHeaderText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  cell: {
    width: `${100 / 7}%` as any,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 2,
  },
  dayNum: { fontSize: 13, fontFamily: "Inter_400Regular" },
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 2 },
  count: { fontSize: 9, fontFamily: "Inter_600SemiBold" },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 2,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  dayDetail: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginTop: 4,
  },
  dayDetailHeader: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 10 },
  scheduleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  scheduleInfo: { flex: 1 },
  scheduleAsset: { fontSize: 13, fontFamily: "Inter_500Medium" },
  scheduleTicket: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
});
