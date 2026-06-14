import React from "react";
import { Platform, StyleSheet, View, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";

const MAX_CONTENT_WIDTH = 700;
/** Extra bottom spacing to clear the tab bar on web. */
const TAB_BAR_HEIGHT_WEB = 96;
/** Extra bottom spacing to clear the tab bar on native. */
const TAB_BAR_HEIGHT_NATIVE = 40;

interface ScreenWrapperProps {
  children: React.ReactNode;
  /** Apply safe-area top padding (default: true) */
  safeTop?: boolean;
  /** Apply safe-area bottom padding (default: true) */
  safeBottom?: boolean;
  /** Extra style for the outer container */
  style?: ViewStyle;
  /** Extra style for the inner content limiter */
  contentStyle?: ViewStyle;
}

/**
 * Wraps every screen with:
 * - Full-bleed background colour
 * - Safe-area insets (top/bottom opt-in)
 * - On tablets / wide screens: centres content with a maxWidth
 * - On phones: edge-to-edge content
 */
export function ScreenWrapper({
  children,
  safeTop = true,
  safeBottom = true,
  style,
  contentStyle,
}: ScreenWrapperProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isTablet } = useResponsiveLayout();

  return (
    <View
      style={[
        styles.outer,
        { backgroundColor: colors.background },
        safeTop && { paddingTop: insets.top },
        safeBottom && {
          paddingBottom:
            insets.bottom + (Platform.OS === "web" ? TAB_BAR_HEIGHT_WEB : TAB_BAR_HEIGHT_NATIVE),
        },
        style,
      ]}
    >
      <View
        style={[
          styles.inner,
          isTablet && styles.tablet,
          contentStyle,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1 },
  inner: { flex: 1 },
  tablet: {
    maxWidth: MAX_CONTENT_WIDTH,
    width: "100%",
    alignSelf: "center",
  },
});
