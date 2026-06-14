import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { and, eq } from "drizzle-orm";
import { Platform } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { getDb } from "@/db/client";
import {
  inspectionSchedules,
  inspectionSeries,
  type InspectionSeries,
  type NewInspectionSeries,
} from "@/db/schema";
import { getHubSpotConnector } from "@/lib/integrations/hubspot";
import { generateScheduleDates } from "@/lib/series/generateSchedules";
import { enqueue, genId } from "@/lib/sync";

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

      const newSeries: NewInspectionSeries = {
        id: seriesId,
        org_id: orgId,
        ...data,
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

      const dates = generateScheduleDates(newSeries as InspectionSeries);
      const todayIso = new Date().toISOString().slice(0, 10);
      const connector = getHubSpotConnector();

      for (const date of dates) {
        const scheduleId = genId();
        const isDue = date <= todayIso;

        await db.insert(inspectionSchedules).values({
          id: scheduleId,
          org_id: orgId,
          series_id: seriesId,
          hubspot_asset_id: data.hubspot_asset_id,
          scheduled_date: date,
          status: "DRAFT",
          hubspot_inspection_ticket_id: null,
          rescheduled_from: null,
          notes: null,
          created_at: now,
          updated_at: now,
          sync_status: "PENDING",
        });

        if (isDue) {
          await connector.createInspectionTicket({
            org_id: orgId,
            hubspot_asset_id: data.hubspot_asset_id,
            schedule_id: scheduleId,
            scheduled_date: date,
          });
        }
      }

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
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inspection-series", orgId] });
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

      const schedules = await db
        .select()
        .from(inspectionSchedules)
        .where(
          and(
            eq(inspectionSchedules.org_id, orgId),
            eq(inspectionSchedules.series_id, seriesId),
          ),
        );

      for (const sched of schedules.filter((s) => s.scheduled_date >= todayIso)) {
        await db
          .update(inspectionSchedules)
          .set({ status: "CANCELLED", updated_at: now, sync_status: "PENDING" })
          .where(eq(inspectionSchedules.id, sched.id));
      }

      await enqueue({
        org_id: orgId,
        entity_type: "inspection_series",
        entity_id: seriesId,
        operation: "DELETE",
        payload: { id: seriesId },
        target_provider: "ITM",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inspection-series", orgId] });
      qc.invalidateQueries({ queryKey: ["inspection-schedules", orgId] });
      qc.invalidateQueries({ queryKey: ["dashboard", orgId] });
    },
  });
}
