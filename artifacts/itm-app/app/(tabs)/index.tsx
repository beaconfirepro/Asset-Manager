import React from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { OfflineSyncIndicator } from "@/components/OfflineSyncIndicator";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";

type FoundationItem = {
  id: string;
  label: string;
  description: string;
  status: "COMPLETED" | "PENDING";
  icon: string;
};

const FOUNDATION_ITEMS: FoundationItem[] = [
  { id: "schema", label: "Drizzle Schema", description: "All DATA_MODEL Section 2 tables created", status: "COMPLETED", icon: "database" },
  { id: "seed", label: "Seed Data", description: "org_beacon_test_001 seeded with all enum states", status: "COMPLETED", icon: "layers" },
  { id: "sync", label: "Sync Outbox", description: "Enqueue / drain runner / SyncStatus transitions", status: "COMPLETED", icon: "upload-cloud" },
  { id: "auth", label: "Pluggable OAuth", description: "Microsoft Entra via AuthProviderConfig", status: "COMPLETED", icon: "shield" },
  { id: "session", label: "Session Resolver", description: "org_id from session only — never from request", status: "COMPLETED", icon: "user-check" },
  { id: "hubspot", label: "HubSpot Connector", description: "Typed stub + HubspotObjectCache TTL read-through", status: "COMPLETED", icon: "link" },
  { id: "connecteam", label: "Connecteam Connector", description: "Crew shift push stub via outbox", status: "COMPLETED", icon: "users" },
  { id: "qbo", label: "QBO Connector", description: "Invoice handoff stub via outbox", status: "COMPLETED", icon: "file-text" },
  { id: "components", label: "Component Kit", description: "Button, Card, Badge, Table, Modal, Input, Tabs, EmptyState", status: "COMPLETED", icon: "layout" },
  { id: "theme", label: "Dark-First Theme", description: "Sunlight-contrast NativeWind tokens in constants/colors.ts", status: "COMPLETED", icon: "sun" },
];

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const topPad = Platform.OS === "web" ? 67 : 0;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPad + 16, paddingBottom: insets.bottom + 32 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
            Phase 0 — Foundation
          </Text>
          <Text style={[styles.title, { color: colors.foreground }]}>ITM App</Text>
          {session && (
            <Text style={[styles.user, { color: colors.mutedForeground }]}>
              {session.user.name} · {session.orgId}
            </Text>
          )}
        </View>
        <OfflineSyncIndicator compact />
      </View>

      <Card style={styles.heroCard}>
        <CardHeader
          title="Foundation Complete"
          subtitle="All Phase 0 deliverables are in place"
          right={
            <View style={[styles.completeBadge, { backgroundColor: colors.success + "22" }]}>
              <Feather name="check-circle" size={18} color={colors.success} />
              <Text style={[styles.completeText, { color: colors.success }]}>10/10</Text>
            </View>
          }
        />
        <CardContent>
          <Text style={[styles.heroDesc, { color: colors.mutedForeground }]}>
            Expo scaffold · Drizzle/SQLite · Sync outbox · Microsoft Entra OAuth ·
            Integration stubs (HubSpot, Connecteam, QBO) · Shared component kit
          </Text>
        </CardContent>
      </Card>

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
        Foundation Checklist
      </Text>

      {FOUNDATION_ITEMS.map((item) => (
        <Card key={item.id} style={styles.itemCard}>
          <View style={styles.itemRow}>
            <View style={[styles.iconBox, { backgroundColor: colors.muted }]}>
              <Feather name={item.icon as never} size={18} color={colors.primary} />
            </View>
            <View style={styles.itemText}>
              <Text style={[styles.itemLabel, { color: colors.foreground }]}>{item.label}</Text>
              <Text style={[styles.itemDesc, { color: colors.mutedForeground }]}>{item.description}</Text>
            </View>
            <StatusBadge status={item.status} size="sm" />
          </View>
        </Card>
      ))}

      <Card style={{ ...styles.nextCard, borderColor: colors.primary + "44" }}>
        <CardHeader title="Next: Phase 1" subtitle="Asset Registry + Compliance Dashboard" />
        <CardContent>
          <Text style={[styles.heroDesc, { color: colors.mutedForeground }]}>
            HubSpot-backed asset list with ITM compliance overlay, traffic-light dashboard,
            action queue, and filter facets. Awaiting Phase 1 task start.
          </Text>
        </CardContent>
      </Card>
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
  greeting: { fontSize: 12, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.8 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5, marginTop: 2 },
  user: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  heroCard: { marginBottom: 4 },
  heroDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  completeBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  completeText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginTop: 4 },
  itemCard: { paddingHorizontal: 0 },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  iconBox: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  itemText: { flex: 1 },
  itemLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  itemDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1, lineHeight: 16 },
  nextCard: { borderWidth: 2, marginTop: 8 },
});
