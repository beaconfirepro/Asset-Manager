import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useComplianceStandards } from "@/hooks/useComplianceStandards";
import { useCreateInspectionForm } from "@/hooks/useInspectionForms";
import { useCreateAiSuggestion } from "@/hooks/useAiSuggestions";
import { getITMApiClient, type GeneratedFormDraft, type GeneratedFormField } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const SYSTEM_TYPES = [
  "FIRE_SPRINKLER",
  "FIRE_ALARM",
  "KITCHEN_HOOD",
  "SUPPRESSION",
  "SPECIAL_HAZARD",
  "EMERGENCY_LIGHTING",
];

type Stage = "INPUT" | "GENERATING" | "REVIEW" | "SAVING";

type Props = {
  visible: boolean;
  onClose: () => void;
  onFormCreated: (formId: string) => void;
};

export function AiGenerateFormModal({ visible, onClose, onFormCreated }: Props) {
  const colors = useColors();
  const { orgId } = useAuth();

  const [stage, setStage] = useState<Stage>("INPUT");
  const [selectedSystemType, setSelectedSystemType] = useState(SYSTEM_TYPES[0]);
  const [selectedStandardId, setSelectedStandardId] = useState<string | null>(null);
  const [draft, setDraft] = useState<GeneratedFormDraft | null>(null);

  const { data: standards = [] } = useComplianceStandards();
  const createForm = useCreateInspectionForm();
  const logSuggestion = useCreateAiSuggestion();

  const selectedStandard = standards.find((s) => s.id === selectedStandardId);

  const handleGenerate = async () => {
    if (!orgId) return;
    setStage("GENERATING");
    try {
      const api = getITMApiClient();
      const result = await api.generateForm(
        orgId,
        selectedSystemType,
        selectedStandard?.code ?? selectedSystemType,
      );
      setDraft(result);
      setStage("REVIEW");
    } catch {
      Alert.alert("Error", "Failed to generate form. Please try again.");
      setStage("INPUT");
    }
  };

  const handleAccept = async () => {
    if (!draft || !orgId) return;
    setStage("SAVING");
    try {
      const formSchema = JSON.stringify({
        title: draft.form_name,
        fields: draft.fields.map((f) => ({
          id: f.id,
          label: f.label,
          type: f.type,
          required: f.required,
          deficiency_trigger: f.deficiency_trigger ?? false,
          options: f.options ?? [],
        })),
      });

      const formId = await createForm.mutateAsync({
        name: draft.form_name,
        system_type: draft.system_type,
        version: "1.0",
        form_schema: formSchema,
        is_active: false,
        ai_generated: true,
        deficiency_triggers: JSON.stringify(
          draft.fields.filter((f) => f.deficiency_trigger).map((f) => f.id),
        ),
        compliance_standard_id: selectedStandardId ?? null,
      });

      if (formId) {
        await logSuggestion.mutateAsync({
          suggestion_type: "FORM_GENERATION",
          payload: {
            form_id: formId,
            generated_sections: 1,
            token_count: draft.fields.length * 40,
            system_type: draft.system_type,
            standard_code: draft.compliance_standard_code,
          },
          context_type: "inspection_form",
          context_id: formId,
          model_version: "stub-v1",
        });
        onFormCreated(formId);
      }

      handleReset();
      onClose();
    } catch {
      Alert.alert("Error", "Failed to save generated form.");
      setStage("REVIEW");
    }
  };

  const handleReject = async () => {
    if (!draft || !orgId) return;
    await logSuggestion.mutateAsync({
      suggestion_type: "FORM_GENERATION",
      payload: {
        rejected: true,
        system_type: draft.system_type,
        standard_code: draft.compliance_standard_code,
      },
      context_type: "inspection_form",
      context_id: null,
      model_version: "stub-v1",
    }).catch(() => {});
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setStage("INPUT");
    setDraft(null);
    setSelectedSystemType(SYSTEM_TYPES[0]);
    setSelectedStandardId(null);
  };

  return (
    <Modal
      visible={visible}
      onClose={() => { handleReset(); onClose(); }}
      title="AI Generate Inspection Form"
      size="lg"
    >
      {stage === "INPUT" && (
        <View style={styles.inputStage}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>System Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {SYSTEM_TYPES.map((t) => (
              <Button
                key={t}
                label={t.replace(/_/g, " ")}
                size="sm"
                variant={selectedSystemType === t ? "primary" : "outline"}
                onPress={() => setSelectedSystemType(t)}
                style={{ marginBottom: 4 }}
              />
            ))}
          </ScrollView>

          {standards.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                Compliance Standard (optional)
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                <Button
                  key="none"
                  label="None"
                  size="sm"
                  variant={selectedStandardId === null ? "primary" : "outline"}
                  onPress={() => setSelectedStandardId(null)}
                  style={{ marginBottom: 4 }}
                />
                {standards.map((s) => (
                  <Button
                    key={s.id}
                    label={s.code}
                    size="sm"
                    variant={selectedStandardId === s.id ? "primary" : "outline"}
                    onPress={() => setSelectedStandardId(s.id)}
                    style={{ marginBottom: 4 }}
                  />
                ))}
              </ScrollView>
            </>
          )}

          <View style={[styles.aiNotice, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "33" }]}>
            <Feather name="cpu" size={14} color={colors.primary} />
            <Text style={[styles.aiNoticeText, { color: colors.primary }]}>
              AI will generate a checklist based on NFPA requirements for the selected system type and standard. You review before saving.
            </Text>
          </View>

          <View style={styles.actions}>
            <Button label="Cancel" variant="outline" onPress={() => { handleReset(); onClose(); }} style={styles.actionBtn} />
            <Button label="Generate" onPress={handleGenerate} style={styles.actionBtn} />
          </View>
        </View>
      )}

      {stage === "GENERATING" && (
        <View style={styles.generatingStage}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.generatingText, { color: colors.foreground }]}>
            Generating checklist…
          </Text>
          <Text style={[styles.generatingSubtext, { color: colors.mutedForeground }]}>
            Analyzing NFPA requirements for {selectedSystemType.replace(/_/g, " ")}
            {selectedStandard ? ` per ${selectedStandard.code}` : ""}
          </Text>
        </View>
      )}

      {(stage === "REVIEW" || stage === "SAVING") && draft && (
        <View style={styles.reviewStage}>
          <View style={styles.reviewHeader}>
            <Feather name="file-plus" size={16} color={colors.success} />
            <Text style={[styles.reviewTitle, { color: colors.foreground }]} numberOfLines={2}>
              {draft.form_name}
            </Text>
          </View>

          <View style={styles.reviewMeta}>
            <Badge label={draft.system_type.replace(/_/g, " ")} variant="info" size="sm" />
            {selectedStandard && <Badge label={selectedStandard.code} variant="default" size="sm" />}
            <Badge label={`${draft.fields.length} fields`} variant="muted" size="sm" />
          </View>

          <Text style={[styles.reviewNote, { color: colors.mutedForeground }]}>
            Review generated fields. The form will be saved as a draft (inactive) — activate it in the form editor when ready.
          </Text>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 240 }}>
            <View style={styles.fieldList}>
              {draft.fields.map((field, i) => (
                <FieldPreviewRow key={field.id} field={field} index={i} />
              ))}
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <Button
              label="Reject"
              variant="outline"
              onPress={handleReject}
              disabled={stage === "SAVING"}
              style={styles.actionBtn}
            />
            <Button
              label={stage === "SAVING" ? "Saving…" : "Accept & Save Draft"}
              onPress={handleAccept}
              disabled={stage === "SAVING"}
              style={styles.actionBtn}
            />
          </View>
        </View>
      )}
    </Modal>
  );
}

