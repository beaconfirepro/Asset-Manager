import React, { useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useAssets } from "@/hooks/useAssets";
import { AssetCard } from "@/components/assets/AssetCard";
import { EmptyState } from "@/components/ui/EmptyState";

const SYSTEM_TYPES = ["All", "FIRE_SPRINKLER", "FIRE_ALARM", "SUPPRESSION", "KITCHEN_HOOD", "SPECIAL_HAZARD", "EMERGENCY_LIGHTING"];
const COMPLIANCE_STATUSES = ["All", "COMPLIANT", "NON_COMPLIANT", "PENDING", "EXEMPT"];

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? colors.primary : colors.muted,
          borderColor: active ? colors.primary : colors.border,
        },
      ]}
    >
      <Text style={[styles.chipText, { color: active ? "#fff" : colors.mutedForeground }]}>
        {label.replace(/_/g, " ")}
      </Text>
    </Pressable>
  );
}

export default function AssetRegistryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data: assets = [], isLoading, refetch, isRefetching } = useAssets();

  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("All");
  const [systemTypeFilter, setSystemTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");


  const locations = useMemo(() => {
    const unique = Array.from(new Set(assets.map((a) => a.location).filter(Boolean)));
    return ["All", ...unique.sort()];
  }, [assets]);

  const filtered = useMemo(() => {
    return assets.filter((a) => {
      const matchSearch =
        !search ||
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        (a.location ?? "").toLowerCase().includes(search.toLowerCase());
      const matchLocation = locationFilter === "All" || a.location === locationFilter;
      const matchType = systemTypeFilter === "All" || a.system_type === systemTypeFilter;
      const matchStatus = statusFilter === "All" || a.overallStatus === statusFilter;
      return matchSearch && matchLocation && matchType && matchStatus;
    });
  }, [assets, search, locationFilter, systemTypeFilter, statusFilter]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + (Platform.OS === "web" ? 96 : 40) }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      <View style={styles.pageHeader}>
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>Asset Registry</Text>
        <Text style={[styles.pageSubtitle, { color: colors.mutedForeground }]}>
          {assets.length} asset{assets.length !== 1 ? "s" : ""} · HubSpot-backed
        </Text>
      </View>

      <View style={[styles.searchBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
        <Feather name="search" size={16} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder="Search assets…"
          placeholderTextColor={colors.mutedForeground}
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />
      </View>

      <Text style={[styles.filterLabel, { color: colors.mutedForeground }]}>Location</Text>
      <View style={styles.chipRow}>
        {locations.map((l) => (
          <FilterChip
            key={l}
            label={l}
            active={locationFilter === l}
            onPress={() => setLocationFilter(l)}
          />
        ))}
      </View>

      <Text style={[styles.filterLabel, { color: colors.mutedForeground }]}>System Type</Text>
      <View style={styles.chipRow}>
        {SYSTEM_TYPES.map((t) => (
          <FilterChip
            key={t}
            label={t}
            active={systemTypeFilter === t}
            onPress={() => setSystemTypeFilter(t)}
          />
        ))}
      </View>

      <Text style={[styles.filterLabel, { color: colors.mutedForeground }]}>Compliance Status</Text>
      <View style={styles.chipRow}>
        {COMPLIANCE_STATUSES.map((s) => (
          <FilterChip
            key={s}
            label={s}
            active={statusFilter === s}
            onPress={() => setStatusFilter(s)}
          />
        ))}
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Loading assets…</Text>
        </View>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="layers"
          title={assets.length === 0 ? "No assets found" : "No matches"}
          description={
            assets.length === 0
              ? "Assets are synced from HubSpot. Check your connection."
              : "Try adjusting filters or search term."
          }
        />
      ) : (
        <View style={styles.list}>
          <Text style={[styles.resultCount, { color: colors.mutedForeground }]}>
            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          </Text>
          {filtered.map((asset) => (
            <AssetCard key={asset.id} asset={asset} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 10 },
  pageHeader: { marginBottom: 4 },
  pageTitle: { fontSize: 26, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  pageSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  filterLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: -4,
    marginTop: 2,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingVertical: 4 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100, borderWidth: 1 },
  chipText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  loading: { paddingVertical: 40, alignItems: "center" },
  loadingText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  list: { gap: 8 },
  resultCount: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "right" },
});
