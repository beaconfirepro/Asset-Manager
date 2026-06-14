import { useQuery } from "@tanstack/react-query";
import { Platform } from "react-native";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  assetComplianceLinks,
  inspectionSchedules,
  inspectionResults,
  systemTests,
  testEquipment,
  inspectionContracts,
} from "@/db/schema";
import { useAuth } from "@/context/AuthContext";

export type ActionQueueItem = {
  id: string;
  type: "OVERDUE" | "AWAITING_QA" | "FAILED_TEST" | "EXPIRING_CALIBRATION" | "DUE_SOON";
  title: string;
  subtitle: string;
  href: string;
  severity: "high" | "medium" | "low";
};

export type DashboardData = {
  complianceHealth: {
    compliant: number;
    nonCompliant: number;
    pending: number;
    exempt: number;
    total: number;
  };
  upcomingCount: number;
  overdueCount: number;
  recurringRevenue: { booked: number; potential: number };
  actionQueue: ActionQueueItem[];
};

const EMPTY: DashboardData = {
  complianceHealth: { compliant: 0, nonCompliant: 0, pending: 0, exempt: 0, total: 0 },
  upcomingCount: 0,
  overdueCount: 0,
  recurringRevenue: { booked: 0, potential: 0 },
  actionQueue: [],
};

export function useDashboard() {
  const { orgId } = useAuth();

  return useQuery({
    queryKey: ["dashboard", orgId],
    enabled: Platform.OS !== "web" && !!orgId,
    queryFn: async (): Promise<DashboardData> => {
      if (!orgId) return EMPTY;
      const db = await getDb();
      const now = new Date().toISOString();
      const in30 = new Date(Date.now() + 30 * 86_400_000).toISOString();

      const [links, schedules, results, tests, equipment, contract] = await Promise.all([
        db.select().from(assetComplianceLinks).where(eq(assetComplianceLinks.org_id, orgId)),
        db.select().from(inspectionSchedules).where(eq(inspectionSchedules.org_id, orgId)),
        db.select().from(inspectionResults).where(eq(inspectionResults.org_id, orgId)),
        db.select().from(systemTests).where(eq(systemTests.org_id, orgId)),
        db.select().from(testEquipment).where(eq(testEquipment.org_id, orgId)),
        db.select().from(inspectionContracts).where(eq(inspectionContracts.org_id, orgId)),
      ]);

      const complianceHealth = {
        compliant: links.filter((l) => l.compliance_status === "COMPLIANT").length,
        nonCompliant: links.filter((l) => l.compliance_status === "NON_COMPLIANT").length,
        pending: links.filter((l) => l.compliance_status === "PENDING").length,
        exempt: links.filter((l) => l.compliance_status === "EXEMPT").length,
        total: links.length,
      };

      const active = schedules.filter((s) => ["DRAFT", "APPROVED"].includes(s.status));
      const overdueCount = active.filter((s) => s.scheduled_date < now).length;
      const upcomingCount = active.filter((s) => s.scheduled_date >= now && s.scheduled_date <= in30).length;

      const bookedRevenue = contract
        .filter((s) => s.is_booked && s.contracted_amount)
        .reduce((acc, s) => acc + (s.contracted_amount ?? 0), 0);
      const potentialRevenue = contract
        .filter((s) => !s.is_booked && s.contracted_amount)
        .reduce((acc, s) => acc + (s.contracted_amount ?? 0), 0);

      const actionQueue: ActionQueueItem[] = [];

      active
        .filter((s) => s.scheduled_date < now)
        .slice(0, 5)
        .forEach((s) => {
          actionQueue.push({
            id: `overdue-${s.id}`,
            type: "OVERDUE",
            title: "Overdue Inspection",
            subtitle: `${s.scheduled_date.slice(0, 10)} · ${s.hubspot_asset_id}`,
            href: `/assets/${s.hubspot_asset_id}`,
            severity: "high",
          });
        });

      results
        .filter((r) => r.status === "SUBMITTED" || r.qa_status === "PENDING")
        .slice(0, 4)
        .forEach((r) => {
          actionQueue.push({
            id: `qa-${r.id}`,
            type: "AWAITING_QA",
            title: "Awaiting QA Review",
            subtitle: `Result · ${r.hubspot_asset_id}`,
            href: `/assets/${r.hubspot_asset_id}`,
            severity: "medium",
          });
        });

      tests
        .filter((t) => t.result === "FAIL")
        .slice(0, 4)
        .forEach((t) => {
          actionQueue.push({
            id: `test-${t.id}`,
            type: "FAILED_TEST",
            title: "Failed System Test",
            subtitle: `${t.test_type.replace(/_/g, " ")} · ${t.hubspot_asset_id}`,
            href: `/assets/${t.hubspot_asset_id}`,
            severity: "high",
          });
        });

      equipment
        .filter((e) => ["EXPIRED", "OVERDUE", "DUE_SOON"].includes(e.calibration_status))
        .slice(0, 4)
        .forEach((e) => {
          actionQueue.push({
            id: `cal-${e.id}`,
            type: "EXPIRING_CALIBRATION",
            title: e.calibration_status === "DUE_SOON" ? "Calibration Due Soon" : "Calibration Expired",
            subtitle: `${e.name}${e.serial_number ? " · " + e.serial_number : ""}`,
            href: "/testing",
            severity: e.calibration_status === "DUE_SOON" ? "medium" : "high",
          });
        });

      contract
        .filter((s) => s.is_booked)
        .slice(0, 3)
        .forEach((s) => {
          actionQueue.push({
            id: `contract-${s.id}`,
            type: "DUE_SOON",
            title: "Booked Contracts Active",
            subtitle: s.name,
            href: "/assets",
            severity: "low",
          });
        });

      return {
        complianceHealth,
        upcomingCount,
        overdueCount,
        recurringRevenue: { booked: bookedRevenue, potential: potentialRevenue },
        actionQueue: actionQueue.slice(0, 20),
      };
    },
    staleTime: 2 * 60_000,
    refetchInterval: 5 * 60_000,
  });
}
