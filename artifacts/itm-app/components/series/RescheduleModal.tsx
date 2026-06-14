import React, { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

type Props = {
  visible: boolean;
  onClose: () => void;
  onConfirm: (newDate: string, reason: string) => Promise<void>;
  currentDate: string;
  futureShiftCount: number;
};

export function RescheduleModal({ visible, onClose, onConfirm, currentDate, futureShiftCount }: Props) {
  const colors = useColors();
  const [newDate, setNewDate] = useState(currentDate);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const deltaMs = new Date(newDate).getTime() - new Date(currentDate).getTime();
  const deltaDays = Math.round(deltaMs / 86_400_000);

  const handleConfirm = async () => {
    if (!newDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return;
    }
    setLoading(true);
    try {
      await onConfirm(newDate, reason);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Reschedule Inspection">
      <View style={styles.body}>
        <View style={styles.currentRow}>
          <Text style={[styles.currentLabel, { color: colors.mutedForeground }]}>Current date:</Text>
          <Text style={[styles.currentDate, { color: colors.foreground }]}>{currentDate}</Text>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>New Date (YYYY-MM-DD)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
            value={newDate}
            onChangeText={setNewDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.mutedForeground}
          />
        </View>

        {deltaDays !== 0 && (
          <View style={[styles.shiftInfo, { backgroundColor: colors.warning + "18", borderColor: colors.warning + "44" }]}>
            <Text style={[styles.shiftText, { color: colors.warning }]}>
              {futureShiftCount} future visit{futureShiftCount !== 1 ? "s" : ""} will auto-shift{" "}
              {deltaDays > 0 ? `forward ${deltaDays}` : `back ${Math.abs(deltaDays)}`} day{Math.abs(deltaDays) !== 1 ? "s" : ""} to maintain series cadence.
            </Text>
          </View>
        )}

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Reason (optional)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground, minHeight: 60, textAlignVertical: "top" }]}
            value={reason}
            onChangeText={setReason}
            placeholder="e.g. Site unavailable on original date"
            placeholderTextColor={colors.mutedForeground}
            multiline
          />
        </View>
      </View>

      <View style={styles.actions}>
        <Button label="Cancel" variant="outline" onPress={onClose} style={styles.actionBtn} />
        <Button
          label={loading ? "Saving…" : "Confirm Reschedule"}
          onPress={handleConfirm}
          disabled={loading || newDate === currentDate}
          style={styles.actionBtn}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  body: { gap: 14, marginBottom: 16 },
  currentRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  currentLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  currentDate: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  field: {},
  label: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14, fontFamily: "Inter_400Regular" },
  shiftInfo: { padding: 10, borderRadius: 8, borderWidth: 1 },
  shiftText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  actions: { flexDirection: "row", gap: 10 },
  actionBtn: { flex: 1 },
});
