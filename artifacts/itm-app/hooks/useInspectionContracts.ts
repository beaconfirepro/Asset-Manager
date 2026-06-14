import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { and, eq } from "drizzle-orm";
import { useAuth } from "@/context/AuthContext";
import { getDb } from "@/db/client";
import {
  inspectionContracts,
  type InspectionSchedule,
  type InspectionContract,
  type NewInspectionContract,
} from "@/db/schema";
import { enqueue, genId } from "@/lib/sync";
import { reconcileSchedules, reconcileSchedulesCloud } from "@/lib/contracts/scheduleReconciler";
import { cloudDelete, cloudList, cloudUpsert, isWeb } from "@/lib/cloud/repo";

export function useInspectionContracts() {
  const { orgId } = useAuth();

  return useQuery({
    queryKey: ["inspection-contract", orgId],
    enabled: !!orgId,
    queryFn: async (): Promise<InspectionContract[]> => {
      if (!orgId) return [];
      if (isWeb) return cloudList<InspectionContract>("inspection_contracts", orgId);
      const db = await getDb();
      return db.select().from(inspectionContracts).where(eq(inspectionContracts.org_id, orgId));
    },
    staleTime: 2 * 60_000,
  });
}

type CreateContractInput = Omit<NewInspectionContract, "id" | "org_id" | "created_at" | "updated_at" | "sync_status">;

export function useCreateContract() {
  const { orgId } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateContractInput): Promise<string | undefined> => {
      if (!orgId) return;
      const now = new Date().toISOString();
      const contractId = genId();

      const newContract: InspectionContract = {
        id: contractId,
        org_id: orgId,
        name: data.name,
        hubspot_asset_id: data.hubspot_asset_id,
        system_type: data.system_type,
        frequency_days: data.frequency_days,
        generation_horizon_days: data.generation_horizon_days ?? 180,
        starts_at: data.starts_at,
        ends_at: data.ends_at ?? null,
        hubspot_service_team_id: data.hubspot_service_team_id ?? null,
        is_booked: data.is_booked ?? false,
        contracted_amount: data.contracted_amount ?? null,
        notes: data.notes ?? null,
        created_at: now,
        updated_at: now,
        sync_status: isWeb ? "SYNCED" : "PENDING",
      };

      if (isWeb) {
        await cloudUpsert<InspectionContract>("inspection_contracts", newContract);
        await reconcileSchedulesCloud(orgId, newContract);
        return contractId;
      }

      const db = await getDb();
      await db.insert(inspectionContracts).values(newContract);
      await enqueue({
        org_id: orgId,
        entity_type: "inspection_contracts",
        entity_id: contractId,
        operation: "CREATE",
        payload: newContract as unknown as Record<string, unknown>,
        target_provider: "ITM",
      });

      await reconcileSchedules(db, orgId, newContract);

      return contractId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inspection-contract", orgId] });
      qc.invalidateQueries({ queryKey: ["inspection-schedules", orgId] });
      qc.invalidateQueries({ queryKey: ["dashboard", orgId] });
    },
  });
}

export function useUpdateContract() {
  const { orgId } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: { id: string; data: Partial<InspectionContract> }) => {
      if (!orgId) return;
      const now = new Date().toISOString();

      if (isWeb) {
        const all = await cloudList<InspectionContract>("inspection_contracts", orgId);
        const current = all.find((s) => s.id === params.id);
        if (!current) return;
        const merged: InspectionContract = {
          ...current,
          ...params.data,
          updated_at: now,
          sync_status: "SYNCED",
        };
        await cloudUpsert<InspectionContract>("inspection_contracts", merged);
        await reconcileSchedulesCloud(orgId, merged);
        return;
      }

      const db = await getDb();

      await db
        .update(inspectionContracts)
        .set({ ...params.data, updated_at: now, sync_status: "PENDING" })
        .where(and(eq(inspectionContracts.id, params.id), eq(inspectionContracts.org_id, orgId)));

      await enqueue({
        org_id: orgId,
        entity_type: "inspection_contracts",
        entity_id: params.id,
        operation: "UPDATE",
        payload: params.data as Record<string, unknown>,
        target_provider: "ITM",
      });

      const rows = await db
        .select()
        .from(inspectionContracts)
        .where(and(eq(inspectionContracts.id, params.id), eq(inspectionContracts.org_id, orgId)));
      if (rows[0]) {
        await reconcileSchedules(db, orgId, rows[0]);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inspection-contract", orgId] });
      qc.invalidateQueries({ queryKey: ["inspection-schedules", orgId] });
      qc.invalidateQueries({ queryKey: ["dashboard", orgId] });
    },
  });
}

export function useDeleteContract() {
  const { orgId } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (contractId: string) => {
      if (!orgId) return;
      const now = new Date().toISOString();
      const todayIso = now.slice(0, 10);

      if (isWeb) {
        const allSched = await cloudList<InspectionSchedule>("inspection_schedules", orgId);
        const future = allSched.filter(
          (s) => s.contract_id === contractId && s.scheduled_date >= todayIso,
        );
        for (const sched of future) {
          await cloudUpsert<InspectionSchedule>("inspection_schedules", {
            ...sched,
            status: "CANCELLED",
            updated_at: now,
            sync_status: "SYNCED",
          });
        }
        await cloudDelete("inspection_contracts", contractId, orgId);
        return;
      }

      const db = await getDb();

      const { inspectionSchedules: schedTable } = await import("@/db/schema");
      const schedules = await db
        .select()
        .from(schedTable)
        .where(and(eq(schedTable.org_id, orgId), eq(schedTable.contract_id, contractId)));

      for (const sched of schedules.filter((s) => s.scheduled_date >= todayIso)) {
        await db
          .update(schedTable)
          .set({ status: "CANCELLED", updated_at: now, sync_status: "PENDING" })
          .where(eq(schedTable.id, sched.id));
        await enqueue({
          org_id: orgId,
          entity_type: "inspection_schedule",
          entity_id: sched.id,
          operation: "UPDATE",
          payload: { status: "CANCELLED" },
          target_provider: "ITM",
        });
      }

      await enqueue({
        org_id: orgId,
        entity_type: "inspection_contracts",
        entity_id: contractId,
        operation: "DELETE",
        payload: { id: contractId },
        target_provider: "ITM",
      });

      await db
        .delete(inspectionContracts)
        .where(and(eq(inspectionContracts.id, contractId), eq(inspectionContracts.org_id, orgId)));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inspection-contract", orgId] });
      qc.invalidateQueries({ queryKey: ["inspection-schedules", orgId] });
      qc.invalidateQueries({ queryKey: ["dashboard", orgId] });
    },
  });
}
