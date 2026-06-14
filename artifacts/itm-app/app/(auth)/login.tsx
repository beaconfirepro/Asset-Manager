import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { eq } from "drizzle-orm";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { signInWithProvider } from "@/lib/auth";
import { getDb } from "@/db/client";
import { appUsers } from "@/db/schema";
import { saveSession, type ITMSession } from "@/lib/session";

const ORG_ID = "org_beacon_test_001";

function nowIso() { return new Date().toISOString(); }
function genId() { return Date.now().toString(36) + Math.random().toString(36).substring(2, 9); }

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { setSession } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleMicrosoftSignIn = async () => {
    setLoading(true);
    try {
      const session = await signInWithProvider(ORG_ID, "MICROSOFT_ENTRA");
      if (session) {
        setSession(session);
      }
    } catch (err) {
      Alert.alert(
        "Sign In Failed",
        err instanceof Error ? err.message : "Unable to sign in. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDevBypass = async () => {
    if (!__DEV__) return;
    setLoading(true);
    try {
      const now = nowIso();
      const userId = "dev_user_001";

      const devUser = {
        id: `u_dev_${genId()}`,
        org_id: ORG_ID,
        external_id: userId,
        provider: "MICROSOFT_ENTRA",
        email: "inspector@beaconfire.com",
        name: "Dev Inspector",
        role: "INSPECTOR",
        avatar_url: null,
        last_login_at: now,
        created_at: now,
        updated_at: now,
        sync_status: "SYNCED",
      };

      let user: typeof devUser = devUser;

      // expo-sqlite is unavailable on web; skip the DB and use an in-memory
      // dev session so the app shell is navigable in the web preview.
      if (Platform.OS !== "web") {
        const db = await getDb();
        const existing = await db
          .select()
          .from(appUsers)
          .where(eq(appUsers.external_id, userId));

        if (existing.length > 0) {
          user = existing[0] as typeof devUser;
        } else {
          const { sync_status: _omit, ...insertUser } = devUser;
          await db.insert(appUsers).values(insertUser);
          user = devUser;
        }
      }

      const session: ITMSession = {
        user: user as ITMSession["user"],
        orgId: ORG_ID,
        accessToken: "dev_token_bypass",
        expiresAt: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
      };
      await saveSession(session);
      setSession(session);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (Platform.OS === "web") {
        console.error("[DevBypass]", msg);
        // eslint-disable-next-line no-alert
        if (typeof window !== "undefined") window.alert(`Dev Bypass Error: ${msg}`);
      } else {
        Alert.alert("Dev Bypass Error", msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0),
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0),
        },
      ]}
    >
      <View style={styles.content}>
        <View style={[styles.logoWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Image
            source={require("@/assets/images/icon.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.branding}>
          <Text style={[styles.appName, { color: colors.foreground }]}>ITM</Text>
          <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
            Inspection, Testing & Maintenance
          </Text>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Text style={[styles.orgName, { color: colors.primary }]}>Beacon Fire Protection</Text>
        </View>

        <View style={styles.authSection}>
          <TouchableOpacity
            onPress={handleMicrosoftSignIn}
            disabled={loading}
            activeOpacity={0.8}
            style={[styles.signInBtn, { opacity: loading ? 0.7 : 1 }]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <View style={styles.btnRow}>
                <Feather name="shield" size={18} color="#fff" />
                <Text style={styles.signInBtnText}>Sign in with Microsoft</Text>
              </View>
            )}
          </TouchableOpacity>

          <Text style={[styles.secureText, { color: colors.mutedForeground }]}>
            Secured with Microsoft Entra ID
          </Text>
        </View>

        {__DEV__ && (
          <TouchableOpacity
            onPress={handleDevBypass}
            disabled={loading}
            style={[styles.devBtn, { borderColor: colors.border, backgroundColor: colors.muted }]}
          >
            <Text style={[styles.devBtnText, { color: colors.mutedForeground }]}>
              Dev: Sign in as Inspector (bypass OAuth)
            </Text>
          </TouchableOpacity>
        )}

        {Platform.OS === "web" && (
          <View style={[styles.webNote, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Feather name="tablet" size={14} color={colors.mutedForeground} />
            <Text style={[styles.webNoteText, { color: colors.mutedForeground }]}>
              This app is optimized for iPad. Scan the QR code in Expo Go for the full experience.
            </Text>
          </View>
        )}
      </View>

      <Text style={[styles.version, { color: colors.mutedForeground }]}>ITM v1.0 — Phase 0</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 32,
  },
  logoWrap: {
    width: 100,
    height: 100,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logo: { width: 80, height: 80 },
  branding: { alignItems: "center", gap: 8 },
  appName: { fontSize: 40, fontFamily: "Inter_700Bold", letterSpacing: -1 },
  tagline: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center" },
  divider: { width: 40, height: 2, borderRadius: 1, marginVertical: 4 },
  orgName: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  authSection: { width: "100%", alignItems: "center", gap: 12 },
  signInBtn: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0078d4",
  },
  btnRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  signInBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  secureText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  devBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    width: "100%",
    alignItems: "center",
  },
  devBtnText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  webNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    width: "100%",
  },
  webNoteText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 16 },
  version: { textAlign: "center", fontSize: 11, paddingBottom: 12, fontFamily: "Inter_400Regular" },
});
