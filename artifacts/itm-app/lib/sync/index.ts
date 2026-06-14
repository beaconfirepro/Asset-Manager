import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { syncOutboxItems, type NewSyncOutboxItem, type SyncOutboxItem } from "@/db/schema";
import { getITMApiClient } from "@/lib/api";

function nowIso(): string {
  return new Date().toISOString();
}

export function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

export type EnqueueParams = {
  org_id: string;
  entity_type: string;
  entity_id: string;
  operation: "CREATE" | "UPDATE" | "DELETE";
  payload: Record<string, unknown>;
  target_provider?: "HUBSPOT" | "CONNECTEAM" | "QBO" | "ITM";
  client_uuid?: string;
};

export async function enqueue(params: EnqueueParams): Promise<SyncOutboxItem> {
  const db = await getDb();
  const now = nowIso();
  const client_uuid = params.client_uuid ?? genId();
  const item: NewSyncOutboxItem = {
    id: genId(),
    org_id: params.org_id,
    entity_type: params.entity_type,
    entity_id: params.entity_id,
    operation: params.operation,
    payload: JSON.stringify(params.payload),
    target_provider: params.target_provider ?? "ITM",
    client_uuid,
    status: "PENDING",
    attempts: 0,
    last_attempt_at: null,
    error: null,
    created_at: now,
    updated_at: now,
  };
  await db.insert(syncOutboxItems).values(item);
  return item as SyncOutboxItem;
}

export async function drainOutbox(orgId: string): Promise<void> {
  const db = await getDb();
  const pending = await db
    .select()
    .from(syncOutboxItems)
    .where(
      and(
        eq(syncOutboxItems.org_id, orgId),
        eq(syncOutboxItems.status, "PENDING"),
      ),
    )
    .limit(20);

  for (const item of pending) {
    await db
      .update(syncOutboxItems)
      .set({ status: "IN_FLIGHT", updated_at: nowIso() })
      .where(eq(syncOutboxItems.id, item.id));

    try {
      await dispatchOutboxItem(item);
      await db
        .update(syncOutboxItems)
        .set({ status: "SYNCED", updated_at: nowIso() })
        .where(eq(syncOutboxItems.id, item.id));
    } catch (err) {
      const attempts = (item.attempts ?? 0) + 1;
      const newStatus = attempts >= 5 ? "FAILED" : "PENDING";
      await db
        .update(syncOutboxItems)
        .set({
          status: newStatus,
          attempts,
          last_attempt_at: nowIso(),
          error: err instanceof Error ? err.message : String(err),
          updated_at: nowIso(),
        })
        .where(eq(syncOutboxItems.id, item.id));
    }
  }
}

async function dispatchOutboxItem(item: SyncOutboxItem): Promise<void> {
  const payload = JSON.parse(item.payload);
  const api = getITMApiClient();
  await api.syncEntity(
    item.entity_type,
    item.operation,
    { ...payload, _target_provider: item.target_provider },
    item.client_uuid,
  );
}

export async function getPendingCount(orgId: string): Promise<number> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(syncOutboxItems)
    .where(
      and(
        eq(syncOutboxItems.org_id, orgId),
        eq(syncOutboxItems.status, "PENDING"),
      ),
    );
  return rows.length;
}

let drainInterval: ReturnType<typeof setInterval> | null = null;

export function startDrainRunner(orgId: string, intervalMs = 30_000): void {
  if (drainInterval) return;
  drainInterval = setInterval(() => {
    drainOutbox(orgId).catch(() => {});
  }, intervalMs);
}

export function stopDrainRunner(): void {
  if (drainInterval) {
    clearInterval(drainInterval);
    drainInterval = null;
  }
}
