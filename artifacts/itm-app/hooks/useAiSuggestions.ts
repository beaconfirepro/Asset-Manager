import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { and, eq } from "drizzle-orm";
import { useAuth } from "@/context/AuthContext";
import { getDb } from "@/db/client";
import { aiSuggestions, type AiSuggestion, type NewAiSuggestion } from "@/db/schema";
import { enqueue, genId } from "@/lib/sync";
import { cloudList, cloudUpsert, isWeb } from "@/lib/cloud/repo";

export function useAiSuggestions(contextType?: string, contextId?: string) {
  const { orgId } = useAuth();

  return useQuery({
    queryKey: ["ai-suggestions", orgId, contextType ?? "all", contextId ?? "all"],
    enabled: !!orgId,
    queryFn: async (): Promise<AiSuggestion[]> => {
      if (!orgId) return [];
      const rows = isWeb
        ? await cloudList<AiSuggestion>("ai_suggestions", orgId)
        : await (await getDb())
            .select()
            .from(aiSuggestions)
            .where(eq(aiSuggestions.org_id, orgId));
      if (contextType && contextId) {
        return rows.filter((r) => r.context_type === contextType && r.context_id === contextId);
      }
      if (contextType) {
        return rows.filter((r) => r.context_type === contextType);
      }
      return rows;
    },
    staleTime: 60_000,
  });
}

type CreateSuggestionInput = {
  suggestion_type: string;
  payload: Record<string, unknown>;
  context_type?: string | null;
  context_id?: string | null;
  model_version?: string | null;
};

export function useCreateAiSuggestion() {
  const { orgId } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateSuggestionInput): Promise<string | undefined> => {
      if (!orgId) return;
      const now = new Date().toISOString();
      const suggId = genId();

      const record: AiSuggestion = {
        id: suggId,
        org_id: orgId,
        suggestion_type: data.suggestion_type,
        status: "PENDING",
        payload: JSON.stringify(data.payload),
        context_type: data.context_type ?? null,
        context_id: data.context_id ?? null,
        accepted_at: null,
        rejected_at: null,
        model_version: data.model_version ?? "stub-v1",
        created_at: now,
        updated_at: now,
        sync_status: isWeb ? "SYNCED" : "PENDING",
      };

      if (isWeb) {
        await cloudUpsert<AiSuggestion>("ai_suggestions", record);
        return suggId;
      }

      const db = await getDb();
      await db.insert(aiSuggestions).values(record as NewAiSuggestion);
      await enqueue({
        org_id: orgId,
        entity_type: "ai_suggestion",
        entity_id: suggId,
        operation: "CREATE",
        payload: record as unknown as Record<string, unknown>,
        target_provider: "ITM",
      });

      return suggId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-suggestions", orgId] });
    },
  });
}

async function setSuggestionStatus(
  orgId: string,
  suggestionId: string,
  status: "ACCEPTED" | "REJECTED",
) {
  const now = new Date().toISOString();
  const timestampField = status === "ACCEPTED" ? "accepted_at" : "rejected_at";

  if (isWeb) {
    const all = await cloudList<AiSuggestion>("ai_suggestions", orgId);
    const current = all.find((s) => s.id === suggestionId);
    if (!current) return;
    await cloudUpsert<AiSuggestion>("ai_suggestions", {
      ...current,
      status,
      [timestampField]: now,
      updated_at: now,
      sync_status: "SYNCED",
    });
    return;
  }

  const db = await getDb();
  await db
    .update(aiSuggestions)
    .set({ status, [timestampField]: now, updated_at: now, sync_status: "PENDING" })
    .where(and(eq(aiSuggestions.id, suggestionId), eq(aiSuggestions.org_id, orgId)));
  await enqueue({
    org_id: orgId,
    entity_type: "ai_suggestion",
    entity_id: suggestionId,
    operation: "UPDATE",
    payload: { status, [timestampField]: now },
    target_provider: "ITM",
  });
}

export function useAcceptAiSuggestion() {
  const { orgId } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (suggestionId: string) => {
      if (!orgId) return;
      await setSuggestionStatus(orgId, suggestionId, "ACCEPTED");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-suggestions", orgId] });
    },
  });
}

export function useRejectAiSuggestion() {
  const { orgId } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (suggestionId: string) => {
      if (!orgId) return;
      await setSuggestionStatus(orgId, suggestionId, "REJECTED");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-suggestions", orgId] });
    },
  });
}
