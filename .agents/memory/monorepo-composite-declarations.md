---
name: Monorepo composite type declarations
description: Why typecheck fails on newly-added lib/* exports while runtime works, and how to fix it.
---

Shared packages under `lib/*` (e.g. `@workspace/db`) are TypeScript **composite** projects
(`composite: true`, `emitDeclarationOnly`, `outDir: dist`). Consumers like `artifacts/api-server`
reference them via `tsconfig.json` `references`, so `tsc` reads the consumer's view of those
packages from the **emitted `.d.ts` in `dist/`**, not from source.

**Symptom:** after adding a new export (e.g. a new table to `lib/db/src/schema/index.ts`),
the dev server runs fine (esbuild/Metro bundle source directly), but `tsc --noEmit` in a
consuming project reports `Module '@workspace/db' has no exported member 'X'` for *only the
newest* exports — older ones resolve because the stale `dist/*.d.ts` still has them.

**Why:** the package `exports` map points at `./src/*.ts`, but project references + the stale
`dist` declarations win for type resolution; `tsc -p ... --noEmit` does not rebuild references.

**How to apply:** after changing any `lib/*` package's public types, rebuild its declarations
before trusting a consumer's typecheck:
`pnpm exec tsc -b lib/<pkg> --force` (or `tsc -b` from a consumer, which builds its references).
