import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Platform } from "react-native";
import { loadSession, clearSession, type ITMSession } from "@/lib/session";
import { setApiToken } from "@/lib/api";
import { startDrainRunner, stopDrainRunner } from "@/lib/sync";
import { seedDatabase } from "@/db/seed";

type AuthContextValue = {
  session: ITMSession | null;
  isLoading: boolean;
  orgId: string | null;
  setSession: (s: ITMSession | null) => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  session: null,
  isLoading: true,
  orgId: null,
  setSession: () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSessionState] = useState<ITMSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        if (Platform.OS !== "web") {
          await seedDatabase();
        }
        const s = await loadSession();
        if (s) {
          setSessionState(s);
          setApiToken(s.accessToken);
          if (Platform.OS !== "web") {
            startDrainRunner(s.orgId);
          }
        }
      } catch (e) {
        console.warn("[AuthContext] init error:", e instanceof Error ? e.message : String(e));
      } finally {
        setIsLoading(false);
      }
    })();

    return () => {
      stopDrainRunner();
    };
  }, []);

  const setSession = useCallback((s: ITMSession | null) => {
    setSessionState(s);
    if (s) {
      setApiToken(s.accessToken);
      if (Platform.OS !== "web") {
        startDrainRunner(s.orgId);
      }
    } else {
      setApiToken(null);
      stopDrainRunner();
    }
  }, []);

  const signOut = useCallback(async () => {
    stopDrainRunner();
    await clearSession();
    setApiToken(null);
    setSessionState(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        isLoading,
        orgId: session?.orgId ?? null,
        setSession,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

export function useSession(): ITMSession {
  const { session } = useAuth();
  if (!session) throw new Error("useSession called outside authenticated context");
  return session;
}

export function useOrgId(): string {
  const { orgId } = useAuth();
  if (!orgId) throw new Error("useOrgId called outside authenticated context");
  return orgId;
}
