import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { inspectionSchedules, type InspectionSchedule, type InspectionContract } from "@/db/schema";
import { getHubSpotConnector } from "@/lib/integrations/hubspot";
import { cloudList, cloudUpsert } from "@/lib/cloud/repo";
import { enqueue, genId } from "@/lib/sync";
import { generateScheduleDates } from "./generateSchedules";

type Db = Awaited<ReturnType<typeof getDb>>;

export async function reconcileSchedules(
  db: Db,
  orgId: string,
  contract: InspectionContract,
): Promise<void> {
  const now = new Date().toISOString();
  const todayIso = now.slice(0, 10);
  const connector = getHubSpotConnector();

  const targetDates = new Set(generateScheduleDates(contract));

  const existing = await db
    .select()
    .from(inspectionSchedules)
    .where(
      and(
        eq(inspectionSchedules.org_id, orgId),
        eq(inspectionSchedules.contract_id, contract.id),
      ),
    );

  const existingDateMap = new Map(
    existing.map((s) => [s.scheduled_date.slice(0, 10), s]),
  );

  const existingFuture = existing.filter(
    (s) => s.scheduled_date.slice(0, 10) >= todayIso && s.status !== "CANCELLED",
  );

  for (const sched of existingFuture) {
    const d = sched.scheduled_date.slice(0, 10);
    if (!targetDates.has(d)) {
      await db
        .update(inspectionSchedules)
        .set({ status: "CANCELLED", updated_at: now, sync_status: "PENDING" })
        .where(eq(inspectionSchedules.id, sched.id));

      await enqueue({
        org_id: orgId,
        entity_type: "inspection_schedule",
        entity_id: sched.id,
        operation: "UPDATE",
        payload: { status: "CANCELLED" },
        target_provider: "ITM",
      });
    }
  }

  for (const date of targetDates) {
    const existing_sched = existingDateMap.get(date);
    if (!existing_sched) {
      const scheduleId = genId();
      const isDue = date <= todayIso;

      await db.insert(inspectionSchedules).values({
        id: scheduleId,
        org_id: orgId,
        contract_id: contract.id,
        hubspot_asset_id: contract.hubspot_asset_id,
        scheduled_date: date,
        status: "DRAFT",
        hubspot_inspection_ticket_id: null,
        rescheduled_from: null,
        notes: null,
        created_at: now,
        updated_at: now,
        sync_status: "PENDING",
      });

      await enqueue({
        org_id: orgId,
        entity_type: "inspection_schedule",
        entity_id: scheduleId,
        operation: "CREATE",
        payload: {
          id: scheduleId,
          contract_id: contract.id,
          hubspot_asset_id: contract.hubspot_asset_id,
          scheduled_date: date,
        },
        target_provider: "ITM",
      });

      if (isDue) {
        const result = await connector.createInspectionTicket({
          org_id: orgId,
          hubspot_asset_id: contract.hubspot_asset_id,
          schedule_id: scheduleId,
          scheduled_date: date,
        });
        await db
          .update(inspectionSchedules)
          .set({
            hubspot_inspection_ticket_id: `pending_${result.client_uuid}`,
            updated_at: now,
          })
          .where(eq(inspectionSchedules.id, scheduleId));
      }
    } else if (
      existing_sched.status === "CANCELLED" &&
      date >= todayIso
    ) {
      await db
        .update(inspectionSchedules)
        .set({ status: "DRAFT", updated_at: now, sync_status: "PENDING" })
        .where(eq(inspectionSchedules.id, existing_sched.id));

      await enqueue({
        org_id: orgId,
        entity_type: "inspection_schedule",
        entity_id: existing_sched.id,
        operation: "UPDATE",
        payload: { status: "DRAFT" },
        target_provider: "ITM",
      });
    }
  }
}

// Web variant: reconciles schedules directly against the cloud Postgres API.
// Mirrors reconcileSchedules but skips offline outbox + HubSpot ticket creation.
export async function reconcileSchedulesCloud(
  orgId: string,
  contract: InspectionContract,
): Promise<void> {
  const now = new Date().toISOString();
  const todayIso = now.slice(0, 10);

  const targetDates = new Set(generateScheduleDates(contract));

  const all = await cloudList<InspectionSchedule>("inspection_schedules", orgId);
  const existing = all.filter((s) => s.contract_id === contract.id);

  const existingDateMap = new Map(
    existing.map((s) => [s.scheduled_date.slice(0, 10), s]),
  );

  const existingFuture = existing.filter(
    (s) => s.scheduled_date.slice(0, 10) >= todayIso && s.status !== "CANCELLED",
  );

  for (const sched of existingFuture) {
    const d = sched.scheduled_date.slice(0, 10);
    if (!targetDates.has(d)) {
      await cloudUpsert<InspectionSchedule>("inspection_schedules", {
        ...sched,
        status: "CANCELLED",
        updated_at: now,
        sync_status: "SYNCED",
      });
    }
  }

  for (const date of targetDates) {
    const existing_sched = existingDateMap.get(date);
    if (!existing_sched) {
      await cloudUpsert<InspectionSchedule>("inspection_schedules", {
        id: genId(),
        org_id: orgId,
        contract_id: contract.id,
        hubspot_asset_id: contract.hubspot_asset_id,
        scheduled_date: date,
        status: "DRAFT",
        hubspot_inspection_ticket_id: null,
        rescheduled_from: null,
        notes: null,
        created_at: now,
        updated_at: now,
        sync_status: "SYNCED",
      });
    } else if (existing_sched.status === "CANCELLED" && date >= todayIso) {
      await cloudUpsert<InspectionSchedule>("inspection_schedules", {
        ...existing_sched,
        status: "DRAFT",
        updated_at: now,
        sync_status: "SYNCED",
      });
    }
  }
}
