import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { and, eq } from "drizzle-orm";
import { Platform } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { getDb } from "@/db/client";
import { inspectionSchedules, type InspectionSchedule } from "@/db/schema";
import { enqueue } from "@/lib/sync";

export function useInspectionSchedules(seriesId?: string) {
  const { orgId } = useAuth();

  return useQuery({
    queryKey: ["inspection-schedules", orgId, seriesId ?? "all"],
    enabled: Platform.OS !== "web" && !!orgId,
    queryFn: async (): Promise<InspectionSchedule[]> => {
      if (!orgId) return [];
      const db = await getDb();
      if (seriesId) {
        return db
          .select()
          .from(inspectionSchedules)
          .where(
            and(
              eq(inspectionSchedules.org_id, orgId),
              eq(inspectionSchedules.series_id, seriesId),
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
  seriesId: string;
  oldDate: string;
  newDate: string;
  reason?: string;
};

export function useRescheduleVisit() {
  const { orgId } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: RescheduleParams) => {
      if (Platform.OS === "web" || !orgId) return;
      const db = await getDb();
      const now = new Date().toISOString();

      const deltaMs =
        new Date(params.newDate).getTime() - new Date(params.oldDate).getTime();

      const all = await db
        .select()
        .from(inspectionSchedules)
        .where(
          and(
            eq(inspectionSchedules.org_id, orgId),
            eq(inspectionSchedules.series_id, params.seriesId),
          ),
        );

      const toShift = all.filter(
        (s) => s.scheduled_date >= params.oldDate && s.status !== "CANCELLED",
      );

      for (const sched of toShift) {
        const shifted = new Date(new Date(sched.scheduled_date).getTime() + deltaMs)
          .toISOString()
          .slice(0, 10);

        await db
          .update(inspectionSchedules)
          .set({
            scheduled_date: shifted,
            rescheduled_from: sched.id === params.scheduleId ? params.oldDate : sched.rescheduled_from,
            notes: sched.id === params.scheduleId ? (params.reason ?? null) : sched.notes,
            updated_at: now,
            sync_status: "PENDING",
          })
          .where(eq(inspectionSchedules.id, sched.id));

        await enqueue({
          org_id: orgId,
          entity_type: "inspection_schedule",
          entity_id: sched.id,
          operation: "UPDATE",
          payload: { scheduled_date: shifted, rescheduled_from: params.oldDate },
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
