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
import { useUpdateQaStatus, useCreateReport, useReportForResult } from "@/hooks/useReports";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type QaDecision = "APPROVED" | "REJECTED";

export default function ReviewScreen() {
  const { id: scheduleId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();

  const { data: result, isLoading } = useInspectionResult(scheduleId);
  const { data: existingReport } = useReportForResult(result?.id);

  const updateQa = useUpdateQaStatus();
  const createReport = useCreateReport();

  const [decision, setDecision] = useState<QaDecision | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const s = styles(colors);

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
    } catch (err) {
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
        <Text style={s.emptyText}>Inspection result not found.</Text>
      </View>
    );
  }

  const formData = (() => {
    try { return JSON.parse(result.form_data ?? "{}") as Record<string, unknown>; }
    catch { return {}; }
  })();

  const formEntries = Object.entries(formData);
  const isApproved = result.qa_status === "APPROVED";

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <View style={s.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={s.pageTitle}>QA Review</Text>
        <StatusBadge status={result.qa_status ?? result.status} />
      </View>

      <Card style={s.card}>
        <Text style={s.sectionTitle}>Inspection Summary</Text>
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
          <Text style={s.metaValue}>
            {result.submitted_at ? new Date(result.submitted_at).toLocaleDateString() : "—"}
          </Text>
        </View>
      </Card>

      <Card style={s.card}>
        <Text style={s.sectionTitle}>Inspection Answers</Text>
        {formEntries.length === 0 ? (
          <Text style={s.emptyText}>No answers recorded.</Text>
        ) : (
          formEntries.map(([key, val]) => (
            <View key={key} style={s.answerRow}>
              <Text style={s.answerKey}>
                {key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </Text>
              <Text style={[s.answerVal, { color: val === true ? colors.success : val === false ? colors.destructive : colors.foreground }]}>
                {val === true ? "✓ Yes" : val === false ? "✗ No" : String(val ?? "—")}
              </Text>
            </View>
          ))
        )}
      </Card>

      {result.qa_notes ? (
        <Card style={s.card}>
          <Text style={s.sectionTitle}>QA Notes</Text>
          <Text style={s.qaNotes}>{result.qa_notes}</Text>
          {result.qa_reviewed_at && (
            <Text style={s.qaDate}>
              Reviewed {new Date(result.qa_reviewed_at).toLocaleDateString()}
            </Text>
          )}
        </Card>
      ) : null}

      {!isApproved && (
        <Card style={s.card}>
          <Text style={s.sectionTitle}>QA Decision</Text>
          <View style={s.decisionRow}>
            <TouchableOpacity
              style={[s.decisionBtn, decision === "APPROVED" && s.decisionBtnActive, { borderColor: colors.success }]}
              onPress={() => setDecision("APPROVED")}
            >
              <Text style={[s.decisionLabel, { color: decision === "APPROVED" ? colors.success : colors.mutedForeground }]}>
                ✓ Approve
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.decisionBtn, decision === "REJECTED" && s.decisionBtnActive, { borderColor: colors.destructive }]}
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
          <Text style={s.approvedSub}>
            This inspection has been approved by QA. You can now generate and send the report.
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
    sectionTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 },
    metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border },
    metaLabel: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    metaValue: { fontSize: 13, color: colors.foreground, fontFamily: "Inter_500Medium" },
    answerRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
    answerKey: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular", flex: 1 },
    answerVal: { fontSize: 13, fontFamily: "Inter_600SemiBold", textAlign: "right" },
    qaNotes: { fontSize: 14, color: colors.foreground, fontFamily: "Inter_400Regular", lineHeight: 22 },
    qaDate: { fontSize: 11, color: colors.mutedForeground, marginTop: 8, fontFamily: "Inter_400Regular" },
    decisionRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
    decisionBtn: { flex: 1, borderWidth: 2, borderRadius: 8, padding: 12, alignItems: "center" },
    decisionBtnActive: { backgroundColor: "rgba(255,255,255,0.06)" },
    decisionLabel: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
    notesInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, color: colors.foreground, fontFamily: "Inter_400Regular", fontSize: 14, backgroundColor: colors.card, minHeight: 72, textAlignVertical: "top" },
    emptyText: { color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center" },
    approvedCard: { borderLeftWidth: 4, borderLeftColor: colors.success },
    approvedTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: colors.success, marginBottom: 6 },
    approvedSub: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", lineHeight: 20 },
  });
}
