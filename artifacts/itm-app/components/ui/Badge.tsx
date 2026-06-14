import React from "react";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import { useColors } from "@/hooks/useColors";

type BadgeVariant = "default" | "success" | "warning" | "destructive" | "info" | "muted" | "outline";

type BadgeProps = {
  label: string;
  variant?: BadgeVariant;
  size?: "sm" | "md";
  style?: ViewStyle;
};

export function Badge({ label, variant = "default", size = "md", style }: BadgeProps) {
  const colors = useColors();

  const config: Record<BadgeVariant, { bg: string; text: string }> = {
    default: { bg: colors.primary + "22", text: colors.primary },
    success: { bg: colors.success + "22", text: colors.success },
    warning: { bg: colors.warning + "22", text: colors.warning },
    destructive: { bg: colors.destructive + "22", text: colors.destructive },
    info: { bg: colors.info + "22", text: colors.info },
    muted: { bg: colors.muted, text: colors.mutedForeground },
    outline: { bg: "transparent", text: colors.foreground },
  };

  const { bg, text } = config[variant];
  const paddingH = size === "sm" ? 6 : 10;
  const paddingV = size === "sm" ? 2 : 4;
  const fontSize = size === "sm" ? 10 : 12;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: bg,
          paddingHorizontal: paddingH,
          paddingVertical: paddingV,
          borderRadius: 100,
          borderWidth: variant === "outline" ? 1 : 0,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      <Text style={[styles.label, { color: text, fontSize }]}>{label}</Text>
    </View>
  );
}

type StatusConfig = {
  label: string;
  variant: BadgeVariant;
};

function resolveStatus(status: string): StatusConfig {
  const map: Record<string, StatusConfig> = {
    COMPLIANT: { label: "Compliant", variant: "success" },
    NON_COMPLIANT: { label: "Non-Compliant", variant: "destructive" },
    PENDING: { label: "Pending", variant: "muted" },
    EXEMPT: { label: "Exempt", variant: "info" },
    ACTIVE: { label: "Active", variant: "success" },
    INACTIVE: { label: "Inactive", variant: "muted" },
    DECOMMISSIONED: { label: "Decommissioned", variant: "destructive" },
    PENDING_INSTALL: { label: "Pending Install", variant: "warning" },
    DRAFT: { label: "Draft", variant: "muted" },
    IN_PROGRESS: { label: "In Progress", variant: "info" },
    SUBMITTED: { label: "Submitted", variant: "info" },
    QA_REVIEW: { label: "QA Review", variant: "warning" },
    APPROVED: { label: "Approved", variant: "success" },
    COMPLETED: { label: "Completed", variant: "success" },
    VOID: { label: "Void", variant: "destructive" },
    SENT: { label: "Sent", variant: "success" },
    PASS: { label: "Pass", variant: "success" },
    FAIL: { label: "Fail", variant: "destructive" },
    INCONCLUSIVE: { label: "Inconclusive", variant: "warning" },
    SCHEDULED: { label: "Scheduled", variant: "info" },
    CANCELLED: { label: "Cancelled", variant: "destructive" },
    VALID: { label: "Valid", variant: "success" },
    DUE_SOON: { label: "Due Soon", variant: "warning" },
    EXPIRED: { label: "Expired", variant: "destructive" },
    OVERDUE: { label: "Overdue", variant: "destructive" },
    SYNCED: { label: "Synced", variant: "success" },
    IN_FLIGHT: { label: "Syncing", variant: "info" },
    FAILED: { label: "Sync Failed", variant: "destructive" },
    CONFLICT: { label: "Conflict", variant: "warning" },
    FIRE_SPRINKLER: { label: "Fire Sprinkler", variant: "info" },
    FIRE_ALARM: { label: "Fire Alarm", variant: "info" },
    SUPPRESSION: { label: "Suppression", variant: "info" },
    KITCHEN_HOOD: { label: "Kitchen Hood", variant: "info" },
    SPECIAL_HAZARD: { label: "Special Hazard", variant: "warning" },
    EMERGENCY_LIGHTING: { label: "Emergency Lighting", variant: "muted" },
  };
  return map[status] ?? { label: status, variant: "muted" };
}

type StatusBadgeProps = {
  status: string;
  size?: "sm" | "md";
  style?: ViewStyle;
};

export function StatusBadge({ status, size = "md", style }: StatusBadgeProps) {
  const { label, variant } = resolveStatus(status);
  return <Badge label={label} variant={variant} size={size} style={style} />;
}

const styles = StyleSheet.create({
  badge: { alignSelf: "flex-start" },
  label: { fontFamily: "Inter_600SemiBold", letterSpacing: 0.3, textTransform: "uppercase" },
});
