import { getDb } from "@/db/client";
import { appUsers, authProviderConfigs, type AppUser, type NewAppUser } from "@/db/schema";
import { saveSession, type ITMSession } from "@/lib/session";
import { EntraIDProvider, type EntraAuthResult } from "./providers/entra";
import { eq } from "drizzle-orm";

export type AuthProviderType = "MICROSOFT_ENTRA";

export interface AuthProvider {
  signIn(): Promise<EntraAuthResult>;
  signOut(): Promise<void>;
}

function nowIso() {
  return new Date().toISOString();
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

export async function getActiveProviderConfig(orgId: string) {
  const db = await getDb();
  const configs = await db
    .select()
    .from(authProviderConfigs)
    .where(eq(authProviderConfigs.org_id, orgId));
  return configs.find((c) => c.is_active) ?? null;
}

export async function signInWithProvider(
  orgId: string,
  provider: AuthProviderType,
): Promise<ITMSession | null> {
  const db = await getDb();

  const configs = await db
    .select()
    .from(authProviderConfigs)
    .where(eq(authProviderConfigs.org_id, orgId));

  const config = configs.find((c) => c.provider === provider && c.is_active);
  if (!config) {
    throw new Error(`No active config for provider ${provider} in org ${orgId}`);
  }

  const authProvider = new EntraIDProvider({
    clientId: config.client_id,
    tenantId: config.tenant_id ?? "common",
    scopes: config.scopes.split(",").map((s) => s.trim()),
  });

  const result = await authProvider.signIn();
  if (!result) return null;

  const now = nowIso();
  const existingUsers = await db
    .select()
    .from(appUsers)
    .where(eq(appUsers.external_id, result.userId));

  let user: AppUser;
  if (existingUsers.length > 0) {
    await db
      .update(appUsers)
      .set({ last_login_at: now, updated_at: now })
      .where(eq(appUsers.external_id, result.userId));
    user = { ...existingUsers[0], last_login_at: now, updated_at: now };
  } else {
    const newUser: NewAppUser = {
      id: genId(),
      org_id: orgId,
      external_id: result.userId,
      provider,
      email: result.email,
      name: result.name,
      role: "INSPECTOR",
      avatar_url: null,
      last_login_at: now,
      created_at: now,
      updated_at: now,
    };
    await db.insert(appUsers).values(newUser);
    user = newUser as AppUser;
  }

  const session: ITMSession = {
    user,
    orgId,
    accessToken: result.accessToken,
    expiresAt: result.expiresAt,
  };
  await saveSession(session);
  return session;
}
