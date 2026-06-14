import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AppUser } from "@/db/schema";

const SESSION_KEY = "itm_session_v1";

export type ITMSession = {
  user: AppUser;
  orgId: string;
  accessToken: string;
  expiresAt: string;
};

export async function saveSession(session: ITMSession): Promise<void> {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export async function loadSession(): Promise<ITMSession | null> {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as ITMSession;
    const expired = new Date(session.expiresAt) < new Date();
    if (expired) {
      await clearSession();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
}

export function getOrgId(session: ITMSession | null): string {
  if (!session) throw new Error("No authenticated session. Cannot resolve org_id.");
  return session.orgId;
}

export function requireSession(session: ITMSession | null): ITMSession {
  if (!session) throw new Error("Not authenticated.");
  return session;
}
