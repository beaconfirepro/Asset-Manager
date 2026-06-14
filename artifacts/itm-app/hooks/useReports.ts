import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { and, eq } from "drizzle-orm";
import { Platform } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { getDb } from "@/db/client";
import {
  inspectionReports,
  inspectionReportItems,
  inspectionResults,
  type InspectionReport,
  type InspectionReportItem,
  type InspectionResult,
  type NewInspectionReport,
  type NewInspectionReportItem,
} from "@/db/schema";
import { getHubSpotConnector } from "@/lib/integrations/hubspot";
import { getQBOConnector } from "@/lib/integrations/qbo";
import { enqueue, genId } from "@/lib/sync";

function nowIso() { return new Date().toISOString(); }

export type ReportWithResult = InspectionReport & { result?: InspectionResult };

export function useReports() {
  const { orgId } = useAuth();
  return useQuery({
    queryKey: ["reports", orgId],
    enabled: Platform.OS !== "web" && !!orgId,
    queryFn: async (): Promise<ReportWithResult[]> => {
      if (!orgId) return [];
      const db = await getDb();
      const reports = await db
        .select()
        .from(inspectionReports)
        .where(eq(inspectionReports.org_id, orgId));
      const results = await db
        .select()
        .from(inspectionResults)
        .where(eq(inspectionResults.org_id, orgId));
      return reports.map((r) => ({
        ...r,
        result: results.find((res) => res.id === r.result_id),
      }));
    },
    staleTime: 60_000,
  });
}

export function useReport(reportId: string | undefined) {
  const { orgId } = useAuth();
  return useQuery({
    queryKey: ["report", orgId, reportId],
    enabled: Platform.OS !== "web" && !!orgId && !!reportId,
    queryFn: async (): Promise<ReportWithResult | null> => {
      if (!orgId || !reportId) return null;
      const db = await getDb();
      const rows = await db
        .select()
        .from(inspectionReports)
        .where(and(eq(inspectionReports.org_id, orgId), eq(inspectionReports.id, reportId)));
      const report = rows[0];
      if (!report) return null;
      const resultRows = await db
        .select()
        .from(inspectionResults)
        .where(eq(inspectionResults.id, report.result_id));
      return { ...report, result: resultRows[0] };
    },
    staleTime: 30_000,
  });
}

export function useReportItems(reportId: string | undefined) {
  const { orgId } = useAuth();
  return useQuery({
    queryKey: ["report-items", orgId, reportId],
    enabled: Platform.OS !== "web" && !!orgId && !!reportId,
    queryFn: async (): Promise<InspectionReportItem[]> => {
      if (!orgId || !reportId) return [];
      const db = await getDb();
      return db
        .select()
        .from(inspectionReportItems)
        .where(and(eq(inspectionReportItems.org_id, orgId), eq(inspectionReportItems.report_id, reportId)));
    },
    staleTime: 30_000,
  });
}

export function useReportForResult(resultId: string | undefined) {
  const { orgId } = useAuth();
  return useQuery({
    queryKey: ["report-for-result", orgId, resultId],
    enabled: Platform.OS !== "web" && !!orgId && !!resultId,
    queryFn: async (): Promise<InspectionReport | null> => {
      if (!orgId || !resultId) return null;
      const db = await getDb();
      const rows = await db
        .select()
        .from(inspectionReports)
        .where(and(eq(inspectionReports.org_id, orgId), eq(inspectionReports.result_id, resultId)));
      return rows[0] ?? null;
    },
    staleTime: 30_000,
  });
}

export function useCreateReport() {
  const { orgId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      resultId: string;
      title: string;
      hubspotCustomerId?: string;
    }): Promise<InspectionReport> => {
      if (!orgId) throw new Error("Not authenticated");
      const db = await getDb();
      const now = nowIso();
      const reportId = genId();
      const report: NewInspectionReport = {
        id: reportId,
        org_id: orgId,
        result_id: params.resultId,
        title: params.title,
        status: "DRAFT",
        pdf_url: null,
        hubspot_customer_id: params.hubspotCustomerId ?? null,
        sent_at: null,
        report_config: JSON.stringify({ format: "NFPA", deficiencies_only: false, include_photos: true }),
        created_at: now,
        updated_at: now,
        sync_status: "PENDING",
      };
      await db.insert(inspectionReports).values(report);
      const summaryItem: NewInspectionReportItem = {
        id: genId(),
        org_id: orgId,
        report_id: reportId,
        item_type: "SUMMARY",
        content: `Inspection report generated — ${new Date().toLocaleDateString()}`,
        sort_order: 0,
        is_visible: true,
        created_at: now,
        updated_at: now,
        sync_status: "PENDING",
      };
      await db.insert(inspectionReportItems).values(summaryItem);
      await enqueue({
        org_id: orgId,
        entity_type: "inspection_report",
        entity_id: reportId,
        operation: "CREATE",
        payload: { report_id: reportId, result_id: params.resultId },
        target_provider: "ITM",
      });
      return report as InspectionReport;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reports", orgId] });
      qc.invalidateQueries({ queryKey: ["report-for-result", orgId] });
    },
  });
}

