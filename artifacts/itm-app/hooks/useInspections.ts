import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { and, eq } from "drizzle-orm";
import { Platform } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { getDb } from "@/db/client";
import {
  inspectionResults,
  type InspectionResult,
  type NewInspectionResult,
} from "@/db/schema";
import { getHubSpotConnector } from "@/lib/integrations/hubspot";
import { enqueue, genId } from "@/lib/sync";
import { isDeficient, type FormField } from "@/lib/inspections/formSchema";

export function useInspectionResult(scheduleId: string | undefined) {
  const { orgId } = useAuth();
  return useQuery({
    queryKey: ["inspection-result", orgId, scheduleId],
    enabled: Platform.OS !== "web" && !!orgId && !!scheduleId,
    queryFn: async (): Promise<InspectionResult | null> => {
      if (!orgId || !scheduleId) return null;
      const db = await getDb();
      const rows = await db
        .select()
        .from(inspectionResults)
        .where(and(eq(inspectionResults.org_id, orgId), eq(inspectionResults.schedule_id, scheduleId)));
      return rows[0] ?? null;
    },
    staleTime: 30_000,
  });
}

export function useInspectionResults() {
  const { orgId } = useAuth();
  return useQuery({
    queryKey: ["inspection-results", orgId],
    enabled: Platform.OS !== "web" && !!orgId,
    queryFn: async (): Promise<InspectionResult[]> => {
      if (!orgId) return [];
      const db = await getDb();
      return db.select().from(inspectionResults).where(eq(inspectionResults.org_id, orgId));
    },
    staleTime: 60_000,
  });
}

export function usePreviousInspection(hubspotAssetId: string | undefined) {
  const { orgId } = useAuth();
  return useQuery({
    queryKey: ["prev-inspection", orgId, hubspotAssetId],
    enabled: Platform.OS !== "web" && !!orgId && !!hubspotAssetId,
    queryFn: async (): Promise<InspectionResult | null> => {
      if (!orgId || !hubspotAssetId) return null;
      const db = await getDb();
      const rows = await db
        .select()
        .from(inspectionResults)
        .where(and(eq(inspectionResults.org_id, orgId), eq(inspectionResults.hubspot_asset_id, hubspotAssetId)));
      const submitted = rows
        .filter((r) => r.status === "QA_REVIEW" || r.status === "APPROVED")
        .sort((a, b) => (b.submitted_at ?? "").localeCompare(a.submitted_at ?? ""));
      return submitted[0] ?? null;
    },
    staleTime: 5 * 60_000,
  });
}

type StartInspectionParams = {
  scheduleId: string;
  formId: string;
  hubspotAssetId: string;
  inspectorId: string;
};

export function useStartInspection() {
  const { orgId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: StartInspectionParams): Promise<InspectionResult | undefined> => {
      if (Platform.OS === "web" || !orgId) return;
      const db = await getDb();
      const now = new Date().toISOString();

      const existing = await db
        .select()
        .from(inspectionResults)
        .where(and(eq(inspectionResults.org_id, orgId), eq(inspectionResults.schedule_id, params.scheduleId)));
      if (existing[0]) return existing[0];

      const clientUuid = genId();
      const resultId = genId();
      const newResult: NewInspectionResult = {
        id: resultId,
        org_id: orgId,
        schedule_id: params.scheduleId,
        form_id: params.formId,
        inspector_id: params.inspectorId,
        hubspot_asset_id: params.hubspotAssetId,
        status: "DRAFT",
        form_data: "{}",
        gps_lat: null,
        gps_lng: null,
        photo_urls: null,
        signature_url: null,
        started_at: now,
        submitted_at: null,
        client_uuid: clientUuid,
        hubspot_deficiency_ticket_id: null,
        qa_status: null,
        qa_reviewer_id: null,
        qa_reviewed_at: null,
        qa_notes: null,
        created_at: now,
        updated_at: now,
        sync_status: "PENDING",
      };
      await db.insert(inspectionResults).values(newResult);
      await enqueue({
        org_id: orgId,
        entity_type: "inspection_result",
        entity_id: resultId,
        operation: "CREATE",
        payload: { id: resultId, client_uuid: clientUuid, schedule_id: params.scheduleId },
        target_provider: "ITM",
        client_uuid: clientUuid,
      });
      return newResult as InspectionResult;
    },
    onSuccess: (_, params) => {
      qc.invalidateQueries({ queryKey: ["inspection-result", orgId, params.scheduleId] });
      qc.invalidateQueries({ queryKey: ["inspection-results", orgId] });
    },
  });
}

