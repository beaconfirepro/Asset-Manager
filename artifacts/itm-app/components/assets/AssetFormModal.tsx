import React, { useState } from "react";
import { Alert, Linking, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useUpdateAssetOverlay } from "@/hooks/useAssets";
import type { AssetComplianceLink } from "@/db/schema";

type Props = {
  visible: boolean;
  onClose: () => void;
  assetId: string;
  assetName: string;
  complianceLink: AssetComplianceLink | null;
  hubspotPortalUrl?: string;
};

export function AssetFormModal({
  visible,
  onClose,
  assetId,
  assetName,
  complianceLink,
  hubspotPortalUrl,
}: Props) {
  const colors = useColors();
  const [notes, setNotes] = useState(complianceLink?.notes ?? "");
  const updateOverlay = useUpdateAssetOverlay();

  const handleSave = async () => {
    if (!complianceLink) return;
    await updateOverlay.mutateAsync({
      complianceLinkId: complianceLink.id,
      assetId,
      notes: notes.trim() || null,
    });
    onClose();
  };

  const handleOpenHubSpot = () => {
    const url = hubspotPortalUrl ?? "https://app.hubspot.com";
    Linking.openURL(url).catch(() =>
      Alert.alert("Cannot open HubSpot", "Please open HubSpot manually to edit core asset fields."),
    );
  };

  return (
    <Modal visible={visible} onClose={onClose} title={`Edit Overlay — ${assetName}`}>
      <View style={styles.body}>
        <Text style={[styles.label, { color: colors.foreground }]}>Compliance Notes</Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.muted,
              color: colors.foreground,
              borderColor: colors.border,
            },
          ]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Add compliance notes…"
          placeholderTextColor={colors.mutedForeground}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <View style={[styles.infoBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Feather name="info" size={14} color={colors.mutedForeground} />
          <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
            Core asset fields (name, location, system type) are managed in HubSpot. ITM only stores the compliance overlay.
          </Text>
        </View>

        <Pressable
          onPress={handleOpenHubSpot}
          style={[styles.hubspotBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
        >
          <Feather name="external-link" size={14} color={colors.primary} />
          <Text style={[styles.hubspotBtnText, { color: colors.primary }]}>Open in HubSpot to edit core fields</Text>
        </Pressable>
      </View>

      <View style={styles.actions}>
        <Button label="Cancel" variant="outline" onPress={onClose} style={styles.actionBtn} />
        <Button
          label={updateOverlay.isPending ? "Saving…" : "Save Overlay"}
          onPress={handleSave}
          disabled={updateOverlay.isPending || !complianceLink}
          style={styles.actionBtn}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  body: { gap: 12, marginBottom: 16 },
  label: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    minHeight: 80,
  },
  infoBox: {
    flexDirection: "row",
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "flex-start",
  },
  infoText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  hubspotBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  hubspotBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  actions: { flexDirection: "row", gap: 10 },
  actionBtn: { flex: 1 },
});
