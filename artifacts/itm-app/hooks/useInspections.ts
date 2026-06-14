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
        .where(
          and(
            eq(inspectionResults.org_id, orgId),
            eq(inspectionResults.schedule_id, scheduleId),
          ),
        );
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
      return db
        .select()
        .from(inspectionResults)
        .where(eq(inspectionResults.org_id, orgId));
    },
    staleTime: 60_000,
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
        .where(
          and(
            eq(inspectionResults.org_id, orgId),
            eq(inspectionResults.schedule_id, params.scheduleId),
          ),
        );

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
  currentFormData: string;
};

export function useSaveAnswer() {
  const { orgId } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: SaveAnswerParams) => {
      if (Platform.OS === "web" || !orgId) return;
      const db = await getDb();
      const now = new Date().toISOString();

      const formData = JSON.parse(params.currentFormData) as Record<string, unknown>;
      formData[params.field.id] = params.answer;
      const newFormDataStr = JSON.stringify(formData);

      await db
        .update(inspectionResults)
        .set({ form_data: newFormDataStr, updated_at: now, sync_status: "PENDING" })
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
    mutationFn: async (params: EnqueueDeficiencyParams) => {
      if (Platform.OS === "web" || !orgId) return;
      const db = await getDb();
      const now = new Date().toISOString();

      const connector = getHubSpotConnector();
      const outboxItem = await connector.createDeficiencyTicket({
        org_id: orgId,
        hubspot_asset_id: params.hubspotAssetId,
        inspection_result_id: params.resultId,
        deficiency_description: params.description || `Deficiency on: ${params.field.label} — ${params.answer}`,
        severity: params.severity,
      });

      await db
        .update(inspectionResults)
        .set({
          hubspot_deficiency_ticket_id: `pending_${outboxItem.client_uuid}`,
          updated_at: now,
          sync_status: "PENDING",
        })
        .where(and(eq(inspectionResults.id, params.resultId), eq(inspectionResults.org_id, orgId)));

      return outboxItem.client_uuid;
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
        const existing = params.currentPhotoUrls ? JSON.parse(params.currentPhotoUrls) as string[] : [];
        const updated = [...existing, params.photoUrl];
        await db.update(inspectionResults)
          .set({ photo_urls: JSON.stringify(updated), updated_at: now, sync_status: "PENDING" })
          .where(and(eq(inspectionResults.id, params.resultId), eq(inspectionResults.org_id, orgId)));
      } else if (params.type === "photo_remove" && params.replacePhotoUrls) {
        await db.update(inspectionResults)
          .set({ photo_urls: JSON.stringify(params.replacePhotoUrls), updated_at: now, sync_status: "PENDING" })
          .where(and(eq(inspectionResults.id, params.resultId), eq(inspectionResults.org_id, orgId)));
      } else if (params.type === "signature" && params.signatureUrl) {
        await db.update(inspectionResults)
          .set({ signature_url: params.signatureUrl, updated_at: now, sync_status: "PENDING" })
          .where(and(eq(inspectionResults.id, params.resultId), eq(inspectionResults.org_id, orgId)));
      } else if (params.type === "gps") {
        await db.update(inspectionResults)
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

      await db.update(inspectionResults)
        .set({ status: "QA_REVIEW", submitted_at: now, updated_at: now, sync_status: "PENDING" })
        .where(and(eq(inspectionResults.id, params.resultId), eq(inspectionResults.org_id, orgId)));

      await enqueue({
        org_id: orgId,
        entity_type: "inspection_result",
        entity_id: params.resultId,
        operation: "UPDATE",
        payload: {
          status: "QA_REVIEW",
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
