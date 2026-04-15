'use client';

import { MetricCard } from '@/components/MetricCard';
import { LcpLineChart } from '@/components/LcpLineChart';
import { ResourcesBarChart } from '@/components/ResourcesBarChart';
import { useMetricStore } from '@/lib/store';
import {
  clsStatus,
  countLongTasks,
  countResources,
  latestCls,
  latestLcp,
  lcpSeries,
  lcpStatus,
  topSlowResources,
} from '@/lib/selectors';

export default function OverviewPage() {
  const metrics = useMetricStore((s) => s.metrics);

  const lcp = latestLcp(metrics);
  const cls = latestCls(metrics);
  const ltCount = countLongTasks(metrics);
  const resCount = countResources(metrics);

  const lcpCard =
    lcp != null
      ? { value: `${Math.round(lcp)} ms`, status: lcpStatus(lcp), hint: 'Latest paint' }
      : { value: '—', status: 'good' as const, hint: 'Waiting for data' };

  const clsCard =
    cls != null
      ? { value: cls.toFixed(4), status: clsStatus(cls), hint: 'Cumulative layout shift' }
      : { value: '—', status: 'good' as const, hint: 'Waiting for data' };

  const ltStatus = ltCount > 12 ? 'bad' : ltCount > 4 ? 'warn' : ('good' as const);
  const resHint = resCount ? `${resCount} entries buffered (max 500)` : 'Waiting for data';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="LCP" value={lcpCard.value} status={lcpCard.status} hint={lcpCard.hint} />
        <MetricCard title="CLS" value={clsCard.value} status={clsCard.status} hint={clsCard.hint} />
        <MetricCard
          title="Long tasks"
          value={String(ltCount)}
          status={ltStatus}
          hint="Count in session buffer"
        />
        <MetricCard
          title="Resources"
          value={String(resCount)}
          status="good"
          hint={resHint}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <LcpLineChart data={lcpSeries(metrics)} />
        <ResourcesBarChart data={topSlowResources(metrics)} />
      </div>
    </div>
  );
}
