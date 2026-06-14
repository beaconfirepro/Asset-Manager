import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useComplianceStandards } from "@/hooks/useComplianceStandards";
import type { AssetComplianceLink } from "@/db/schema";

type Props = {
  complianceLinks: AssetComplianceLink[];
  systemType?: string;
};

export function ComplianceStandardChips({ complianceLinks, systemType }: Props) {
  const colors = useColors();
  const { data: standards = [] } = useComplianceStandards(systemType);

  const chips = complianceLinks.map((link) => {
    const std = standards.find((s) => s.id === link.compliance_standard_id);
    const isCompliant = link.compliance_status === "COMPLIANT";
    const isNonCompliant = link.compliance_status === "NON_COMPLIANT";
    const color = isCompliant ? colors.success : isNonCompliant ? colors.destructive : colors.warning;

    return {
      id: link.id,
      label: std?.code ?? link.compliance_standard_id.slice(0, 8),
      color,
      status: link.compliance_status,
    };
  });

  if (chips.length === 0) {
    return (
      <Text style={[styles.none, { color: colors.mutedForeground }]}>No standards linked</Text>
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {chips.map((chip) => (
        <View key={chip.id} style={[styles.chip, { backgroundColor: chip.color + "22", borderColor: chip.color + "55" }]}>
          <Text style={[styles.chipText, { color: chip.color }]}>{chip.label}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 6, paddingVertical: 2 },
  chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  chipText: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.3 },
  none: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
