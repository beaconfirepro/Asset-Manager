import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import { Button } from "@/components/ui/Button";
import { FormSchemaFieldEditor } from "./FormSchemaFieldEditor";
import type { FormField, FormSchema } from "@/lib/inspections/formSchema";
import { genId } from "@/lib/sync";

const SYSTEM_TYPES = [
  "FIRE_SPRINKLER", "FIRE_ALARM", "SUPPRESSION",
  "KITCHEN_HOOD", "SPECIAL_HAZARD", "EMERGENCY_LIGHTING",
];

type Props = {
  initialForm?: {
    id?: string;
    name: string;
    system_type: string;
    version: string;
    is_active: boolean;
    form_schema: string;
  };
  onSave: (data: {
    name: string;
    system_type: string;
    version: string;
    is_active: boolean;
    form_schema: string;
  }) => Promise<void>;
  saving?: boolean;
};

function parseSchema(raw: string): FormSchema {
  try { return JSON.parse(raw) as FormSchema; } catch { return { fields: [] }; }
}

export function InspectionFormBuilder({ initialForm, onSave, saving }: Props) {
  const colors = useColors();

  const [name, setName] = useState(initialForm?.name ?? "");
  const [systemType, setSystemType] = useState(initialForm?.system_type ?? "FIRE_SPRINKLER");
  const [version, setVersion] = useState(initialForm?.version ?? "1.0");
  const [isActive, setIsActive] = useState(initialForm?.is_active ?? false);

  const initial = parseSchema(initialForm?.form_schema ?? '{"fields":[]}');
  const [schemaTitle, setSchemaTitle] = useState(initial.title ?? "");
  const [sections, setSections] = useState<string[]>(initial.sections ?? []);
  const [fields, setFields] = useState<FormField[]>(initial.fields);
  const [newSection, setNewSection] = useState("");

  const addField = (type: FormField["type"] = "pass_fail") => {
    setFields((prev) => [
      ...prev,
      {
        id: genId(),
        type,
        label: "",
        required: true,
        section: sections[0],
      },
    ]);
  };

  const updateField = (idx: number, updated: FormField) => {
    setFields((prev) => prev.map((f, i) => (i === idx ? updated : f)));
  };

  const deleteField = (idx: number) => {
    setFields((prev) => prev.filter((_, i) => i !== idx));
  };

  const moveField = (idx: number, dir: -1 | 1) => {
    setFields((prev) => {
      const updated = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= updated.length) return updated;
      [updated[idx], updated[target]] = [updated[target], updated[idx]];
      return updated;
    });
  };

  const addSection = () => {
    if (!newSection.trim()) return;
    setSections((prev) => [...prev, newSection.trim()]);
    setNewSection("");
  };

  const handleSave = async () => {
    const schema: FormSchema = {
      title: schemaTitle || name,
      sections: sections.length > 0 ? sections : undefined,
      fields,
    };
    await onSave({
      name,
      system_type: systemType,
      version,
      is_active: isActive,
      form_schema: JSON.stringify(schema),
    });
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Form Metadata</Text>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Form Name</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
            value={name}
            onChangeText={setName}
            placeholder="e.g. NFPA 25 Quarterly Inspection"
            placeholderTextColor={colors.mutedForeground}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>System Type</Text>
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
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Version</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
            value={version}
            onChangeText={setVersion}
            placeholder="1.0"
            placeholderTextColor={colors.mutedForeground}
          />
        </View>

        <View style={styles.toggleRow}>
          <Text style={[styles.label, { color: colors.foreground, marginBottom: 0 }]}>Active (serves this form type)</Text>
          <Switch value={isActive} onValueChange={setIsActive} trackColor={{ true: colors.success, false: colors.muted }} />
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Sections (optional)</Text>
        <View style={styles.chipRow}>
          {sections.map((sec) => (
            <View key={sec} style={[styles.sectionChip, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Text style={[styles.chipText, { color: colors.foreground }]}>{sec}</Text>
              <Button
                label="×"
                size="sm"
                variant="ghost"
                onPress={() => setSections((prev) => prev.filter((s) => s !== sec))}
              />
            </View>
          ))}
        </View>
        <View style={styles.addRow}>
          <TextInput
            style={[styles.input, { flex: 1, backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
            value={newSection}
            onChangeText={setNewSection}
            placeholder="New section name"
            placeholderTextColor={colors.mutedForeground}
            onSubmitEditing={addSection}
            returnKeyType="done"
          />
          <Button label="Add" size="sm" variant="outline" onPress={addSection} />
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.fieldsHeader}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
            Fields ({fields.length})
          </Text>
          <Button label="+ Add Field" size="sm" onPress={() => addField("pass_fail")} />
        </View>

        {fields.length === 0 && (
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            No fields yet. Add your first field above.
          </Text>
        )}

        {fields.map((field, idx) => (
          <FormSchemaFieldEditor
            key={field.id}
            field={field}
            sections={sections}
            onUpdate={(updated) => updateField(idx, updated)}
            onDelete={() => deleteField(idx)}
            onMoveUp={idx > 0 ? () => moveField(idx, -1) : undefined}
            onMoveDown={idx < fields.length - 1 ? () => moveField(idx, 1) : undefined}
          />
        ))}
      </View>

      <Button
        label={saving ? "Saving…" : "Save Form"}
        onPress={handleSave}
        disabled={saving || !name.trim() || fields.length === 0}
        style={styles.saveBtn}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 14, paddingBottom: 48 },
  section: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 12 },
  sectionTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.6 },
  field: { gap: 4 },
  label: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.4 },
  input: { borderWidth: 1, borderRadius: 8, padding: 8, fontSize: 13, fontFamily: "Inter_400Regular" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  toggleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionChip: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16, borderWidth: 1, gap: 4 },
  chipText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  addRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  fieldsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", paddingVertical: 16 },
  saveBtn: { marginTop: 4 },
});
