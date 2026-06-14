import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { TabsView } from "@/components/ui/TabsView";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { TestRecordTable } from "@/components/testing/TestRecordTable";
import { TestRecordModal } from "@/components/testing/TestRecordModal";
import { MaintenanceModal } from "@/components/testing/MaintenanceModal";
import { ScreenWrapper } from "@/components/ui/ScreenWrapper";
import { useSystemTests, useCreateTest, useDeleteTest } from "@/hooks/useTests";
import { useMaintenance, useCreateMaintenance } from "@/hooks/useMaintenance";
import { MaintenanceTable } from "@/components/assets/MaintenanceTable";

type TabKey = "tests" | "maintenance" | "pm";

const TABS = [
  { key: "tests" as TabKey, label: "Tests" },
  { key: "maintenance" as TabKey, label: "Maintenance" },
  { key: "pm" as TabKey, label: "PM Schedule" },
];

export default function TestingScreen() {
  const colors = useColors();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("tests");
  const [showTestModal, setShowTestModal] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);

  const { data: tests = [], isLoading: testsLoading, refetch: refetchTests } = useSystemTests();
  const { data: maintenance = [], isLoading: maintLoading, refetch: refetchMaint } = useMaintenance();
  const createTest = useCreateTest();
  const deleteTest = useDeleteTest();
  const createMaintenance = useCreateMaintenance();

  const isLoading = testsLoading || maintLoading;

  const failedTests = tests.filter((t) => t.result === "FAIL");

  const pmItems = useMemo(() => {
    const today = new Date().toISOString();
    return maintenance
      .filter((m) => m.next_maintenance_at && m.next_maintenance_at > today && m.status !== "CANCELLED")
      .sort((a, b) => (a.next_maintenance_at ?? "").localeCompare(b.next_maintenance_at ?? ""));
  }, [maintenance]);

  const refetch = () => {
    refetchTests();
    refetchMaint();
  };

  return (
    <ScreenWrapper safeBottom={false}>
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TabsView
        tabs={[
          { key: "tests", label: "Tests", badge: failedTests.length },
          { key: "maintenance", label: "Maintenance" },
          { key: "pm", label: "PM Schedule", badge: pmItems.length },
        ]}
        activeKey={activeTab}
        onTabChange={(k) => setActiveTab(k as TabKey)}
        style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}
      />

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentPad}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        >
          {activeTab === "tests" && (
            <>
              {failedTests.length > 0 && (
                <Card style={styles.alertCard}>
                  <CardContent>
                    <View style={styles.alertRow}>
                      <Feather name="alert-triangle" size={16} color={colors.destructive} />
                      <Text style={[styles.alertText, { color: colors.destructive }]}>
                        {failedTests.length} failed test{failedTests.length !== 1 ? "s" : ""} — check Dashboard action queue
                      </Text>
                    </View>
                  </CardContent>
                </Card>
              )}
              <Card>
                <CardHeader
                  title="System Tests"
                  subtitle={`${tests.length} records · ${failedTests.length} failed`}
                />
                <CardContent>
                  <TestRecordTable
                    tests={tests}
                    onDelete={(id) => deleteTest.mutate(id)}
                  />
                </CardContent>
              </Card>
            </>
          )}

          {activeTab === "maintenance" && (
            <Card>
              <CardHeader
                title="Maintenance Records"
                subtitle={`${maintenance.length} records`}
              />
              <CardContent>
                <MaintenanceTable records={maintenance} />
              </CardContent>
            </Card>
          )}

          {activeTab === "pm" && (
            <>
              {pmItems.length === 0 ? (
                <EmptyState
                  icon="calendar"
                  title="No upcoming PM items"
                  description="Maintenance records with a future next-maintenance date appear here."
                />
              ) : (
                <Card>
                  <CardHeader
                    title="PM Schedule"
                    subtitle={`${pmItems.length} upcoming items`}
                  />
                  <CardContent>
                    {pmItems.map((item, idx) => (
                      <View
                        key={item.id}
                        style={[
                          styles.pmRow,
                          {
                            borderBottomColor: colors.border,
                            borderBottomWidth: idx < pmItems.length - 1 ? 1 : 0,
                          },
                        ]}
                      >
                        <View style={[styles.pmDot, { backgroundColor: colors.info }]} />
                        <View style={styles.pmBody}>
                          <Text style={[styles.pmDate, { color: colors.foreground }]}>
                            {item.next_maintenance_at?.slice(0, 10)}
                          </Text>
                          <Text style={[styles.pmAsset, { color: colors.mutedForeground }]}>
                            {item.hubspot_asset_id} · {item.maintenance_type}
                          </Text>
                          {item.description && (
                            <Text style={[styles.pmDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
                              {item.description}
                            </Text>
                          )}
                        </View>
                        <StatusBadge status={item.status} size="sm" />
                      </View>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </ScrollView>
      )}

      <View style={styles.fabArea}>
        <Pressable
          onPress={() => router.push("/(tabs)/testing/equipment" as never)}
          style={[styles.fabSecondary, { backgroundColor: colors.muted, borderColor: colors.border }]}
        >
          <Feather name="tool" size={18} color={colors.foreground} />
          <Text style={[styles.fabSecondaryText, { color: colors.foreground }]}>Equipment</Text>
        </Pressable>
        <Pressable
          onPress={() => activeTab === "tests" ? setShowTestModal(true) : setShowMaintenanceModal(true)}
          style={[styles.fab, { backgroundColor: colors.primary }]}
        >
          <Feather name="plus" size={22} color="#fff" />
        </Pressable>
      </View>

      <TestRecordModal
        visible={showTestModal}
        onClose={() => setShowTestModal(false)}
        onSubmit={async (data) => {
          await createTest.mutateAsync(data);
        }}
      />

      <MaintenanceModal
        visible={showMaintenanceModal}
        onClose={() => setShowMaintenanceModal(false)}
        onSubmit={async (data) => {
          await createMaintenance.mutateAsync(data);
        }}
      />
    </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { flex: 1 },
  contentPad: { padding: 16, paddingBottom: 120, gap: 12 },
  alertCard: { borderWidth: 1 },
  alertRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  alertText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  pmRow: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 12, gap: 10 },
  pmDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  pmBody: { flex: 1 },
  pmDate: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  pmAsset: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  pmDesc: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  fabArea: {
    position: "absolute",
    bottom: 96,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  fabSecondary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  fabSecondaryText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  fab: {
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
