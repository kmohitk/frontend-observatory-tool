const INGEST_URL = 'http://127.0.0.1:3001/ingest';
/** Next.js dashboard (`pnpm dev`). Toolbar opens this URL; no auto-open on install (avoids tab storms). */
const DASHBOARD_URL = 'http://127.0.0.1:3000/';
const MAX_QUEUE = 200;

function openDashboardTab(): void {
  void chrome.tabs.create({ url: DASHBOARD_URL });
}

chrome.action.onClicked.addListener(() => {
  openDashboardTab();
});

const pending: unknown[] = [];
let flushing = false;

/**
 * MV3 service workers often drop or block long-lived WebSockets. HTTP POST to the local relay is reliable
 * and still triggers the same broadcast to dashboard WebSocket clients.
 */
async function flushQueue(): Promise<void> {
  if (flushing) return;
  flushing = true;
  try {
    while (pending.length) {
      const payload = pending[0];
      try {
        const res = await fetch(INGEST_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'metric', payload }),
        });
        if (!res.ok) throw new Error(`ingest ${res.status}`);
        pending.shift();
      } catch {
        break;
      }
    }
  } finally {
    flushing = false;
  }
}

function forwardMetric(payload: unknown): void {
  pending.push(payload);
  if (pending.length > MAX_QUEUE) pending.splice(0, pending.length - MAX_QUEUE);
  void flushQueue();
}

function forwardMetricBatch(batch: unknown): void {
  if (!Array.isArray(batch)) return;
  for (const item of batch) {
    forwardMetric(item);
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.kind === 'OBS_METRIC' && message.payload != null) {
    forwardMetric(message.payload);
  } else if (message?.kind === 'OBS_METRICS_BATCH' && Array.isArray(message.payload)) {
    forwardMetricBatch(message.payload);
  }
  sendResponse({ ok: true });
  return true;
});

setInterval(() => {
  void flushQueue();
}, 3000);
