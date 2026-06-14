import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useInspectionForms, useUpdateInspectionForm } from "@/hooks/useInspectionForms";
import { InspectionFormBuilder } from "@/components/admin/InspectionFormBuilder";
import { ScreenWrapper } from "@/components/ui/ScreenWrapper";
import type { InspectionForm } from "@/db/schema";

export default function AdminFormEditScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: forms = [], isLoading } = useInspectionForms();
  const updateForm = useUpdateInspectionForm();

  const form = forms.find((f) => f.id === id);

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScreenWrapper>
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <InspectionFormBuilder
        initialForm={form}
        saving={updateForm.isPending}
        onSave={async (data) => {
          if (!form) return;
          await updateForm.mutateAsync({ id: form.id, data });
        }}
      />
    </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});
