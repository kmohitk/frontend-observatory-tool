'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export function LcpLineChart({ data }: { data: { t: number; v: number }[] }) {
  const chartData = data.map((d, i) => ({
    i,
    ms: Math.round(d.v),
    label: new Date(d.t).toLocaleTimeString(),
  }));

  return (
    <div className="h-[320px] w-full rounded-lg border border-obs-border bg-obs-card p-6">
      <div className="mb-3 text-sm font-medium text-obs-text">LCP over time</div>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#374151" strokeDasharray="4 4" />
          <XAxis dataKey="label" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
          <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} unit=" ms" />
          <Tooltip
            contentStyle={{
              background: '#111827',
              border: '1px solid #374151',
              borderRadius: 8,
              color: '#E5E7EB',
            }}
            labelStyle={{ color: '#9CA3AF' }}
            formatter={(value: number) => [`${value} ms`, 'LCP']}
          />
          <Line
            type="monotone"
            dataKey="ms"
            stroke="#34d399"
            strokeWidth={2}
            dot={false}
            isAnimationActive
            animationDuration={400}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
