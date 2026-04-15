# Frontend Performance Observatory

Monorepo: injectable SDK → `postMessage` → Chrome extension → WebSocket (`localhost:3001`) → Next.js dashboard (live charts).

## Structure

- `apps/dashboard` — Next.js 14 (App Router), Tailwind, Recharts, Zustand
- `packages/sdk` — IIFE bundle (`observatory-sdk.js`) + floating overlay
- `packages/extension` — MV3 content + background service worker
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

1. **WebSocket server** (port 3001, in-memory buffer, max 500 metrics):

   ```bash
   pnpm ws
   ```

2. **Dashboard** (port 3000):

   ```bash
   pnpm dev
   ```

3. **Chrome extension**

   ```bash
   pnpm build:extension
   ```

   In Chrome: **Extensions → Developer mode → Load unpacked** → choose `packages/extension` (folder that contains `manifest.json` and `dist/`).

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

1. Install and enable the extension.
2. Start `pnpm ws` and `pnpm dev`.
3. Open `http://localhost:3000`.
4. Open a tab with a site that loads the SDK (injected script).
5. Metrics flow: page → `window.postMessage` → content script → background → WebSocket → dashboard store (debounced) → charts.

## Notes

- The extension connects to `ws://localhost:3001`. Keep the WS server running while testing.
- Client store debounces WebSocket metric batches (~120ms) and keeps at most 500 metrics.
- Theme tokens: background `#0B1220`, cards `#1F2937`, text `#E5E7EB`.
