import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";

type Props = {
  compliant: number;
  nonCompliant: number;
  pending: number;
  exempt: number;
  total: number;
};

type TrafficDotProps = {
  count: number;
  label: string;
  color: string;
  bg: string;
};

function TrafficDot({ count, label, color, bg }: TrafficDotProps) {
  return (
    <View style={styles.dotCol}>
      <View style={[styles.dotCircle, { backgroundColor: bg }]}>
        <Text style={[styles.dotCount, { color }]}>{count}</Text>
      </View>
      <Text style={[styles.dotLabel, { color }]}>{label}</Text>
    </View>
  );
}

export function ComplianceHealthCard({ compliant, nonCompliant, pending, exempt, total }: Props) {
  const colors = useColors();

  const pct = total > 0 ? Math.round((compliant / total) * 100) : 0;
  const healthLabel = nonCompliant > 0 ? "At Risk" : pending > 0 ? "Review Needed" : "Healthy";
  const healthColor = nonCompliant > 0 ? colors.destructive : pending > 0 ? colors.warning : colors.success;

  return (
    <Card>
      <CardHeader
        title="Compliance Health"
        subtitle={`${total} asset standard${total !== 1 ? "s" : ""} tracked`}
        right={
          <View style={[styles.healthPill, { backgroundColor: healthColor + "22" }]}>
            <View style={[styles.healthDot, { backgroundColor: healthColor }]} />
            <Text style={[styles.healthText, { color: healthColor }]}>{healthLabel}</Text>
          </View>
        }
      />
      <CardContent>
        <View style={styles.row}>
          <TrafficDot count={compliant} label="Compliant" color={colors.success} bg={colors.success + "22"} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <TrafficDot count={nonCompliant} label="Non-Compliant" color={colors.destructive} bg={colors.destructive + "22"} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <TrafficDot count={pending} label="Pending" color={colors.warning} bg={colors.warning + "22"} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <TrafficDot count={exempt} label="Exempt" color={colors.info} bg={colors.info + "22"} />
        </View>

        <View style={[styles.barTrack, { backgroundColor: colors.muted }]}>
          <View style={[styles.barFill, { width: `${pct}%` as any, backgroundColor: healthColor }]} />
        </View>
        <Text style={[styles.pctLabel, { color: colors.mutedForeground }]}>
          {pct}% compliant across all tracked standards
        </Text>
      </CardContent>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  dotCol: { flex: 1, alignItems: "center", gap: 6 },
  dotCircle: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  dotCount: { fontSize: 20, fontFamily: "Inter_700Bold" },
  dotLabel: { fontSize: 10, fontFamily: "Inter_500Medium", textAlign: "center", textTransform: "uppercase", letterSpacing: 0.4 },
  divider: { width: 1, height: 48, marginHorizontal: 4 },
  barTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  barFill: { height: 6, borderRadius: 3, minWidth: 4 },
  pctLabel: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 6, textAlign: "center" },
  healthPill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  healthDot: { width: 7, height: 7, borderRadius: 4 },
  healthText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
});
