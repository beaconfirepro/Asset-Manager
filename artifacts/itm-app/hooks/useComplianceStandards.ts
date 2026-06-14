import { useQuery } from "@tanstack/react-query";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { complianceStandards, type ComplianceStandard } from "@/db/schema";
import { useAuth } from "@/context/AuthContext";
import { cloudList, isWeb } from "@/lib/cloud/repo";

export function useComplianceStandards(systemType?: string) {
  const { orgId } = useAuth();

  return useQuery({
    queryKey: ["compliance-standards", orgId, systemType ?? "all"],
    enabled: !!orgId,
    queryFn: async (): Promise<ComplianceStandard[]> => {
      if (!orgId) return [];
      const rows = isWeb
        ? await cloudList<ComplianceStandard>("compliance_standards", orgId)
        : await (await getDb())
            .select()
            .from(complianceStandards)
            .where(eq(complianceStandards.org_id, orgId));
      return systemType ? rows.filter((r) => r.system_type === systemType) : rows;
    },
    staleTime: 10 * 60_000,
  });
}
