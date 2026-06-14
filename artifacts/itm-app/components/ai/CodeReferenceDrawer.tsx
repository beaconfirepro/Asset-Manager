import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { useComplianceStandards } from "@/hooks/useComplianceStandards";
import { getITMApiClient, type CodeReferenceResult } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import type { ComplianceStandard } from "@/db/schema";

type Props = {
  visible: boolean;
  onClose: () => void;
  filterStandardCode?: string;
};

function StandardRow({
  standard,
  orgId,
}: {
  standard: ComplianceStandard;
  orgId: string;
}) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);
  const [refs, setRefs] = useState<CodeReferenceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const handleExpand = async () => {
    const next = !expanded;
    setExpanded(next);
    if (next && !fetched) {
      setLoading(true);
      try {
        const api = getITMApiClient();
        const results = await api.getCodeReference(orgId, standard.code);
        setRefs(results);
        setFetched(true);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <View
      style={[
        styles.standardCard,
        { backgroundColor: colors.card, borderColor: expanded ? colors.primary + "55" : colors.border },
      ]}
    >
      <Pressable onPress={handleExpand} style={styles.standardHeader}>
        <View style={styles.standardMeta}>
          <Text style={[styles.standardCode, { color: colors.primary }]}>{standard.code}</Text>
          <Text style={[styles.standardName, { color: colors.foreground }]} numberOfLines={1}>
            {standard.name}
          </Text>
        </View>
        <View style={styles.standardRight}>
          <Badge label={`v${standard.version}`} variant="muted" size="sm" />
          <Feather
            name={expanded ? "chevron-up" : "chevron-down"}
            size={16}
            color={colors.mutedForeground}
          />
        </View>
      </Pressable>

      {standard.description && !expanded && (
        <Text style={[styles.standardDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
          {standard.description}
        </Text>
      )}

      {expanded && (
        <View style={styles.refsContainer}>
          {standard.description && (
            <Text style={[styles.standardDesc, { color: colors.mutedForeground }]}>
              {standard.description}
            </Text>
          )}
          {standard.effective_date && (
            <Text style={[styles.effectiveDate, { color: colors.mutedForeground }]}>
              Effective: {standard.effective_date}
            </Text>
          )}
          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 8 }} />
          ) : refs.length > 0 ? (
            <View style={styles.refsList}>
              <Text style={[styles.refsTitle, { color: colors.mutedForeground }]}>
                KEY SECTIONS
              </Text>
              {refs.map((ref, i) => (
                <View
                  key={i}
                  style={[styles.refRow, { borderLeftColor: colors.primary + "66", backgroundColor: colors.primary + "08" }]}
                >
                  <Text style={[styles.refSection, { color: colors.primary }]}>{ref.section}</Text>
                  <Text style={[styles.refText, { color: colors.foreground }]}>{ref.text}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={[styles.noRefs, { color: colors.mutedForeground }]}>
              No code sections cached for this standard.
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

export function CodeReferenceDrawer({ visible, onClose, filterStandardCode }: Props) {
  const colors = useColors();
  const { orgId } = useAuth();
  const { data: standards = [], isLoading } = useComplianceStandards();

  const displayed = filterStandardCode
    ? standards.filter((s) => s.code === filterStandardCode)
    : standards;

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title="NFPA Code References"
      size="lg"
    >
      <View style={styles.drawerHeader}>
        <Feather name="book-open" size={16} color={colors.primary} />
        <Text style={[styles.drawerSubtitle, { color: colors.mutedForeground }]}>
          Tap a standard to expand key code sections
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : displayed.length === 0 ? (
        <View style={styles.center}>
          <Feather name="book" size={32} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            No compliance standards configured.
          </Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 480 }}>
          <View style={styles.standardsList}>
            {displayed.map((s) => (
              <StandardRow key={s.id} standard={s} orgId={orgId ?? ""} />
            ))}
          </View>
        </ScrollView>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  drawerHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
  drawerSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  center: { alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  standardsList: { gap: 10, paddingBottom: 16 },
  standardCard: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 6 },
  standardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  standardMeta: { flex: 1, gap: 2 },
  standardCode: { fontSize: 13, fontFamily: "Inter_700Bold", letterSpacing: 0.3 },
  standardName: { fontSize: 13, fontFamily: "Inter_500Medium" },
  standardRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  standardDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  effectiveDate: { fontSize: 11, fontFamily: "Inter_400Regular" },
  refsContainer: { gap: 8, marginTop: 4 },
  refsTitle: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, textTransform: "uppercase" },
  refsList: { gap: 8 },
  refRow: { borderLeftWidth: 3, paddingLeft: 10, paddingVertical: 6, paddingRight: 8, borderRadius: 4, gap: 2 },
  refSection: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  refText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  noRefs: { fontSize: 12, fontFamily: "Inter_400Regular", fontStyle: "italic" },
});
