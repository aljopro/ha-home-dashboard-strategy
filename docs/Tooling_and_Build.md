# Tooling and Build

> **Source of truth for:** the build pipeline and its constraints. We adapt the
> [`custom-cards/boilerplate-card`](https://github.com/custom-cards/boilerplate-card)
> approach to a TypeScript + Vite + HACS workflow.
>
> **Status:** architectural reference. Read this before changing `vite.config.ts`,
> `tsconfig.json`, `package.json`, `hacs.json`, or `deploy.sh`.

---

## 1. The fundamental constraint: one self-contained classic script

Home Assistant loads dashboard resources as a **single JavaScript file** served
from `/local/...` (i.e. `config/www/...`) or via HACS. That file is loaded into
the already-running frontend. This dictates everything below:

1. **Output must be a single bundle**, not an ES-module graph with relative
   imports. The browser fetches one URL.
2. **Output must execute as a classic script** (`module` type is not how HA
   resource includes behave by default), so we build an **IIFE**, not an ESM
   bundle with `import` statements at the top.
3. **No bare `import` of npm packages survives to runtime *unbundled*.** Anything
   we depend on is bundled in (Rollup inlines it into the IIFE). `home-assistant-js-websocket`
   supplies *types* only — we must not pull its runtime code in (we consume the
   `hass` object HA hands us; we don't open our own connection). **`lit` is the one
   deliberately-bundled runtime dependency** (needed by the config editor — see
   [UI_and_Lit_Standards.md](./UI_and_Lit_Standards.md) §1). A standalone HACS
   resource cannot assume HA exposes Lit as a global, so we bundle it; multiple
   Lit copies coexist safely, and tag-name collisions are prevented by guarded
   `customElements.define`.
4. **Stable filename.** HACS and manual resource includes reference a fixed path,
   so the emitted file name must never change between builds.

The boilerplate-card lineage solves the same problem (rollup → single IIFE that
registers a custom element). We keep that shape but use Vite's library mode.

---

## 2. The build: Vite library mode → IIFE

Defined in [vite.config.ts](../vite.config.ts):

```ts
build: {
  outDir: 'dist',
  emptyOutDir: true,
  lib: {
    entry: path.resolve(__dirname, 'src/index.ts'),
    name: 'HaHomeDashboardStrategy',
    fileName: 'rooms_sections_strategy',
    formats: ['iife'],          // ← single classic script, self-executing
  },
  rollupOptions: {
    output: {
      entryFileNames: 'rooms_sections_strategy.js',  // ← fixed, suffix-free name
    },
  },
}
```

**Why each line is load-bearing:**

| Setting                                   | Constraint it satisfies                                  |
| ----------------------------------------- | -------------------------------------------------------- |
| `formats: ['iife']`                       | HA loads a classic script; IIFE self-registers on eval.  |
| `entryFileNames: 'rooms_sections_strategy.js'` | Fixed URL for HACS / resource include (no hash, no `.iife` suffix). |
| `emptyOutDir: true`                       | No stale artifacts shipped.                              |
| `entry: src/index.ts`                     | Single entry that side-effect-imports the strategy.      |

**Entry-point contract.** [src/index.ts](../src/index.ts) imports the strategy
module for its registration side effect (`import './strategies/...'`). Evaluating
the bundle therefore registers the custom element. Do not rely on a consumer
calling an exported function — HA just includes the script.

**Rule: keep the dependency graph bundle-friendly.** Use relative `.js`-suffixed
import specifiers between our own modules (the repo already does, e.g.
`'./builders/entityFilters.js'`), and do not add npm runtime deps without first
deciding whether they're bundled or externalized. Default answer: don't add them.

---

## 3. TypeScript configuration constraints

From [tsconfig.json](../tsconfig.json):

| Option                  | Value     | Why                                                              |
| ----------------------- | --------- | --------------------------------------------------------------- |
| `target`                | `ES2020`  | Matches the evergreen browsers HA supports; no over-transpiling.|
| `module` / `moduleResolution` | `ESNext` / `node` | Vite/Rollup handle module wiring; node resolution for deps. |
| `lib`                   | `ES2020`, `DOM` | We use `customElements`, `HTMLElement`, etc.              |
| `strict`                | `true`    | Non-negotiable. All four docs assume strict typing.             |
| `isolatedModules`       | `true`    | Required for fast per-file transpilation (esbuild/Vite).        |
| `skipLibCheck`          | `true`    | HA's upstream `.d.ts` are sprawling; don't typecheck them.      |
| `declaration`           | `true`    | Emits `.d.ts` for consumers / our own type discipline.          |

- **No experimental decorators — anywhere.** `experimentalDecorators` stays off.
  We register custom elements manually (`customElements.define`) instead of
  `@customElement`, and Lit components declare reactive members via the static
  `properties` getter instead of `@property`/`@state` (see
  [UI_and_Lit_Standards.md](./UI_and_Lit_Standards.md) §1.1). This keeps the build
  free of any decorator transform or `reflect-metadata` runtime. See also
  [Strategy_API_Guidelines.md](./Strategy_API_Guidelines.md) §2.
- **Typecheck is a separate gate from build.** `npm run typecheck` runs
  `tsc --noEmit`; the actual JS emit comes from Vite/esbuild. Keep both green —
  esbuild does not type-check, so `tsc` is our only type safety net in CI.

---

## 4. npm scripts (the canonical commands)

From [package.json](../package.json):

| Script              | Command                | Purpose                                  |
| ------------------- | ---------------------- | ---------------------------------------- |
| `npm run dev`       | `vite`                 | Local dev server (uses `src/main.ts` harness). |
| `npm run build`     | `vite build`           | Produce `dist/rooms_sections_strategy.js`. |
| `npm run preview`   | `vite preview`         | Serve the built artifact.                |
| `npm test`          | `vitest run`           | One-shot unit run (CI). See [Testing_Standards.md](./Testing_Standards.md). |
| `npm run test:watch`| `vitest --watch`       | TDD loop.                                |
| `npm run typecheck` | `tsc --noEmit`         | Type gate (build does NOT type-check).   |
| `npm run format`    | `prettier --write .`   | Formatting.                              |
| `npm run deploy`    | `./deploy.sh`          | Build + copy to a mounted HA instance.   |

**Dev vs. prod entry.** `src/main.ts` is a *dev-only* harness that attaches to
`window` for quick browsing; it is **not** the production entry. Production builds
from `src/index.ts`. Don't wire production behavior through `main.ts`.

---

## 5. Distribution: HACS + manual resource

From [hacs.json](../hacs.json):

```json
{
  "name": "HA Home Dashboard Strategy",
  "content_in_root": false,
  "domains": ["frontend"],
  "zip_release": false,
  "filename": "dist/rooms_sections_strategy.js",
  "homeassistant": "2021.12.0"
}
```

Constraints this imposes:

- **`filename` must match the build output exactly** (`dist/rooms_sections_strategy.js`).
  If the Vite `entryFileNames` changes, this must change in lockstep — and a
  rename breaks every existing user's resource include. Treat the filename as a
  public API.
- **`domains: ["frontend"]`** — this is a frontend resource; HACS registers it as
  a dashboard resource (a JS module/URL), not an integration.
- **`homeassistant` floor** declares the minimum supported HA version. Don't use
  frontend APIs newer than what that floor guarantees without raising it.
- **`package.json` `files: ["dist/"]`** — only the built artifact is published;
  source is not part of the distributable.

`README.md` is rendered by HACS (`render_readme: true`), so installation/usage
docs belong there, not buried in source.

---

## 6. Deploy loop (local HA testing)

[deploy.sh](../deploy.sh) builds then copies the bundle over an SMB mount into
`config/www/strategies/`:

```
npm run build  →  cp dist/rooms_sections_strategy.js  $MOUNT/www/strategies/
```

Iteration constraints to remember:

- The frontend aggressively caches resources. After deploy you must
  **hard-refresh** (Cmd/Ctrl+Shift+R). A normal reload will serve the old bundle.
- The strategy registers on script eval, behind a `customElements.get()` guard —
  so a hard refresh (fresh document) is what actually re-registers the new code.
- Mount path / HA URL are overridable args; defaults target
  `/Volumes/config` and `http://homeassistant.local:8123`.

---

## 7. Hard rules (do not break without updating this doc)

- [ ] Output stays a **single IIFE** with a **fixed filename**.
- [ ] `hacs.json#filename` == Vite output path, always in sync.
- [ ] No npm **runtime** deps bundled without an explicit decision; approved exceptions: `lit` (bundled). `home-assistant-js-websocket` stays types-only.
- [ ] No experimental decorators / no reflect-metadata in the runtime path (Lit uses `static properties`).
- [ ] `tsc --noEmit` is green (build alone does not type-check).
- [ ] Production builds from `src/index.ts`; `src/main.ts` is dev-only.
- [ ] Renaming the artifact is a breaking change — avoid; if unavoidable, bump version + document migration in `README.md`.
