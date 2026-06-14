import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useComplianceStandards } from "@/hooks/useComplianceStandards";

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
const RESULTS: ResultType[] = ["PASS", "FAIL", "INCONCLUSIVE"];

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    hubspot_asset_id: string;
    compliance_standard_id?: string | null;
    test_type: string;
    result: ResultType;
    readings?: string | null;
    notes?: string | null;
    tested_at: string;
    hubspot_work_order_ticket_id?: string | null;
  }) => Promise<void>;
};

export function TestRecordModal({ visible, onClose, onSubmit }: Props) {
  const colors = useColors();
  const [loading, setLoading] = useState(false);

  const [assetId, setAssetId] = useState("hs_asset_001");
  const [testType, setTestType] = useState(TEST_TYPES[0]);
  const [result, setResult] = useState<ResultType>("PASS");
  const [readings, setReadings] = useState('{"static_psi": 75, "residual_psi": 68}');
  const [notes, setNotes] = useState("");
  const [testedAt, setTestedAt] = useState(new Date().toISOString().slice(0, 10));
  const [workOrderId, setWorkOrderId] = useState("");

  const { data: standards = [] } = useComplianceStandards();
  const [complianceStandardId, setComplianceStandardId] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!assetId.trim()) {
      Alert.alert("Validation", "Asset ID is required.");
      return;
    }
    if (!testType.trim()) {
      Alert.alert("Validation", "Test type is required.");
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
        Alert.alert("Validation", "Readings must be valid JSON (e.g. {\"psi\": 75}).");
        return;
      }
    }
    setLoading(true);
    try {
      await onSubmit({
        hubspot_asset_id: assetId.trim(),
        compliance_standard_id: complianceStandardId,
        test_type: testType,
        result,
        readings: readings.trim() || null,
        notes: notes.trim() || null,
        tested_at: testedAt,
        hubspot_work_order_ticket_id: workOrderId.trim() || null,
      });
      setAssetId("hs_asset_001");
      setTestType(TEST_TYPES[0]);
      setResult("PASS");
      setReadings('{"static_psi": 75, "residual_psi": 68}');
      setNotes("");
      setTestedAt(new Date().toISOString().slice(0, 10));
      setWorkOrderId("");
      onClose();
    } catch {
      Alert.alert("Error", "Failed to save test record. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Log System Test" size="lg">
      <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 480 }}>
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
              Compliance Standard (optional)
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              <Button
                key="none"
                label="None"
                size="sm"
                variant={complianceStandardId === null ? "primary" : "outline"}
                onPress={() => setComplianceStandardId(null)}
                style={{ marginBottom: 4 }}
              />
              {standards.map((s) => (
                <Button
                  key={s.id}
                  label={s.code}
                  size="sm"
                  variant={complianceStandardId === s.id ? "primary" : "outline"}
                  onPress={() => setComplianceStandardId(s.id)}
                  style={{ marginBottom: 4 }}
                />
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Result *</Text>
          <View style={styles.chipRow}>
            {RESULTS.map((r) => (
              <Button
                key={r}
                label={r}
                size="sm"
                variant={
                  result === r
                    ? r === "PASS"
                      ? "primary"
                      : r === "FAIL"
                      ? "destructive"
                      : "outline"
                    : "outline"
                }
                onPress={() => setResult(r)}
              />
            ))}
          </View>
        </View>

        {result === "FAIL" && (
          <View style={[styles.failBanner, { backgroundColor: colors.destructive + "18", borderColor: colors.destructive + "44" }]}>
            <Text style={[styles.failText, { color: colors.destructive }]}>
              Failed test will surface to the Dashboard action queue.
            </Text>
          </View>
        )}

        <Input
          label="Readings (JSON)"
          value={readings}
          onChangeText={setReadings}
          placeholder='{"static_psi": 75, "flow_gpm": 500}'
          multiline
          numberOfLines={3}
          containerStyle={styles.field}
        />

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
  failBanner: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    marginBottom: 14,
  },
  failText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  actions: { flexDirection: "row", gap: 10, marginTop: 12 },
  actionBtn: { flex: 1 },
});
