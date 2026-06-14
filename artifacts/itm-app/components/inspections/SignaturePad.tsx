import React, { useRef } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { Button } from "@/components/ui/Button";

type Props = {
  signatureUrl: string | null;
  onSave: (dataUri: string) => void;
  onClear?: () => void;
  disabled?: boolean;
};

const PAD_HEIGHT = 160;

let SignatureCanvas: React.ComponentType<{
  ref?: React.Ref<{ readSignature: () => void; clearSignature: () => void }>;
  onOK: (sig: string) => void;
  onEmpty?: () => void;
  style?: object;
  webStyle?: string;
  backgroundColor?: string;
  penColor?: string;
}> | null = null;

if (Platform.OS !== "web") {
  try {
    SignatureCanvas = require("react-native-signature-canvas").default;
  } catch {
    SignatureCanvas = null;
  }
}

export function SignaturePad({ signatureUrl, onSave, onClear, disabled }: Props) {
  const colors = useColors();
  const sigRef = useRef<{ readSignature: () => void; clearSignature: () => void }>(null);

  const hasSignature = signatureUrl && signatureUrl.length > 0;

  const handleClear = () => {
    sigRef.current?.clearSignature();
    onClear?.();
  };

  const handleSave = () => {
    sigRef.current?.readSignature();
  };

  const webStyle = `
    .m-signature-pad { box-shadow: none; border: none; }
    .m-signature-pad--body { border: none; }
    .m-signature-pad--footer { display: none; }
    body, html { background: transparent; margin: 0; padding: 0; }
  `;

  if (hasSignature && !disabled) {
    return (
      <View style={[styles.savedBanner, { backgroundColor: colors.success + "22", borderColor: colors.success + "44" }]}>
        <Feather name="check-circle" size={14} color={colors.success} />
        <Text style={[styles.savedText, { color: colors.success }]}>Signature captured</Text>
        <Button label="Retake" size="sm" variant="ghost" onPress={handleClear} style={{ marginLeft: "auto" }} />
      </View>
    );
  }

  if (hasSignature && disabled) {
    return (
      <View style={[styles.savedBanner, { backgroundColor: colors.success + "22", borderColor: colors.success + "44" }]}>
        <Feather name="check-circle" size={14} color={colors.success} />
        <Text style={[styles.savedText, { color: colors.success }]}>Signature captured</Text>
      </View>
    );
  }

  if (disabled) {
    return (
      <View style={[styles.emptyPad, { backgroundColor: colors.muted, borderColor: colors.border }]}>
        <Text style={[styles.placeholder, { color: colors.mutedForeground }]}>No signature</Text>
      </View>
    );
  }

  if (!SignatureCanvas) {
    return (
      <View style={[styles.emptyPad, { backgroundColor: colors.muted, borderColor: colors.border }]}>
        <Feather name="edit-3" size={18} color={colors.mutedForeground} />
        <Text style={[styles.placeholder, { color: colors.mutedForeground }]}>
          Signature pad not available on this platform
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.padWrapper, { borderColor: colors.border }]}>
        <SignatureCanvas
          ref={sigRef}
          onOK={(sig) => onSave(sig)}
          style={{ flex: 1, height: PAD_HEIGHT }}
          webStyle={webStyle}
          backgroundColor="white"
          penColor="#1a1a2e"
        />
      </View>
      <Text style={[styles.hint, { color: colors.mutedForeground }]}>
        Sign with your finger above, then tap Save
      </Text>
      <View style={styles.actions}>
        <Button label="Clear" variant="outline" size="sm" onPress={handleClear} style={{ flex: 1 }} />
        <Button label="Save Signature" size="sm" onPress={handleSave} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  padWrapper: {
    height: PAD_HEIGHT,
    borderRadius: 10,
    borderWidth: 1.5,
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  emptyPad: {
    height: 60,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  placeholder: { fontSize: 13, fontFamily: "Inter_400Regular", fontStyle: "italic" },
  hint: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" },
  actions: { flexDirection: "row", gap: 8 },
  savedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  savedText: { fontSize: 13, fontFamily: "Inter_500Medium" },
});
