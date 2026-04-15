'use client';

import type { Status } from '@/lib/selectors';

const statusRing: Record<Status, string> = {
  good: 'text-emerald-400',
  warn: 'text-amber-400',
  bad: 'text-rose-400',
};

export function MetricCard({
  title,
  value,
  status,
  hint,
}: {
  title: string;
  value: string;
  status: Status;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-obs-border bg-obs-card p-4 shadow-lg shadow-black/20">
      <div className="text-xs font-medium uppercase tracking-wide text-obs-muted">{title}</div>
      <div className={`mt-2 text-3xl font-semibold tabular-nums ${statusRing[status]}`}>{value}</div>
      {hint ? <div className="mt-1 text-xs text-obs-muted">{hint}</div> : null}
    </div>
  );
}
