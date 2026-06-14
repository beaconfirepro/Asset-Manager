import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";

type Props = {
  booked: number;
  potential: number;
};

function fmt(n: number) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function RecurringRevenueCard({ booked, potential }: Props) {
  const colors = useColors();
  const total = booked + potential;
  const pct = total > 0 ? Math.round((booked / total) * 100) : 0;

  return (
    <Card>
      <CardHeader title="Recurring Revenue" subtitle="ITM contracts" />
      <CardContent>
        <Text style={[styles.bookedAmt, { color: colors.success, fontFamily: "Inter_700Bold" }]}>
          {fmt(booked)}
        </Text>
        <Text style={[styles.bookedLabel, { color: colors.mutedForeground }]}>Booked ARR</Text>

        <View style={[styles.barTrack, { backgroundColor: colors.muted }]}>
          <View
            style={[styles.barFill, { width: `${pct}%` as any, backgroundColor: colors.success }]}
          />
        </View>

        <View style={styles.row}>
          <View style={styles.leg}>
            <View style={[styles.dot, { backgroundColor: colors.success }]} />
            <Text style={[styles.legLabel, { color: colors.mutedForeground }]}>
              Booked <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>{fmt(booked)}</Text>
            </Text>
          </View>
          <View style={styles.leg}>
            <View style={[styles.dot, { backgroundColor: colors.muted }]} />
            <Text style={[styles.legLabel, { color: colors.mutedForeground }]}>
              Potential <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>{fmt(potential)}</Text>
            </Text>
          </View>
        </View>
      </CardContent>
    </Card>
  );
}

const styles = StyleSheet.create({
  bookedAmt: { fontSize: 32, lineHeight: 36, letterSpacing: -1 },
  bookedLabel: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2, marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  barTrack: { height: 6, borderRadius: 3, overflow: "hidden", marginBottom: 10 },
  barFill: { height: 6, borderRadius: 3, minWidth: 4 },
  row: { flexDirection: "row", gap: 20 },
  leg: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
