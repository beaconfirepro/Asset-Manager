import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useAsset, useAssetHistory } from "@/hooks/useAssets";
import { StatusBadge } from "@/components/ui/Badge";
import { SystemTypeBadge } from "@/components/assets/SystemTypeBadge";
import { AssetLifecycleBadge } from "@/components/assets/AssetLifecycleBadge";
import { ComplianceStandardChips } from "@/components/assets/ComplianceStandardChips";
import { AssetFormModal } from "@/components/assets/AssetFormModal";
import { InspectionScheduleRow } from "@/components/assets/InspectionScheduleRow";
import { MaintenanceTable } from "@/components/assets/MaintenanceTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { TabsView } from "@/components/ui/TabsView";
import { enqueue } from "@/lib/sync";
import { useAuth } from "@/context/AuthContext";

type Tab = "inspections" | "tests" | "maintenance" | "compliance" | "schedules";

const TABS: { id: Tab; label: string; key: Tab }[] = [
  { id: "inspections", key: "inspections", label: "Inspections" },
  { id: "tests", key: "tests", label: "Tests" },
  { id: "maintenance", key: "maintenance", label: "Maintenance" },
  { id: "compliance", key: "compliance", label: "Compliance" },
  { id: "schedules", key: "schedules", label: "Schedules" },
];

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return iso.slice(0, 10);
}

