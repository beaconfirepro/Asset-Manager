---
name: ITM App — drizzle-orm Metro dynamic import
description: Metro can't resolve drizzle-orm via dynamic await import(); use static imports
---

Metro bundler requires all module imports to be statically analyzable at build time. Dynamic `await import("drizzle-orm")` inside a function body causes "Unable to resolve module" errors at bundle time.

**Fix:** Move all drizzle-orm imports to static top-level: `import { eq } from "drizzle-orm"`.

**Why:** Metro's static analysis phase resolves modules before runtime. Dynamic imports work for code splitting in web bundlers (webpack/vite) but Metro treats them differently.

**How to apply:** Never use `await import("drizzle-orm")` or `await import("@/db/schema")` inside function bodies. Always put these at the top of the file as static imports.
