import React from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useColors } from "@/hooks/useColors";

type CardProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  elevated?: boolean;
};

type CardHeaderProps = {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
};

type CardContentProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function Card({ children, style, elevated = false }: CardProps) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          shadowColor: elevated ? "#000" : "transparent",
          shadowOpacity: elevated ? 0.18 : 0,
          shadowRadius: elevated ? 8 : 0,
          shadowOffset: { width: 0, height: 2 },
          elevation: elevated ? 4 : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function CardHeader({ title, subtitle, right }: CardHeaderProps) {
  const colors = useColors();
  return (
    <View style={styles.header}>
      <View style={styles.headerText}>
        <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
        {subtitle && (
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>
        )}
      </View>
      {right && <View>{right}</View>}
    </View>
  );
}

export function CardContent({ children, style }: CardContentProps) {
  return <View style={[styles.content, style]}>{children}</View>;
}

export function CardDivider() {
  const colors = useColors();
  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerText: { flex: 1, marginRight: 8 },
  title: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  content: { paddingHorizontal: 16, paddingBottom: 16 },
  divider: { height: 1, marginHorizontal: 16 },
});
