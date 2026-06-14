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

  return useQuery({
    queryKey: ["code-update-flags", orgId, forms.length, standards.length],
    enabled: Platform.OS !== "web" && !!orgId,
    queryFn: (): FormCodeUpdateFlag[] => detectLocalCodeUpdates(forms, standards),
    staleTime: 5 * 60_000,
  });
}

export type { FormCodeUpdateFlag };
