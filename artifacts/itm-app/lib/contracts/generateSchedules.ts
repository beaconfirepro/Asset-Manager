import type { InspectionContract } from "@/db/schema";

export function generateScheduleDates(contract: InspectionContract): string[] {
  const now = new Date();
  const horizonMs = contract.generation_horizon_days * 86_400_000;
  const horizonDate = new Date(now.getTime() + horizonMs);

  const endsAt = contract.ends_at ? new Date(contract.ends_at) : null;
  const end = endsAt && endsAt < horizonDate ? endsAt : horizonDate;

  const dates: string[] = [];
  let current = new Date(contract.starts_at);

  const maxLookback = new Date(now.getTime() - 365 * 86_400_000);
  while (current < maxLookback && current < end) {
    current = new Date(current.getTime() + contract.frequency_days * 86_400_000);
  }

  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current = new Date(current.getTime() + contract.frequency_days * 86_400_000);
  }

  return dates;
}
