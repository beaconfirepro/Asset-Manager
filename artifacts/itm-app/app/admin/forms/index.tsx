import React, { useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useInspectionForms } from "@/hooks/useInspectionForms";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { SystemTypeBadge } from "@/components/assets/SystemTypeBadge";
import type { InspectionForm } from "@/db/schema";

export default function AdminFormsListScreen() {
  const colors = useColors();
  const router = useRouter();
  const { data: forms = [], isLoading, refetch } = useInspectionForms();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={forms}
        keyExtractor={(f) => f.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        ListEmptyComponent={
          <EmptyState
            icon="file-text"
            title="No inspection forms"
            description="Tap + to create your first NFPA inspection form."
          />
        }
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }: { item: InspectionForm }) => {
          const schema = (() => { try { return JSON.parse(item.form_schema); } catch { return { fields: [] }; } })();
          const fieldCount = schema.fields?.length ?? 0;
          return (
            <Pressable
              onPress={() => router.push(`/admin/forms/${item.id}` as any)}
              style={({ pressed }) => [
                styles.card,
                { backgroundColor: colors.card, borderColor: colors.border },
                pressed && { opacity: 0.85 },
              ]}
            >
              <View style={styles.cardTop}>
                <View style={styles.cardTitle}>
                  <Text style={[styles.formName, { color: colors.foreground }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Badge
                    label={item.is_active ? "Active" : "Draft"}
                    variant={item.is_active ? "success" : "muted"}
                    size="sm"
                  />
                </View>
                <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
              </View>
              <View style={styles.cardMeta}>
                <SystemTypeBadge systemType={item.system_type} size="sm" />
                <View style={styles.metaItem}>
                  <Feather name="list" size={11} color={colors.mutedForeground} />
                  <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                    {fieldCount} field{fieldCount !== 1 ? "s" : ""}
                  </Text>
                </View>
                <Text style={[styles.metaText, { color: colors.mutedForeground }]}>v{item.version}</Text>
                {item.ai_generated && (
                  <Badge label="AI" variant="muted" size="sm" />
                )}
              </View>
            </Pressable>
          );
        }}
      />

      <Pressable
        onPress={() => router.push("/admin/forms/new" as any)}
        style={[styles.fab, { backgroundColor: colors.primary }]}
      >
        <Feather name="plus" size={22} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16, paddingBottom: 100 },
  card: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 8 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  formName: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  cardMeta: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 10 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 11, fontFamily: "Inter_400Regular" },
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
