import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { and, eq } from "drizzle-orm";
import { Platform } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { getDb } from "@/db/client";
import { aiSuggestions, type AiSuggestion, type NewAiSuggestion } from "@/db/schema";
import { enqueue, genId } from "@/lib/sync";

export function useAiSuggestions(contextType?: string, contextId?: string) {
  const { orgId } = useAuth();

  return useQuery({
    queryKey: ["ai-suggestions", orgId, contextType ?? "all", contextId ?? "all"],
    enabled: Platform.OS !== "web" && !!orgId,
    queryFn: async (): Promise<AiSuggestion[]> => {
      if (!orgId) return [];
      const db = await getDb();
      const rows = await db
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
      if (Platform.OS === "web" || !orgId) return;
      const db = await getDb();
      const now = new Date().toISOString();
      const suggId = genId();

      const record: NewAiSuggestion = {
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
        sync_status: "PENDING",
      };

      await db.insert(aiSuggestions).values(record);
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

export function useAcceptAiSuggestion() {
  const { orgId } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (suggestionId: string) => {
      if (Platform.OS === "web" || !orgId) return;
      const db = await getDb();
      const now = new Date().toISOString();
      await db
        .update(aiSuggestions)
        .set({ status: "ACCEPTED", accepted_at: now, updated_at: now, sync_status: "PENDING" })
        .where(and(eq(aiSuggestions.id, suggestionId), eq(aiSuggestions.org_id, orgId)));
      await enqueue({
        org_id: orgId,
        entity_type: "ai_suggestion",
        entity_id: suggestionId,
        operation: "UPDATE",
        payload: { status: "ACCEPTED", accepted_at: now },
        target_provider: "ITM",
      });
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
      if (Platform.OS === "web" || !orgId) return;
      const db = await getDb();
      const now = new Date().toISOString();
      await db
        .update(aiSuggestions)
        .set({ status: "REJECTED", rejected_at: now, updated_at: now, sync_status: "PENDING" })
        .where(and(eq(aiSuggestions.id, suggestionId), eq(aiSuggestions.org_id, orgId)));
      await enqueue({
        org_id: orgId,
        entity_type: "ai_suggestion",
        entity_id: suggestionId,
        operation: "UPDATE",
        payload: { status: "REJECTED", rejected_at: now },
        target_provider: "ITM",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-suggestions", orgId] });
    },
  });
}
