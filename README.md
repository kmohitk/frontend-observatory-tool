# Frontend Performance Observatory

Monorepo: **Chrome extension** (content script collects metrics) → HTTP `/ingest` → relay → WebSocket → Next.js dashboard. Optional **SDK** script posts `OBS_METRIC` for legacy experiments only.

**Deployment (local + production):** see [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md).

## Structure

- `apps/dashboard` — Next.js 14 (App Router), Tailwind, Recharts, Zustand
- `packages/collector` — shared PerformanceObserver logic + optional overlay helpers
- `packages/extension` — MV3 content script (collector + overlay) + background (ingest to relay)
- `packages/sdk` — optional IIFE (`observatory-sdk.js`) that uses the collector + `postMessage`
- `packages/shared` — `Metric` types and message guards

## Prerequisites

- Node 18+
- [pnpm](https://pnpm.io) 9+

## Install

```bash
pnpm install
```

This runs `prepare` and builds `@observatory/shared` (needed by the dashboard).

## Run (three processes)

1. **Metrics relay** (port 3001: WebSocket for the dashboard + **HTTP POST `/ingest`** for the extension):

   ```bash
   pnpm ws
   ```

   Quick health check (should show `wsClients` and `metricsBuffered`):

   ```bash
   curl -s http://127.0.0.1:3001/health
   ```

   The Chrome MV3 **background uses HTTP POST** to `http://127.0.0.1:3001/ingest` (reliable in service workers). The dashboard still uses **WebSocket** on the same port for live updates.

2. **Dashboard** (port 3000):

   ```bash
   pnpm dev
   ```

3. **Chrome extension**

   ```bash
   pnpm build:extension
   ```

   In Chrome: **Extensions → Developer mode → Load unpacked** → choose `packages/extension` (folder that contains `manifest.json` and `dist/`). Click **Reload** on the extension after each rebuild.

   Open the dashboard with the extension’s **toolbar icon** (or go to **`http://127.0.0.1:3000/`** manually after `pnpm dev`). The extension does **not** auto-open tabs on install (that was causing duplicate tabs / odd reload behavior with unpacked extensions).

   The content script is **disabled on port 3000** (`localhost` / `127.0.0.1`) so it does not inject into the Next.js dashboard (avoids React conflicts and a metric “feedback” loop). To test `observatory-test.html` with **`npx serve`**, use another port if the dashboard also uses 3000, e.g. **`npx serve . -l 4173`**.

   The background script must be allowed to reach `127.0.0.1:3001` (included via `host_permissions` in `manifest.json`).

## Build SDK (script tag)

```bash
pnpm build:sdk
```

Output: `packages/sdk/dist/observatory-sdk.js`

Inject on any page (with the extension installed and WS + dashboard running):

```html
<script src="file:///absolute/path/to/packages/sdk/dist/observatory-sdk.js"></script>
```

Or serve the file over HTTP and use a normal `src` URL. You should see the bottom-right overlay and metrics on the dashboard.

## Full production build

```bash
pnpm build
```

## Integration flow

1. Install and enable the extension (reload after each `pnpm build:extension`).
2. Start `pnpm ws` and `pnpm dev`.
3. Open `http://localhost:3000`.
4. Visit any page (HTTP/S) **except** the dashboard URL on **port 3000** (injection is disabled there). The **content script** runs the collector; metrics go **content → background `fetch` `/ingest` → relay → dashboard WebSocket** → Zustand → charts.
5. **Optional:** load `packages/sdk/dist/observatory-sdk.js` on a page for a script-tag-only path (`postMessage`). Do **not** use SDK and extension together on the same page (double collection / two overlays).

## Notes

- The extension connects to `ws://localhost:3001`. Keep the WS server running while testing.
- Client store debounces WebSocket metric batches (~120ms) and keeps at most 500 metrics.
- Theme tokens: background `#0B1220`, cards `#1F2937`, text `#E5E7EB`.
