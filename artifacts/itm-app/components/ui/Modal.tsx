import React from "react";
import {
  KeyboardAvoidingView,
  Modal as RNModal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

type ModalProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "full";
  contentStyle?: ViewStyle;
};

export function Modal({
  visible,
  onClose,
  title,
  children,
  footer,
  size = "md",
  contentStyle,
}: ModalProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const maxHeight = size === "full" ? "95%" : size === "lg" ? "80%" : size === "sm" ? "40%" : "65%";

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={[styles.backdropInner, { backgroundColor: "rgba(0,0,0,0.55)" }]} />
      </Pressable>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.kavContainer}
        pointerEvents="box-none"
      >
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              maxHeight,
              paddingBottom: insets.bottom + 16,
            },
          ]}
        >
          <View style={styles.handle}>
            <View style={[styles.handleBar, { backgroundColor: colors.border }]} />
          </View>
          {title && (
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
              <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
                <Feather name="x" size={20} color={colors.mutedForeground} />
              </Pressable>
            </View>
          )}
          <ScrollView
            style={[styles.body, contentStyle]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
          {footer && (
            <View style={[styles.footer, { borderTopColor: colors.border }]}>{footer}</View>
          )}
        </View>
      </KeyboardAvoidingView>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject },
  backdropInner: { flex: 1 },
  kavContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  handle: { alignItems: "center", paddingTop: 12, paddingBottom: 4 },
  handleBar: { width: 36, height: 4, borderRadius: 2 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  title: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  closeBtn: { padding: 4 },
  body: { paddingHorizontal: 20 },
  footer: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1 },
});
