import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import type { InspectionSeries } from "@/db/schema";

type Props = {
  series: InspectionSeries[];
};

function fmt(n: number) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function SeriesRevenuePanel({ series }: Props) {
  const colors = useColors();

  const booked = series.filter((s) => s.is_booked && s.contracted_amount);
  const unbooked = series.filter((s) => !s.is_booked && s.contracted_amount);

  const bookedTotal = booked.reduce((acc, s) => acc + (s.contracted_amount ?? 0), 0);
  const unbookedTotal = unbooked.reduce((acc, s) => acc + (s.contracted_amount ?? 0), 0);
  const grandTotal = bookedTotal + unbookedTotal;

  const pct = grandTotal > 0 ? Math.round((bookedTotal / grandTotal) * 100) : 0;

  return (
    <Card>
      <CardHeader title="Revenue Summary" subtitle={`${series.length} contracts total`} />
      <CardContent>
        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={[styles.amtLabel, { color: colors.mutedForeground }]}>Booked ARR</Text>
            <Text style={[styles.amt, { color: colors.success, fontFamily: "Inter_700Bold" }]}>{fmt(bookedTotal)}</Text>
            <Text style={[styles.count, { color: colors.mutedForeground }]}>{booked.length} contracts</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.col}>
            <Text style={[styles.amtLabel, { color: colors.mutedForeground }]}>Potential</Text>
            <Text style={[styles.amt, { color: colors.warning, fontFamily: "Inter_700Bold" }]}>{fmt(unbookedTotal)}</Text>
            <Text style={[styles.count, { color: colors.mutedForeground }]}>{unbooked.length} contracts</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.col}>
            <Text style={[styles.amtLabel, { color: colors.mutedForeground }]}>Total</Text>
            <Text style={[styles.amt, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>{fmt(grandTotal)}</Text>
            <Text style={[styles.count, { color: colors.mutedForeground }]}>{pct}% booked</Text>
          </View>
        </View>

        <View style={[styles.barTrack, { backgroundColor: colors.muted }]}>
          <View style={[styles.barFill, { width: `${pct}%` as any, backgroundColor: colors.success }]} />
        </View>

        {booked.length > 0 && (
          <View style={styles.table}>
            <Text style={[styles.tableHeader, { color: colors.mutedForeground, borderBottomColor: colors.border }]}>
              Booked Contracts
            </Text>
            {booked.map((s) => (
              <View key={s.id} style={[styles.tableRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.seriesName, { color: colors.foreground }]} numberOfLines={1}>{s.name}</Text>
                <Text style={[styles.seriesAmt, { color: colors.success }]}>{fmt(s.contracted_amount ?? 0)}</Text>
              </View>
            ))}
          </View>
        )}
      </CardContent>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", marginBottom: 14 },
  col: { flex: 1, alignItems: "center", gap: 3 },
  divider: { width: 1, marginHorizontal: 4 },
  amtLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  amt: { fontSize: 18, letterSpacing: -0.5 },
  count: { fontSize: 11, fontFamily: "Inter_400Regular" },
  barTrack: { height: 6, borderRadius: 3, overflow: "hidden", marginBottom: 14 },
  barFill: { height: 6, borderRadius: 3, minWidth: 4 },
  table: {},
  tableHeader: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingBottom: 6,
    borderBottomWidth: 1,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  seriesName: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", marginRight: 8 },
  seriesAmt: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
