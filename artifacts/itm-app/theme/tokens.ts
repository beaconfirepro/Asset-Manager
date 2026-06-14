export const FONT = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
} as const;

export const RADIUS = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 32,
} as const;

export const SHADOW = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

export const COMPLIANCE_HEALTH = {
  GOOD: { threshold: 0.9, color: "#22C55E", label: "Good" },
  WARNING: { threshold: 0.7, color: "#F59E0B", label: "Needs Attention" },
  CRITICAL: { threshold: 0, color: "#EF4444", label: "Critical" },
} as const;

export type ComplianceHealth = keyof typeof COMPLIANCE_HEALTH;

export function getComplianceHealth(ratio: number): ComplianceHealth {
  if (ratio >= COMPLIANCE_HEALTH.GOOD.threshold) return "GOOD";
  if (ratio >= COMPLIANCE_HEALTH.WARNING.threshold) return "WARNING";
  return "CRITICAL";
}
