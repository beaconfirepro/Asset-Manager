import { useWindowDimensions } from "react-native";

/**
 * Responsive layout hook that provides device-class info and adaptive values.
 *
 * Breakpoint: 768 px wide — below is "phone", at or above is "tablet" (iPad).
 */
export function useResponsiveLayout() {
  const { width } = useWindowDimensions();
  const isPhone = width < 768;
  const isTablet = !isPhone;

  return { width, isPhone, isTablet } as const;
}
