import React from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAiSuggestions, useAcceptAiSuggestion, useRejectAiSuggestion } from "@/hooks/useAiSuggestions";
import type { AiSuggestion } from "@/db/schema";

type Props = {
  contextType?: string;
  contextId?: string;
  showTitle?: boolean;
};

type SuggestionTypeMeta = {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
};

function useSuggestionMeta(type: string): SuggestionTypeMeta {
  const colors = useColors();
  const map: Record<string, SuggestionTypeMeta> = {
    CODE_REFERENCE: { label: "Code Reference", icon: "book-open", color: colors.info },
    FINDING_AUTOFILL: { label: "Finding Autofill", icon: "edit-3", color: colors.primary },
    PHOTO_DEFICIENCY: { label: "Photo Analysis", icon: "camera", color: colors.warning },
    QA_FLAG: { label: "QA Flag", icon: "flag", color: colors.destructive },
    FORM_GENERATION: { label: "Form Generation", icon: "file-plus", color: colors.success },
  };
  return map[type] ?? { label: type, icon: "cpu", color: colors.mutedForeground };
}

function SuggestionPayloadView({ suggestion }: { suggestion: AiSuggestion }) {
  const colors = useColors();
  let payload: Record<string, unknown> = {};
  try { payload = JSON.parse(suggestion.payload); } catch { /* ignore */ }

  switch (suggestion.suggestion_type) {
    case "CODE_REFERENCE":
      return (
        <View style={styles.payloadBlock}>
          <Text style={[styles.payloadCode, { color: colors.primary }]}>
            {String(payload.code ?? "")}
          </Text>
          <Text style={[styles.payloadText, { color: colors.foreground }]}>
            {String(payload.text ?? "")}
          </Text>
        </View>
      );

    case "FINDING_AUTOFILL":
      return (
        <View style={styles.payloadBlock}>
          <Text style={[styles.payloadLabel, { color: colors.mutedForeground }]}>
            Field: {String(payload.field ?? "—")}
          </Text>
          <Text style={[styles.payloadText, { color: colors.foreground }]}>
            "{String(payload.suggested_text ?? "")}"
          </Text>
        </View>
      );

    case "PHOTO_DEFICIENCY": {
      const issues = (payload.detected_issues as string[] | undefined) ?? [];
      const confidence = ((payload.confidence as number | undefined) ?? 0) * 100;
      return (
        <View style={styles.payloadBlock}>
          <Text style={[styles.payloadLabel, { color: colors.mutedForeground }]}>
            Confidence: {confidence.toFixed(0)}%
          </Text>
          {issues.length > 0 && (
            <View style={styles.issueList}>
              {issues.map((issue, i) => (
                <Badge key={i} label={issue} variant="warning" size="sm" />
              ))}
            </View>
          )}
          {issues.length === 0 && (
            <Text style={[styles.payloadText, { color: colors.mutedForeground }]}>No issues detected</Text>
          )}
        </View>
      );
    }

    case "QA_FLAG":
      return (
        <View style={styles.payloadBlock}>
          <Text style={[styles.payloadCode, { color: colors.destructive }]}>
            {String(payload.flag ?? "").replace(/_/g, " ")}
          </Text>
          <Text style={[styles.payloadText, { color: colors.foreground }]}>
            {String(payload.message ?? "")}
          </Text>
        </View>
      );

    case "FORM_GENERATION": {
      const sections = payload.generated_sections as number | undefined;
      const tokens = payload.token_count as number | undefined;
      return (
        <View style={styles.payloadBlock}>
          <Text style={[styles.payloadText, { color: colors.foreground }]}>
            Generated {sections ?? "—"} section{sections !== 1 ? "s" : ""}{tokens ? ` · ${tokens} tokens` : ""}
          </Text>
        </View>
      );
    }

    default:
      return (
        <Text style={[styles.payloadText, { color: colors.mutedForeground }]} numberOfLines={3}>
          {suggestion.payload}
        </Text>
      );
  }
}

