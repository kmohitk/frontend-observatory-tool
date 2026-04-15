import type { Metric } from '@observatory/shared';

export type Status = 'good' | 'warn' | 'bad';

export function lcpStatus(ms: number): Status {
  if (ms <= 2500) return 'good';
  if (ms <= 4000) return 'warn';
  return 'bad';
}

export function clsStatus(v: number): Status {
  if (v <= 0.1) return 'good';
  if (v <= 0.25) return 'warn';
  return 'bad';
}

export function latestLcp(metrics: Metric[]): number | null {
  let last: number | null = null;
  let lastTs = -1;
  for (const m of metrics) {
    if (m.type === 'lcp' && m.timestamp >= lastTs) {
      lastTs = m.timestamp;
      last = m.value;
    }
  }
  return last;
}

export function latestCls(metrics: Metric[]): number | null {
  let last: number | null = null;
  let lastTs = -1;
  for (const m of metrics) {
    if (m.type === 'cls' && m.timestamp >= lastTs) {
      lastTs = m.timestamp;
      last = m.value;
    }
  }
  return last;
}

export function countLongTasks(metrics: Metric[]): number {
  return metrics.filter((m) => m.type === 'longtask').length;
}

export function countResources(metrics: Metric[]): number {
  return metrics.filter((m) => m.type === 'resource').length;
}

export function lcpSeries(metrics: Metric[]): { t: number; v: number }[] {
  return metrics
    .filter((m): m is Extract<Metric, { type: 'lcp' }> => m.type === 'lcp')
    .map((m) => ({ t: m.timestamp, v: m.value }))
    .slice(-80);
}

export type ResourceAgg = { name: string; duration: number };

export function topSlowResources(metrics: Metric[], limit = 8): ResourceAgg[] {
  const map = new Map<string, number>();
  for (const m of metrics) {
    if (m.type !== 'resource') continue;
    const prev = map.get(m.name) ?? 0;
    map.set(m.name, Math.max(prev, m.duration));
  }
  return [...map.entries()]
    .map(([name, duration]) => ({ name, duration }))
    .sort((a, b) => b.duration - a.duration)
    .slice(0, limit);
}
