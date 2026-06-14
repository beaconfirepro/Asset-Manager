import React from "react";
import { type ViewStyle } from "react-native";
import { Badge } from "@/components/ui/Badge";

const LIFECYCLE_MAP: Record<string, { label: string; variant: "success" | "destructive" | "warning" | "muted" }> = {
  ACTIVE: { label: "Active", variant: "success" },
  INACTIVE: { label: "Inactive", variant: "muted" },
  DECOMMISSIONED: { label: "Decommissioned", variant: "destructive" },
  PENDING_INSTALL: { label: "Pending Install", variant: "warning" },
};

type Props = {
  status: string;
  size?: "sm" | "md";
  style?: ViewStyle;
};

export function AssetLifecycleBadge({ status, size = "md", style }: Props) {
  const cfg = LIFECYCLE_MAP[status] ?? { label: status, variant: "muted" as const };
  return <Badge label={cfg.label} variant={cfg.variant} size={size} style={style} />;
}
