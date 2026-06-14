import React from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useCreateInspectionForm } from "@/hooks/useInspectionForms";
import { InspectionFormBuilder } from "@/components/admin/InspectionFormBuilder";
import { ScreenWrapper } from "@/components/ui/ScreenWrapper";

export default function AdminFormNewScreen() {
  const colors = useColors();
  const router = useRouter();
  const createForm = useCreateInspectionForm();

  return (
    <ScreenWrapper safeBottom={false}>
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <InspectionFormBuilder
        saving={createForm.isPending}
        onSave={async (data) => {
          const id = await createForm.mutateAsync(data);
          if (id) router.replace(`/admin/forms/${id}` as any);
        }}
      />
    </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
