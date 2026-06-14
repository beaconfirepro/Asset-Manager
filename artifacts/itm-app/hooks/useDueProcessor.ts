import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { processDueSchedules } from "@/lib/series/dueProcessor";

const INTERVAL_MS = 15 * 60_000;

export function useDueProcessor() {
  const { orgId } = useAuth();
  const qc = useQueryClient();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (Platform.OS === "web" || !orgId) return;

    const run = async () => {
      try {
        const count = await processDueSchedules(orgId);
        if (count > 0) {
          qc.invalidateQueries({ queryKey: ["inspection-schedules", orgId] });
          qc.invalidateQueries({ queryKey: ["dashboard", orgId] });
        }
      } catch {
        // silent — never block UI for background processing
      }
    };

    run();

    timerRef.current = setInterval(run, INTERVAL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [orgId, qc]);
}
