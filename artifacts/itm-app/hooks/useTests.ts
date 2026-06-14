import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { and, eq } from "drizzle-orm";
import { Platform } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { getDb } from "@/db/client";
import { systemTests, type SystemTest, type NewSystemTest } from "@/db/schema";
import { enqueue, genId } from "@/lib/sync";
import { computeTestResult } from "@/lib/testScoring";

export function useSystemTests() {
  const { orgId } = useAuth();
  return useQuery({
    queryKey: ["system-tests", orgId],
    enabled: Platform.OS !== "web" && !!orgId,
    queryFn: async (): Promise<SystemTest[]> => {
      if (!orgId) return [];
      const db = await getDb();
      return db.select().from(systemTests).where(eq(systemTests.org_id, orgId));
    },
    staleTime: 60_000,
  });
}

export function useSystemTestsByAsset(hubspotAssetId: string | undefined) {
  const { orgId } = useAuth();
  return useQuery({
    queryKey: ["system-tests-asset", orgId, hubspotAssetId],
    enabled: Platform.OS !== "web" && !!orgId && !!hubspotAssetId,
    queryFn: async (): Promise<SystemTest[]> => {
      if (!orgId || !hubspotAssetId) return [];
      const db = await getDb();
      return db
        .select()
        .from(systemTests)
        .where(and(eq(systemTests.org_id, orgId), eq(systemTests.hubspot_asset_id, hubspotAssetId)));
    },
    staleTime: 60_000,
  });
}

type CreateTestInput = {
  hubspot_asset_id: string;
  compliance_standard_id?: string | null;
  compliance_standard_code?: string | null;
  test_type: string;
  result?: "PASS" | "FAIL" | "INCONCLUSIVE";
  readings?: string | null;
  notes?: string | null;
  tested_at: string;
  hubspot_work_order_ticket_id?: string | null;
};

export function useCreateTest() {
  const { orgId, session } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateTestInput): Promise<string> => {
      if (!orgId) throw new Error("Not authenticated");
      const db = await getDb();
      const testId = genId();
      const now = new Date().toISOString();

      const scoring = computeTestResult(
        data.compliance_standard_code ?? null,
        data.test_type,
        data.readings ?? null,
      );
      const derivedResult = scoring.criteriaApplied
        ? scoring.result
        : (data.result ?? "INCONCLUSIVE");

      const { compliance_standard_code: _code, result: _manualResult, ...rest } = data;

      const record: NewSystemTest = {
        id: testId,
        org_id: orgId,
        inspector_id: session?.user.id ?? "unknown",
        ...rest,
        result: derivedResult,
        created_at: now,
        updated_at: now,
        sync_status: "PENDING",
      };
      await db.insert(systemTests).values(record);
      await enqueue({
        org_id: orgId,
        entity_type: "system_test",
        entity_id: testId,
        operation: "CREATE",
        payload: record as unknown as Record<string, unknown>,
        target_provider: "HUBSPOT",
      });
      return testId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["system-tests", orgId] });
      qc.invalidateQueries({ queryKey: ["dashboard", orgId] });
    },
  });
}

export function useDeleteTest() {
  const { orgId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (testId: string) => {
      if (!orgId) throw new Error("Not authenticated");
      const db = await getDb();
      await db
        .delete(systemTests)
        .where(and(eq(systemTests.id, testId), eq(systemTests.org_id, orgId)));
      await enqueue({
        org_id: orgId,
        entity_type: "system_test",
        entity_id: testId,
        operation: "DELETE",
        payload: { id: testId },
        target_provider: "HUBSPOT",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["system-tests", orgId] });
      qc.invalidateQueries({ queryKey: ["dashboard", orgId] });
    },
  });
}
