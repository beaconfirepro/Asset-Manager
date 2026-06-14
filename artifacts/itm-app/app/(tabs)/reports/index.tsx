import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useReports, type ReportWithResult } from "@/hooks/useReports";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ScreenWrapper } from "@/components/ui/ScreenWrapper";

const STATUS_FILTERS = ["ALL", "DRAFT", "QA_REVIEW", "APPROVED", "SENT"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

function reportStatusBadge(status: string) {
  return <StatusBadge status={status} size="sm" />;
}

function ReportRow({ report, onPress }: { report: ReportWithResult; onPress: () => void }) {
  const colors = useColors();
  const s = rowStyles(colors);
  const createdDate = report.created_at ? new Date(report.created_at).toLocaleDateString() : "—";
  const assetId = report.result?.hubspot_asset_id ?? "—";
  const sentDate = report.sent_at ? new Date(report.sent_at).toLocaleDateString() : null;

  return (
    <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={0.75}>
      <View style={s.rowLeft}>
        <Text style={s.title} numberOfLines={1}>{report.title ?? "Untitled Report"}</Text>
        <Text style={s.sub}>Asset: {assetId} · Created: {createdDate}</Text>
        {sentDate && <Text style={s.sent}>Sent {sentDate}</Text>}
      </View>
      <View style={s.rowRight}>
        {reportStatusBadge(report.status)}
        <Text style={s.chevron}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function ReportsIndexScreen() {
  const colors = useColors();
  const router = useRouter();
  const s = styles(colors);

  const { data: reports = [], isLoading } = useReports();
  const [filter, setFilter] = useState<StatusFilter>("ALL");

  const filtered = filter === "ALL" ? reports : reports.filter((r) => r.status === filter);

  const counts: Record<string, number> = {};
  for (const r of reports) counts[r.status] = (counts[r.status] ?? 0) + 1;

  if (isLoading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <ScreenWrapper>
      <View style={s.header}>
        <Text style={s.pageTitle}>Reports</Text>
        <Text style={s.pageSubtitle}>{reports.length} total</Text>
      </View>

      <View style={s.filterBar}>
        {STATUS_FILTERS.map((f) => {
          const active = filter === f;
          const count = f === "ALL" ? reports.length : (counts[f] ?? 0);
          return (
            <TouchableOpacity
              key={f}
              style={[s.filterChip, active && s.filterChipActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[s.filterLabel, active && s.filterLabelActive]}>
                {f === "ALL" ? "All" : f === "QA_REVIEW" ? "QA Review" : f.charAt(0) + f.slice(1).toLowerCase()}
              </Text>
              {count > 0 && (
                <View style={[s.filterBadge, active && s.filterBadgeActive]}>
                  <Text style={[s.filterBadgeText, active && s.filterBadgeTextActive]}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {filtered.length === 0 ? (
        <EmptyState
          title="No reports"
          description={filter === "ALL" ? "Reports will appear here after inspections are submitted and approved." : `No ${filter.toLowerCase()} reports.`}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(r) => r.id}
          contentContainerStyle={s.list}
          renderItem={({ item }) => (
            <ReportRow
              report={item}
              onPress={() => router.push(`/(tabs)/reports/${item.id}`)}
            />
          )}
          ItemSeparatorComponent={() => <View style={s.separator} />}
        />
      )}
    </ScreenWrapper>
  );
}

function styles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
    header: { paddingHorizontal: 20, paddingBottom: 16 },
    pageTitle: { fontSize: 28, fontFamily: "Inter_700Bold", color: colors.foreground },
    pageSubtitle: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 2 },
    filterBar: { flexDirection: "row", paddingHorizontal: 16, paddingBottom: 12, gap: 8, flexWrap: "wrap" },
    filterChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
    filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    filterLabel: { fontSize: 12, fontFamily: "Inter_500Medium", color: colors.mutedForeground },
    filterLabelActive: { color: "#fff" },
    filterBadge: { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.border, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
    filterBadgeActive: { backgroundColor: "rgba(255,255,255,0.3)" },
    filterBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground },
    filterBadgeTextActive: { color: "#fff" },
    list: { paddingHorizontal: 16, paddingBottom: 32 },
    separator: { height: 8 },
  });
}

function rowStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    row: { backgroundColor: colors.card, borderRadius: 12, padding: 16, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.border },
    rowLeft: { flex: 1, gap: 3 },
    title: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    sub: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    sent: { fontSize: 11, color: colors.success, fontFamily: "Inter_500Medium" },
    rowRight: { alignItems: "flex-end", gap: 6, marginLeft: 12 },
    chevron: { fontSize: 18, color: colors.mutedForeground },
  });
}
