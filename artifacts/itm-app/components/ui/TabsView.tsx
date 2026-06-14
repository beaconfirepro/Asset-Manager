import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { useColors } from "@/hooks/useColors";

type Tab = {
  key: string;
  label: string;
  badge?: number;
};

type TabsViewProps = {
  tabs: Tab[];
  activeKey: string;
  onTabChange: (key: string) => void;
  style?: ViewStyle;
};

export function TabsView({ tabs, activeKey, onTabChange, style }: TabsViewProps) {
  const colors = useColors();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[styles.container, style]}
      contentContainerStyle={styles.content}
    >
      {tabs.map((tab) => {
        const isActive = tab.key === activeKey;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onTabChange(tab.key)}
            style={[
              styles.tab,
              {
                borderBottomWidth: isActive ? 2 : 0,
                borderBottomColor: colors.primary,
              },
            ]}
          >
            <View style={styles.tabInner}>
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isActive ? colors.primary : colors.mutedForeground,
                    fontFamily: isActive ? "Inter_600SemiBold" : "Inter_400Regular",
                  },
                ]}
              >
                {tab.label}
              </Text>
              {tab.badge != null && tab.badge > 0 && (
                <View style={[styles.badge, { backgroundColor: colors.destructive }]}>
                  <Text style={styles.badgeText}>{tab.badge > 99 ? "99+" : tab.badge}</Text>
                </View>
              )}
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 0 },
  content: { paddingHorizontal: 16, gap: 4 },
  tab: { paddingHorizontal: 12, paddingVertical: 12, marginRight: 4 },
  tabInner: { flexDirection: "row", alignItems: "center", gap: 6 },
  tabLabel: { fontSize: 14 },
  badge: { borderRadius: 100, paddingHorizontal: 6, paddingVertical: 1, minWidth: 18, alignItems: "center" },
  badgeText: { fontSize: 10, color: "#fff", fontFamily: "Inter_600SemiBold" },
});
