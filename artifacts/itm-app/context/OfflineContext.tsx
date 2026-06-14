import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { drainOutbox } from "@/lib/sync";

type OfflineContextValue = {
  isOnline: boolean;
  pendingCount: number;
  setPendingCount: (n: number) => void;
  triggerDrain: (orgId: string) => Promise<void>;
};

const OfflineContext = createContext<OfflineContextValue>({
  isOnline: true,
  pendingCount: 0,
  setPendingCount: () => {},
  triggerDrain: async () => {},
});

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === "active") {
        checkConnectivity();
      }
      appState.current = nextState;
    });
    checkConnectivity();
    return () => sub.remove();
  }, []);

  const checkConnectivity = async () => {
    try {
      const res = await fetch("https://dns.google/resolve?name=google.com", {
        signal: AbortSignal.timeout ? AbortSignal.timeout(3000) : undefined,
      });
      setIsOnline(res.ok);
    } catch {
      setIsOnline(false);
    }
  };

  const triggerDrain = useCallback(async (orgId: string) => {
    try {
      await drainOutbox(orgId);
    } catch (e) {
      console.warn("[OfflineContext] drain error:", e);
    }
  }, []);

  return (
    <OfflineContext.Provider value={{ isOnline, pendingCount, setPendingCount, triggerDrain }}>
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline(): OfflineContextValue {
  return useContext(OfflineContext);
}
