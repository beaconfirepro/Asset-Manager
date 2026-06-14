export type FieldType =
  | "pass_fail"
  | "yes_no"
  | "text"
  | "number"
  | "select"
  | "photo"
  | "signature"
  | "checkbox";

export type FormField = {
  id: string;
  type: FieldType;
  label: string;
  required?: boolean;
  deficiency_trigger?: string;
  deficiency_severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  options?: string[];
  section?: string;
  description?: string;
};

export type FormSchema = {
  title?: string;
  sections?: string[];
  fields: FormField[];
};

export type FormData = Record<string, string | boolean | string[] | null>;

export function parseFormSchema(raw: string): FormSchema {
  try {
    return JSON.parse(raw) as FormSchema;
  } catch {
    return { fields: [] };
  }
}

export function parseFormData(raw: string): FormData {
  try {
    return JSON.parse(raw) as FormData;
  } catch {
    return {};
  }
}

export function isDeficient(field: FormField, answer: string | boolean | string[] | null): boolean {
  if (!field.deficiency_trigger || answer == null) return false;
  return String(answer).toUpperCase() === field.deficiency_trigger.toUpperCase();
}

export function computeProgress(schema: FormSchema, data: FormData): number {
  const required = schema.fields.filter((f) => f.required);
  if (required.length === 0) return 1;
  const answered = required.filter(
    (f) => data[f.id] != null && data[f.id] !== "" && data[f.id] !== false,
  );
  return answered.length / required.length;
}
