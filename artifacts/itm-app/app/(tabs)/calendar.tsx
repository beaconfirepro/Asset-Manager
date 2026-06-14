import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useInspectionSchedules } from "@/hooks/useInspectionSchedules";
import { useInspectionContracts } from "@/hooks/useInspectionContracts";
import { InspectionCalendar } from "@/components/contracts/InspectionCalendar";
import { Card, CardContent } from "@/components/ui/Card";
import type { InspectionSchedule } from "@/db/schema";

export default function CalendarScreen() {
  const colors = useColors();
  const router = useRouter();

  const { data: schedules = [], isLoading: schLoading, refetch: refetchSch } = useInspectionSchedules();
  const { data: contract = [], isLoading: serLoading, refetch: refetchSer } = useInspectionContracts();

  const isLoading = schLoading || serLoading;

  const active = useMemo(
    () => schedules.filter((s) => s.status !== "CANCELLED"),
    [schedules],
  );

  const today = new Date().toISOString().slice(0, 10);
  const in14 = new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10);

  const overdue = active.filter((s) => s.scheduled_date.slice(0, 10) < today);
  const dueSoon = active.filter((s) => {
    const d = s.scheduled_date.slice(0, 10);
    return d >= today && d <= in14;
  });
  const onTrack = active.filter((s) => s.scheduled_date.slice(0, 10) > in14);

  const handleSelectSchedule = (schedule: InspectionSchedule) => {
    const ser = contract.find((s) => s.id === schedule.contract_id);
    if (ser) {
      router.push(`/contracts/${ser.id}` as any);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={() => { refetchSch(); refetchSer(); }}
          tintColor={colors.primary}
        />
      }
    >
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        Internal operations view — {active.length} scheduled visit{active.length !== 1 ? "s" : ""}
      </Text>

      <View style={[styles.statsRow]}>
        {[
          { label: "Overdue", count: overdue.length, color: colors.destructive },
          { label: "Due soon", count: dueSoon.length, color: colors.warning },
          { label: "On track", count: onTrack.length, color: colors.info },
        ].map((stat) => (
          <Card key={stat.label} style={[styles.statCard, { borderColor: stat.color + "44" }]}>
            <CardContent>
              <Text style={[styles.statCount, { color: stat.color }]}>{stat.count}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{stat.label}</Text>
            </CardContent>
          </Card>
        ))}
      </View>

      <InspectionCalendar schedules={active} onSelectSchedule={handleSelectSchedule} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: Platform.OS === "web" ? 96 : 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 4 },
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: { flex: 1 },
  statCount: { fontSize: 28, fontFamily: "Inter_700Bold", textAlign: "center" },
  statLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", textAlign: "center", marginTop: 2 },
});
