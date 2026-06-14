import { useWindowDimensions } from "react-native";

export function useResponsive() {
  const { width } = useWindowDimensions();

  const isPhone = width < 768;
  const isTablet = width >= 768;
  const isLarge = width >= 1024;

  const gutter = isPhone ? 16 : 24;
  const columns = isLarge ? 3 : isTablet ? 2 : 1;
  const contentMaxWidth = isLarge ? 1100 : isTablet ? 820 : 600;

  return { width, isPhone, isTablet, isLarge, gutter, columns, contentMaxWidth };
}
