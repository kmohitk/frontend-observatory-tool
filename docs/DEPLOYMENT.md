# Deployment guide

This document explains how to run the Frontend Performance Observatory on a **developer machine** and what to plan for **production** deployments.

## Architecture (reminder)

| Component | Role |
|-----------|------|
| **Chrome extension** | Content script collects Web Vitals / resources; background `POST`s JSON to the relay. |
| **Relay** (`apps/dashboard/scripts/ws-server.mjs`) | HTTP `POST /ingest` + WebSocket on one port; buffers metrics and broadcasts to dashboard clients. |
| **Dashboard** (Next.js) | Browser UI; connects to the relay via **WebSocket** for live updates. |

The extension does **not** inject into the Next dev dashboard on **port 3000** (see `packages/extension/manifest.json` `exclude_matches`) to avoid React conflicts.

---

## Local setup

### Prerequisites

- **Node.js** 18+
- **pnpm** 9+ ([installation](https://pnpm.io/installation))
- **Google Chrome** (or Chromium) for the extension

### Install dependencies

From the repository root:

```bash
pnpm install
```

This builds `@observatory/shared` (required by the dashboard).

### Processes to run

You need **two** terminal processes for the app, plus a **one-time** extension build.

#### 1. Metrics relay (port 3001)

```bash
pnpm ws
```

- **HTTP:** `POST http://127.0.0.1:3001/ingest` (extension → relay)  
- **WebSocket:** `ws://127.0.0.1:3001` (dashboard ← relay)  
- **Health:** `GET http://127.0.0.1:3001/health`

```bash
curl -s http://127.0.0.1:3001/health
```

#### 2. Dashboard (port 3000 in dev)

```bash
pnpm dev
```

Open **`http://127.0.0.1:3000`** (or the URL printed by Next.js). Use the extension **toolbar icon** to open the same URL if you prefer.

#### 3. Extension (build + load in Chrome)

```bash
pnpm build:extension
```

1. Chrome → **`chrome://extensions`**
2. Enable **Developer mode**
3. **Load unpacked** → select `packages/extension` (directory that contains `manifest.json` and `dist/`)
4. After code changes: **`pnpm build:extension`** → **Reload** the extension on `chrome://extensions`

### Ports

| Port | Service |
|------|---------|
| **3000** | Next.js dashboard (`pnpm dev` / `next start`) |
| **3001** | Relay (HTTP + WebSocket) |

Do not run another stack (e.g. `npx serve` on **3000**) at the same time as the dashboard unless you change ports. For static test pages (e.g. `observatory-test.html`), use e.g. **`npx serve . -l 4173`**.

### Verify end-to-end

1. Relay running → `/health` returns JSON with `ok: true`.  
2. Dashboard open → top bar shows **WebSocket connected** (relay reachable).  
3. Visit a normal website in another tab (not `:3000`) → metrics should appear on the dashboard.

---

## Production deployment

The repository ships a **minimal** relay and dashboard suitable for **internal** or **low-trust** networks. For internet-facing or multi-tenant use, you must add **authentication**, **TLS**, **rate limits**, and **operational monitoring** yourself.

### 1. Dashboard (Next.js)

**Build:**

```bash
pnpm --filter @observatory/dashboard build
```

**Run:**

```bash
pnpm --filter @observatory/dashboard start
```

By default Next listens on port **3000** (`next start`). Set `PORT` if needed:

```bash
PORT=3000 pnpm --filter @observatory/dashboard start
```

Host behind **HTTPS** in production (reverse proxy or platform TLS). The browser dashboard opens a **WebSocket** to the relay; today the client uses a **hardcoded** dev URL — see [Configuration](#configuration-for-non-localhost).

**Typical platforms:** Docker + nginx/Caddy, Fly.io, Railway, AWS ECS, Kubernetes, etc. Ensure the process is **long-lived** and restarts on failure.

### 2. Relay (HTTP + WebSocket)

The relay is a small Node script: `apps/dashboard/scripts/ws-server.mjs`.

Run it as a **separate process** (systemd, PM2, Docker sidecar, second container, etc.):

```bash
node apps/dashboard/scripts/ws-server.mjs
```

Or from the dashboard package after install:

```bash
pnpm --filter @observatory/dashboard exec node ./scripts/ws-server.mjs
```

**Production checklist:**

- Listen on `0.0.0.0` only if you intend to expose it (already the default in the script). Prefer **binding to localhost** and exposing via a **reverse proxy** with TLS.  
- Put **HTTPS** and **WSS** in front (Caddy, nginx, Envoy). WebSocket upgrades must be enabled on the proxy.  
- Add **authentication** on `POST /ingest` (API key, JWT, mTLS) — the current script accepts any JSON body.  
- Add **rate limiting** and maximum body size.  
- For **multiple relay instances**, use Redis/NATS (or similar) to broadcast metrics to all dashboard sockets, or sticky sessions — not included in this repo.

### 3. Chrome extension

**Build:**

```bash
pnpm build:extension
```

Distribute the `packages/extension` folder (packed for the Chrome Web Store or private policy install). Users must load a build whose **ingest URL** and **dashboard URL** match your deployment — see below.

`host_permissions` in `manifest.json` must cover your relay and dashboard origins (e.g. `https://observatory.example.com/*`).

### 4. Optional SDK (`observatory-sdk.js`)

```bash
pnpm build:sdk
```

Artifact: `packages/sdk/dist/observatory-sdk.js`. Host on a CDN or ship via npm if you publish a package. Do **not** load the SDK and the extension on the same page (double collection).

---

## Configuration (non-localhost)

Today these are **constants in source** (no env files). For production you will typically:

| Setting | Current location (approx.) | Change to |
|--------|----------------------------|-----------|
| Ingest URL | `packages/extension/src/background.ts` — `INGEST_URL` | `https://your-relay.example.com/ingest` |
| Dashboard URL (toolbar) | Same file — `DASHBOARD_URL` | `https://dashboard.example.com/` |
| WebSocket URL (dashboard) | `apps/dashboard/lib/useMetricsWebSocket.ts` — `WS_URL` | `wss://your-relay.example.com` (same host/path your proxy uses for WS) |
| Relay port | `apps/dashboard/scripts/ws-server.mjs` — `PORT` | Env-driven `process.env.PORT` if you fork the script |
| `exclude_matches` (content script) | `packages/extension/manifest.json` | Match your dashboard origin/port so the UI is not instrumented |

Recommended follow-up for maintainability: inject these via **build-time** replacements (e.g. esbuild `define`, Vite `define`, or a small `config.json` copied at build) so CI can produce staging vs production bundles.

---

## Security summary

| Area | Risk | Mitigation |
|------|------|------------|
| `POST /ingest` | Anyone can push fake metrics | API keys, network ACLs, VPN, or private relay only |
| WebSocket | Open broadcast | Same-origin or auth on upgrade; TLS (`wss://`) |
| Extension | Broad `host_permissions` | Narrow to your relay + dashboard origins in production |
| PII in URLs | Resource names may contain tokens | Strip query strings in collector before send (custom change) |

---

## Troubleshooting

| Symptom | Things to check |
|--------|------------------|
| Dashboard never connects | Relay not running; firewall; wrong `WS_URL`; mixed content (HTTPS page → `ws://`) |
| No metrics | Extension not loaded; ingest URL wrong; relay logs; visit a tab that is **not** excluded (not dashboard `:3000`) |
| Duplicate / broken dashboard tab | Do not rely on auto-open; use toolbar; avoid port clashes on 3000 |
| `EADDRINUSE` on 3001 | Another process uses the port; stop it or change `PORT` in `ws-server.mjs` |

---

## Quick reference commands

```bash
pnpm install          # deps + build shared
pnpm ws               # relay :3001
pnpm dev              # dashboard :3000
pnpm build:extension  # extension dist/
pnpm build            # full monorepo production build
```

For questions specific to the main README, see [README.md](../README.md).
