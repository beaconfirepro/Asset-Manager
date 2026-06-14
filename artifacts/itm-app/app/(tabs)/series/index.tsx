import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useInspectionSeries, useCreateSeries } from "@/hooks/useInspectionSeries";
import { useInspectionSchedules } from "@/hooks/useInspectionSchedules";
import { useAssets } from "@/hooks/useAssets";
import { SeriesCard } from "@/components/series/SeriesCard";
import { SeriesRevenuePanel } from "@/components/series/SeriesRevenuePanel";
import { InspectionSeriesFormModal } from "@/components/series/InspectionSeriesFormModal";
import { EmptyState } from "@/components/ui/EmptyState";
import type { InspectionSeries } from "@/db/schema";

type FilterTab = "all" | "booked" | "unbooked";

export default function SeriesListScreen() {
  const colors = useColors();
  const { orgId } = useAuth();
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: series = [], isLoading, refetch } = useInspectionSeries();
  const { data: allSchedules = [] } = useInspectionSchedules();
  const { data: assets = [] } = useAssets();
  const createSeries = useCreateSeries();

  const assetOptions = assets.map((a) => ({ id: a.id, name: a.name }));

  const filtered = useMemo(() => {
    if (filterTab === "booked") return series.filter((s) => s.is_booked);
    if (filterTab === "unbooked") return series.filter((s) => !s.is_booked);
    return series;
  }, [series, filterTab]);

  const nextDateBySeries = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const map: Record<string, string | null> = {};
    for (const s of series) {
      const upcoming = allSchedules
        .filter((sc) => sc.series_id === s.id && sc.scheduled_date >= today && sc.status !== "CANCELLED")
        .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));
      map[s.id] = upcoming[0]?.scheduled_date ?? null;
    }
    return map;
  }, [series, allSchedules]);

  const countBySeries = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of series) {
      map[s.id] = allSchedules.filter((sc) => sc.series_id === s.id && sc.status !== "CANCELLED").length;
    }
    return map;
  }, [series, allSchedules]);

  const FILTER_TABS: { key: FilterTab; label: string }[] = [
    { key: "all", label: `All (${series.length})` },
    { key: "booked", label: `Booked (${series.filter((s) => s.is_booked).length})` },
    { key: "unbooked", label: `Potential (${series.filter((s) => !s.is_booked).length})` },
  ];

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View style={styles.header}>
            {series.length > 0 && <SeriesRevenuePanel series={series} />}

            <View style={styles.filterRow}>
              {FILTER_TABS.map((tab) => (
                <Pressable
                  key={tab.key}
                  onPress={() => setFilterTab(tab.key)}
                  style={[
                    styles.filterTab,
                    {
                      backgroundColor: filterTab === tab.key ? colors.primary : colors.muted,
                      borderColor: filterTab === tab.key ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.filterTabText, { color: filterTab === tab.key ? "#fff" : colors.mutedForeground }]}>
                    {tab.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="repeat"
            title="No inspection series"
            description={
              filterTab !== "all"
                ? "No series match the selected filter."
                : "Tap + to create your first recurring inspection series."
            }
          />
        }
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }: { item: InspectionSeries }) => (
          <SeriesCard
            series={item}
            nextDate={nextDateBySeries[item.id]}
            scheduleCount={countBySeries[item.id]}
          />
        )}
      />

      <Pressable
        onPress={() => setShowCreateModal(true)}
        style={[styles.fab, { backgroundColor: colors.primary }]}
      >
        <Feather name="plus" size={22} color="#fff" />
      </Pressable>

      <InspectionSeriesFormModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        mode="create"
        assetOptions={assetOptions}
        onSubmit={async (data) => {
          await createSeries.mutateAsync(data);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { padding: 16, paddingBottom: 100 },
  header: { gap: 14, marginBottom: 14 },
  filterRow: { flexDirection: "row", gap: 8 },
  filterTab: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  filterTabText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  fab: {
    position: "absolute",
    bottom: 96,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
});
