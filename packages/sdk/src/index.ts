import type { Metric } from '@observatory/shared';
import { OBS_METRIC_MESSAGE_TYPE } from '@observatory/shared';

function now(): number {
  return Date.now();
}

function send(metric: Metric): void {
  window.postMessage({ type: OBS_METRIC_MESSAGE_TYPE, payload: metric }, '*');
}

function createOverlay(): {
  setLcp: (v: string) => void;
  setCls: (v: string) => void;
  setLongTask: (v: string) => void;
} {
  const root = document.createElement('div');
  root.id = 'observatory-perf-overlay';
  root.setAttribute(
    'style',
    [
      'position:fixed',
      'right:12px',
      'bottom:12px',
      'z-index:2147483646',
      'font:12px/1.4 ui-monospace,monospace',
      'color:#E5E7EB',
      'background:#1F2937',
      'border:1px solid #374151',
      'border-radius:8px',
      'padding:10px 12px',
      'min-width:160px',
      'box-shadow:0 8px 24px rgba(0,0,0,.35)',
      'pointer-events:none',
    ].join(';'),
  );

  const title = document.createElement('div');
  title.textContent = 'Observatory';
  title.style.cssText = 'font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#9CA3AF;margin-bottom:6px';
  root.appendChild(title);

  const mkRow = (label: string) => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;justify-content:space-between;gap:12px;margin-top:4px';
    const l = document.createElement('span');
    l.textContent = label;
    l.style.color = '#9CA3AF';
    const v = document.createElement('span');
    v.style.fontWeight = '600';
    row.append(l, v);
    root.appendChild(row);
    return v;
  };

  const lcpEl = mkRow('LCP');
  const clsEl = mkRow('CLS');
  const ltEl = mkRow('Last LT');

  const attach = () => {
    if (document.body) document.body.appendChild(root);
    else queueMicrotask(attach);
  };
  attach();

  return {
    setLcp: (v) => {
      lcpEl.textContent = v;
    },
    setCls: (v) => {
      clsEl.textContent = v;
    },
    setLongTask: (v) => {
      ltEl.textContent = v;
    },
  };
}

function init(): void {
  if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') return;

  const overlay = createOverlay();
  let clsValue = 0;
  let lastLcp = 0;

  const safeObserver = (
    type: string,
    cb: (list: PerformanceObserverEntryList) => void,
  ): void => {
    try {
      const po = new PerformanceObserver(cb);
      po.observe({ type, buffered: true } as PerformanceObserverInit);
    } catch {
      /* unsupported */
    }
  };

  safeObserver('largest-contentful-paint', (list) => {
    const entries = list.getEntries() as PerformanceEntry[];
    for (const e of entries) {
      const v = (e as PerformanceEntry & { renderTime?: number; loadTime?: number }).renderTime ??
        (e as PerformanceEntry & { loadTime?: number }).loadTime ??
        e.startTime;
      lastLcp = v;
      const metric: Metric = { type: 'lcp', value: v, timestamp: now() };
      send(metric);
      overlay.setLcp(`${Math.round(v)} ms`);
    }
  });

  safeObserver('layout-shift', (list) => {
    for (const e of list.getEntries() as PerformanceEntry[]) {
      const ls = e as PerformanceEntry & { value?: number; hadRecentInput?: boolean };
      if (ls.hadRecentInput) continue;
      clsValue += ls.value ?? 0;
      const metric: Metric = { type: 'cls', value: clsValue, timestamp: now() };
      send(metric);
      overlay.setCls(clsValue.toFixed(4));
    }
  });

  safeObserver('longtask', (list) => {
    for (const e of list.getEntries()) {
      const d = e.duration;
      const metric: Metric = { type: 'longtask', duration: d, timestamp: now() };
      send(metric);
      overlay.setLongTask(`${Math.round(d)} ms`);
    }
  });

  const seenResources = new Set<string>();
  const flushResources = (): void => {
    try {
      const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      for (const e of entries) {
        const key = `${e.name}|${e.startTime}`;
        if (seenResources.has(key)) continue;
        seenResources.add(key);
        const metric: Metric = {
          type: 'resource',
          name: e.name,
          duration: e.duration,
          timestamp: now(),
        };
        send(metric);
      }
    } catch {
      /* ignore */
    }
  };

  safeObserver('resource', (list) => {
    for (const e of list.getEntries() as PerformanceResourceTiming[]) {
      const key = `${e.name}|${e.startTime}`;
      if (seenResources.has(key)) continue;
      seenResources.add(key);
      const metric: Metric = {
        type: 'resource',
        name: e.name,
        duration: e.duration,
        timestamp: now(),
      };
      send(metric);
    }
  });

  if (document.readyState === 'complete') flushResources();
  else window.addEventListener('load', () => flushResources(), { once: true });

  const scheduleFlush = (): void => {
    const ric = (window as Window & { requestIdleCallback?: (cb: () => void) => number })
      .requestIdleCallback;
    if (ric) ric(() => flushResources());
    else window.setTimeout(flushResources, 2000);
  };
  scheduleFlush();
  window.setInterval(scheduleFlush, 4000);
}

init();
