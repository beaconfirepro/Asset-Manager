import React from "react";
import { Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { OfflineSyncIndicator } from "@/components/OfflineSyncIndicator";
import { ComplianceHealthCard } from "@/components/dashboard/ComplianceHealthCard";
import { UpcomingInspectionsCard } from "@/components/dashboard/UpcomingInspectionsCard";
import { RecurringRevenueCard } from "@/components/dashboard/RecurringRevenueCard";
import { ActionQueuePanel } from "@/components/dashboard/ActionQueuePanel";
import { useDashboard } from "@/hooks/useDashboard";

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const router = useRouter();
  const { data, isLoading, refetch, isRefetching } = useDashboard();
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 96 : 40);

  const health = data?.complianceHealth ?? { compliant: 0, nonCompliant: 0, pending: 0, exempt: 0, total: 0 };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 16, paddingBottom: bottomPad },
      ]}
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
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
            {session?.orgId ?? "Beacon Fire Protection"}
          </Text>
          <Text style={[styles.title, { color: colors.foreground }]}>ITM Dashboard</Text>
          {session?.user?.name && (
            <Text style={[styles.user, { color: colors.mutedForeground }]}>{session.user.name}</Text>
          )}
        </View>
        <View style={styles.headerRight}>
          <Pressable
            onPress={() => router.push("/admin/forms" as any)}
            hitSlop={10}
            style={[styles.adminBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
          >
            <Feather name="settings" size={14} color={colors.mutedForeground} />
            <Text style={[styles.adminBtnText, { color: colors.mutedForeground }]}>Forms</Text>
          </Pressable>
          <OfflineSyncIndicator compact />
        </View>
      </View>

      {Platform.OS === "web" ? (
        <View style={[styles.webNote, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Text style={[styles.webNoteText, { color: colors.mutedForeground }]}>
            Full dashboard data loads on device via Expo Go (SQLite + offline cache).
          </Text>
        </View>
      ) : null}

      <ComplianceHealthCard
        compliant={health.compliant}
        nonCompliant={health.nonCompliant}
        pending={health.pending}
        exempt={health.exempt}
        total={health.total}
      />

      <View style={styles.row}>
        <View style={styles.halfCard}>
          <UpcomingInspectionsCard
            upcomingCount={data?.upcomingCount ?? 0}
            overdueCount={data?.overdueCount ?? 0}
          />
        </View>
        <View style={styles.halfCard}>
          <RecurringRevenueCard
            booked={data?.recurringRevenue.booked ?? 0}
            potential={data?.recurringRevenue.potential ?? 0}
          />
        </View>
      </View>

      <ActionQueuePanel items={data?.actionQueue ?? []} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 12 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  headerRight: { alignItems: "flex-end", gap: 8 },
  adminBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  adminBtnText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  greeting: { fontSize: 12, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.8 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5, marginTop: 2 },
  user: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  row: { flexDirection: "row", gap: 12 },
  halfCard: { flex: 1 },
  webNote: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 4,
  },
  webNoteText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18 },
});
