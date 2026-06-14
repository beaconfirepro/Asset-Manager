import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

export type EntraConfig = {
  clientId: string;
  tenantId: string;
  scopes: string[];
};

export type EntraAuthResult = {
  accessToken: string;
  userId: string;
  email: string;
  name: string;
  expiresAt: string;
};

function parseJwtPayload(token: string): Record<string, unknown> {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    return JSON.parse(json);
  } catch {
    return {};
  }
}

export class EntraIDProvider {
  private config: EntraConfig;

  constructor(config: EntraConfig) {
    this.config = config;
  }

  async signIn(): Promise<EntraAuthResult | null> {
    const { clientId, tenantId, scopes } = this.config;
    const redirectUri = AuthSession.makeRedirectUri({ scheme: "itm-app" });

    const discovery = {
      authorizationEndpoint: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`,
      tokenEndpoint: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    };

    const request = new AuthSession.AuthRequest({
      clientId,
      scopes: [...scopes, "openid", "profile", "email"],
      redirectUri,
      responseType: AuthSession.ResponseType.Token,
      usePKCE: false,
    });

    const result = await request.promptAsync(discovery);

    if (result.type !== "success" || !result.params.access_token) {
      if (result.type === "cancel" || result.type === "dismiss") return null;
      throw new Error(`Auth failed: ${result.type}`);
    }

    const token = result.params.access_token;
    const payload = parseJwtPayload(token);

    const expiresIn = Number(result.params.expires_in ?? 3600);
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    return {
      accessToken: token,
      userId: String(payload.oid ?? payload.sub ?? "unknown"),
      email: String(payload.email ?? payload.upn ?? payload.preferred_username ?? ""),
      name: String(payload.name ?? ""),
      expiresAt,
    };
  }

  async signOut(): Promise<void> {
    const { tenantId } = this.config;
    const logoutUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/logout`;
    await WebBrowser.openBrowserAsync(logoutUrl);
  }
}
