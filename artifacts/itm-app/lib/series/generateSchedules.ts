import type { InspectionSeries } from "@/db/schema";

export function generateScheduleDates(series: InspectionSeries): string[] {
  const now = new Date();
  const horizonMs = series.generation_horizon_days * 86_400_000;
  const horizonDate = new Date(now.getTime() + horizonMs);

  const endsAt = series.ends_at ? new Date(series.ends_at) : null;
  const end = endsAt && endsAt < horizonDate ? endsAt : horizonDate;

  const dates: string[] = [];
  let current = new Date(series.starts_at);

  const maxLookback = new Date(now.getTime() - 365 * 86_400_000);
  while (current < maxLookback && current < end) {
    current = new Date(current.getTime() + series.frequency_days * 86_400_000);
  }

  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current = new Date(current.getTime() + series.frequency_days * 86_400_000);
  }

  return dates;
}
