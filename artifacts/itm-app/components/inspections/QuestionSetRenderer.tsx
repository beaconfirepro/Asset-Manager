import React, { useCallback } from "react";
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  Pressable,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import { DeficiencyCaptureCard } from "./DeficiencyCaptureCard";
import { PhotoAnnotator } from "./PhotoAnnotator";
import { SignaturePad } from "./SignaturePad";
import {
  isDeficient,
  type FormData,
  type FormField,
  type FormSchema,
} from "@/lib/inspections/formSchema";

type Props = {
  schema: FormSchema;
  formData: FormData;
  photoUrls: string[];
  signatureUrl: string | null;
  onAnswer: (field: FormField, answer: string | boolean | string[] | null) => void;
  onDeficiencyReport: (field: FormField, description: string, severity: string) => Promise<void>;
  onAddPhoto: (uri: string) => void;
  onRemovePhoto: (uri: string) => void;
  onSaveSignature: (dataUri: string) => void;
  reportedDeficiencies: Set<string>;
  disabled?: boolean;
};

function SectionHeader({ title, colors }: { title: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
      <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{title}</Text>
    </View>
  );
}

function PassFailField({
  field,
  value,
  onChange,
  colors,
  disabled,
}: {
  field: FormField;
  value: string | null;
  onChange: (v: string) => void;
  colors: ReturnType<typeof useColors>;
  disabled?: boolean;
}) {
  return (
    <View style={styles.passFailRow}>
      {["PASS", "FAIL"].map((opt) => {
        const active = value === opt;
        const isFailOpt = opt === "FAIL";
        return (
          <Pressable
            key={opt}
            onPress={() => !disabled && onChange(opt)}
            disabled={disabled}
            style={[
              styles.passFailBtn,
              {
                backgroundColor: active
                  ? isFailOpt
                    ? colors.destructive
                    : colors.success
                  : colors.muted,
                borderColor: active
                  ? isFailOpt
                    ? colors.destructive
                    : colors.success
                  : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.passFailText,
                { color: active ? "#fff" : colors.mutedForeground },
              ]}
            >
              {opt}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function QuestionSetRenderer({
  schema,
  formData,
  photoUrls,
  signatureUrl,
  onAnswer,
  onDeficiencyReport,
  onAddPhoto,
  onRemovePhoto,
  onSaveSignature,
  reportedDeficiencies,
  disabled = false,
}: Props) {
  const colors = useColors();

  const renderField = useCallback(
    (field: FormField) => {
      const raw = formData[field.id];
      const answered = raw != null && raw !== "" && raw !== false;
      const deficient = answered && isDeficient(field, raw);

      return (
        <View key={field.id} style={[styles.fieldCard, { backgroundColor: colors.card, borderColor: deficient ? colors.destructive + "66" : colors.border }]}>
          <View style={styles.fieldHeader}>
            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
              {field.label}
              {field.required && <Text style={{ color: colors.destructive }}> *</Text>}
            </Text>
            {answered && !deficient && (
              <View style={[styles.answeredDot, { backgroundColor: colors.success }]} />
            )}
            {deficient && (
              <View style={[styles.answeredDot, { backgroundColor: colors.destructive }]} />
            )}
          </View>

          {field.description && (
            <Text style={[styles.fieldDescription, { color: colors.mutedForeground }]}>
              {field.description}
            </Text>
          )}

          {(field.type === "pass_fail") && (
            <PassFailField
              field={field}
              value={typeof raw === "string" ? raw : null}
              onChange={(v) => onAnswer(field, v)}
              colors={colors}
              disabled={disabled}
            />
          )}

          {field.type === "yes_no" && (
            <View style={styles.passFailRow}>
              {["YES", "NO"].map((opt) => {
                const active = typeof raw === "string" && raw === opt;
                return (
                  <Pressable
                    key={opt}
                    onPress={() => !disabled && onAnswer(field, opt)}
                    disabled={disabled}
                    style={[
                      styles.passFailBtn,
                      {
                        backgroundColor: active ? colors.primary : colors.muted,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.passFailText, { color: active ? "#fff" : colors.mutedForeground }]}>
                      {opt}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {field.type === "text" && (
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
              value={typeof raw === "string" ? raw : ""}
              onChangeText={(v) => onAnswer(field, v)}
              placeholder={`Enter ${field.label.toLowerCase()}…`}
              placeholderTextColor={colors.mutedForeground}
              editable={!disabled}
              multiline
            />
          )}

          {field.type === "number" && (
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
              value={typeof raw === "string" ? raw : ""}
              onChangeText={(v) => onAnswer(field, v)}
              placeholder="0"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="decimal-pad"
              editable={!disabled}
            />
          )}

          {field.type === "select" && field.options && (
            <View style={styles.selectRow}>
              {field.options.map((opt) => {
                const active = typeof raw === "string" && raw === opt;
                return (
                  <Pressable
                    key={opt}
                    onPress={() => !disabled && onAnswer(field, opt)}
                    disabled={disabled}
                    style={[
                      styles.selectOption,
                      {
                        backgroundColor: active ? colors.primary : colors.muted,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.selectText, { color: active ? "#fff" : colors.mutedForeground }]}>
                      {opt}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {field.type === "checkbox" && (
            <View style={styles.checkboxRow}>
              <Switch
                value={raw === true}
                onValueChange={(v) => onAnswer(field, v)}
                disabled={disabled}
                trackColor={{ true: colors.success, false: colors.muted }}
              />
              <Text style={[styles.checkboxLabel, { color: colors.foreground }]}>
                {raw === true ? "Checked" : "Unchecked"}
              </Text>
            </View>
          )}

          {field.type === "photo" && (
            <PhotoAnnotator
              photoUrls={photoUrls}
              onAddPhoto={onAddPhoto}
              onRemovePhoto={onRemovePhoto}
              disabled={disabled}
            />
          )}

          {field.type === "signature" && (
            <SignaturePad
              signatureUrl={signatureUrl}
              onSave={onSaveSignature}
              disabled={disabled}
            />
          )}

          {deficient && (
            <DeficiencyCaptureCard
              field={field}
              answer={raw}
              resultId=""
              onEnqueue={(desc, sev) => onDeficiencyReport(field, desc, sev)}
              alreadyReported={reportedDeficiencies.has(field.id)}
            />
          )}
        </View>
      );
    },
    [formData, photoUrls, signatureUrl, reportedDeficiencies, disabled, colors, onAnswer, onDeficiencyReport, onAddPhoto, onRemovePhoto, onSaveSignature],
  );

  const sections = schema.sections ?? [];
  const ungrouped = schema.fields.filter((f) => !f.section);
  const grouped = sections.map((sec) => ({
    title: sec,
    fields: schema.fields.filter((f) => f.section === sec),
  }));

  return (
    <View style={styles.container}>
      {sections.length > 0 ? (
        <>
          {grouped.map((group) => (
            <View key={group.title}>
              <SectionHeader title={group.title} colors={colors} />
              {group.fields.map(renderField)}
            </View>
          ))}
          {ungrouped.length > 0 && ungrouped.map(renderField)}
        </>
      ) : (
        schema.fields.map(renderField)
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  sectionHeader: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  fieldCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  fieldHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  fieldLabel: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium", lineHeight: 18 },
  fieldDescription: { fontSize: 12, fontFamily: "Inter_400Regular", fontStyle: "italic" },
  answeredDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  passFailRow: { flexDirection: "row", gap: 8 },
  passFailBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  passFailText: { fontSize: 14, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    minHeight: 44,
    textAlignVertical: "top",
  },
  selectRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  selectOption: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  selectText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  checkboxRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  checkboxLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
});
