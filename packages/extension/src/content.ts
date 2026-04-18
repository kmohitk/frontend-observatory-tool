import type { Metric } from '@observatory/shared';
import { createObservatoryOverlay, startPerformanceCollection } from '@observatory/collector';

const overlay = createObservatoryOverlay();

const pending: Metric[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const FLUSH_MS = 100;
const MAX_BATCH = 120;

function flushMetrics(): void {
  flushTimer = null;
  if (pending.length === 0) return;
  const batch = pending.splice(0, Math.min(pending.length, MAX_BATCH));
  void chrome.runtime.sendMessage({ kind: 'OBS_METRICS_BATCH', payload: batch });
  if (pending.length) scheduleFlush();
}

function scheduleFlush(): void {
  if (flushTimer != null) return;
  flushTimer = setTimeout(flushMetrics, FLUSH_MS);
}

startPerformanceCollection({
  onMetric: (metric) => {
    pending.push(metric);
    scheduleFlush();
  },
  overlay,
});
