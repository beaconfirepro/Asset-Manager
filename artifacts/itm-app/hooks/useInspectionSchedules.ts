import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { and, eq } from "drizzle-orm";
import { useAuth } from "@/context/AuthContext";
import { getDb } from "@/db/client";
import { inspectionSchedules, type InspectionSchedule } from "@/db/schema";
import { cloudList, cloudUpsert, isWeb } from "@/lib/cloud/repo";
import { enqueue } from "@/lib/sync";

export function useInspectionSchedules(contractId?: string) {
  const { orgId } = useAuth();

  return useQuery({
    queryKey: ["inspection-schedules", orgId, contractId ?? "all"],
    enabled: !!orgId,
    queryFn: async (): Promise<InspectionSchedule[]> => {
      if (!orgId) return [];
      if (isWeb) {
        const all = await cloudList<InspectionSchedule>("inspection_schedules", orgId);
        return contractId ? all.filter((s) => s.contract_id === contractId) : all;
      }
      const db = await getDb();
      if (contractId) {
        return db
          .select()
          .from(inspectionSchedules)
          .where(
            and(
              eq(inspectionSchedules.org_id, orgId),
              eq(inspectionSchedules.contract_id, contractId),
            ),
          );
      }
      return db
        .select()
        .from(inspectionSchedules)
        .where(eq(inspectionSchedules.org_id, orgId));
    },
    staleTime: 2 * 60_000,
  });
}

type RescheduleParams = {
  scheduleId: string;
  contractId: string;
  oldDate: string;
  newDate: string;
  reason?: string;
};

export function useRescheduleVisit() {
  const { orgId } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: RescheduleParams) => {
      if (!orgId) return;
      const now = new Date().toISOString();

      const deltaMs =
        new Date(params.newDate).getTime() - new Date(params.oldDate).getTime();

      if (isWeb) {
        const allCloud = await cloudList<InspectionSchedule>("inspection_schedules", orgId);
        const toShiftCloud = allCloud.filter(
          (s) =>
            s.contract_id === params.contractId &&
            s.scheduled_date >= params.oldDate &&
            s.status !== "CANCELLED",
        );
        for (const sched of toShiftCloud) {
          const shifted = new Date(new Date(sched.scheduled_date).getTime() + deltaMs)
            .toISOString()
            .slice(0, 10);
          const isTarget = sched.id === params.scheduleId;
          await cloudUpsert<InspectionSchedule>("inspection_schedules", {
            ...sched,
            scheduled_date: shifted,
            rescheduled_from: isTarget ? params.oldDate : sched.rescheduled_from,
            notes: isTarget ? (params.reason ?? null) : sched.notes,
            updated_at: now,
            sync_status: "SYNCED",
          });
        }
        return;
      }

      const db = await getDb();

      const all = await db
        .select()
        .from(inspectionSchedules)
        .where(
          and(
            eq(inspectionSchedules.org_id, orgId),
            eq(inspectionSchedules.contract_id, params.contractId),
          ),
        );

      const toShift = all.filter(
        (s) => s.scheduled_date >= params.oldDate && s.status !== "CANCELLED",
      );

      for (const sched of toShift) {
        const shifted = new Date(new Date(sched.scheduled_date).getTime() + deltaMs)
          .toISOString()
          .slice(0, 10);

        const isTarget = sched.id === params.scheduleId;

        await db
          .update(inspectionSchedules)
          .set({
            scheduled_date: shifted,
            rescheduled_from: isTarget ? params.oldDate : sched.rescheduled_from,
            notes: isTarget ? (params.reason ?? null) : sched.notes,
            updated_at: now,
            sync_status: "PENDING",
          })
          .where(eq(inspectionSchedules.id, sched.id));

        const outboxPayload: Record<string, unknown> = { scheduled_date: shifted };
        if (isTarget) outboxPayload.rescheduled_from = params.oldDate;

        await enqueue({
          org_id: orgId,
          entity_type: "inspection_schedule",
          entity_id: sched.id,
          operation: "UPDATE",
          payload: outboxPayload,
          target_provider: "ITM",
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inspection-schedules", orgId] });
      qc.invalidateQueries({ queryKey: ["dashboard", orgId] });
    },
  });
}
