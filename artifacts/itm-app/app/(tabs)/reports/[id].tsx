import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { ScreenWrapper } from "@/components/ui/ScreenWrapper";
import {
  useReport,
  useReportItems,
  useUpdateReport,
  useSubmitReportForReview,
  useApproveReport,
  useRejectReport,
  useSendReport,
  useStorePdfUrl,
  useProposalHandoff,
} from "@/hooks/useReports";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { generateReportPdf, type ReportConfig } from "@/lib/pdf/reportPdf";

type SendModalState = {
  visible: boolean;
  customerId: string;
  message: string;
  enqueueInvoice: boolean;
  contractedAmount: string;
};

type ProposalModalState = {
  visible: boolean;
  customerId: string;
  deficiencySummary: string;
};

const STATUS_LIFECYCLE: Array<{ status: string; label: string }> = [
  { status: "DRAFT", label: "Draft" },
  { status: "QA_REVIEW", label: "QA Review" },
  { status: "APPROVED", label: "Approved" },
  { status: "SENT", label: "Sent" },
];

function LifecycleStepper({ current, colors }: { current: string; colors: ReturnType<typeof useColors> }) {
  const idx = STATUS_LIFECYCLE.findIndex((s) => s.status === current);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
      {STATUS_LIFECYCLE.map((step, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <React.Fragment key={step.status}>
            <View style={{ alignItems: "center" }}>
              <View style={[
                stepStyle.dot,
                done && { backgroundColor: colors.success, borderColor: colors.success },
                active && { borderColor: colors.primary, backgroundColor: colors.primary + "22" },
              ]}>
                <Text style={[stepStyle.dotLabel, (done || active) && { color: done ? colors.success : colors.primary }]}>
                  {done ? "✓" : String(i + 1)}
                </Text>
              </View>
              <Text style={[stepStyle.stepLabel, active && { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>
                {step.label}
              </Text>
            </View>
            {i < STATUS_LIFECYCLE.length - 1 && (
              <View style={[stepStyle.line, done && { backgroundColor: colors.success }]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const stepStyle = StyleSheet.create({
  dot: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: "#555", alignItems: "center", justifyContent: "center", backgroundColor: "transparent" },
  dotLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#555" },
  stepLabel: { fontSize: 10, color: "#888", fontFamily: "Inter_400Regular", marginTop: 3, textAlign: "center", maxWidth: 52 },
  line: { flex: 1, height: 2, backgroundColor: "#333", marginBottom: 14, marginHorizontal: 2 },
});

export default function ReportBuilderScreen() {
  const { id: reportId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const s = styles(colors);

  const { data: report, isLoading } = useReport(reportId);
  const { data: items = [] } = useReportItems(reportId);
  const updateReport = useUpdateReport();
  const storePdfUrl = useStorePdfUrl();
  const submitForReview = useSubmitReportForReview();
  const approveReport = useApproveReport();
  const rejectReport = useRejectReport();
  const sendReport = useSendReport();
  const proposalHandoff = useProposalHandoff();

  const [generating, setGenerating] = useState(false);
  const [sendModal, setSendModal] = useState<SendModalState>({
    visible: false, customerId: "", message: "", enqueueInvoice: false, contractedAmount: "",
  });
  const [proposalModal, setProposalModal] = useState<ProposalModalState>({
    visible: false, customerId: "", deficiencySummary: "",
  });
  const [rejectNotes, setRejectNotes] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);

  const reportConfig: ReportConfig = (() => {
    try { return JSON.parse(report?.report_config ?? "{}") as ReportConfig; }
    catch { return { format: "NFPA", deficiencies_only: false, include_photos: true }; }
  })();

  async function patchConfig(updates: Partial<ReportConfig>) {
    if (!reportId) return;
    const next: ReportConfig = { ...reportConfig, ...updates };
    await updateReport.mutateAsync({ reportId, updates: { report_config: JSON.stringify(next) } });
  }

  async function handleGeneratePdf() {
    if (!report?.result) return;
    setGenerating(true);
    try {
      const pdfUri = await generateReportPdf(report, report.result, items, reportConfig);
      await storePdfUrl.mutateAsync({ reportId: report.id, pdfUrl: pdfUri });
      Alert.alert("PDF Ready", "The report PDF has been generated and is ready for review.");
    } catch {
      Alert.alert("Error", "PDF generation failed. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSubmitForReview() {
    if (!reportId) return;
    await submitForReview.mutateAsync({ reportId });
    Alert.alert("Submitted", "Report submitted for QA review.");
  }

  async function handleApprove() {
    if (!reportId) return;
    await approveReport.mutateAsync({ reportId });
    Alert.alert("Approved", "Report is now approved and ready to send.");
  }

  async function handleReject() {
    if (!reportId) return;
    await rejectReport.mutateAsync({ reportId, notes: rejectNotes });
    setShowRejectInput(false);
    setRejectNotes("");
    Alert.alert("Rejected", "Report returned to draft for revision.");
  }

  async function confirmSend() {
    if (!report) return;
    try {
      await sendReport.mutateAsync({
        reportId: report.id,
        hubspotCustomerId: sendModal.customerId,
        pdfUrl: report.pdf_url ?? "",
        enqueueInvoice: sendModal.enqueueInvoice,
        contractedAmount: sendModal.contractedAmount ? parseFloat(sendModal.contractedAmount) : 0,
      });
      setSendModal((m) => ({ ...m, visible: false }));
      Alert.alert("Report Sent", "Report delivery and invoice queued in the sync outbox.");
    } catch {
      Alert.alert("Error", "Failed to send report.");
    }
  }

  async function confirmProposal() {
    if (!report?.result) return;
    try {
      await proposalHandoff.mutateAsync({
        hubspotCustomerId: proposalModal.customerId,
        resultId: report.result.id,
        deficiencySummary: proposalModal.deficiencySummary,
      });
      setProposalModal((m) => ({ ...m, visible: false }));
      Alert.alert("Proposal Queued", "Deficiency proposal handoff enqueued to HubSpot outbox.");
    } catch {
      Alert.alert("Error", "Failed to enqueue proposal handoff.");
    }
  }

  if (isLoading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!report) {
    return (
      <View style={s.center}>
        <Text style={s.muted}>Report not found.</Text>
      </View>
    );
  }

  const isDraft = report.status === "DRAFT";
  const isQaReview = report.status === "QA_REVIEW";
  const isApproved = report.status === "APPROVED";
  const isSent = report.status === "SENT";
  const canEdit = isDraft;
  const hasPdf = !!report.pdf_url;
  const hasDeficiencies = items.some((i) => i.item_type === "FINDING");

  return (
    <ScreenWrapper safeBottom={false}>
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <View style={s.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.backText}>‹ Reports</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.pageTitle} numberOfLines={2}>{report.title ?? "Untitled Report"}</Text>

      <LifecycleStepper current={report.status} colors={colors} />

      {report.result && (
        <Card style={s.card}>
          <Text style={s.sectionTitle}>Inspection Details</Text>
          <View style={s.metaRow}>
            <Text style={s.metaLabel}>Asset</Text>
            <Text style={s.metaValue}>{report.result.hubspot_asset_id ?? "—"}</Text>
          </View>
          <View style={s.metaRow}>
            <Text style={s.metaLabel}>Inspection QA</Text>
            <StatusBadge status={report.result.qa_status ?? "PENDING"} size="sm" />
          </View>
          <View style={s.metaRow}>
            <Text style={s.metaLabel}>Inspector</Text>
            <Text style={s.metaValue}>{report.result.inspector_id ?? "—"}</Text>
          </View>
          {report.result.qa_notes && (
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>QA Notes</Text>
              <Text style={[s.metaValue, { flex: 1, textAlign: "right" }]}>{report.result.qa_notes}</Text>
            </View>
          )}
        </Card>
      )}

      <Card style={s.card}>
        <Text style={s.sectionTitle}>Report Format</Text>
        <View style={s.formatRow}>
          {(["NFPA", "JOINT_COMMISSION", "DEFICIENCIES_ONLY", "SERVICE_SUMMARY"] as const).map((fmt) => {
            const active = reportConfig.format === fmt;
            const label = fmt === "JOINT_COMMISSION" ? "Joint Comm." : fmt === "DEFICIENCIES_ONLY" ? "Deficiencies" : fmt === "SERVICE_SUMMARY" ? "Service Summary" : "NFPA";
            return (
              <TouchableOpacity
                key={fmt}
                style={[s.fmtChip, active && s.fmtChipActive]}
                onPress={() => canEdit && void patchConfig({ format: fmt })}
                disabled={!canEdit}
              >
                <Text style={[s.fmtLabel, active && s.fmtLabelActive]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={s.toggleRow}>
          <Text style={s.toggleLabel}>Deficiencies Only</Text>
          <Switch
            value={reportConfig.deficiencies_only}
            onValueChange={(v) => { if (canEdit) void patchConfig({ deficiencies_only: v }); }}
            trackColor={{ true: colors.primary, false: colors.border }}
            thumbColor="#fff"
            disabled={!canEdit}
          />
        </View>
        <View style={s.toggleRow}>
          <Text style={s.toggleLabel}>Include Photos</Text>
          <Switch
            value={reportConfig.include_photos}
            onValueChange={(v) => { if (canEdit) void patchConfig({ include_photos: v }); }}
            trackColor={{ true: colors.primary, false: colors.border }}
            thumbColor="#fff"
            disabled={!canEdit}
          />
        </View>
      </Card>

      <Card style={s.card}>
        <Text style={s.sectionTitle}>Report Items ({items.length})</Text>
        {items.length === 0 ? (
          <Text style={s.muted}>No items in this report.</Text>
        ) : (
          items.map((item) => (
            <View key={item.id} style={s.itemRow}>
              <View style={[s.itemTypeDot, {
                backgroundColor: item.item_type === "FINDING" ? colors.destructive : item.item_type === "SUMMARY" ? colors.success : colors.primary
              }]} />
              <View style={{ flex: 1 }}>
                <Text style={s.itemType}>{item.item_type}</Text>
                <Text style={s.itemContent} numberOfLines={2}>{item.content}</Text>
              </View>
            </View>
          ))
        )}
      </Card>

      <Card style={s.card}>
        <Text style={s.sectionTitle}>Preview</Text>
        <View style={s.previewBox}>
          <View style={s.previewHeader}>
            <View>
              <Text style={s.previewBrand}>Beacon Fire Protection</Text>
              <Text style={s.previewBrandSub}>Inspection · Testing · Maintenance</Text>
            </View>
            <StatusBadge status={report.status} size="sm" />
          </View>
          <Text style={s.previewReportTitle}>{report.title ?? "Inspection Report"}</Text>
          <Text style={s.previewMeta}>
            {reportConfig.format.replace(/_/g, " ")} · Photos: {reportConfig.include_photos ? "Yes" : "No"} · Deficiencies only: {reportConfig.deficiencies_only ? "Yes" : "No"}
          </Text>
          {items.slice(0, 3).map((item) => (
            <View key={item.id} style={s.previewItem}>
              <Text style={[s.previewItemType, { color: item.item_type === "FINDING" ? colors.destructive : colors.success }]}>
                [{item.item_type}]
              </Text>
              <Text style={s.previewItemContent} numberOfLines={1}>{item.content}</Text>
            </View>
          ))}
          {items.length > 3 && <Text style={s.muted}>…and {items.length - 3} more items</Text>}
          {hasPdf && (
            <View style={s.pdfIndicator}>
              <Text style={s.pdfLabel}>📄 PDF generated</Text>
            </View>
          )}
        </View>
      </Card>

      {!isSent && (
        <Card style={s.card}>
          <Text style={s.sectionTitle}>Actions</Text>

          {isDraft && (
            <>
              <Button
                label={generating ? "Generating PDF…" : hasPdf ? "Regenerate PDF" : "Generate PDF"}
                variant="secondary"
                onPress={handleGeneratePdf}
                disabled={generating}
                style={s.actionBtn}
              />
              {hasDeficiencies && (
                <Button
                  label="Create Proposal (HubSpot)"
                  variant="outline"
                  onPress={() => setProposalModal((m) => ({
                    ...m,
                    visible: true,
                    customerId: report.hubspot_customer_id ?? "",
                  }))}
                  style={s.actionBtn}
                />
              )}
              <Button
                label="Submit for Review →"
                variant="primary"
                onPress={handleSubmitForReview}
                disabled={!hasPdf || submitForReview.isPending}
                style={s.actionBtn}
              />
              {!hasPdf && (
                <Text style={s.hint}>Generate the PDF first before submitting for review.</Text>
              )}
            </>
          )}

          {isQaReview && (
            <>
              <View style={s.qaReviewBanner}>
                <Text style={s.qaReviewText}>⏳ Awaiting QA review. Approve or reject below.</Text>
              </View>
              <Button
                label={generating ? "Regenerating…" : "Regenerate PDF"}
                variant="secondary"
                onPress={handleGeneratePdf}
                disabled={generating}
                style={s.actionBtn}
              />
              <View style={s.decisionRow}>
                <Button
                  label="✓ Approve"
                  variant="secondary"
                  onPress={handleApprove}
                  disabled={approveReport.isPending}
                  style={StyleSheet.flatten([s.actionBtn, { flex: 1, borderColor: colors.success }])}
                />
                <Button
                  label="✗ Reject"
                  variant="destructive"
                  onPress={() => setShowRejectInput((v) => !v)}
                  style={StyleSheet.flatten([s.actionBtn, { flex: 1 }])}
                />
              </View>
              {showRejectInput && (
                <>
                  <TextInput
                    style={s.notesInput}
                    placeholder="Rejection notes…"
                    placeholderTextColor={colors.mutedForeground}
                    value={rejectNotes}
                    onChangeText={setRejectNotes}
                    multiline
                    numberOfLines={3}
                  />
                  <Button
                    label="Confirm Reject"
                    variant="destructive"
                    onPress={handleReject}
                    disabled={rejectReport.isPending}
                    style={s.actionBtn}
                  />
                </>
              )}
            </>
          )}

          {isApproved && (
            <>
              <View style={s.approvedBanner}>
                <Text style={s.approvedBannerText}>✓ Report approved — ready to send</Text>
              </View>
              <Button
                label="Send Report →"
                variant="primary"
                onPress={() => setSendModal((m) => ({ ...m, visible: true, customerId: report.hubspot_customer_id ?? "" }))}
                disabled={sendReport.isPending}
                style={s.actionBtn}
              />
              {hasDeficiencies && (
                <Button
                  label="Create Proposal (HubSpot)"
                  variant="outline"
                  onPress={() => setProposalModal((m) => ({
                    ...m,
                    visible: true,
                    customerId: report.hubspot_customer_id ?? "",
                  }))}
                  style={s.actionBtn}
                />
              )}
            </>
          )}
        </Card>
      )}

      {isSent && (
        <View style={s.sentBanner}>
          <Text style={s.sentTitle}>✓ Report Sent</Text>
          <Text style={s.sentSub}>
            {report.sent_at ? `Delivered ${new Date(report.sent_at).toLocaleDateString()}` : "Delivered"}
          </Text>
        </View>
      )}

      <Modal
        visible={sendModal.visible}
        transparent
        animationType="slide"
        onRequestClose={() => setSendModal((m) => ({ ...m, visible: false }))}
      >
        <View style={s.overlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>Send Report</Text>
            <Text style={s.modalSub}>
              Queues delivery via HubSpot Customer Portal and optionally creates a QBO invoice.
            </Text>
            <Text style={s.inputLabel}>HubSpot Customer ID</Text>
            <TextInput
              style={s.input}
              value={sendModal.customerId}
              onChangeText={(v) => setSendModal((m) => ({ ...m, customerId: v }))}
              placeholder="hs_cust_001"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
            />
            <View style={s.toggleRow}>
              <Text style={s.toggleLabel}>Create QBO Invoice</Text>
              <Switch
                value={sendModal.enqueueInvoice}
                onValueChange={(v) => setSendModal((m) => ({ ...m, enqueueInvoice: v }))}
                trackColor={{ true: colors.primary, false: colors.border }}
                thumbColor="#fff"
              />
            </View>
            {sendModal.enqueueInvoice && (
              <>
                <Text style={s.inputLabel}>Contracted Amount ($)</Text>
                <TextInput
                  style={s.input}
                  value={sendModal.contractedAmount}
                  onChangeText={(v) => setSendModal((m) => ({ ...m, contractedAmount: v }))}
                  placeholder="0.00"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="decimal-pad"
                />
              </>
            )}
            <View style={s.modalActions}>
              <Button label="Cancel" variant="outline" onPress={() => setSendModal((m) => ({ ...m, visible: false }))} style={{ flex: 1 }} />
              <Button label={sendReport.isPending ? "Sending…" : "Send →"} variant="primary" onPress={confirmSend} disabled={!sendModal.customerId || sendReport.isPending} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={proposalModal.visible}
        transparent
        animationType="slide"
        onRequestClose={() => setProposalModal((m) => ({ ...m, visible: false }))}
      >
        <View style={s.overlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>Create Proposal</Text>
            <Text style={s.modalSub}>
              Enqueues a deficiency proposal handoff to HubSpot. The proposal will be created when the sync outbox drains.
            </Text>
            <Text style={s.inputLabel}>HubSpot Customer ID</Text>
            <TextInput
              style={s.input}
              value={proposalModal.customerId}
              onChangeText={(v) => setProposalModal((m) => ({ ...m, customerId: v }))}
              placeholder="hs_cust_001"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
            />
            <Text style={s.inputLabel}>Deficiency Summary</Text>
            <TextInput
              style={[s.input, { minHeight: 80, textAlignVertical: "top" }]}
              value={proposalModal.deficiencySummary}
              onChangeText={(v) => setProposalModal((m) => ({ ...m, deficiencySummary: v }))}
              placeholder="Describe deficiencies requiring remediation…"
              placeholderTextColor={colors.mutedForeground}
              multiline
            />
            <View style={s.modalActions}>
              <Button label="Cancel" variant="outline" onPress={() => setProposalModal((m) => ({ ...m, visible: false }))} style={{ flex: 1 }} />
              <Button label={proposalHandoff.isPending ? "Queuing…" : "Create Proposal"} variant="primary" onPress={confirmProposal} disabled={!proposalModal.customerId || !proposalModal.deficiencySummary || proposalHandoff.isPending} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
    </ScreenWrapper>
  );
}

function styles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 20, paddingBottom: 60 },
    center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
    headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
    backText: { color: colors.primary, fontSize: 15, fontFamily: "Inter_400Regular" },
    pageTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: colors.foreground, marginBottom: 20 },
    card: { marginBottom: 16, padding: 16 },
    sectionTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 12 },
    metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.border },
    metaLabel: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    metaValue: { fontSize: 13, color: colors.foreground, fontFamily: "Inter_500Medium" },
    formatRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
    fmtChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
    fmtChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    fmtLabel: { fontSize: 12, fontFamily: "Inter_500Medium", color: colors.mutedForeground },
    fmtLabelActive: { color: "#fff" },
    toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border },
    toggleLabel: { fontSize: 14, color: colors.foreground, fontFamily: "Inter_400Regular" },
    itemRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
    itemTypeDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
    itemType: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.5 },
    itemContent: { fontSize: 13, color: colors.foreground, fontFamily: "Inter_400Regular", marginTop: 2 },
    previewBox: { backgroundColor: "#fff", borderRadius: 8, padding: 14, borderWidth: 1, borderColor: colors.border },
    previewHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, paddingBottom: 10, borderBottomWidth: 2, borderBottomColor: "#e85d2f" },
    previewBrand: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#0a1628" },
    previewBrandSub: { fontSize: 9, color: "#888" },
    previewReportTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#0a1628", marginBottom: 4 },
    previewMeta: { fontSize: 10, color: "#888", marginBottom: 8 },
    previewItem: { flexDirection: "row", gap: 6, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
    previewItemType: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
    previewItemContent: { fontSize: 11, color: "#444", flex: 1 },
    pdfIndicator: { marginTop: 8, backgroundColor: "#f0faf4", borderRadius: 6, padding: 6, alignItems: "center" },
    pdfLabel: { fontSize: 11, color: "#1a7f37", fontFamily: "Inter_600SemiBold" },
    actionBtn: { marginBottom: 8 },
    hint: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginBottom: 8, fontStyle: "italic" },
    decisionRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
    qaReviewBanner: { backgroundColor: colors.warning + "18", borderRadius: 8, padding: 10, marginBottom: 12 },
    qaReviewText: { fontSize: 13, color: colors.warning, fontFamily: "Inter_500Medium" },
    approvedBanner: { backgroundColor: colors.success + "18", borderRadius: 8, padding: 10, marginBottom: 12 },
    approvedBannerText: { fontSize: 13, color: colors.success, fontFamily: "Inter_600SemiBold" },
    notesInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, color: colors.foreground, fontFamily: "Inter_400Regular", fontSize: 14, backgroundColor: colors.card, minHeight: 72, textAlignVertical: "top", marginBottom: 8 },
    muted: { color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13 },
    sentBanner: { backgroundColor: colors.success + "18", borderRadius: 12, padding: 20, alignItems: "center", marginTop: 8 },
    sentTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: colors.success },
    sentSub: { fontSize: 13, color: colors.mutedForeground, marginTop: 4 },
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
    modalBox: { backgroundColor: colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
    modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: colors.foreground, marginBottom: 6 },
    modalSub: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginBottom: 16, lineHeight: 18 },
    inputLabel: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
    input: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, color: colors.foreground, fontFamily: "Inter_400Regular", fontSize: 14, backgroundColor: colors.card, marginBottom: 14 },
    modalActions: { flexDirection: "row", gap: 10, marginTop: 20 },
  });
}
