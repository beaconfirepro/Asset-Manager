import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { and, eq } from "drizzle-orm";
import { Platform } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { getDb } from "@/db/client";
import { inspectionForms, type InspectionForm, type NewInspectionForm } from "@/db/schema";
import { enqueue, genId } from "@/lib/sync";

export function useInspectionForms(systemType?: string) {
  const { orgId } = useAuth();

  return useQuery({
    queryKey: ["inspection-forms", orgId, systemType ?? "all"],
    enabled: Platform.OS !== "web" && !!orgId,
    queryFn: async (): Promise<InspectionForm[]> => {
      if (!orgId) return [];
      const db = await getDb();
      const rows = await db
        .select()
        .from(inspectionForms)
        .where(eq(inspectionForms.org_id, orgId));
      return systemType ? rows.filter((f) => f.system_type === systemType) : rows;
    },
    staleTime: 5 * 60_000,
  });
}

export function useActiveForm(systemType: string | undefined) {
  const { orgId } = useAuth();

  return useQuery({
    queryKey: ["inspection-form-active", orgId, systemType],
    enabled: Platform.OS !== "web" && !!orgId && !!systemType,
    queryFn: async (): Promise<InspectionForm | null> => {
      if (!orgId || !systemType) return null;
      const db = await getDb();
      const rows = await db
        .select()
        .from(inspectionForms)
        .where(
          and(
            eq(inspectionForms.org_id, orgId),
            eq(inspectionForms.system_type, systemType),
            eq(inspectionForms.is_active, true),
          ),
        );
      return rows[0] ?? null;
    },
    staleTime: 5 * 60_000,
  });
}

type CreateFormInput = Omit<NewInspectionForm, "id" | "org_id" | "created_at" | "updated_at" | "sync_status">;

export function useCreateInspectionForm() {
  const { orgId } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateFormInput): Promise<string | undefined> => {
      if (Platform.OS === "web" || !orgId) return;
      const db = await getDb();
      const now = new Date().toISOString();
      const formId = genId();

      const newForm: NewInspectionForm = {
        id: formId,
        org_id: orgId,
        ...data,
        created_at: now,
        updated_at: now,
        sync_status: "PENDING",
      };

      await db.insert(inspectionForms).values(newForm);
      await enqueue({
        org_id: orgId,
        entity_type: "inspection_form",
        entity_id: formId,
        operation: "CREATE",
        payload: newForm as unknown as Record<string, unknown>,
        target_provider: "ITM",
      });

      return formId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inspection-forms", orgId] });
      qc.invalidateQueries({ queryKey: ["inspection-form-active", orgId] });
    },
  });
}

export function useUpdateInspectionForm() {
  const { orgId } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: { id: string; data: Partial<InspectionForm> }) => {
      if (Platform.OS === "web" || !orgId) return;
      const db = await getDb();
      const now = new Date().toISOString();

      if (params.data.is_active) {
        await db
          .update(inspectionForms)
          .set({ is_active: false, updated_at: now })
          .where(
            and(
              eq(inspectionForms.org_id, orgId),
              eq(inspectionForms.system_type, params.data.system_type ?? ""),
            ),
          );
      }

      await db
        .update(inspectionForms)
        .set({ ...params.data, updated_at: now, sync_status: "PENDING" })
        .where(and(eq(inspectionForms.id, params.id), eq(inspectionForms.org_id, orgId)));

      await enqueue({
        org_id: orgId,
        entity_type: "inspection_form",
        entity_id: params.id,
        operation: "UPDATE",
        payload: params.data as Record<string, unknown>,
        target_provider: "ITM",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inspection-forms", orgId] });
      qc.invalidateQueries({ queryKey: ["inspection-form-active", orgId] });
    },
  });
}
