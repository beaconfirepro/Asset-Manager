import React, { useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { useComplianceStandards } from "@/hooks/useComplianceStandards";
import { computeTestResult, CRITERIA_BY_STANDARD_CODE } from "@/lib/testScoring";
import type { ComplianceStandard } from "@/db/schema";

const TEST_TYPES = [
  "FLOW_TEST",
  "SMOKE_DETECTOR_SENSITIVITY",
  "SUPPRESSION_DISCHARGE",
  "PRESSURE_TEST",
  "VALVE_OPERATION",
  "BATTERY_LOAD",
  "ALARM_VERIFICATION",
];

type ResultType = "PASS" | "FAIL" | "INCONCLUSIVE";

type SubmitData = {
  hubspot_asset_id: string;
  compliance_standard_id?: string | null;
  compliance_standard_code?: string | null;
  test_type: string;
  result?: ResultType;
  readings?: string | null;
  notes?: string | null;
  tested_at: string;
  hubspot_work_order_ticket_id?: string | null;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: SubmitData) => Promise<void>;
};

export function TestRecordModal({ visible, onClose, onSubmit }: Props) {
  const colors = useColors();
  const [loading, setLoading] = useState(false);

  const [assetId, setAssetId] = useState("hs_asset_001");
  const [testType, setTestType] = useState(TEST_TYPES[0]);
  const [readings, setReadings] = useState("");
  const [notes, setNotes] = useState("");
  const [testedAt, setTestedAt] = useState(new Date().toISOString().slice(0, 10));
  const [workOrderId, setWorkOrderId] = useState("");
  const [selectedStandard, setSelectedStandard] = useState<ComplianceStandard | null>(null);

  const { data: standards = [] } = useComplianceStandards();

  const scoring = useMemo(
    () =>
      computeTestResult(
        selectedStandard?.code ?? null,
        testType,
        readings.trim() || null,
      ),
    [selectedStandard?.code, testType, readings],
  );

  const hasApplicableCriteria = useMemo(() => {
    if (!selectedStandard?.code) return false;
    const sc = CRITERIA_BY_STANDARD_CODE[selectedStandard.code];
    return !!(sc && sc[testType]?.length);
  }, [selectedStandard?.code, testType]);

  const readingPlaceholder = useMemo(() => {
    if (!selectedStandard?.code) return '{"static_psi": 75, "flow_gpm": 500}';
    const sc = CRITERIA_BY_STANDARD_CODE[selectedStandard.code];
    const tc = sc?.[testType];
    if (!tc?.length) return '{"field": value, ...}';
    const example: Record<string, string | number | boolean> = {};
    for (const c of tc) {
      if (c.kind === "numeric") example[c.field] = c.min ?? c.max ?? 0;
      else if (c.kind === "boolean") example[c.field] = true;
      else if (c.kind === "ratio") { example[c.field] = 22; example[c.compareField] = 24; }
    }
    return JSON.stringify(example);
  }, [selectedStandard?.code, testType]);

  const handleSubmit = async () => {
    if (!assetId.trim()) {
      Alert.alert("Validation", "Asset ID is required.");
      return;
    }
    if (!testedAt.match(/^\d{4}-\d{2}-\d{2}$/)) {
      Alert.alert("Validation", "Test date must be in YYYY-MM-DD format.");
      return;
    }
    if (readings.trim()) {
      try {
        JSON.parse(readings);
      } catch {
        Alert.alert("Validation", "Readings must be valid JSON.");
        return;
      }
    }
    setLoading(true);
    try {
      await onSubmit({
        hubspot_asset_id: assetId.trim(),
        compliance_standard_id: selectedStandard?.id ?? null,
        compliance_standard_code: selectedStandard?.code ?? null,
        test_type: testType,
        readings: readings.trim() || null,
        notes: notes.trim() || null,
        tested_at: testedAt,
        hubspot_work_order_ticket_id: workOrderId.trim() || null,
      });
      setAssetId("hs_asset_001");
      setTestType(TEST_TYPES[0]);
      setReadings("");
      setNotes("");
      setTestedAt(new Date().toISOString().slice(0, 10));
      setWorkOrderId("");
      setSelectedStandard(null);
      onClose();
    } catch {
      Alert.alert("Error", "Failed to save test record. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Log System Test" size="lg">
      <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 500 }}>
        <Input
          label="Asset ID *"
          value={assetId}
          onChangeText={setAssetId}
          placeholder="e.g. hs_asset_001"
          containerStyle={styles.field}
        />

        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Test Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {TEST_TYPES.map((t) => (
              <Button
                key={t}
                label={t.replace(/_/g, " ")}
                size="sm"
                variant={testType === t ? "primary" : "outline"}
                onPress={() => setTestType(t)}
                style={{ marginBottom: 4 }}
              />
            ))}
          </ScrollView>
        </View>

        {standards.length > 0 && (
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
              Compliance Standard
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              <Button
                key="none"
                label="None"
                size="sm"
                variant={selectedStandard === null ? "primary" : "outline"}
                onPress={() => setSelectedStandard(null)}
                style={{ marginBottom: 4 }}
              />
              {standards.map((s) => (
                <Button
                  key={s.id}
                  label={s.code}
                  size="sm"
                  variant={selectedStandard?.id === s.id ? "primary" : "outline"}
                  onPress={() => setSelectedStandard(s)}
                  style={{ marginBottom: 4 }}
                />
              ))}
            </ScrollView>
          </View>
        )}

        <Input
          label="Readings (JSON)"
          value={readings}
          onChangeText={setReadings}
          placeholder={readingPlaceholder}
          multiline
          numberOfLines={3}
          containerStyle={styles.field}
        />

        {hasApplicableCriteria && (
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
              Auto-Computed Result
            </Text>
            <View
              style={[
                styles.scoringBox,
                {
                  backgroundColor:
                    scoring.result === "PASS"
                      ? colors.success + "18"
                      : scoring.result === "FAIL"
                      ? colors.destructive + "18"
                      : colors.muted,
                  borderColor:
                    scoring.result === "PASS"
                      ? colors.success + "55"
                      : scoring.result === "FAIL"
                      ? colors.destructive + "55"
                      : colors.border,
                },
              ]}
            >
              <View style={styles.scoringHeader}>
                <Feather
                  name={scoring.result === "PASS" ? "check-circle" : scoring.result === "FAIL" ? "x-circle" : "help-circle"}
                  size={16}
                  color={
                    scoring.result === "PASS"
                      ? colors.success
                      : scoring.result === "FAIL"
                      ? colors.destructive
                      : colors.mutedForeground
                  }
                />
                <StatusBadge status={scoring.result} size="sm" />
                {scoring.criteriaApplied && (
                  <Text style={[styles.scoringLabel, { color: colors.mutedForeground }]}>
                    per {selectedStandard?.code}
                  </Text>
                )}
              </View>
              {scoring.violations.map((v, i) => (
                <Text key={i} style={[styles.violation, { color: colors.destructive }]}>
                  • {v}
                </Text>
              ))}
              {scoring.warnings.map((w, i) => (
                <Text key={i} style={[styles.warning, { color: colors.mutedForeground }]}>
                  • {w}
                </Text>
              ))}
              {!scoring.criteriaApplied && (
                <Text style={[styles.warning, { color: colors.mutedForeground }]}>
                  Enter readings to compute result automatically
                </Text>
              )}
            </View>
          </View>
        )}

        {!hasApplicableCriteria && selectedStandard && (
          <View style={[styles.noStdBanner, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Text style={[styles.noStdText, { color: colors.mutedForeground }]}>
              No scoring criteria defined for {selectedStandard.code} / {testType} — result determined by inspector judgment.
            </Text>
          </View>
        )}

        <Input
          label="Test Date * (YYYY-MM-DD)"
          value={testedAt}
          onChangeText={setTestedAt}
          placeholder="2026-06-14"
          containerStyle={styles.field}
        />

        <Input
          label="Work Order Ticket ID (optional)"
          value={workOrderId}
          onChangeText={setWorkOrderId}
          placeholder="hs_wo_001"
          containerStyle={styles.field}
        />

        <Input
          label="Notes"
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder="Optional observations…"
          containerStyle={styles.field}
        />
      </ScrollView>

      <View style={styles.actions}>
        <Button label="Cancel" variant="outline" onPress={onClose} style={styles.actionBtn} />
        <Button
          label={loading ? "Saving…" : "Log Test"}
          onPress={handleSubmit}
          disabled={loading}
          style={styles.actionBtn}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 14, fontFamily: "Inter_500Medium", marginBottom: 6 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  scoringBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    gap: 6,
  },
  scoringHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  scoringLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  violation: { fontSize: 12, fontFamily: "Inter_500Medium", lineHeight: 18 },
  warning: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  noStdBanner: { borderRadius: 8, borderWidth: 1, padding: 10, marginBottom: 14 },
  noStdText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  actions: { flexDirection: "row", gap: 10, marginTop: 12 },
  actionBtn: { flex: 1 },
});
