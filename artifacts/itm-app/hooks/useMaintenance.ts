import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { and, eq } from "drizzle-orm";
import { Platform } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { getDb } from "@/db/client";
import { maintenanceRecords, type MaintenanceRecord, type NewMaintenanceRecord } from "@/db/schema";
import { enqueue, genId } from "@/lib/sync";
import { getConnecteamConnector } from "@/lib/integrations/connecteam";

export function useMaintenance() {
  const { orgId } = useAuth();
  return useQuery({
    queryKey: ["maintenance", orgId],
    enabled: Platform.OS !== "web" && !!orgId,
    queryFn: async (): Promise<MaintenanceRecord[]> => {
      if (!orgId) return [];
      const db = await getDb();
      return db.select().from(maintenanceRecords).where(eq(maintenanceRecords.org_id, orgId));
    },
    staleTime: 60_000,
  });
}

export function useMaintenanceByAsset(hubspotAssetId: string | undefined) {
  const { orgId } = useAuth();
  return useQuery({
    queryKey: ["maintenance-asset", orgId, hubspotAssetId],
    enabled: Platform.OS !== "web" && !!orgId && !!hubspotAssetId,
    queryFn: async (): Promise<MaintenanceRecord[]> => {
      if (!orgId || !hubspotAssetId) return [];
      const db = await getDb();
      return db
        .select()
        .from(maintenanceRecords)
        .where(
          and(
            eq(maintenanceRecords.org_id, orgId),
            eq(maintenanceRecords.hubspot_asset_id, hubspotAssetId),
          ),
        );
    },
    staleTime: 60_000,
  });
}

type CreateMaintenanceInput = {
  hubspot_asset_id: string;
  maintenance_type: "PREVENTIVE" | "CORRECTIVE" | "EMERGENCY";
  description?: string | null;
  scheduled_at?: string | null;
  next_maintenance_at?: string | null;
  hubspot_work_order_ticket_id?: string | null;
  cost?: number | null;
  notes?: string | null;
};

export function useCreateMaintenance() {
  const { orgId, session } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateMaintenanceInput): Promise<string> => {
      if (!orgId) throw new Error("Not authenticated");
      const db = await getDb();
      const recId = genId();
      const now = new Date().toISOString();
      const record: NewMaintenanceRecord = {
        id: recId,
        org_id: orgId,
        technician_id: session?.user.id ?? null,
        status: "SCHEDULED",
        connecteam_shift_id: null,
        completed_at: null,
        ...data,
        created_at: now,
        updated_at: now,
        sync_status: "PENDING",
      };
      await db.insert(maintenanceRecords).values(record);
      await enqueue({
        org_id: orgId,
        entity_type: "maintenance_record",
        entity_id: recId,
        operation: "CREATE",
        payload: record as unknown as Record<string, unknown>,
        target_provider: "HUBSPOT",
      });
      return recId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["maintenance", orgId] });
      qc.invalidateQueries({ queryKey: ["dashboard", orgId] });
    },
  });
}

export function useUpdateMaintenanceStatus() {
  const { orgId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      if (!orgId) throw new Error("Not authenticated");
      const db = await getDb();
      const now = new Date().toISOString();
      const completedAt = status === "COMPLETED" ? now : undefined;
      await db
        .update(maintenanceRecords)
        .set({
          status,
          ...(completedAt !== undefined ? { completed_at: completedAt } : {}),
          updated_at: now,
          sync_status: "PENDING",
        })
        .where(and(eq(maintenanceRecords.id, id), eq(maintenanceRecords.org_id, orgId)));
      await enqueue({
        org_id: orgId,
        entity_type: "maintenance_record",
        entity_id: id,
        operation: "UPDATE",
        payload: { status },
        target_provider: "HUBSPOT",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["maintenance", orgId] });
    },
  });
}

type CrewShiftParams = {
  maintenanceRecordId: string;
  hubspotAssetId: string;
  jobTitle: string;
  location: string;
  scheduledAt: string;
  durationHours: number;
  notes?: string;
};

export function useCreateCrewShift() {
  const { orgId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: CrewShiftParams) => {
      if (!orgId) throw new Error("Not authenticated");
      const connecteam = getConnecteamConnector();
      const result = await connecteam.createCrewShift({
        org_id: orgId,
        maintenance_record_id: params.maintenanceRecordId,
        hubspot_asset_id: params.hubspotAssetId,
        job_title: params.jobTitle,
        location: params.location,
        scheduled_at: params.scheduledAt,
        duration_hours: params.durationHours,
        notes: params.notes,
      });
      const db = await getDb();
      await db
        .update(maintenanceRecords)
        .set({
          connecteam_shift_id: result.client_uuid,
          updated_at: new Date().toISOString(),
          sync_status: "PENDING",
        })
        .where(
          and(eq(maintenanceRecords.id, params.maintenanceRecordId), eq(maintenanceRecords.org_id, orgId)),
        );
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["maintenance", orgId] });
    },
  });
}
