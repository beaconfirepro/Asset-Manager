import React, { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { TestEquipment } from "@/db/schema";

type CalibrationResult = "PASS" | "FAIL" | "INCONCLUSIVE";
const RESULTS: CalibrationResult[] = ["PASS", "FAIL", "INCONCLUSIVE"];

type Props = {
  visible: boolean;
  onClose: () => void;
  equipment?: TestEquipment | null;
  onSubmit: (data: {
    equipment_id: string;
    technician?: string | null;
    result: CalibrationResult;
    certificate_number?: string | null;
    notes?: string | null;
    calibrated_at: string;
    expires_at: string;
  }) => Promise<void>;
};

export function CalibrationModal({ visible, onClose, equipment, onSubmit }: Props) {
  const colors = useColors();
  const [loading, setLoading] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const oneYearOut = new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10);

  const [result, setResult] = useState<CalibrationResult>("PASS");
  const [technician, setTechnician] = useState("");
  const [certNumber, setCertNumber] = useState("");
  const [calibratedAt, setCalibratedAt] = useState(today);
  const [expiresAt, setExpiresAt] = useState(oneYearOut);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (visible) {
      setResult("PASS");
      setTechnician("");
      setCertNumber("");
      setCalibratedAt(new Date().toISOString().slice(0, 10));
      setExpiresAt(new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10));
      setNotes("");
    }
  }, [visible]);

  const handleSubmit = async () => {
    if (!equipment) {
      Alert.alert("Error", "No equipment selected.");
      return;
    }
    if (!calibratedAt.match(/^\d{4}-\d{2}-\d{2}$/)) {
      Alert.alert("Validation", "Calibration date must be in YYYY-MM-DD format.");
      return;
    }
    if (!expiresAt.match(/^\d{4}-\d{2}-\d{2}$/)) {
      Alert.alert("Validation", "Expiry date must be in YYYY-MM-DD format.");
      return;
    }
    setLoading(true);
    try {
      await onSubmit({
        equipment_id: equipment.id,
        technician: technician.trim() || null,
        result,
        certificate_number: certNumber.trim() || null,
        notes: notes.trim() || null,
        calibrated_at: calibratedAt,
        expires_at: expiresAt,
      });
      onClose();
    } catch {
      Alert.alert("Error", "Failed to log calibration. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Log Calibration" size="lg">
      {equipment && (
        <View style={[styles.equipBanner, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Text style={[styles.equipName, { color: colors.foreground }]}>{equipment.name}</Text>
          <Text style={[styles.equipSub, { color: colors.mutedForeground }]}>
            {equipment.model ?? ""}{equipment.serial_number ? ` · ${equipment.serial_number}` : ""}
          </Text>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Calibration Result</Text>
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

        <Input
          label="Technician / Lab"
          value={technician}
          onChangeText={setTechnician}
          placeholder="e.g. AccuCal Labs"
          containerStyle={styles.field}
        />

        <Input
          label="Certificate Number (optional)"
          value={certNumber}
          onChangeText={setCertNumber}
          placeholder="CERT-2026-0001"
          containerStyle={styles.field}
        />

        <Input
          label="Calibrated Date * (YYYY-MM-DD)"
          value={calibratedAt}
          onChangeText={setCalibratedAt}
          placeholder="2026-06-14"
          containerStyle={styles.field}
        />

        <Input
          label="Expires Date * (YYYY-MM-DD)"
          value={expiresAt}
          onChangeText={setExpiresAt}
          placeholder="2027-06-14"
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
          label={loading ? "Saving…" : "Log Calibration"}
          onPress={handleSubmit}
          disabled={loading || !equipment}
          style={styles.actionBtn}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  equipBanner: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
  },
  equipName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  equipSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 14, fontFamily: "Inter_500Medium", marginBottom: 6 },
  chipRow: { flexDirection: "row", gap: 8 },
  actions: { flexDirection: "row", gap: 10, marginTop: 12 },
  actionBtn: { flex: 1 },
});
