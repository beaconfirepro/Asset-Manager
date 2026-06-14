import React, { useState } from "react";
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
import { useColors } from "@/hooks/useColors";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { AiSuggestionPanel } from "@/components/ai/AiSuggestionPanel";
import { CodeReferenceDrawer } from "@/components/ai/CodeReferenceDrawer";
import { useComplianceStandards } from "@/hooks/useComplianceStandards";
import { useAiSuggestions } from "@/hooks/useAiSuggestions";
import { useCodeUpdateFlags } from "@/hooks/useCodeUpdateFlags";
import { useAuth } from "@/context/AuthContext";
import { FEATURES } from "@/lib/featureFlags";
import { Platform } from "react-native";

type AiTab = "suggestions" | "code_library" | "code_updates";

export default function AiCodeIntelligenceScreen() {
  const colors = useColors();
  const { orgId } = useAuth();
  const [activeTab, setActiveTab] = useState<AiTab>("suggestions");
  const [showCodeRef, setShowCodeRef] = useState(false);
  const { data: standards = [], isLoading: standardsLoading, refetch: refetchStandards } = useComplianceStandards();
  const { data: suggestions = [], isLoading: suggestionsLoading, refetch: refetchSuggestions } = useAiSuggestions();
  const { data: codeUpdateFlags = [], isLoading: flagsLoading, refetch: refetchFlags } = useCodeUpdateFlags();

  if (!FEATURES.AI_CODE_INTELLIGENCE) {
    return (
      <View style={[styles.gated, { backgroundColor: colors.background }]}>
        <Feather name="lock" size={40} color={colors.mutedForeground} />
        <Text style={[styles.gatedTitle, { color: colors.foreground }]}>Feature Not Enabled</Text>
        <Text style={[styles.gatedDesc, { color: colors.mutedForeground }]}>
          AI Code Intelligence (Feature 20.4) is not enabled for this organization.
        </Text>
      </View>
    );
  }

  const pendingCount = suggestions.filter((s) => s.status === "PENDING").length;

  const handleRefresh = () => {
    refetchSuggestions();
    refetchStandards();
    refetchFlags();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <View style={[styles.aiIcon, { backgroundColor: colors.primary + "18" }]}>
            <Feather name="cpu" size={20} color={colors.primary} />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>AI Code Intelligence</Text>
            <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>
              NFPA code assist · Accept/reject only · All outputs logged
            </Text>
          </View>
          <Button
            label="Code Refs"
            size="sm"
            variant="outline"
            onPress={() => setShowCodeRef(true)}
          />
        </View>

        <View style={styles.tabRow}>
          {(["suggestions", "code_library", "code_updates"] as AiTab[]).map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[
                styles.tab,
                activeTab === tab && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === tab ? colors.primary : colors.mutedForeground },
                ]}
              >
                {tab === "suggestions"
                  ? `Suggestions${pendingCount > 0 ? ` (${pendingCount})` : ""}`
                  : tab === "code_library"
                  ? "Code Library"
                  : "Code Updates"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={suggestionsLoading || standardsLoading}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {activeTab === "suggestions" && (
          Platform.OS === "web" ? (
            <WebPlaceholder label="AI suggestions available on device" colors={colors} />
          ) : (
            <AiSuggestionPanel showTitle={false} />
          )
        )}

        {activeTab === "code_library" && (
          standardsLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
          ) : standards.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="book" size={36} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Standards Configured</Text>
              <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
                Add compliance standards in Admin → Standards to enable code library browsing.
              </Text>
            </View>
          ) : (
            <View style={styles.codeLibrary}>
              {standards.map((standard) => (
                <Pressable
                  key={standard.id}
                  style={[styles.standardCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => setShowCodeRef(true)}
                >
                  <View style={styles.standardCardTop}>
                    <View style={[styles.standardIconWrap, { backgroundColor: colors.primary + "18" }]}>
                      <Feather name="book-open" size={16} color={colors.primary} />
                    </View>
                    <View style={styles.standardCardInfo}>
                      <Text style={[styles.standardCode, { color: colors.primary }]}>{standard.code}</Text>
                      <Text style={[styles.standardName, { color: colors.foreground }]} numberOfLines={1}>
                        {standard.name}
                      </Text>
                    </View>
                    <Badge label={`v${standard.version}`} variant="muted" size="sm" />
                  </View>
                  {standard.description && (
                    <Text style={[styles.standardDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
                      {standard.description}
                    </Text>
                  )}
                  <View style={styles.standardCardFooter}>
                    <Badge label={standard.system_type.replace(/_/g, " ")} variant="info" size="sm" />
                    {standard.effective_date && (
                      <Text style={[styles.effectiveDate, { color: colors.mutedForeground }]}>
                        Effective {standard.effective_date}
                      </Text>
                    )}
                    <Text style={[styles.tapHint, { color: colors.primary }]}>
                      Tap for sections →
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )
        )}

        {activeTab === "code_updates" && (
          Platform.OS === "web" ? (
            <WebPlaceholder label="Code update detection available on device" colors={colors} />
          ) : (
            <View style={styles.codeUpdates}>
              <View style={[styles.codeUpdatesInfo, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <Feather name="alert-circle" size={14} color={colors.mutedForeground} />
                <Text style={[styles.codeUpdatesInfoText, { color: colors.mutedForeground }]}>
                  Detects active inspection forms whose linked NFPA standard became effective after the form was last modified. Pull to refresh.
                </Text>
              </View>

              {flagsLoading && (
                <View style={styles.checkingRow}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.checkingText, { color: colors.mutedForeground }]}>
                    Scanning active forms…
                  </Text>
                </View>
              )}

              {!flagsLoading && codeUpdateFlags.length === 0 && (
                <View style={[styles.noUpdates, { backgroundColor: colors.success + "12", borderColor: colors.success + "33" }]}>
                  <Feather name="check-circle" size={18} color={colors.success} />
                  <Text style={[styles.noUpdatesText, { color: colors.success }]}>
                    All active forms are up to date with current NFPA standard versions.
                  </Text>
                </View>
              )}

              {codeUpdateFlags.map((flag) => (
                <View
                  key={flag.form_id}
                  style={[styles.updateCard, { backgroundColor: colors.warning + "12", borderColor: colors.warning + "44" }]}
                >
                  <View style={styles.updateCardHeader}>
                    <Feather name="alert-triangle" size={14} color={colors.warning} />
                    <Text style={[styles.updateFormName, { color: colors.foreground }]} numberOfLines={1}>
                      {flag.form_name}
                    </Text>
                  </View>
                  <Text style={[styles.updateDetail, { color: colors.mutedForeground }]}>
                    {flag.standard_code} v{flag.standard_version} · standard effective {flag.standard_effective_date} · form last updated {flag.form_updated_at}
                  </Text>
                  <Text style={[styles.updateSummary, { color: colors.foreground }]}>
                    {flag.change_summary}
                  </Text>
                </View>
              ))}
            </View>
          )
        )}
      </ScrollView>

      <CodeReferenceDrawer visible={showCodeRef} onClose={() => setShowCodeRef(false)} />
    </View>
  );
}

function WebPlaceholder({ label, colors }: { label: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.emptyState}>
      <Feather name="smartphone" size={36} color={colors.mutedForeground} />
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Device Required</Text>
      <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gated: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12, padding: 32 },
  gatedTitle: { fontSize: 20, fontFamily: "Inter_600SemiBold" },
  gatedDesc: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  header: { borderBottomWidth: 1, paddingBottom: 0 },
  headerTop: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, paddingBottom: 12 },
  aiIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  headerSubtitle: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  tabRow: { flexDirection: "row" },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center", borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12, paddingBottom: 40 },
  emptyState: { alignItems: "center", gap: 10, paddingVertical: 48 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  emptyDesc: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18, maxWidth: 280 },
  codeLibrary: { gap: 10 },
  standardCard: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 8 },
  standardCardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  standardIconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  standardCardInfo: { flex: 1, gap: 2 },
  standardCode: { fontSize: 13, fontFamily: "Inter_700Bold" },
  standardName: { fontSize: 13, fontFamily: "Inter_500Medium" },
  standardDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  standardCardFooter: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 },
  effectiveDate: { fontSize: 11, fontFamily: "Inter_400Regular" },
  tapHint: { fontSize: 11, fontFamily: "Inter_500Medium", marginLeft: "auto" },
  codeUpdates: { gap: 12 },
  codeUpdatesInfo: { flexDirection: "row", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1, alignItems: "flex-start" },
  codeUpdatesInfoText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 17 },
  checkingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  checkingText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  noUpdates: { flexDirection: "row", gap: 10, padding: 14, borderRadius: 10, borderWidth: 1, alignItems: "center" },
  noUpdatesText: { fontSize: 14, fontFamily: "Inter_500Medium", flex: 1 },
  updateCard: { borderRadius: 10, borderWidth: 1, padding: 12, gap: 6 },
  updateCardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  updateFormName: { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1 },
  updateDetail: { fontSize: 12, fontFamily: "Inter_400Regular" },
  updateSummary: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
});
