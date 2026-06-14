import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
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
import {
  useReport,
  useReportItems,
  useUpdateReport,
  useSendReport,
  useStorePdfUrl,
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

export default function ReportBuilderScreen() {
  const { id: reportId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const s = styles(colors);

  const { data: report, isLoading } = useReport(reportId);
  const { data: items = [] } = useReportItems(reportId);
  const updateReport = useUpdateReport();
  const storePdfUrl = useStorePdfUrl();
  const sendReport = useSendReport();

  const [generating, setGenerating] = useState(false);
  const [sendModal, setSendModal] = useState<SendModalState>({
    visible: false,
    customerId: "",
    message: "",
    enqueueInvoice: false,
    contractedAmount: "",
  });

  const reportConfig: ReportConfig = (() => {
    try { return JSON.parse(report?.report_config ?? "{}") as ReportConfig; }
    catch { return { format: "NFPA", deficiencies_only: false, include_photos: true }; }
  })();

  async function patchConfig(updates: Partial<ReportConfig>) {
    if (!reportId) return;
    const next: ReportConfig = { ...reportConfig, ...updates };
    await updateReport.mutateAsync({
      reportId,
      updates: { report_config: JSON.stringify(next) },
    });
  }

  async function handleGeneratePdf() {
    if (!report?.result) return;
    setGenerating(true);
    try {
      const pdfUri = await generateReportPdf(report, report.result, items, reportConfig);
      await storePdfUrl.mutateAsync({ reportId: report.id, pdfUrl: pdfUri });
      Alert.alert("PDF Generated", "The report PDF has been saved and the report is now Approved.");
    } catch (err) {
      Alert.alert("Error", "PDF generation failed. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSend() {
    if (!report) return;
    if (!report.pdf_url) {
      Alert.alert("No PDF", "Generate the PDF first before sending.");
      return;
    }
    if (report.status !== "APPROVED") {
      Alert.alert("Not Approved", "The report must be QA-approved before it can be sent.");
      return;
    }
    setSendModal((m) => ({
      ...m,
      visible: true,
      customerId: report.hubspot_customer_id ?? "",
    }));
  }

  async function confirmSend() {
    if (!report) return;
    try {
      await sendReport.mutateAsync({
        reportId: report.id,
        hubspotCustomerId: sendModal.customerId,
        pdfUrl: report.pdf_url ?? "",
        message: sendModal.message,
        enqueueInvoice: sendModal.enqueueInvoice,
        contractedAmount: sendModal.contractedAmount ? parseFloat(sendModal.contractedAmount) : 0,
      });
      setSendModal((m) => ({ ...m, visible: false }));
      Alert.alert("Report Sent", "Report delivery and invoice have been queued in the sync outbox.");
    } catch {
      Alert.alert("Error", "Failed to send report.");
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

  const isApproved = report.status === "APPROVED";
  const isSent = report.status === "SENT";
  const canSend = isApproved && !!report.pdf_url;

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <View style={s.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>‹ Reports</Text>
        </TouchableOpacity>
        <StatusBadge status={report.status} />
      </View>

      <Text style={s.pageTitle} numberOfLines={2}>{report.title ?? "Untitled Report"}</Text>

      {report.result && (
        <Card style={s.card}>
          <Text style={s.sectionTitle}>Inspection Details</Text>
          <View style={s.metaRow}>
            <Text style={s.metaLabel}>Asset</Text>
            <Text style={s.metaValue}>{report.result.hubspot_asset_id ?? "—"}</Text>
          </View>
          <View style={s.metaRow}>
            <Text style={s.metaLabel}>Inspection Status</Text>
            <StatusBadge status={report.result.status} size="sm" />
          </View>
          <View style={s.metaRow}>
            <Text style={s.metaLabel}>QA Status</Text>
            <StatusBadge status={report.result.qa_status ?? "PENDING"} size="sm" />
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
                onPress={() => !isSent && patchConfig({ format: fmt })}
                disabled={isSent}
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
            onValueChange={(v) => { if (!isSent) void patchConfig({ deficiencies_only: v }); }}
            trackColor={{ true: colors.primary, false: colors.border }}
            thumbColor="#fff"
            disabled={isSent}
          />
        </View>
        <View style={s.toggleRow}>
          <Text style={s.toggleLabel}>Include Photos</Text>
          <Switch
            value={reportConfig.include_photos}
            onValueChange={(v) => { if (!isSent) void patchConfig({ include_photos: v }); }}
            trackColor={{ true: colors.primary, false: colors.border }}
            thumbColor="#fff"
            disabled={isSent}
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
              <View style={[s.itemTypeDot, { backgroundColor: item.item_type === "FINDING" ? colors.destructive : item.item_type === "SUMMARY" ? colors.success : colors.primary }]} />
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
            Format: {reportConfig.format.replace(/_/g, " ")} · Photos: {reportConfig.include_photos ? "Yes" : "No"}
          </Text>
          {items.slice(0, 3).map((item) => (
            <View key={item.id} style={s.previewItem}>
              <Text style={[s.previewItemType, { color: item.item_type === "FINDING" ? colors.destructive : colors.success }]}>
                [{item.item_type}]
              </Text>
              <Text style={s.previewItemContent} numberOfLines={1}>{item.content}</Text>
            </View>
          ))}
          {items.length > 3 && (
            <Text style={s.muted}>… and {items.length - 3} more items</Text>
          )}
          {report.pdf_url && (
            <View style={s.pdfIndicator}>
              <Text style={s.pdfLabel}>📄 PDF available</Text>
            </View>
          )}
        </View>
      </Card>

      {!isSent && (
        <View style={s.actions}>
          {!isApproved && !report.pdf_url && (
            <View style={s.warningBox}>
              <Text style={s.warningText}>
                ⚠ The inspection must be QA-approved before generating a report PDF.
              </Text>
            </View>
          )}
          <Button
            label={generating ? "Generating PDF…" : report.pdf_url ? "Regenerate PDF" : "Generate PDF"}
            variant={isApproved ? "primary" : "secondary"}
            onPress={handleGeneratePdf}
            disabled={generating || !isApproved}
            style={{ marginBottom: 10 }}
          />
          <Button
            label="Send Report"
            variant="primary"
            onPress={handleSend}
            disabled={!canSend || sendReport.isPending}
          />
        </View>
      )}

      {isSent && (
        <View style={s.sentBanner}>
          <Text style={s.sentTitle}>✓ Report Sent</Text>
          <Text style={s.sentSub}>
            Delivered {report.sent_at ? new Date(report.sent_at).toLocaleDateString() : ""}
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
              This will queue the report for delivery via the HubSpot Customer Portal and (optionally) create a QBO invoice.
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

            <Text style={s.inputLabel}>Message (optional)</Text>
            <TextInput
              style={[s.input, { minHeight: 64, textAlignVertical: "top" }]}
              value={sendModal.message}
              onChangeText={(v) => setSendModal((m) => ({ ...m, message: v }))}
              placeholder="Add a cover message…"
              placeholderTextColor={colors.mutedForeground}
              multiline
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
              <Button
                label="Cancel"
                variant="outline"
                onPress={() => setSendModal((m) => ({ ...m, visible: false }))}
                style={{ flex: 1 }}
              />
              <Button
                label={sendReport.isPending ? "Sending…" : "Send →"}
                variant="primary"
                onPress={confirmSend}
                disabled={!sendModal.customerId || sendReport.isPending}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function styles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 20, paddingBottom: 60 },
    center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
    headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
    backBtn: {},
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
    muted: { color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 13 },
    actions: { gap: 0, marginTop: 8 },
    warningBox: { backgroundColor: colors.warning + "18", borderRadius: 8, padding: 12, marginBottom: 12 },
    warningText: { fontSize: 13, color: colors.warning, fontFamily: "Inter_400Regular", lineHeight: 18 },
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
