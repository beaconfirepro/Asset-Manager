import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { and, eq } from "drizzle-orm";
import { Platform } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { getDb } from "@/db/client";
import {
  testEquipment,
  calibrationRecords,
  type TestEquipment,
  type NewTestEquipment,
  type CalibrationRecord,
  type NewCalibrationRecord,
} from "@/db/schema";
import { enqueue, genId } from "@/lib/sync";

export function deriveCalibrationStatus(
  nextCalibrationAt: string | null | undefined,
): "VALID" | "DUE_SOON" | "EXPIRED" | "OVERDUE" {
  if (!nextCalibrationAt) return "OVERDUE";
  const next = new Date(nextCalibrationAt);
  const now = new Date();
  const in30 = new Date(Date.now() + 30 * 86_400_000);
  if (next < now) return "EXPIRED";
  if (next <= in30) return "DUE_SOON";
  return "VALID";
}

export function useTestEquipment() {
  const { orgId } = useAuth();
  return useQuery({
    queryKey: ["test-equipment", orgId],
    enabled: Platform.OS !== "web" && !!orgId,
    queryFn: async (): Promise<TestEquipment[]> => {
      if (!orgId) return [];
      const db = await getDb();
      return db.select().from(testEquipment).where(eq(testEquipment.org_id, orgId));
    },
    staleTime: 60_000,
  });
}

export function useCalibrationRecords(equipmentId?: string) {
  const { orgId } = useAuth();
  return useQuery({
    queryKey: ["calibration-records", orgId, equipmentId ?? "all"],
    enabled: Platform.OS !== "web" && !!orgId,
    queryFn: async (): Promise<CalibrationRecord[]> => {
      if (!orgId) return [];
      const db = await getDb();
      if (equipmentId) {
        return db
          .select()
          .from(calibrationRecords)
          .where(
            and(eq(calibrationRecords.org_id, orgId), eq(calibrationRecords.equipment_id, equipmentId)),
          );
      }
      return db.select().from(calibrationRecords).where(eq(calibrationRecords.org_id, orgId));
    },
    staleTime: 60_000,
  });
}

type CreateEquipmentInput = {
  name: string;
  model?: string | null;
  serial_number?: string | null;
  manufacturer?: string | null;
  notes?: string | null;
};

export function useCreateEquipment() {
  const { orgId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateEquipmentInput): Promise<string> => {
      if (!orgId) throw new Error("Not authenticated");
      const db = await getDb();
      const eqId = genId();
      const now = new Date().toISOString();
      const record: NewTestEquipment = {
        id: eqId,
        org_id: orgId,
        calibration_status: "VALID",
        last_calibration_at: null,
        next_calibration_at: null,
        ...data,
        created_at: now,
        updated_at: now,
        sync_status: "PENDING",
      };
      await db.insert(testEquipment).values(record);
      await enqueue({
        org_id: orgId,
        entity_type: "test_equipment",
        entity_id: eqId,
        operation: "CREATE",
        payload: record as unknown as Record<string, unknown>,
        target_provider: "HUBSPOT",
      });
      return eqId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["test-equipment", orgId] });
    },
  });
}

type CreateCalibrationInput = {
  equipment_id: string;
  technician?: string | null;
  result: "PASS" | "FAIL" | "INCONCLUSIVE";
  certificate_number?: string | null;
  notes?: string | null;
  calibrated_at: string;
  expires_at: string;
};

export function useCreateCalibration() {
  const { orgId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateCalibrationInput): Promise<string> => {
      if (!orgId) throw new Error("Not authenticated");
      const db = await getDb();
      const calId = genId();
      const now = new Date().toISOString();
      const record: NewCalibrationRecord = {
        id: calId,
        org_id: orgId,
        ...data,
        created_at: now,
        updated_at: now,
        sync_status: "PENDING",
      };
      await db.insert(calibrationRecords).values(record);
      const newStatus = deriveCalibrationStatus(data.expires_at);
      await db
        .update(testEquipment)
        .set({
          calibration_status: newStatus,
          last_calibration_at: data.calibrated_at,
          next_calibration_at: data.expires_at,
          updated_at: now,
          sync_status: "PENDING",
        })
        .where(and(eq(testEquipment.id, data.equipment_id), eq(testEquipment.org_id, orgId)));
      await enqueue({
        org_id: orgId,
        entity_type: "calibration_record",
        entity_id: calId,
        operation: "CREATE",
        payload: record as unknown as Record<string, unknown>,
        target_provider: "HUBSPOT",
      });
      return calId;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["test-equipment", orgId] });
      qc.invalidateQueries({ queryKey: ["calibration-records", orgId, variables.equipment_id] });
      qc.invalidateQueries({ queryKey: ["dashboard", orgId] });
    },
  });
}
