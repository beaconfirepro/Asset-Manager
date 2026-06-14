import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { and, eq } from "drizzle-orm";
import { Platform } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { getDb } from "@/db/client";
import { syncOutboxItems, type SyncOutboxItem } from "@/db/schema";

export function useOutboxConflicts(entityId: string | undefined) {
  const { orgId } = useAuth();
  return useQuery({
    queryKey: ["outbox-conflicts", orgId, entityId],
    enabled: Platform.OS !== "web" && !!orgId && !!entityId,
    queryFn: async (): Promise<SyncOutboxItem[]> => {
      if (!orgId || !entityId) return [];
      const db = await getDb();
      const rows = await db
        .select()
        .from(syncOutboxItems)
        .where(and(eq(syncOutboxItems.org_id, orgId), eq(syncOutboxItems.entity_id, entityId)));
      return rows.filter((r) => r.status === "FAILED" || r.status === "CONFLICT");
    },
    staleTime: 15_000,
    refetchInterval: 20_000,
  });
}

export function useRetryOutboxItem() {
  const { orgId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { outboxItemId: string; entityId: string }) => {
      if (Platform.OS === "web" || !orgId) return;
      const db = await getDb();
      await db
        .update(syncOutboxItems)
        .set({ status: "PENDING", attempts: 0, error: null, updated_at: new Date().toISOString() })
        .where(and(eq(syncOutboxItems.id, params.outboxItemId), eq(syncOutboxItems.org_id, orgId)));
    },
    onSuccess: (_, params) => {
      qc.invalidateQueries({ queryKey: ["outbox-conflicts", orgId, params.entityId] });
    },
  });
}
