import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { FONT } from "@/theme/tokens";

interface StatProps {
  value: string | number;
  label: string;
}

export function Stat({ value, label }: StatProps) {
  const colors = useColors();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius,
        },
      ]}
    >
      <Text
        style={[
          styles.value,
          { color: colors.foreground, fontFamily: FONT.bold },
        ]}
      >
        {value}
      </Text>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit={Platform.OS !== "web"}
        minimumFontScale={0.8}
        style={[
          styles.label,
          { color: colors.mutedForeground, fontFamily: FONT.medium },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderWidth: 1,
    padding: 12,
  },
  value: {
    fontSize: 22,
    lineHeight: 28,
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
});