function SuggestionCard({ suggestion }: { suggestion: AiSuggestion }) {
  const colors = useColors();
  const meta = useSuggestionMeta(suggestion.suggestion_type);
  const accept = useAcceptAiSuggestion();
  const reject = useRejectAiSuggestion();

  const isPending = suggestion.status === "PENDING";
  const isAccepted = suggestion.status === "ACCEPTED";
  const isRejected = suggestion.status === "REJECTED";
  const isBusy = accept.isPending || reject.isPending;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: isAccepted
            ? colors.success + "55"
            : isRejected
            ? colors.border
            : colors.border,
          opacity: isRejected ? 0.6 : 1,
        },
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.iconWrap, { backgroundColor: meta.color + "18" }]}>
          <Feather name={meta.icon} size={14} color={meta.color} />
        </View>
        <Text style={[styles.typeLabel, { color: meta.color }]}>{meta.label}</Text>
        <View style={styles.spacer} />
        {isAccepted && <Badge label="Accepted" variant="success" size="sm" />}
        {isRejected && <Badge label="Rejected" variant="muted" size="sm" />}
        {isPending && <Badge label="Pending" variant="warning" size="sm" />}
      </View>

      <SuggestionPayloadView suggestion={suggestion} />

      {suggestion.model_version && (
        <Text style={[styles.modelVersion, { color: colors.mutedForeground }]}>
          Model: {suggestion.model_version}
        </Text>
      )}

      {isPending && (
        <View style={styles.actionRow}>
          <Button
            label={accept.isPending ? "…" : "Accept"}
            size="sm"
            variant="primary"
            onPress={() => accept.mutate(suggestion.id)}
            disabled={isBusy}
            style={styles.actionBtn}
          />
          <Button
            label={reject.isPending ? "…" : "Reject"}
            size="sm"
            variant="outline"
            onPress={() => reject.mutate(suggestion.id)}
            disabled={isBusy}
            style={styles.actionBtn}
          />
        </View>
      )}

      {isAccepted && suggestion.accepted_at && (
        <Text style={[styles.decidedAt, { color: colors.success }]}>
          Accepted {suggestion.accepted_at.slice(0, 10)}
        </Text>
      )}
      {isRejected && suggestion.rejected_at && (
        <Text style={[styles.decidedAt, { color: colors.mutedForeground }]}>
          Rejected {suggestion.rejected_at.slice(0, 10)}
        </Text>
      )}
    </View>
  );
}

export function AiSuggestionPanel({ contextType, contextId, showTitle = true }: Props) {
  const colors = useColors();
  const { data: suggestions = [], isLoading } = useAiSuggestions(contextType, contextId);

  const pending = suggestions.filter((s) => s.status === "PENDING");
  const decided = suggestions.filter((s) => s.status !== "PENDING");

  if (isLoading) {
    return (
      <View style={styles.loadingRow}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Loading AI suggestions…</Text>
      </View>
    );
  }

  if (suggestions.length === 0) {
    return (
      <View style={styles.empty}>
        <Feather name="cpu" size={28} color={colors.mutedForeground} />
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
          No AI suggestions for this context.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.panel}>
      {showTitle && (
        <View style={styles.panelHeader}>
          <Feather name="cpu" size={14} color={colors.primary} />
          <Text style={[styles.panelTitle, { color: colors.foreground }]}>
            AI Suggestions
          </Text>
          {pending.length > 0 && (
            <View style={[styles.pendingBubble, { backgroundColor: colors.primary }]}>
              <Text style={styles.pendingCount}>{pending.length}</Text>
            </View>
          )}
        </View>
      )}

      {pending.length > 0 && (
        <View style={styles.group}>
          <Text style={[styles.groupLabel, { color: colors.mutedForeground }]}>NEEDS REVIEW</Text>
          {pending.map((s) => <SuggestionCard key={s.id} suggestion={s} />)}
        </View>
      )}

      {decided.length > 0 && (
        <View style={styles.group}>
          <Text style={[styles.groupLabel, { color: colors.mutedForeground }]}>DECIDED</Text>
          {decided.map((s) => <SuggestionCard key={s.id} suggestion={s} />)}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: 12 },
  panelHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  panelTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1 },
  pendingBubble: { width: 20, height: 20, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  pendingCount: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#fff" },
  group: { gap: 8 },
  groupLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, textTransform: "uppercase" },
  card: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 8 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconWrap: { width: 28, height: 28, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  typeLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  spacer: { flex: 1 },
  payloadBlock: { gap: 4 },
  payloadCode: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  payloadLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  payloadText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  issueList: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 4 },
  modelVersion: { fontSize: 10, fontFamily: "Inter_400Regular", fontStyle: "italic" },
  actionRow: { flexDirection: "row", gap: 8 },
  actionBtn: { flex: 1 },
  decidedAt: { fontSize: 11, fontFamily: "Inter_400Regular" },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12 },
  loadingText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  empty: { alignItems: "center", gap: 8, padding: 24 },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
});
