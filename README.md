# ha-home-dashboard-strategy

Scaffold for a Home Assistant dashboard strategy packaged for HACS, built with TypeScript, Vite, and Vitest.

Quick start

-   Install dependencies:

```bash
npm install
```

-   Development (Vite):

```bash
npm run dev
```

-   Build (produces `dist/rooms_sections_strategy.js`):

```bash
npm run build
```

-   Run tests:

```bash
npm test
```

HACS notes

-   `hacs.json` is provided to allow HACS to detect this repository as a `frontend` content package. The built bundle is placed in `dist/` and can be referenced by HACS or manually installed in `www/`.

Next steps

-   Implement the actual dashboard strategy in `src/components/DashboardStrategy.ts` and wire it into `src/index.ts`.
-   Add build/time bundling tweaks if you need to expose specific globals or integrate with Lovelace.

# ha-home-dashboard-strategy

An automatic Home Assistant Dashboard Strategy for your home