export function useUpdateReport() {
  const { orgId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      reportId: string;
      updates: Partial<Pick<InspectionReport, "status" | "pdf_url" | "report_config" | "title" | "hubspot_customer_id" | "sent_at">>;
    }): Promise<void> => {
      if (!orgId) throw new Error("Not authenticated");
      const db = await getDb();
      await db
        .update(inspectionReports)
        .set({ ...params.updates, updated_at: nowIso(), sync_status: "PENDING" })
        .where(and(eq(inspectionReports.org_id, orgId), eq(inspectionReports.id, params.reportId)));
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["reports", orgId] });
      qc.invalidateQueries({ queryKey: ["report", orgId, variables.reportId] });
    },
  });
}

export function useUpdateQaStatus() {
  const { orgId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      resultId: string;
      qaStatus: "PENDING" | "APPROVED" | "REJECTED";
      qaReviewerId?: string;
      qaNotes?: string;
    }): Promise<void> => {
      if (!orgId) throw new Error("Not authenticated");
      const db = await getDb();
      const now = nowIso();
      await db
        .update(inspectionResults)
        .set({
          qa_status: params.qaStatus,
          qa_reviewer_id: params.qaReviewerId ?? null,
          qa_reviewed_at: now,
          qa_notes: params.qaNotes ?? null,
          status: params.qaStatus === "APPROVED" ? "APPROVED" : params.qaStatus === "REJECTED" ? "SUBMITTED" : "QA_REVIEW",
          updated_at: now,
          sync_status: "PENDING",
        })
        .where(and(eq(inspectionResults.org_id, orgId), eq(inspectionResults.id, params.resultId)));
      await enqueue({
        org_id: orgId,
        entity_type: "inspection_result",
        entity_id: params.resultId,
        operation: "UPDATE",
        payload: { qa_status: params.qaStatus, qa_notes: params.qaNotes },
        target_provider: "ITM",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inspection-results", orgId] });
      qc.invalidateQueries({ queryKey: ["inspection-result", orgId] });
    },
  });
}

export function useStorePdfUrl() {
  const { orgId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { reportId: string; pdfUrl: string }): Promise<void> => {
      if (!orgId) throw new Error("Not authenticated");
      const db = await getDb();
      await db
        .update(inspectionReports)
        .set({ pdf_url: params.pdfUrl, status: "APPROVED", updated_at: nowIso(), sync_status: "PENDING" })
        .where(and(eq(inspectionReports.org_id, orgId), eq(inspectionReports.id, params.reportId)));
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["reports", orgId] });
      qc.invalidateQueries({ queryKey: ["report", orgId, variables.reportId] });
    },
  });
}

export function useSendReport() {
  const { orgId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      reportId: string;
      hubspotCustomerId: string;
      pdfUrl: string;
      message?: string;
      enqueueInvoice?: boolean;
      contractedAmount?: number;
    }): Promise<void> => {
      if (!orgId) throw new Error("Not authenticated");
      await getHubSpotConnector().deliverReport({
        org_id: orgId,
        hubspot_customer_id: params.hubspotCustomerId,
        report_id: params.reportId,
        pdf_url: params.pdfUrl,
      });
      if (params.enqueueInvoice) {
        await getQBOConnector().createInvoice({
          org_id: orgId,
          hubspot_customer_id: params.hubspotCustomerId,
          report_id: params.reportId,
          line_items: [{ description: "Inspection services", quantity: 1, unit_price: params.contractedAmount ?? 0 }],
        });
      }
      const db = await getDb();
      await db
        .update(inspectionReports)
        .set({ status: "SENT", sent_at: nowIso(), updated_at: nowIso(), sync_status: "PENDING" })
        .where(and(eq(inspectionReports.org_id, orgId), eq(inspectionReports.id, params.reportId)));
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["reports", orgId] });
      qc.invalidateQueries({ queryKey: ["report", orgId, variables.reportId] });
    },
  });
}
