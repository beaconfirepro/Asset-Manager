import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";

type Props = {
  upcomingCount: number;
  overdueCount: number;
};

export function UpcomingInspectionsCard({ upcomingCount, overdueCount }: Props) {
  const colors = useColors();

  return (
    <Card>
      <CardHeader title="Inspections" subtitle="Next 30 days" />
      <CardContent>
        <View style={styles.row}>
          <View style={[styles.statBox, { backgroundColor: colors.info + "18", borderColor: colors.info + "44" }]}>
            <Feather name="calendar" size={20} color={colors.info} />
            <Text style={[styles.statNum, { color: colors.info }]}>{upcomingCount}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Upcoming</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.destructive + "18", borderColor: colors.destructive + "44" }]}>
            <Feather name="alert-circle" size={20} color={colors.destructive} />
            <Text style={[styles.statNum, { color: colors.destructive }]}>{overdueCount}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Overdue</Text>
          </View>
        </View>
      </CardContent>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 12 },
  statBox: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 10,
    gap: 4,
    borderWidth: 1,
  },
  statNum: { fontSize: 28, fontFamily: "Inter_700Bold", lineHeight: 32 },
  statLabel: { fontSize: 11, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5 },
});
