import React, { useRef, useState } from "react";
import {
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { Button } from "@/components/ui/Button";

type Point = { x: number; y: number };
type Stroke = Point[];

type Props = {
  signatureUrl: string | null;
  onSave: (dataUri: string) => void;
  onClear?: () => void;
  disabled?: boolean;
};

const PAD_HEIGHT = 140;

export function SignaturePad({ signatureUrl, onSave, onClear, disabled }: Props) {
  const colors = useColors();
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const currentStroke = useRef<Stroke>([]);
  const padRef = useRef<View>(null);
  const [padLayout, setPadLayout] = useState({ x: 0, y: 0 });

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => !disabled,
    onMoveShouldSetPanResponder: () => !disabled,
    onPanResponderGrant: (e: GestureResponderEvent) => {
      const { locationX, locationY } = e.nativeEvent;
      currentStroke.current = [{ x: locationX, y: locationY }];
      setIsDrawing(true);
    },
    onPanResponderMove: (e: GestureResponderEvent) => {
      const { locationX, locationY } = e.nativeEvent;
      currentStroke.current.push({ x: locationX, y: locationY });
      setStrokes((prev) => [...prev.slice(0, -1), [...currentStroke.current]]);
    },
    onPanResponderRelease: () => {
      if (currentStroke.current.length > 0) {
        setStrokes((prev) => {
          const updated = [...prev];
          if (updated[updated.length - 1] !== currentStroke.current) {
            updated.push([...currentStroke.current]);
          }
          return updated;
        });
      }
      currentStroke.current = [];
      setIsDrawing(false);
    },
  });

  const handleClear = () => {
    setStrokes([]);
    onClear?.();
  };

  const handleSave = () => {
    if (strokes.length === 0) return;
    const sigData = JSON.stringify({
      type: "signature_strokes_v1",
      strokes,
      timestamp: new Date().toISOString(),
    });
    onSave(`sig_strokes_v1:${sigData}`);
  };

  const hasSignature = signatureUrl && signatureUrl.length > 0;

  return (
    <View style={styles.container}>
      {hasSignature && strokes.length === 0 ? (
        <View style={[styles.savedBanner, { backgroundColor: colors.success + "22", borderColor: colors.success + "44" }]}>
          <Feather name="check-circle" size={14} color={colors.success} />
          <Text style={[styles.savedText, { color: colors.success }]}>Signature captured</Text>
          {!disabled && (
            <Pressable onPress={handleClear} style={{ marginLeft: "auto" }}>
              <Text style={[styles.retakeText, { color: colors.primary }]}>Retake</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <View
          ref={padRef}
          onLayout={(e) => setPadLayout({ x: e.nativeEvent.layout.x, y: e.nativeEvent.layout.y })}
          style={[
            styles.pad,
            { backgroundColor: disabled ? colors.muted : "#fff", borderColor: colors.border },
          ]}
          {...(disabled ? {} : panResponder.panHandlers)}
        >
          {strokes.length === 0 && (
            <Text style={[styles.placeholder, { color: colors.mutedForeground }]}>
              {disabled ? "No signature" : "Sign here with your finger"}
            </Text>
          )}

          {strokes.map((stroke, si) =>
            stroke.map((pt, pi) =>
              pi === 0 ? null : (
                <View
                  key={`${si}-${pi}`}
                  style={[
                    styles.inkDot,
                    {
                      left: pt.x - 1,
                      top: pt.y - 1,
                      backgroundColor: "#1a1a2e",
                    },
                  ]}
                />
              ),
            ),
          )}
        </View>
      )}

      {!disabled && !hasSignature && strokes.length === 0 ? null : !disabled && !hasSignature ? (
        <View style={styles.actions}>
          <Button label="Clear" variant="outline" size="sm" onPress={handleClear} style={{ flex: 1 }} />
          <Button label="Save Signature" size="sm" onPress={handleSave} style={{ flex: 1 }} disabled={strokes.length === 0} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  pad: {
    height: PAD_HEIGHT,
    borderRadius: 10,
    borderWidth: 1.5,
    overflow: "hidden",
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholder: { fontSize: 14, fontFamily: "Inter_400Regular", fontStyle: "italic" },
  inkDot: {
    position: "absolute",
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
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
  retakeText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
});
