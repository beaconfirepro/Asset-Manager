import React from "react";
import { StyleSheet, View } from "react-native";

import { useResponsive } from "@/hooks/useResponsive";

interface GridProps {
  gap?: number;
  minItemWidth?: number;
  children: React.ReactNode;
}

export function Grid({ gap = 12, minItemWidth = 260, children }: GridProps) {
  const { isPhone } = useResponsive();

  return (
    <View style={[styles.container, { gap }]}>
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child;
        return (
          <View
            style={
              isPhone
                ? styles.fullWidth
                : { flexGrow: 1, flexBasis: 0, minWidth: minItemWidth }
            }
          >
            {child}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  fullWidth: {
    width: "100%",
  },
});
