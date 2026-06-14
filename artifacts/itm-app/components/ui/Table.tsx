import React from "react";
import { ScrollView, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { useColors } from "@/hooks/useColors";

type Column<T> = {
  key: string;
  header: string;
  width?: number;
  flex?: number;
  render: (row: T) => React.ReactNode;
  align?: "left" | "center" | "right";
};

type TableProps<T> = {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  style?: ViewStyle;
  emptyText?: string;
  onRowPress?: (item: T) => void;
};

export function Table<T>({
  columns,
  data,
  keyExtractor,
  style,
  emptyText = "No data",
}: TableProps<T>) {
  const colors = useColors();

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={style}>
      <View>
        <View style={[styles.headerRow, { borderBottomColor: colors.border, backgroundColor: colors.muted }]}>
          {columns.map((col) => (
            <View
              key={col.key}
              style={[
                styles.cell,
                { width: col.width, flex: col.width ? undefined : (col.flex ?? 1) },
              ]}
            >
              <Text
                style={[
                  styles.headerText,
                  { color: colors.mutedForeground, textAlign: col.align ?? "left" },
                ]}
              >
                {col.header}
              </Text>
            </View>
          ))}
        </View>
        {data.length === 0 ? (
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{emptyText}</Text>
          </View>
        ) : (
          data.map((row, idx) => (
            <View
              key={keyExtractor(row)}
              style={[
                styles.row,
                {
                  borderBottomColor: colors.border,
                  backgroundColor: idx % 2 === 0 ? "transparent" : colors.muted + "55",
                },
              ]}
            >
              {columns.map((col) => (
                <View
                  key={col.key}
                  style={[
                    styles.cell,
                    { width: col.width, flex: col.width ? undefined : (col.flex ?? 1) },
                  ]}
                >
                  {col.render(row)}
                </View>
              ))}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", borderBottomWidth: 1, paddingVertical: 8 },
  row: { flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 12 },
  cell: { paddingHorizontal: 12, justifyContent: "center" },
  headerText: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  empty: { padding: 32, alignItems: "center" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
