import React, { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { Button } from "@/components/ui/Button";
import type { FormField } from "@/lib/inspections/formSchema";

const SEVERITIES = [
  { label: "Low", value: "LOW" },
  { label: "Medium", value: "MEDIUM" },
  { label: "High", value: "HIGH" },
  { label: "Critical", value: "CRITICAL" },
];

type Props = {
  field: FormField;
  answer: string | boolean | string[] | null;
  resultId: string;
  onEnqueue: (description: string, severity: string) => Promise<void>;
  alreadyReported: boolean;
};

export function DeficiencyCaptureCard({ field, answer, onEnqueue, alreadyReported }: Props) {
  const colors = useColors();
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<string>(field.deficiency_severity ?? "MEDIUM");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(alreadyReported);

  const handleReport = async () => {
    if (!description.trim() && !alreadyReported) return;
    setLoading(true);
    try {
      await onEnqueue(
        description.trim() || `Deficiency on: ${field.label} (${answer})`,
        severity,
      );
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.destructive + "11", borderColor: colors.destructive + "44" }]}>
      <View style={styles.header}>
        <Feather name="alert-triangle" size={14} color={colors.destructive} />
        <Text style={[styles.headerText, { color: colors.destructive }]}>Deficiency Detected</Text>
        {submitted && <Feather name="check-circle" size={14} color={colors.success} />}
      </View>

      <Text style={[styles.fieldLabel, { color: colors.foreground }]}>{field.label}</Text>
      <Text style={[styles.answerText, { color: colors.mutedForeground }]}>
        Answer: <Text style={{ color: colors.destructive, fontFamily: "Inter_600SemiBold" }}>{String(answer)}</Text>
      </Text>

      {!submitted && (
        <>
          <TextInput
            style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the deficiency…"
            placeholderTextColor={colors.mutedForeground}
            multiline
          />
          <View style={styles.severityRow}>
            {SEVERITIES.map((s) => (
              <Button
                key={s.value}
                label={s.label}
                size="sm"
                variant={severity === s.value ? "destructive" : "outline"}
                onPress={() => setSeverity(s.value)}
                style={{ flex: 1 }}
              />
            ))}
          </View>
          <Button
            label={loading ? "Reporting…" : "Report Deficiency → HubSpot"}
            variant="destructive"
            onPress={handleReport}
            disabled={loading}
          />
        </>
      )}

      {submitted && (
        <View style={[styles.reportedBanner, { backgroundColor: colors.success + "22" }]}>
          <Feather name="check" size={12} color={colors.success} />
          <Text style={[styles.reportedText, { color: colors.success }]}>
            Deficiency ticket enqueued — will create in HubSpot on reconnect.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 10, borderWidth: 1, padding: 12, gap: 8, marginTop: 6 },
  header: { flexDirection: "row", alignItems: "center", gap: 6 },
  headerText: { fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  answerText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    minHeight: 50,
    textAlignVertical: "top",
  },
  severityRow: { flexDirection: "row", gap: 6 },
  reportedBanner: { flexDirection: "row", alignItems: "center", gap: 6, padding: 8, borderRadius: 6 },
  reportedText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
});
