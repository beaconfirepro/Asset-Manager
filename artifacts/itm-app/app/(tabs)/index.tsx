import React from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { useAuth } from "@/context/AuthContext";
import { ScreenWrapper } from "@/components/ui/ScreenWrapper";
import { OfflineSyncIndicator } from "@/components/OfflineSyncIndicator";
import { ComplianceHealthCard } from "@/components/dashboard/ComplianceHealthCard";
import { UpcomingInspectionsCard } from "@/components/dashboard/UpcomingInspectionsCard";
import { RecurringRevenueCard } from "@/components/dashboard/RecurringRevenueCard";
import { ActionQueuePanel } from "@/components/dashboard/ActionQueuePanel";
import { useDashboard } from "@/hooks/useDashboard";

export default function DashboardScreen() {
  const colors = useColors();
  const { session } = useAuth();
  const router = useRouter();
  const { data, refetch, isRefetching } = useDashboard();
  const { isPhone } = useResponsiveLayout();

  const health = data?.complianceHealth ?? { compliant: 0, nonCompliant: 0, pending: 0, exempt: 0, total: 0 };

  return (
    <ScreenWrapper>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
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

        <ComplianceHealthCard
          compliant={health.compliant}
          nonCompliant={health.nonCompliant}
          pending={health.pending}
          exempt={health.exempt}
          total={health.total}
        />

        <View style={[styles.row, isPhone && styles.rowPhone]}>
          <View style={isPhone ? undefined : styles.halfCard}>
            <UpcomingInspectionsCard
              upcomingCount={data?.upcomingCount ?? 0}
              overdueCount={data?.overdueCount ?? 0}
            />
          </View>
          <View style={isPhone ? undefined : styles.halfCard}>
            <RecurringRevenueCard
              booked={data?.recurringRevenue.booked ?? 0}
              potential={data?.recurringRevenue.potential ?? 0}
            />
          </View>
        </View>

        <ActionQueuePanel items={data?.actionQueue ?? []} />
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 12, paddingTop: 16 },
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
  rowPhone: { flexDirection: "column" },
  halfCard: { flex: 1 },
});
