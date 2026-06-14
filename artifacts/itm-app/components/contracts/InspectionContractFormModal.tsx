import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import type { InspectionContract } from "@/db/schema";

const SYSTEM_TYPES = [
  "FIRE_SPRINKLER",
  "FIRE_ALARM",
  "SUPPRESSION",
  "KITCHEN_HOOD",
  "SPECIAL_HAZARD",
  "EMERGENCY_LIGHTING",
];

const FREQUENCIES = [
  { label: "Monthly (30 days)", value: 30 },
  { label: "Quarterly (90 days)", value: 90 },
  { label: "Semi-Annual (180 days)", value: 180 },
  { label: "Annual (365 days)", value: 365 },
];

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<InspectionContract, "id" | "org_id" | "created_at" | "updated_at" | "sync_status">) => Promise<void>;
  initialValues?: Partial<InspectionContract>;
  mode?: "create" | "edit";
  assetOptions?: { id: string; name: string }[];
};

function LabeledInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric" | "decimal-pad";
  multiline?: boolean;
}) {
  const colors = useColors();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border },
          multiline && { minHeight: 60, textAlignVertical: "top" },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        keyboardType={keyboardType ?? "default"}
        multiline={multiline}
      />
    </View>
  );
}

export function InspectionContractFormModal({
  visible,
  onClose,
  onSubmit,
  initialValues,
  mode = "create",
  assetOptions = [],
}: Props) {
  const colors = useColors();
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState(initialValues?.name ?? "");
  const [assetId, setAssetId] = useState(initialValues?.hubspot_asset_id ?? assetOptions[0]?.id ?? "");
  const [systemType, setSystemType] = useState(initialValues?.system_type ?? "FIRE_SPRINKLER");
  const [frequencyDays, setFrequencyDays] = useState(String(initialValues?.frequency_days ?? 90));
  const [horizonDays, setHorizonDays] = useState(String(initialValues?.generation_horizon_days ?? 180));
  const [startsAt, setStartsAt] = useState(initialValues?.starts_at ?? new Date().toISOString().slice(0, 10));
  const [endsAt, setEndsAt] = useState(initialValues?.ends_at ?? "");
  const [isBooked, setIsBooked] = useState(initialValues?.is_booked ?? false);
  const [contractedAmount, setContractedAmount] = useState(
    initialValues?.contracted_amount != null ? String(initialValues.contracted_amount) : "",
  );
  const [notes, setNotes] = useState(initialValues?.notes ?? "");

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert("Validation", "Contract name is required.");
      return;
    }
    const freq = parseInt(frequencyDays, 10);
    if (isNaN(freq) || freq < 1) {
      Alert.alert("Validation", "Frequency must be a positive number of days.");
      return;
    }
    if (!startsAt.match(/^\d{4}-\d{2}-\d{2}$/)) {
      Alert.alert("Validation", "Start date must be in YYYY-MM-DD format.");
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        name: name.trim(),
        hubspot_asset_id: assetId || "hs_asset_001",
        system_type: systemType,
        frequency_days: freq,
        generation_horizon_days: parseInt(horizonDays, 10) || 180,
        starts_at: startsAt,
        ends_at: endsAt.trim() || null,
        hubspot_service_team_id: null,
        is_booked: isBooked,
        contracted_amount: contractedAmount ? parseFloat(contractedAmount) : null,
        notes: notes.trim() || null,
      });
      onClose();
    } catch {
      Alert.alert("Error", "Failed to save contract. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} title={mode === "create" ? "New ITM Contract" : "Edit Contract"}>
      <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 480 }}>
        <LabeledInput label="Contract Name *" value={name} onChangeText={setName} placeholder="e.g. Quarterly NFPA 25 — Building A" />

        {assetOptions.length > 0 && (
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Asset</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {assetOptions.map((a) => (
                <Button
                  key={a.id}
                  label={a.name}
                  size="sm"
                  variant={assetId === a.id ? "primary" : "outline"}
                  onPress={() => setAssetId(a.id)}
                />
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>System Type</Text>
          <View style={styles.chipRow}>
            {SYSTEM_TYPES.map((t) => (
              <Button
                key={t}
                label={t.replace(/_/g, " ")}
                size="sm"
                variant={systemType === t ? "primary" : "outline"}
                onPress={() => setSystemType(t)}
                style={{ marginBottom: 4 }}
              />
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Frequency</Text>
          <View style={styles.chipRow}>
            {FREQUENCIES.map((f) => (
              <Button
                key={f.value}
                label={f.label}
                size="sm"
                variant={frequencyDays === String(f.value) ? "primary" : "outline"}
                onPress={() => setFrequencyDays(String(f.value))}
                style={{ marginBottom: 4 }}
              />
            ))}
          </View>
        </View>

        <LabeledInput label="Generation Horizon (days)" value={horizonDays} onChangeText={setHorizonDays} keyboardType="numeric" placeholder="180" />
        <LabeledInput label="Starts At (YYYY-MM-DD) *" value={startsAt} onChangeText={setStartsAt} placeholder="2026-01-01" />
        <LabeledInput label="Ends At (YYYY-MM-DD, optional)" value={endsAt} onChangeText={setEndsAt} placeholder="Leave blank for ongoing" />

        <View style={styles.field}>
          <View style={styles.switchRow}>
            <Text style={[styles.fieldLabel, { color: colors.foreground, marginBottom: 0 }]}>Booked (contracted)</Text>
            <Switch
              value={isBooked}
              onValueChange={setIsBooked}
              trackColor={{ true: colors.success, false: colors.muted }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {isBooked && (
          <LabeledInput
            label="Contracted Amount ($)"
            value={contractedAmount}
            onChangeText={setContractedAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
          />
        )}

        <LabeledInput label="Notes" value={notes} onChangeText={setNotes} multiline placeholder="Optional notes…" />
      </ScrollView>

      <View style={styles.actions}>
        <Button label="Cancel" variant="outline" onPress={onClose} style={styles.actionBtn} />
        <Button
          label={loading ? "Saving…" : mode === "create" ? "Create Contract" : "Save Changes"}
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
  fieldLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14, fontFamily: "Inter_400Regular" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  actions: { flexDirection: "row", gap: 10, marginTop: 16 },
  actionBtn: { flex: 1 },
});
