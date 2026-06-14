import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import type { ActionQueueItem } from "@/hooks/useDashboard";

const TYPE_ICON: Record<ActionQueueItem["type"], string> = {
  OVERDUE: "alert-circle",
  AWAITING_QA: "eye",
  FAILED_TEST: "x-circle",
  EXPIRING_CALIBRATION: "tool",
  DUE_SOON: "clock",
};

const SEVERITY_COLOR = (colors: ReturnType<typeof useColors>, sev: ActionQueueItem["severity"]) => {
  if (sev === "high") return colors.destructive;
  if (sev === "medium") return colors.warning;
  return colors.info;
};

type Props = {
  items: ActionQueueItem[];
};

export function ActionQueuePanel({ items }: Props) {
  const colors = useColors();
  const router = useRouter();

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader title="Action Queue" subtitle="Items requiring attention" />
        <CardContent>
          <View style={styles.emptyRow}>
            <Feather name="check-circle" size={20} color={colors.success} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              All clear — no actions required
            </Text>
          </View>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Action Queue"
        subtitle={`${items.length} item${items.length !== 1 ? "s" : ""} requiring attention`}
      />
      <CardContent style={{ paddingHorizontal: 0 }}>
        {items.map((item, idx) => {
          const color = SEVERITY_COLOR(colors, item.severity);
          const iconName = TYPE_ICON[item.type] as any;
          const isLast = idx === items.length - 1;

          return (
            <Pressable
              key={item.id}
              onPress={() => router.push(item.href as any)}
              style={({ pressed }) => [
                styles.row,
                { borderBottomColor: colors.border, borderBottomWidth: isLast ? 0 : 1 },
                pressed && { backgroundColor: colors.muted + "66" },
              ]}
            >
              <View style={[styles.iconBox, { backgroundColor: color + "22" }]}>
                <Feather name={iconName} size={16} color={color} />
              </View>
              <View style={styles.text}>
                <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={[styles.sub, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {item.subtitle}
                </Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </Pressable>
          );
        })}
      </CardContent>
    </Card>
  );
}

const styles = StyleSheet.create({
  emptyRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  iconBox: { width: 34, height: 34, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  text: { flex: 1 },
  title: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  sub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
});
