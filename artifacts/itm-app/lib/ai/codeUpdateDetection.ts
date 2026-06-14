import type { InspectionForm, ComplianceStandard } from "@/db/schema";

export type FormCodeUpdateFlag = {
  form_id: string;
  form_name: string;
  standard_code: string;
  standard_version: string;
  form_updated_at: string;
  standard_effective_date: string;
  change_summary: string;
};

/**
 * Compares each active InspectionForm's `updated_at` timestamp against the
 * linked ComplianceStandard's `effective_date`. If the standard became effective
 * AFTER the form was last modified, the form is considered outdated and flagged.
 *
 * Pure function — no DB access; accepts data already loaded by TanStack Query.
 */
export function detectLocalCodeUpdates(
  forms: InspectionForm[],
  standards: ComplianceStandard[],
): FormCodeUpdateFlag[] {
  const standardsById = new Map(standards.map((s) => [s.id, s]));
  const flags: FormCodeUpdateFlag[] = [];

  for (const form of forms) {
    if (!form.compliance_standard_id) continue;
    const standard = standardsById.get(form.compliance_standard_id);
    if (!standard?.effective_date) continue;

    const formDate = new Date(form.updated_at);
    const effectiveDate = new Date(standard.effective_date);

    if (effectiveDate > formDate) {
      flags.push({
        form_id: form.id,
        form_name: form.name,
        standard_code: standard.code,
        standard_version: standard.version,
        form_updated_at: form.updated_at.slice(0, 10),
        standard_effective_date: standard.effective_date,
        change_summary: `${standard.name} (${standard.code}) was updated to v${standard.version}, effective ${standard.effective_date} — after this form was last modified on ${form.updated_at.slice(0, 10)}.`,
      });
    }
  }

  return flags;
}