type SaveAnswerParams = {
  resultId: string;
  field: FormField;
  answer: string | boolean | string[] | null;
  hubspotAssetId: string;
};

export function useSaveAnswer() {
  const { orgId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: SaveAnswerParams): Promise<string | undefined> => {
      if (Platform.OS === "web" || !orgId) return;
      const db = await getDb();
      const now = new Date().toISOString();

      const [latestResult] = await db
        .select()
        .from(inspectionResults)
        .where(and(eq(inspectionResults.id, params.resultId), eq(inspectionResults.org_id, orgId)));

      const formData = JSON.parse(latestResult?.form_data ?? "{}") as Record<string, unknown>;
      formData[params.field.id] = params.answer;

      const defEnqueuedKey = `_def_enqueued_${params.field.id}`;
      const alreadyEnqueued = formData[defEnqueuedKey] === true;

      let deficiencyTicketId: string | undefined;

      if (isDeficient(params.field, params.answer) && !alreadyEnqueued) {
        try {
          const connector = getHubSpotConnector();
          const outboxItem = await connector.createDeficiencyTicket({
            org_id: orgId,
            hubspot_asset_id: params.hubspotAssetId,
            inspection_result_id: params.resultId,
            deficiency_description: `Auto-detected deficiency: ${params.field.label} → ${params.answer}`,
            severity: params.field.deficiency_severity ?? "MEDIUM",
          });
          formData[defEnqueuedKey] = true;
          formData[`_def_ticket_${params.field.id}`] = `pending_${outboxItem.client_uuid}`;
          deficiencyTicketId = `pending_${outboxItem.client_uuid}`;
        } catch {
        }
      }

      const newFormDataStr = JSON.stringify(formData);

      await db
        .update(inspectionResults)
        .set({
          form_data: newFormDataStr,
          updated_at: now,
          sync_status: "PENDING",
          ...(deficiencyTicketId ? { hubspot_deficiency_ticket_id: deficiencyTicketId } : {}),
        })
        .where(and(eq(inspectionResults.id, params.resultId), eq(inspectionResults.org_id, orgId)));

      return newFormDataStr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inspection-result", orgId] });
    },
  });
}

type EnqueueDeficiencyParams = {
  resultId: string;
  field: FormField;
  answer: string | boolean | string[] | null;
  hubspotAssetId: string;
  description: string;
  severity: string;
};

export function useEnqueueDeficiency() {
  const { orgId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: EnqueueDeficiencyParams): Promise<string | undefined> => {
      if (Platform.OS === "web" || !orgId) return;
      const db = await getDb();
      const now = new Date().toISOString();

      const [currentResult] = await db
        .select()
        .from(inspectionResults)
        .where(and(eq(inspectionResults.id, params.resultId), eq(inspectionResults.org_id, orgId)));

      if (!currentResult) return;

      const currentFormData = JSON.parse(currentResult.form_data) as Record<string, unknown>;
      const defEnqueuedKey = `_def_enqueued_${params.field.id}`;
      if (currentFormData[defEnqueuedKey] === true) {
        return currentResult.hubspot_deficiency_ticket_id ?? undefined;
      }

      const connector = getHubSpotConnector();
      const outboxItem = await connector.createDeficiencyTicket({
        org_id: orgId,
        hubspot_asset_id: params.hubspotAssetId,
        inspection_result_id: params.resultId,
        deficiency_description: params.description || `Deficiency on: ${params.field.label} — ${params.answer}`,
        severity: params.severity,
      });

      const ticketId = `pending_${outboxItem.client_uuid}`;
      currentFormData[defEnqueuedKey] = true;
      currentFormData[`_def_ticket_${params.field.id}`] = ticketId;

      await db
        .update(inspectionResults)
        .set({
          hubspot_deficiency_ticket_id: ticketId,
          form_data: JSON.stringify(currentFormData),
          updated_at: now,
          sync_status: "PENDING",
        })
        .where(and(eq(inspectionResults.id, params.resultId), eq(inspectionResults.org_id, orgId)));

      return ticketId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inspection-result", orgId] });
    },
  });
}

