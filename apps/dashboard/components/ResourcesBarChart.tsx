'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ResourceAgg } from '@/lib/selectors';

function shortName(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname.length > 24 ? `${u.pathname.slice(0, 22)}…` : u.pathname || u.host;
  } catch {
    return url.length > 28 ? `${url.slice(0, 26)}…` : url;
  }
}

export function ResourcesBarChart({ data }: { data: ResourceAgg[] }) {
  const chartData = data.map((d) => ({
    name: shortName(d.name),
    full: d.name,
    ms: Math.round(d.duration),
  }));

  return (
    <div className="h-[320px] w-full rounded-lg border border-obs-border bg-obs-card p-4">
      <div className="mb-3 text-sm font-medium text-obs-text">Slowest resources (max duration)</div>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 12, left: 8, bottom: 0 }}>
          <CartesianGrid stroke="#374151" strokeDasharray="4 4" horizontal={false} />
          <XAxis type="number" tick={{ fill: '#9CA3AF', fontSize: 11 }} unit=" ms" />
          <YAxis
            type="category"
            dataKey="name"
            width={120}
            tick={{ fill: '#9CA3AF', fontSize: 10 }}
          />
          <Tooltip
            contentStyle={{
              background: '#111827',
              border: '1px solid #374151',
              borderRadius: 8,
              color: '#E5E7EB',
              maxWidth: 360,
            }}
            formatter={(value: number) => [`${value} ms`, 'Duration']}
            labelFormatter={(_, payload) => {
              const p = payload?.[0]?.payload as { full?: string } | undefined;
              return p?.full ?? '';
            }}
          />
          <Bar
            dataKey="ms"
            fill="#60a5fa"
            radius={[0, 4, 4, 0]}
            isAnimationActive
            animationDuration={400}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
