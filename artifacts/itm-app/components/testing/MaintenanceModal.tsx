import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

type MaintenanceType = "PREVENTIVE" | "CORRECTIVE" | "EMERGENCY";
const MAINTENANCE_TYPES: MaintenanceType[] = ["PREVENTIVE", "CORRECTIVE", "EMERGENCY"];

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    hubspot_asset_id: string;
    maintenance_type: MaintenanceType;
    description?: string | null;
    scheduled_at?: string | null;
    next_maintenance_at?: string | null;
    hubspot_work_order_ticket_id?: string | null;
    cost?: number | null;
    notes?: string | null;
  }) => Promise<void>;
};

export function MaintenanceModal({ visible, onClose, onSubmit }: Props) {
  const colors = useColors();
  const [loading, setLoading] = useState(false);

  const [assetId, setAssetId] = useState("hs_asset_001");
  const [maintenanceType, setMaintenanceType] = useState<MaintenanceType>("PREVENTIVE");
  const [description, setDescription] = useState("");
  const [scheduledAt, setScheduledAt] = useState(new Date().toISOString().slice(0, 10));
  const [nextMaintenanceAt, setNextMaintenanceAt] = useState("");
  const [workOrderId, setWorkOrderId] = useState("");
  const [cost, setCost] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = async () => {
    if (!assetId.trim()) {
      Alert.alert("Validation", "Asset ID is required.");
      return;
    }
    if (scheduledAt && !scheduledAt.match(/^\d{4}-\d{2}-\d{2}$/)) {
      Alert.alert("Validation", "Scheduled date must be in YYYY-MM-DD format.");
      return;
    }
    if (nextMaintenanceAt && !nextMaintenanceAt.match(/^\d{4}-\d{2}-\d{2}$/)) {
      Alert.alert("Validation", "Next maintenance date must be in YYYY-MM-DD format.");
      return;
    }
    setLoading(true);
    try {
      await onSubmit({
        hubspot_asset_id: assetId.trim(),
        maintenance_type: maintenanceType,
        description: description.trim() || null,
        scheduled_at: scheduledAt || null,
        next_maintenance_at: nextMaintenanceAt || null,
        hubspot_work_order_ticket_id: workOrderId.trim() || null,
        cost: cost ? parseFloat(cost) : null,
        notes: notes.trim() || null,
      });
      setAssetId("hs_asset_001");
      setMaintenanceType("PREVENTIVE");
      setDescription("");
      setScheduledAt(new Date().toISOString().slice(0, 10));
      setNextMaintenanceAt("");
      setWorkOrderId("");
      setCost("");
      setNotes("");
      onClose();
    } catch {
      Alert.alert("Error", "Failed to save maintenance record. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} title="New Maintenance Record" size="lg">
      <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 480 }}>
        <Input
          label="Asset ID *"
          value={assetId}
          onChangeText={setAssetId}
          placeholder="e.g. hs_asset_001"
          containerStyle={styles.field}
        />

        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Maintenance Type</Text>
          <View style={styles.chipRow}>
            {MAINTENANCE_TYPES.map((t) => (
              <Button
                key={t}
                label={t}
                size="sm"
                variant={
                  maintenanceType === t
                    ? t === "EMERGENCY"
                      ? "destructive"
                      : "primary"
                    : "outline"
                }
                onPress={() => setMaintenanceType(t)}
              />
            ))}
          </View>
        </View>

        <Input
          label="Description"
          value={description}
          onChangeText={setDescription}
          multiline
          placeholder="Describe the work to be performed…"
          containerStyle={styles.field}
        />

        <Input
          label="Scheduled Date (YYYY-MM-DD)"
          value={scheduledAt}
          onChangeText={setScheduledAt}
          placeholder="2026-06-14"
          containerStyle={styles.field}
        />

        <Input
          label="Next Maintenance Date (YYYY-MM-DD, optional)"
          value={nextMaintenanceAt}
          onChangeText={setNextMaintenanceAt}
          placeholder="Leave blank if unknown"
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
          label="Estimated Cost ($, optional)"
          value={cost}
          onChangeText={setCost}
          keyboardType="decimal-pad"
          placeholder="0.00"
          containerStyle={styles.field}
        />

        <Input
          label="Notes"
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder="Optional notes…"
          containerStyle={styles.field}
        />
      </ScrollView>

      <View style={styles.actions}>
        <Button label="Cancel" variant="outline" onPress={onClose} style={styles.actionBtn} />
        <Button
          label={loading ? "Saving…" : "Create Record"}
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
  chipRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  actions: { flexDirection: "row", gap: 10, marginTop: 12 },
  actionBtn: { flex: 1 },
});
