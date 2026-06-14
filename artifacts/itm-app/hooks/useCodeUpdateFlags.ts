import { useQuery } from "@tanstack/react-query";
import { Platform } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useInspectionForms } from "@/hooks/useInspectionForms";
import { useComplianceStandards } from "@/hooks/useComplianceStandards";
import { detectLocalCodeUpdates, type FormCodeUpdateFlag } from "@/lib/ai/codeUpdateDetection";

export function useCodeUpdateFlags() {
  const { orgId } = useAuth();
  const { data: forms = [] } = useInspectionForms();
  const { data: standards = [] } = useComplianceStandards();

  const formKey = forms
    .map((f) => `${f.id}:${f.updated_at}:${f.compliance_standard_id ?? ""}`)
    .sort()
    .join("|");
  const standardKey = standards
    .map((s) => `${s.id}:${s.version}:${s.effective_date ?? ""}`)
    .sort()
    .join("|");

  return useQuery({
    queryKey: ["code-update-flags", orgId, formKey, standardKey],
    enabled: !!orgId,
    queryFn: (): FormCodeUpdateFlag[] => detectLocalCodeUpdates(forms, standards),
    staleTime: 5 * 60_000,
  });
}

export type { FormCodeUpdateFlag };
