import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { and, eq } from "drizzle-orm";
import { useAuth } from "@/context/AuthContext";
import { getDb } from "@/db/client";
import { inspectionForms, type InspectionForm, type NewInspectionForm } from "@/db/schema";
import { enqueue, genId } from "@/lib/sync";
import { cloudList, cloudUpsert, isWeb } from "@/lib/cloud/repo";

export function useInspectionForms(systemType?: string) {
  const { orgId } = useAuth();

  return useQuery({
    queryKey: ["inspection-forms", orgId, systemType ?? "all"],
    enabled: !!orgId,
    queryFn: async (): Promise<InspectionForm[]> => {
      if (!orgId) return [];
      const rows = isWeb
        ? await cloudList<InspectionForm>("inspection_forms", orgId)
        : await (await getDb())
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
    enabled: !!orgId && !!systemType,
    queryFn: async (): Promise<InspectionForm | null> => {
      if (!orgId || !systemType) return null;
      if (isWeb) {
        const rows = await cloudList<InspectionForm>("inspection_forms", orgId);
        return rows.find((f) => f.system_type === systemType && f.is_active) ?? null;
      }
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
      if (!orgId) return;
      const now = new Date().toISOString();
      const formId = genId();

      const newForm: InspectionForm = {
        id: formId,
        org_id: orgId,
        name: data.name,
        system_type: data.system_type,
        version: data.version ?? "1.0",
        form_schema: data.form_schema,
        is_active: data.is_active ?? false,
        ai_generated: data.ai_generated ?? false,
        deficiency_triggers: data.deficiency_triggers ?? null,
        compliance_standard_id: data.compliance_standard_id ?? null,
        created_at: now,
        updated_at: now,
        sync_status: isWeb ? "SYNCED" : "PENDING",
      };

      if (isWeb) {
        await cloudUpsert<InspectionForm>("inspection_forms", newForm);
        return formId;
      }

      const db = await getDb();
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
      if (!orgId) return;
      const now = new Date().toISOString();

      if (isWeb) {
        const all = await cloudList<InspectionForm>("inspection_forms", orgId);
        const current = all.find((f) => f.id === params.id);
        if (!current) return;
        const systemType = params.data.system_type ?? current.system_type;

        // Activating a form deactivates other active forms of the same system type.
        if (params.data.is_active) {
          for (const other of all) {
            if (other.id !== params.id && other.system_type === systemType && other.is_active) {
              await cloudUpsert<InspectionForm>("inspection_forms", {
                ...other,
                is_active: false,
                updated_at: now,
                sync_status: "SYNCED",
              });
            }
          }
        }

        await cloudUpsert<InspectionForm>("inspection_forms", {
          ...current,
          ...params.data,
          updated_at: now,
          sync_status: "SYNCED",
        });
        return;
      }

      const db = await getDb();

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
