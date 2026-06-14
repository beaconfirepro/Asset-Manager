import * as Print from "expo-print";
import type { InspectionReport, InspectionReportItem, InspectionResult } from "@/db/schema";

export type ReportConfig = {
  format: "NFPA" | "JOINT_COMMISSION" | "DEFICIENCIES_ONLY" | "SERVICE_SUMMARY";
  deficiencies_only: boolean;
  include_photos: boolean;
  cover_letter?: string;
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function systemTypeLabel(type: string): string {
  const map: Record<string, string> = {
    FIRE_SPRINKLER: "Fire Sprinkler",
    FIRE_ALARM: "Fire Alarm",
    SUPPRESSION: "Suppression",
    KITCHEN_HOOD: "Kitchen Hood",
    SPECIAL_HAZARD: "Special Hazard",
    EMERGENCY_LIGHTING: "Emergency Lighting",
  };
  return map[type] ?? type;
}

function itemsHtml(items: InspectionReportItem[], config: ReportConfig): string {
  const visible = items.filter((i) => i.is_visible);
  if (!visible.length) return "<p>No report items.</p>";
  return visible.map((item) => {
    if (item.item_type === "SUMMARY") {
      return `<div class="item summary"><h3>Summary</h3><p>${item.content}</p></div>`;
    }
    if (item.item_type === "FINDING") {
      return `<div class="item finding"><h3>Finding</h3><p>${item.content}</p></div>`;
    }
    if (item.item_type === "PHOTO" && config.include_photos) {
      return `<div class="item photo"><h3>Photo</h3><p class="muted">[Photo attachment — ${item.content}]</p></div>`;
    }
    return `<div class="item"><p>${item.content}</p></div>`;
  }).join("");
}

function formAnswersHtml(result: InspectionResult): string {
  try {
    const data = JSON.parse(result.form_data ?? "{}") as Record<string, unknown>;
    const rows = Object.entries(data).map(([k, v]) => {
      const val = v === true ? "✓ Yes" : v === false ? "✗ No" : String(v ?? "—");
      const label = k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      return `<tr><td>${label}</td><td><strong>${val}</strong></td></tr>`;
    });
    if (!rows.length) return "<p>No answers recorded.</p>";
    return `<table class="answers"><thead><tr><th>Question</th><th>Answer</th></tr></thead><tbody>${rows.join("")}</tbody></table>`;
  } catch {
    return "<p>Answer data unavailable.</p>";
  }
}

export function buildReportHtml(
  report: InspectionReport,
  result: InspectionResult,
  items: InspectionReportItem[],
  config: ReportConfig,
): string {
  const assetLabel = result.hubspot_asset_id ?? "—";
  const inspectionDate = formatDate(result.started_at);
  const formatLabel = config.format === "JOINT_COMMISSION" ? "Joint Commission" : "NFPA";
  const statusColor = result.status === "APPROVED" || result.status === "COMPLETED" ? "#1a7f37" : "#d93025";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${report.title ?? "Inspection Report"}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 11pt; color: #1a1a1a; background: #fff; }
    .page { max-width: 800px; margin: 0 auto; padding: 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #e85d2f; padding-bottom: 20px; margin-bottom: 24px; }
    .brand { }
    .brand-name { font-size: 22pt; font-weight: 700; color: #0a1628; }
    .brand-tag { font-size: 9pt; color: #666; margin-top: 2px; }
    .report-meta { text-align: right; font-size: 9pt; color: #555; }
    .report-meta .report-num { font-size: 11pt; font-weight: 600; color: #0a1628; }
    h1 { font-size: 16pt; color: #0a1628; margin-bottom: 8px; }
    h2 { font-size: 13pt; color: #0a1628; margin: 24px 0 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
    h3 { font-size: 11pt; color: #333; margin-bottom: 6px; }
    .status-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 9pt; font-weight: 700; background: ${statusColor}22; color: ${statusColor}; text-transform: uppercase; letter-spacing: 0.5px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 16px 0; }
    .info-item { background: #f9fafb; padding: 12px 14px; border-radius: 6px; border-left: 3px solid #e85d2f; }
    .info-label { font-size: 8pt; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px; }
    .info-value { font-size: 10pt; font-weight: 600; color: #1a1a1a; }
    .cover-letter { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px 20px; margin: 20px 0; font-size: 10pt; line-height: 1.6; color: #444; }
    .answers { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 10pt; }
    .answers th { background: #0a1628; color: #fff; padding: 8px 12px; text-align: left; font-size: 9pt; }
    .answers td { padding: 7px 12px; border-bottom: 1px solid #f0f0f0; }
    .answers tr:nth-child(even) td { background: #f9fafb; }
    .item { margin: 12px 0; padding: 12px 16px; border-radius: 6px; border: 1px solid #e5e7eb; }
    .item.finding { border-left: 4px solid #e85d2f; }
    .item.summary { border-left: 4px solid #1a7f37; }
    .item.photo { border-left: 4px solid #0a1628; }
    .muted { color: #888; font-style: italic; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; font-size: 8pt; color: #888; }
    .accent { color: #e85d2f; font-weight: 600; }
    @page { margin: 20mm; }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="brand">
        <div class="brand-name">Beacon Fire Protection</div>
        <div class="brand-tag">Inspection · Testing · Maintenance</div>
      </div>
      <div class="report-meta">
        <div class="report-num">${report.title ?? "Inspection Report"}</div>
        <div>Format: ${formatLabel}</div>
        <div>Generated: ${formatDate(report.created_at)}</div>
        <div style="margin-top:6px"><span class="status-badge">${report.status}</span></div>
      </div>
    </div>

    <h1>${report.title ?? "Inspection Report"}</h1>

    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Asset ID</div>
        <div class="info-value">${assetLabel}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Inspection Date</div>
        <div class="info-value">${inspectionDate}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Inspector</div>
        <div class="info-value">${result.inspector_id ?? "—"}</div>
      </div>
      <div class="info-item">
        <div class="info-label">QA Status</div>
        <div class="info-value">${result.qa_status ?? "—"}</div>
      </div>
    </div>

    ${config.cover_letter ? `
    <h2>Cover Letter</h2>
    <div class="cover-letter">${config.cover_letter}</div>
    ` : ""}

    <h2>Inspection Results</h2>
    ${formAnswersHtml(result)}

    <h2>Report Items</h2>
    ${itemsHtml(items, config)}

    ${result.signature_url ? `
    <h2>Signatures</h2>
    <p>Inspector signature captured on file.</p>
    ` : ""}

    <div class="footer">
      <div>&copy; ${new Date().getFullYear()} Beacon Fire Protection &mdash; Confidential</div>
      <div>Delivered via HubSpot Customer Portal &middot; <span class="accent">NFPA Compliant</span></div>
    </div>
  </div>
</body>
</html>`;
}

export async function generateReportPdf(
  report: InspectionReport,
  result: InspectionResult,
  items: InspectionReportItem[],
  config: ReportConfig,
): Promise<string> {
  const html = buildReportHtml(report, result, items, config);
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  return uri;
}