function FieldPreviewRow({ field, index }: { field: GeneratedFormField; index: number }) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.fieldRow,
        { backgroundColor: colors.muted, borderColor: colors.border },
      ]}
    >
      <View style={styles.fieldLeft}>
        <Text style={[styles.fieldIndex, { color: colors.mutedForeground }]}>
          {index + 1}
        </Text>
        <View style={styles.fieldInfo}>
          <Text style={[styles.fieldLabel, { color: colors.foreground }]} numberOfLines={2}>
            {field.label}
          </Text>
          <View style={styles.fieldMeta}>
            <Badge
              label={field.type}
              variant="muted"
              size="sm"
            />
            {field.required && <Badge label="Required" variant="warning" size="sm" />}
            {field.deficiency_trigger && (
              <Badge label="Deficiency" variant="destructive" size="sm" />
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  inputStage: { gap: 14 },
  sectionLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingBottom: 4 },
  aiNotice: { flexDirection: "row", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1, alignItems: "flex-start" },
  aiNoticeText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 17 },
  actions: { flexDirection: "row", gap: 10, marginTop: 4 },
  actionBtn: { flex: 1 },
  generatingStage: { alignItems: "center", gap: 14, paddingVertical: 32 },
  generatingText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  generatingSubtext: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  reviewStage: { gap: 12 },
  reviewHeader: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  reviewTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1, lineHeight: 20 },
  reviewMeta: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  reviewNote: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  fieldList: { gap: 6 },
  fieldRow: { borderRadius: 8, borderWidth: 1, padding: 10 },
  fieldLeft: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  fieldIndex: { fontSize: 12, fontFamily: "Inter_500Medium", width: 20, marginTop: 1 },
  fieldInfo: { flex: 1, gap: 4 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  fieldMeta: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
});
