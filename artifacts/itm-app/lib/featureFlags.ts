/**
 * Feature flags for the ITM app.
 *
 * Feature 20.4 — AI Code Intelligence:
 *   Gates the entire AI surface (P-14, AiSuggestionPanel, CodeReferenceDrawer,
 *   AI form generation, and in-workspace AI assist).
 *
 *   Runtime configuration:
 *     Set the Expo public env var EXPO_PUBLIC_AI_ENABLED=false to disable the
 *     entire AI surface at build time (e.g. for orgs on Phases 1-5 only).
 *     Defaults to enabled when the variable is absent or any value other than "false".
 */
export const FEATURES = {
  AI_CODE_INTELLIGENCE: process.env.EXPO_PUBLIC_AI_ENABLED === "true",
} as const;

// To enable Phase 6 AI surfaces, set: EXPO_PUBLIC_AI_ENABLED=true
