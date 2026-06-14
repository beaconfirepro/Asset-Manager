import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "destructive";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  testID?: string;
};

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  icon,
  style,
  testID,
}: ButtonProps) {
  const colors = useColors();

  const handlePress = () => {
    if (disabled || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const bgColor = {
    primary: colors.primary,
    secondary: colors.secondary,
    outline: "transparent",
    ghost: "transparent",
    destructive: colors.destructive,
  }[variant];

  const textColor = {
    primary: colors.primaryForeground,
    secondary: colors.secondaryForeground,
    outline: colors.primary,
    ghost: colors.foreground,
    destructive: colors.destructiveForeground,
  }[variant];

  const paddingH = { sm: 12, md: 16, lg: 20 }[size];
  const paddingV = { sm: 6, md: 10, lg: 14 }[size];
  const fontSize = { sm: 12, md: 14, lg: 16 }[size];

  return (
    <TouchableOpacity
      testID={testID}
      onPress={handlePress}
      activeOpacity={0.75}
      disabled={disabled || loading}
      style={[
        styles.base,
        {
          backgroundColor: bgColor,
          paddingHorizontal: paddingH,
          paddingVertical: paddingV,
          borderWidth: variant === "outline" ? 1.5 : 0,
          borderColor: variant === "outline" ? colors.primary : "transparent",
          borderRadius: 10,
          opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <View style={styles.row}>
          {icon && <View style={styles.iconWrap}>{icon}</View>}
          <Text style={[styles.label, { color: textColor, fontSize }]}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  iconWrap: { marginRight: 2 },
  label: { fontFamily: "Inter_600SemiBold", letterSpacing: 0.1 },
});
