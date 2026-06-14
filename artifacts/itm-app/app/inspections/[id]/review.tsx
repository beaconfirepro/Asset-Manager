import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useInspectionResult } from "@/hooks/useInspections";
import { usePreviousInspection } from "@/hooks/useInspections";
import { useUpdateQaStatus, useCreateReport, useReportForResult } from "@/hooks/useReports";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ScreenWrapper } from "@/components/ui/ScreenWrapper";

type QaDecision = "APPROVED" | "REJECTED";

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function parseFormData(raw: string | null | undefined): Record<string, unknown> {
  try { return JSON.parse(raw ?? "{}") as Record<string, unknown>; }
  catch { return {}; }
}

function fieldLabel(key: string) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function fieldValue(val: unknown): { text: string; changed: boolean } {
  if (val === true) return { text: "✓ Yes", changed: false };
  if (val === false) return { text: "✗ No", changed: false };
  if (val == null) return { text: "—", changed: false };
  return { text: String(val), changed: false };
}

function CompareRow({
  label,
  current,
  previous,
  colors,
}: {
  label: string;
  current: unknown;
  previous: unknown;
  colors: ReturnType<typeof useColors>;
}) {
  const cur = fieldValue(current);
  const prev = fieldValue(previous);
  const changed = current !== previous && previous !== undefined;
  return (
    <View style={cmpStyles(colors).row}>
      <Text style={cmpStyles(colors).label}>{label}</Text>
      <View style={cmpStyles(colors).valCol}>
        <Text style={[cmpStyles(colors).curVal, changed && { color: colors.warning }]}>{cur.text}</Text>
      </View>
      <View style={cmpStyles(colors).valCol}>
        <Text style={cmpStyles(colors).prevVal}>{prev.text !== undefined ? prev.text : "—"}</Text>
      </View>
    </View>
  );
}

function cmpStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    row: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.border },
    label: { flex: 1.2, fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    valCol: { flex: 1, paddingHorizontal: 4 },
    curVal: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    prevVal: { fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground },
  });
}

