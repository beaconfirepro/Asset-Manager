/**
 * Feature flags for the ITM app.
 *
 * Feature 20.4 — AI Code Intelligence:
 *   Gates the entire AI surface (P-14, AiSuggestionPanel, CodeReferenceDrawer,
 *   AI form generation, and in-workspace AI assist).
 *   Set to `true` to enable AI surfaces; `false` keeps Phases 1-5 AI-free.
 */
export const FEATURES = {
  AI_CODE_INTELLIGENCE: true,
} as const;
