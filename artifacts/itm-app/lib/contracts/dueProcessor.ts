import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { inspectionSchedules } from "@/db/schema";
import { getHubSpotConnector } from "@/lib/integrations/hubspot";

export async function processDueSchedules(orgId: string): Promise<number> {
  const db = await getDb();
  const connector = getHubSpotConnector();
  const todayIso = new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();

  const all = await db
    .select()
    .from(inspectionSchedules)
    .where(eq(inspectionSchedules.org_id, orgId));

  const due = all.filter(
    (s) =>
      s.scheduled_date.slice(0, 10) <= todayIso &&
      s.status !== "CANCELLED" &&
      !s.hubspot_inspection_ticket_id,
  );

  for (const sched of due) {
    const result = await connector.createInspectionTicket({
      org_id: orgId,
      hubspot_asset_id: sched.hubspot_asset_id,
      schedule_id: sched.id,
      scheduled_date: sched.scheduled_date,
    });

    await db
      .update(inspectionSchedules)
      .set({
        hubspot_inspection_ticket_id: `pending_${result.client_uuid}`,
        updated_at: now,
      })
      .where(eq(inspectionSchedules.id, sched.id));
  }

  return due.length;
}
