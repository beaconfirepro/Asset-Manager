import React, { useState } from "react";
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { Button } from "@/components/ui/Button";
import type { FormField, FieldType } from "@/lib/inspections/formSchema";
import { genId } from "@/lib/sync";

const FIELD_TYPES: { type: FieldType; label: string }[] = [
  { type: "pass_fail", label: "Pass / Fail" },
  { type: "yes_no", label: "Yes / No" },
  { type: "text", label: "Text" },
  { type: "number", label: "Number" },
  { type: "select", label: "Select" },
  { type: "checkbox", label: "Checkbox" },
  { type: "photo", label: "Photo" },
  { type: "signature", label: "Signature" },
];

const SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

type Props = {
  field: FormField;
  sections: string[];
  onUpdate: (updated: FormField) => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
};

export function FormSchemaFieldEditor({ field, sections, onUpdate, onDelete, onMoveUp, onMoveDown }: Props) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);
  const [optionInput, setOptionInput] = useState("");

  const update = (patch: Partial<FormField>) => onUpdate({ ...field, ...patch });

  const addOption = () => {
    if (!optionInput.trim()) return;
    update({ options: [...(field.options ?? []), optionInput.trim()] });
    setOptionInput("");
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Pressable onPress={() => setExpanded((e) => !e)} style={styles.cardHeader}>
        <View style={styles.dragHandle}>
          <Feather name="menu" size={14} color={colors.mutedForeground} />
        </View>
        <View style={styles.headerInfo}>
          <Text style={[styles.fieldLabel, { color: colors.foreground }]} numberOfLines={1}>
            {field.label || "Untitled field"}
          </Text>
          <Text style={[styles.fieldType, { color: colors.mutedForeground }]}>
            {FIELD_TYPES.find((t) => t.type === field.type)?.label ?? field.type}
            {field.required ? " · Required" : ""}
            {field.deficiency_trigger ? ` · Deficiency on ${field.deficiency_trigger}` : ""}
          </Text>
        </View>
        <View style={styles.headerActions}>
          {onMoveUp && <Pressable onPress={onMoveUp} hitSlop={8}><Feather name="arrow-up" size={14} color={colors.mutedForeground} /></Pressable>}
          {onMoveDown && <Pressable onPress={onMoveDown} hitSlop={8}><Feather name="arrow-down" size={14} color={colors.mutedForeground} /></Pressable>}
          <Pressable onPress={onDelete} hitSlop={8}><Feather name="trash-2" size={14} color={colors.destructive} /></Pressable>
          <Feather name={expanded ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
        </View>
      </Pressable>

      {expanded && (
        <View style={styles.body}>
          <View style={styles.fieldRow}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Label</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
              value={field.label}
              onChangeText={(v) => update({ label: v })}
              placeholder="Question label"
              placeholderTextColor={colors.mutedForeground}
            />
          </View>

          <View style={styles.fieldRow}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Description (optional)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
              value={field.description ?? ""}
              onChangeText={(v) => update({ description: v || undefined })}
              placeholder="Help text for inspector"
              placeholderTextColor={colors.mutedForeground}
            />
          </View>

          <View style={styles.fieldRow}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Field Type</Text>
            <View style={styles.chipRow}>
              {FIELD_TYPES.map((t) => (
                <Pressable
                  key={t.type}
                  onPress={() => update({ type: t.type })}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: field.type === t.type ? colors.primary : colors.muted,
                      borderColor: field.type === t.type ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.chipText, { color: field.type === t.type ? "#fff" : colors.mutedForeground }]}>
                    {t.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {field.type === "select" && (
            <View style={styles.fieldRow}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Options</Text>
              <View style={styles.optionList}>
                {(field.options ?? []).map((opt, i) => (
                  <View key={i} style={[styles.optionRow, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                    <Text style={[styles.optionText, { color: colors.foreground }]}>{opt}</Text>
                    <Pressable onPress={() => update({ options: field.options?.filter((_, j) => j !== i) })}>
                      <Feather name="x" size={12} color={colors.mutedForeground} />
                    </Pressable>
                  </View>
                ))}
              </View>
              <View style={styles.addOptionRow}>
                <TextInput
                  style={[styles.input, { flex: 1, backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
                  value={optionInput}
                  onChangeText={setOptionInput}
                  placeholder="New option"
                  placeholderTextColor={colors.mutedForeground}
                  onSubmitEditing={addOption}
                  returnKeyType="done"
                />
                <Button label="Add" size="sm" variant="outline" onPress={addOption} />
              </View>
            </View>
          )}

          {sections.length > 0 && (
            <View style={styles.fieldRow}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>Section</Text>
              <View style={styles.chipRow}>
                <Pressable
                  onPress={() => update({ section: undefined })}
                  style={[styles.chip, { backgroundColor: !field.section ? colors.primary : colors.muted, borderColor: !field.section ? colors.primary : colors.border }]}
                >
                  <Text style={[styles.chipText, { color: !field.section ? "#fff" : colors.mutedForeground }]}>None</Text>
                </Pressable>
                {sections.map((sec) => (
                  <Pressable
                    key={sec}
                    onPress={() => update({ section: sec })}
                    style={[styles.chip, { backgroundColor: field.section === sec ? colors.primary : colors.muted, borderColor: field.section === sec ? colors.primary : colors.border }]}
                  >
                    <Text style={[styles.chipText, { color: field.section === sec ? "#fff" : colors.mutedForeground }]}>{sec}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          <View style={styles.toggleRow}>
            <Text style={[styles.label, { color: colors.mutedForeground, marginBottom: 0 }]}>Required</Text>
            <Switch value={field.required ?? false} onValueChange={(v) => update({ required: v })} trackColor={{ true: colors.primary, false: colors.muted }} />
          </View>

          {(field.type === "pass_fail" || field.type === "yes_no" || field.type === "select") && (
            <>
              <View style={styles.fieldRow}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Deficiency trigger (answer that creates a ticket)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
                  value={field.deficiency_trigger ?? ""}
                  onChangeText={(v) => update({ deficiency_trigger: v || undefined })}
                  placeholder={field.type === "pass_fail" ? "FAIL" : field.type === "yes_no" ? "NO" : "Option value"}
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize="characters"
                />
              </View>

              {field.deficiency_trigger && (
                <View style={styles.fieldRow}>
                  <Text style={[styles.label, { color: colors.mutedForeground }]}>Deficiency severity</Text>
                  <View style={styles.chipRow}>
                    {SEVERITIES.map((s) => (
                      <Pressable
                        key={s}
                        onPress={() => update({ deficiency_severity: s as FormField["deficiency_severity"] })}
                        style={[styles.chip, { backgroundColor: field.deficiency_severity === s ? colors.destructive : colors.muted, borderColor: field.deficiency_severity === s ? colors.destructive : colors.border }]}
                      >
                        <Text style={[styles.chipText, { color: field.deficiency_severity === s ? "#fff" : colors.mutedForeground }]}>{s}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 10, borderWidth: 1, overflow: "hidden" },
  cardHeader: { flexDirection: "row", alignItems: "center", padding: 12, gap: 10 },
  dragHandle: { padding: 4 },
  headerInfo: { flex: 1 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  fieldType: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  body: { padding: 12, paddingTop: 0, gap: 10 },
  fieldRow: { gap: 4 },
  label: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.4 },
  input: { borderWidth: 1, borderRadius: 8, padding: 8, fontSize: 13, fontFamily: "Inter_400Regular" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, borderWidth: 1 },
  chipText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  toggleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  optionList: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 4 },
  optionRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, borderWidth: 1 },
  optionText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  addOptionRow: { flexDirection: "row", gap: 8, alignItems: "center" },
});