export default function AssetDetailScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { orgId } = useAuth();

  const { data: asset, isLoading: assetLoading } = useAsset(id);
  const { data: history, isLoading: historyLoading } = useAssetHistory(id);

  const [activeTab, setActiveTab] = useState<Tab>("inspections");
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [crewShiftLoading, setCrewShiftLoading] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : 0;

  const handleCreateCrewShift = async () => {
    if (!asset || !orgId) return;
    setCrewShiftLoading(true);
    try {
      await enqueue({
        org_id: orgId,
        entity_type: "crew_shift",
        entity_id: `shift_${Date.now().toString(36)}`,
        operation: "CREATE",
        payload: {
          hubspot_asset_id: asset.id,
          asset_name: asset.name,
          location: asset.location,
          system_type: asset.system_type,
          trigger: "manual_handoff",
        },
        target_provider: "CONNECTEAM",
      });
      Alert.alert(
        "Crew Shift Enqueued",
        "A Connecteam crew shift request has been queued and will sync when online.",
      );
    } catch {
      Alert.alert("Error", "Failed to queue crew shift. Please try again.");
    } finally {
      setCrewShiftLoading(false);
    }
  };

  if (assetLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.loading, { color: colors.mutedForeground }]}>Loading asset…</Text>
      </View>
    );
  }

  if (!asset) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <EmptyState icon="alert-circle" title="Asset not found" description="This asset may not be cached offline." />
        <Button label="Go back" onPress={() => router.back()} style={{ marginTop: 16, alignSelf: "center" }} />
      </View>
    );
  }

  const firstLink = asset.complianceLinks[0] ?? null;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: insets.bottom + 40 }]}
      showsVerticalScrollIndicator={false}
    >
      <Pressable onPress={() => router.back()} style={styles.backRow}>
        <Feather name="arrow-left" size={16} color={colors.primary} />
        <Text style={[styles.backText, { color: colors.primary }]}>Assets</Text>
      </Pressable>

      <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.heroTop}>
          <View style={styles.heroMeta}>
            <Text style={[styles.assetName, { color: colors.foreground }]}>{asset.name}</Text>
            <Text style={[styles.assetLocation, { color: colors.mutedForeground }]}>
              <Feather name="map-pin" size={12} color={colors.mutedForeground} /> {asset.location || "No location"}
            </Text>
          </View>
          <Pressable
            onPress={() => setEditModalVisible(true)}
            style={[styles.editBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
          >
            <Feather name="edit-2" size={14} color={colors.primary} />
            <Text style={[styles.editBtnText, { color: colors.primary }]}>Edit Overlay</Text>
          </Pressable>
        </View>

        <View style={styles.badgeRow}>
          <SystemTypeBadge systemType={asset.system_type} />
          <AssetLifecycleBadge status={asset.lifecycle_status} />
          <StatusBadge status={asset.overallStatus} size="sm" />
        </View>

        <View style={[styles.infoGrid, { borderTopColor: colors.border }]}>
          <View style={styles.infoItem}>
            <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Last Inspection</Text>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>{fmtDate(asset.lastInspectionAt)}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Next Inspection</Text>
            <Text style={[styles.infoValue, { color: colors.foreground }]}>{fmtDate(asset.nextInspectionAt)}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>HubSpot ID</Text>
            <Text style={[styles.infoValue, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>{asset.id}</Text>
          </View>
        </View>

        <View style={[styles.complianceChipsRow, { borderTopColor: colors.border }]}>
          <Text style={[styles.infoLabel, { color: colors.mutedForeground, marginBottom: 6 }]}>Standards</Text>
          <ComplianceStandardChips complianceLinks={asset.complianceLinks} systemType={asset.system_type} />
        </View>

        <Button
          label={crewShiftLoading ? "Queuing…" : "Create Crew Shift (Connecteam)"}
          variant="outline"
          onPress={handleCreateCrewShift}
          disabled={crewShiftLoading}
          style={styles.crewShiftBtn}
        />
      </View>

      <TabsView
        tabs={TABS}
        activeKey={activeTab}
        onTabChange={(key) => setActiveTab(key as Tab)}
      />

      <View style={[styles.tabContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {activeTab === "inspections" && (
          <View style={styles.tabPane}>
            {!history?.results.length ? (
              <EmptyState icon="clipboard" title="No inspection results" description="Inspection history will appear here" />
            ) : (
              history.results.map((r) => (
                <View key={r.id} style={[styles.resultRow, { borderBottomColor: colors.border }]}>
                  <View>
                    <Text style={[styles.resultDate, { color: colors.foreground }]}>{fmtDate(r.submitted_at ?? r.started_at)}</Text>
                    <Text style={[styles.resultSub, { color: colors.mutedForeground }]}>
                      Inspector: {r.inspector_id}
                    </Text>
                  </View>
                  <StatusBadge status={r.status} size="sm" />
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === "tests" && (
          <View style={styles.tabPane}>
            {!history?.tests.length ? (
              <EmptyState icon="activity" title="No test records" description="System test history will appear here" />
            ) : (
              history.tests.map((t) => (
                <View key={t.id} style={[styles.resultRow, { borderBottomColor: colors.border }]}>
                  <View style={styles.testInfo}>
                    <Text style={[styles.resultDate, { color: colors.foreground }]}>
                      {t.test_type.replace(/_/g, " ")}
                    </Text>
                    <Text style={[styles.resultSub, { color: colors.mutedForeground }]}>{fmtDate(t.tested_at)}</Text>
                  </View>
                  <StatusBadge status={t.result} size="sm" />
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === "maintenance" && (
          <View style={styles.tabPane}>
            <MaintenanceTable records={history?.maintenance ?? []} />
          </View>
        )}

        {activeTab === "compliance" && (
          <View style={styles.tabPane}>
            {asset.complianceLinks.length === 0 ? (
              <EmptyState icon="shield" title="No compliance standards" description="Linked compliance standards will appear here" />
            ) : (
              asset.complianceLinks.map((link) => (
                <View key={link.id} style={[styles.resultRow, { borderBottomColor: colors.border }]}>
                  <View style={styles.testInfo}>
                    <Text style={[styles.resultDate, { color: colors.foreground }]}>
                      {link.compliance_standard_id}
                    </Text>
                    {link.notes && (
                      <Text style={[styles.resultSub, { color: colors.mutedForeground }]} numberOfLines={2}>
                        {link.notes}
                      </Text>
                    )}
                  </View>
                  <StatusBadge status={link.compliance_status} size="sm" />
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === "schedules" && (
          <View style={styles.tabPane}>
            {!history?.schedules.length ? (
              <EmptyState icon="calendar" title="No schedules" description="Inspection schedules will appear here" />
            ) : (
              history.schedules.map((s) => (
                <InspectionScheduleRow key={s.id} schedule={s} />
              ))
            )}
          </View>
        )}
      </View>

      <AssetFormModal
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        assetId={asset.id}
        assetName={asset.name}
        complianceLink={firstLink}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  loading: { fontSize: 14, fontFamily: "Inter_400Regular" },
  backRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  backText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  heroCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 12 },
  heroTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  heroMeta: { flex: 1 },
  assetName: { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  assetLocation: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 3 },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  editBtnText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  infoItem: { minWidth: 100 },
  infoLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  infoValue: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginTop: 3 },
  complianceChipsRow: { paddingTop: 12, borderTopWidth: 1 },
  crewShiftBtn: { marginTop: 4 },
  tabContent: { borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  tabPane: { padding: 14 },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  testInfo: { flex: 1 },
  resultDate: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  resultSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
});
