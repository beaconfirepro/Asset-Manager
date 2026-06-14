import React from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useResponsive } from "@/hooks/useResponsive";
import { FONT } from "@/theme/tokens";

interface ScreenProps {
  title?: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  children: React.ReactNode;
}

export function Screen({
  title,
  subtitle,
  headerRight,
  refreshing,
  onRefresh,
  children,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { gutter, contentMaxWidth } = useResponsive();

  const hasHeader = !!(title || subtitle || headerRight);

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.contentContainer,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom + 16,
          paddingHorizontal: gutter,
        },
      ]}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing ?? false}
            onRefresh={onRefresh}
            tintColor={colors.tint}
          />
        ) : undefined
      }
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.inner, { maxWidth: contentMaxWidth }]}>
        {hasHeader && (
          <View style={styles.header}>
            <View style={styles.headerText}>
              {title && (
                <Text
                  style={[
                    styles.title,
                    { color: colors.foreground, fontFamily: FONT.bold },
                  ]}
                >
                  {title}
                </Text>
              )}
              {subtitle && (
                <Text
                  style={[
                    styles.subtitle,
                    {
                      color: colors.mutedForeground,
                      fontFamily: FONT.regular,
                    },
                  ]}
                >
                  {subtitle}
                </Text>
              )}
            </View>
            {headerRight && <View>{headerRight}</View>}
          </View>
        )}
        {children}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    alignItems: "center",
  },
  inner: {
    width: "100%",
    alignSelf: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerText: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 24,
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2,
  },
});
