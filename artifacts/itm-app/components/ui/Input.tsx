import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { useColors } from "@/hooks/useColors";

type InputProps = TextInputProps & {
  label?: string;
  error?: string;
  hint?: string;
  containerStyle?: ViewStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
};

export function Input({
  label,
  error,
  hint,
  containerStyle,
  leftIcon,
  rightIcon,
  style,
  ...props
}: InputProps) {
  const colors = useColors();
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
      )}
      <View
        style={[
          styles.inputWrap,
          {
            borderColor: error
              ? colors.destructive
              : focused
                ? colors.primary
                : colors.border,
            backgroundColor: colors.card,
          },
        ]}
      >
        {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
        <TextInput
          style={[
            styles.input,
            {
              color: colors.foreground,
              paddingLeft: leftIcon ? 0 : 12,
              paddingRight: rightIcon ? 0 : 12,
            },
            style,
          ]}
          placeholderTextColor={colors.mutedForeground}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />
        {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
      </View>
      {error && (
        <Text style={[styles.hint, { color: colors.destructive }]}>{error}</Text>
      )}
      {hint && !error && (
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>{hint}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  label: { fontSize: 14, fontFamily: "Inter_500Medium" },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 10,
    minHeight: 44,
  },
  iconLeft: { paddingLeft: 12, paddingRight: 8 },
  iconRight: { paddingRight: 12, paddingLeft: 8 },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", paddingVertical: 10 },
  hint: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
