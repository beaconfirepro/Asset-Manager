import React from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { useCreateInspectionForm } from "@/hooks/useInspectionForms";
import { InspectionFormBuilder } from "@/components/admin/InspectionFormBuilder";

export default function AdminFormNewScreen() {
  const colors = useColors();
  const router = useRouter();
  const createForm = useCreateInspectionForm();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <InspectionFormBuilder
        saving={createForm.isPending}
        onSave={async (data) => {
          const id = await createForm.mutateAsync(data);
          if (id) router.replace(`/admin/forms/${id}` as any);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