export default function ReviewScreen() {
  const { id: scheduleId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const s = styles(colors);

  const { data: result, isLoading } = useInspectionResult(scheduleId);
  const { data: previousResult } = usePreviousInspection(
    result?.status !== "DRAFT" && result?.status !== "IN_PROGRESS" ? result?.hubspot_asset_id : undefined
  );
  const { data: existingReport } = useReportForResult(result?.id);

  const updateQa = useUpdateQaStatus();
  const createReport = useCreateReport();

  const [decision, setDecision] = useState<QaDecision | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmitReview() {
    if (!result || !decision) return;
    setSubmitting(true);
    try {
      await updateQa.mutateAsync({
        resultId: result.id,
        qaStatus: decision,
        qaNotes: notes.trim() || undefined,
      });
      Alert.alert(
        decision === "APPROVED" ? "QA Approved" : "QA Rejected",
        decision === "APPROVED"
          ? "Inspection approved. You can now generate a report."
          : "Inspection returned to inspector for correction.",
        [{ text: "OK" }],
      );
      setDecision(null);
      setNotes("");
    } catch {
      Alert.alert("Error", "Failed to submit QA decision.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGenerateReport() {
    if (!result) return;
    if (existingReport) {
      router.push(`/(tabs)/reports/${existingReport.id}`);
      return;
    }
    try {
      const report = await createReport.mutateAsync({
        resultId: result.id,
        title: `Inspection Report — ${result.hubspot_asset_id ?? "Asset"}`,
        hubspotCustomerId: "hs_cust_001",
      });
      router.push(`/(tabs)/reports/${report.id}`);
    } catch {
      Alert.alert("Error", "Could not create report.");
    }
  }

  if (isLoading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!result) {
    return (
      <View style={s.center}>
        <Text style={s.muted}>Inspection result not found.</Text>
      </View>
    );
  }

  const currentData = parseFormData(result.form_data);
  const prevData = parseFormData(previousResult?.form_data);
  const allKeys = Array.from(new Set([...Object.keys(currentData), ...Object.keys(prevData)]));
  const isApproved = result.qa_status === "APPROVED";
  const hasPrevious = !!previousResult && previousResult.id !== result.id;

  return (
    <ScreenWrapper safeBottom={false}>
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <View style={s.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={s.pageTitle}>QA Review</Text>
        <StatusBadge status={result.qa_status ?? result.status} />
      </View>

      <Card style={s.card}>
        <Text style={s.sectionTitle}>Inspection Details</Text>
        <View style={s.metaRow}>
          <Text style={s.metaLabel}>Asset</Text>
          <Text style={s.metaValue}>{result.hubspot_asset_id ?? "—"}</Text>
        </View>
        <View style={s.metaRow}>
          <Text style={s.metaLabel}>Status</Text>
          <StatusBadge status={result.status} size="sm" />
        </View>
        <View style={s.metaRow}>
          <Text style={s.metaLabel}>Inspector</Text>
          <Text style={s.metaValue}>{result.inspector_id ?? "—"}</Text>
        </View>
        <View style={s.metaRow}>
          <Text style={s.metaLabel}>Submitted</Text>
          <Text style={s.metaValue}>{formatDate(result.submitted_at)}</Text>
        </View>
      </Card>

      <Card style={s.card}>
        <View style={s.compareHeader}>
          <Text style={s.sectionTitle}>Inspection Answers</Text>
          {hasPrevious && (
            <View style={s.compareKey}>
              <View style={s.keyDot} />
              <Text style={s.keyText}>Changed vs. previous</Text>
            </View>
          )}
        </View>

        {hasPrevious && (
          <View style={s.compareColHeaders}>
            <Text style={[s.compareColLabel, { flex: 1.2 }]}>Field</Text>
            <Text style={s.compareColLabel}>Current</Text>
            <Text style={s.compareColLabel}>
              Previous ({formatDate(previousResult?.submitted_at)})
            </Text>
          </View>
        )}

        {allKeys.length === 0 ? (
          <Text style={s.muted}>No answers recorded.</Text>
        ) : hasPrevious ? (
          allKeys.map((key) => (
            <CompareRow
              key={key}
              label={fieldLabel(key)}
              current={currentData[key]}
              previous={prevData[key]}
              colors={colors}
            />
          ))
        ) : (
          Object.entries(currentData).map(([key, val]) => (
            <View key={key} style={s.answerRow}>
              <Text style={s.answerKey}>{fieldLabel(key)}</Text>
              <Text style={[
                s.answerVal,
                { color: val === true ? colors.success : val === false ? colors.destructive : colors.foreground }
              ]}>
                {val === true ? "✓ Yes" : val === false ? "✗ No" : String(val ?? "—")}
              </Text>
            </View>
          ))
        )}

        {hasPrevious && (
          <View style={s.prevMeta}>
            <Text style={s.prevMetaText}>
              Comparing with inspection submitted {formatDate(previousResult?.submitted_at)} · Status: {previousResult?.status}
            </Text>
          </View>
        )}
      </Card>

      {result.qa_notes ? (
        <Card style={s.card}>
          <Text style={s.sectionTitle}>QA Notes</Text>
          <Text style={s.qaNotes}>{result.qa_notes}</Text>
          {result.qa_reviewed_at && (
            <Text style={s.qaDate}>Reviewed {formatDate(result.qa_reviewed_at)}</Text>
          )}
        </Card>
      ) : null}

      {!isApproved && (
        <Card style={s.card}>
          <Text style={s.sectionTitle}>QA Decision</Text>
          <View style={s.decisionRow}>
            <TouchableOpacity
              style={[s.decisionBtn, decision === "APPROVED" && s.decisionBtnApprove, { borderColor: colors.success }]}
              onPress={() => setDecision("APPROVED")}
            >
              <Text style={[s.decisionLabel, { color: decision === "APPROVED" ? colors.success : colors.mutedForeground }]}>
                ✓ Approve
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.decisionBtn, decision === "REJECTED" && s.decisionBtnReject, { borderColor: colors.destructive }]}
              onPress={() => setDecision("REJECTED")}
            >
              <Text style={[s.decisionLabel, { color: decision === "REJECTED" ? colors.destructive : colors.mutedForeground }]}>
                ✗ Reject
              </Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={s.notesInput}
            placeholder="Reviewer notes (optional)…"
            placeholderTextColor={colors.mutedForeground}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />

          <Button
            label={submitting ? "Submitting…" : "Submit QA Decision"}
            variant="primary"
            onPress={handleSubmitReview}
            disabled={!decision || submitting}
            style={{ marginTop: 12 }}
          />
        </Card>
      )}

      {isApproved && (
        <Card style={[s.card, s.approvedCard]}>
          <Text style={s.approvedTitle}>✓ QA Approved</Text>
          {result.qa_notes && <Text style={s.approvedNotes}>"{result.qa_notes}"</Text>}
          <Text style={s.approvedSub}>
            This inspection has been approved. You can now generate and send the report.
          </Text>
          <Button
            label={existingReport ? "Open Report →" : "Generate Report"}
            variant="primary"
            onPress={handleGenerateReport}
            disabled={createReport.isPending}
            style={{ marginTop: 14 }}
          />
        </Card>
      )}
    </ScrollView>
    </ScreenWrapper>
  );
}

function styles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 20, paddingBottom: 48 },
    center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
    headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 20, gap: 12 },
    backBtn: { paddingRight: 4 },
    backText: { color: colors.primary, fontSize: 17, fontFamily: "Inter_400Regular" },
    pageTitle: { flex: 1, fontSize: 20, fontFamily: "Inter_700Bold", color: colors.foreground },
    card: { marginBottom: 16, padding: 16 },
    sectionTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 },
    compareHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
    compareKey: { flexDirection: "row", alignItems: "center", gap: 5 },
    keyDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.warning },
    keyText: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    compareColHeaders: { flexDirection: "row", paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 4 },
    compareColLabel: { flex: 1, fontSize: 10, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.4 },
    metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border },
    metaLabel: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    metaValue: { fontSize: 13, color: colors.foreground, fontFamily: "Inter_500Medium" },
    answerRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
    answerKey: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular", flex: 1 },
    answerVal: { fontSize: 13, fontFamily: "Inter_600SemiBold", textAlign: "right" },
    prevMeta: { marginTop: 10, paddingTop: 8 },
    prevMetaText: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontStyle: "italic" },
    qaNotes: { fontSize: 14, color: colors.foreground, fontFamily: "Inter_400Regular", lineHeight: 22 },
    qaDate: { fontSize: 11, color: colors.mutedForeground, marginTop: 8, fontFamily: "Inter_400Regular" },
    decisionRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
    decisionBtn: { flex: 1, borderWidth: 2, borderRadius: 8, padding: 12, alignItems: "center" },
    decisionBtnApprove: { backgroundColor: "rgba(26,127,55,0.08)" },
    decisionBtnReject: { backgroundColor: "rgba(201,48,44,0.08)" },
    decisionLabel: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
    notesInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, color: colors.foreground, fontFamily: "Inter_400Regular", fontSize: 14, backgroundColor: colors.card, minHeight: 72, textAlignVertical: "top" },
    muted: { color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center" },
    approvedCard: { borderLeftWidth: 4, borderLeftColor: colors.success },
    approvedTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: colors.success, marginBottom: 4 },
    approvedNotes: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontStyle: "italic", marginBottom: 8 },
    approvedSub: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", lineHeight: 20 },
  });
}
