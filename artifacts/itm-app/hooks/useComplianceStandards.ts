import { useQuery } from "@tanstack/react-query";
import { Platform } from "react-native";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { complianceStandards } from "@/db/schema";
import { useAuth } from "@/context/AuthContext";

export function useComplianceStandards(systemType?: string) {
  const { orgId } = useAuth();

  return useQuery({
    queryKey: ["compliance-standards", orgId, systemType ?? "all"],
    enabled: Platform.OS !== "web" && !!orgId,
    queryFn: async () => {
      if (!orgId) return [];
      const db = await getDb();
      const rows = await db
        .select()
        .from(complianceStandards)
        .where(eq(complianceStandards.org_id, orgId));
      if (systemType) return rows.filter((r) => r.system_type === systemType);
      return rows;
    },
    staleTime: 10 * 60_000,
  });
}
