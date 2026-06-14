import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { and, eq } from "drizzle-orm";
import { Platform } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { getDb } from "@/db/client";
import {
  inspectionSeries,
  type InspectionSeries,
  type NewInspectionSeries,
} from "@/db/schema";
import { enqueue, genId } from "@/lib/sync";
import { reconcileSchedules } from "@/lib/series/scheduleReconciler";

export function useInspectionSeries() {
  const { orgId } = useAuth();

  return useQuery({
    queryKey: ["inspection-series", orgId],
    enabled: Platform.OS !== "web" && !!orgId,
    queryFn: async (): Promise<InspectionSeries[]> => {
      if (!orgId) return [];
      const db = await getDb();
      return db.select().from(inspectionSeries).where(eq(inspectionSeries.org_id, orgId));
    },
    staleTime: 2 * 60_000,
  });
}

type CreateSeriesInput = Omit<NewInspectionSeries, "id" | "org_id" | "created_at" | "updated_at" | "sync_status">;

export function useCreateSeries() {
  const { orgId } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateSeriesInput): Promise<string | undefined> => {
      if (Platform.OS === "web" || !orgId) return;
      const db = await getDb();
      const now = new Date().toISOString();
      const seriesId = genId();

      const newSeries: InspectionSeries = {
        id: seriesId,
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
        sync_status: "PENDING",
      };

      await db.insert(inspectionSeries).values(newSeries);
      await enqueue({
        org_id: orgId,
        entity_type: "inspection_series",
        entity_id: seriesId,
        operation: "CREATE",
        payload: newSeries as unknown as Record<string, unknown>,
        target_provider: "ITM",
      });

      await reconcileSchedules(db, orgId, newSeries);

      return seriesId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inspection-series", orgId] });
      qc.invalidateQueries({ queryKey: ["inspection-schedules", orgId] });
      qc.invalidateQueries({ queryKey: ["dashboard", orgId] });
    },
  });
}

export function useUpdateSeries() {
  const { orgId } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: { id: string; data: Partial<InspectionSeries> }) => {
      if (Platform.OS === "web" || !orgId) return;
      const db = await getDb();
      const now = new Date().toISOString();

      await db
        .update(inspectionSeries)
        .set({ ...params.data, updated_at: now, sync_status: "PENDING" })
        .where(and(eq(inspectionSeries.id, params.id), eq(inspectionSeries.org_id, orgId)));

      await enqueue({
        org_id: orgId,
        entity_type: "inspection_series",
        entity_id: params.id,
        operation: "UPDATE",
        payload: params.data as Record<string, unknown>,
        target_provider: "ITM",
      });

      const rows = await db
        .select()
        .from(inspectionSeries)
        .where(and(eq(inspectionSeries.id, params.id), eq(inspectionSeries.org_id, orgId)));
      if (rows[0]) {
        await reconcileSchedules(db, orgId, rows[0]);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inspection-series", orgId] });
      qc.invalidateQueries({ queryKey: ["inspection-schedules", orgId] });
      qc.invalidateQueries({ queryKey: ["dashboard", orgId] });
    },
  });
}

export function useDeleteSeries() {
  const { orgId } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (seriesId: string) => {
      if (Platform.OS === "web" || !orgId) return;
      const db = await getDb();
      const now = new Date().toISOString();
      const todayIso = now.slice(0, 10);

      const { inspectionSchedules: schedTable } = await import("@/db/schema");
      const schedules = await db
        .select()
        .from(schedTable)
        .where(and(eq(schedTable.org_id, orgId), eq(schedTable.series_id, seriesId)));

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
        entity_type: "inspection_series",
        entity_id: seriesId,
        operation: "DELETE",
        payload: { id: seriesId },
        target_provider: "ITM",
      });

      await db
        .delete(inspectionSeries)
        .where(and(eq(inspectionSeries.id, seriesId), eq(inspectionSeries.org_id, orgId)));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inspection-series", orgId] });
      qc.invalidateQueries({ queryKey: ["inspection-schedules", orgId] });
      qc.invalidateQueries({ queryKey: ["dashboard", orgId] });
    },
  });
}