type AttachMediaParams = {
  resultId: string;
  scheduleId: string;
  type: "photo" | "photo_remove" | "signature" | "gps";
  photoUrl?: string;
  replacePhotoUrls?: string[];
  signatureUrl?: string;
  gpsLat?: number;
  gpsLng?: number;
  currentPhotoUrls?: string | null;
};

export function useAttachMedia() {
  const { orgId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: AttachMediaParams) => {
      if (Platform.OS === "web" || !orgId) return;
      const db = await getDb();
      const now = new Date().toISOString();

      if (params.type === "photo" && params.photoUrl) {
        const existing = params.currentPhotoUrls ? (JSON.parse(params.currentPhotoUrls) as string[]) : [];
        await db
          .update(inspectionResults)
          .set({ photo_urls: JSON.stringify([...existing, params.photoUrl]), updated_at: now, sync_status: "PENDING" })
          .where(and(eq(inspectionResults.id, params.resultId), eq(inspectionResults.org_id, orgId)));
      } else if (params.type === "photo_remove" && params.replacePhotoUrls) {
        await db
          .update(inspectionResults)
          .set({ photo_urls: JSON.stringify(params.replacePhotoUrls), updated_at: now, sync_status: "PENDING" })
          .where(and(eq(inspectionResults.id, params.resultId), eq(inspectionResults.org_id, orgId)));
      } else if (params.type === "signature" && params.signatureUrl) {
        await db
          .update(inspectionResults)
          .set({ signature_url: params.signatureUrl, updated_at: now, sync_status: "PENDING" })
          .where(and(eq(inspectionResults.id, params.resultId), eq(inspectionResults.org_id, orgId)));
      } else if (params.type === "gps") {
        await db
          .update(inspectionResults)
          .set({ gps_lat: params.gpsLat ?? null, gps_lng: params.gpsLng ?? null, updated_at: now, sync_status: "PENDING" })
          .where(and(eq(inspectionResults.id, params.resultId), eq(inspectionResults.org_id, orgId)));
      }
    },
    onSuccess: (_, params) => {
      qc.invalidateQueries({ queryKey: ["inspection-result", orgId, params.scheduleId] });
    },
  });
}

export function useSubmitInspection() {
  const { orgId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { resultId: string; scheduleId: string; clientUuid: string }) => {
      if (Platform.OS === "web" || !orgId) return;
      const db = await getDb();
      const now = new Date().toISOString();

      await db
        .update(inspectionResults)
        .set({ status: "QA_REVIEW", submitted_at: now, updated_at: now, sync_status: "PENDING" })
        .where(and(eq(inspectionResults.id, params.resultId), eq(inspectionResults.org_id, orgId)));

      const [fullResult] = await db
        .select()
        .from(inspectionResults)
        .where(and(eq(inspectionResults.id, params.resultId), eq(inspectionResults.org_id, orgId)));

      await enqueue({
        org_id: orgId,
        entity_type: "inspection_result",
        entity_id: params.resultId,
        operation: "UPDATE",
        client_uuid: params.clientUuid,
        payload: {
          id: params.resultId,
          org_id: orgId,
          schedule_id: fullResult?.schedule_id,
          form_id: fullResult?.form_id,
          inspector_id: fullResult?.inspector_id,
          hubspot_asset_id: fullResult?.hubspot_asset_id,
          status: "QA_REVIEW",
          form_data: fullResult?.form_data ?? "{}",
          photo_urls: fullResult?.photo_urls ?? null,
          signature_url: fullResult?.signature_url ?? null,
          gps_lat: fullResult?.gps_lat ?? null,
          gps_lng: fullResult?.gps_lng ?? null,
          hubspot_deficiency_ticket_id: fullResult?.hubspot_deficiency_ticket_id ?? null,
          started_at: fullResult?.started_at,
          submitted_at: now,
          client_uuid: params.clientUuid,
          _sync_endpoint: "/itm/inspections/sync",
          _idempotency_key: params.clientUuid,
        },
        target_provider: "ITM",
      });
    },
    onSuccess: (_, params) => {
      qc.invalidateQueries({ queryKey: ["inspection-result", orgId, params.scheduleId] });
      qc.invalidateQueries({ queryKey: ["inspection-results", orgId] });
      qc.invalidateQueries({ queryKey: ["dashboard", orgId] });
    },
  });
}
