'use client';

import { create } from 'zustand';
import type { Metric } from '@observatory/shared';

const MAX_METRICS = 500;

export type MetricStore = {
  metrics: Metric[];
  addMetric: (m: Metric) => void;
  addMetrics: (batch: Metric[]) => void;
  setMetrics: (metrics: Metric[]) => void;
};

export const useMetricStore = create<MetricStore>((set) => ({
  metrics: [],
  addMetric: (m) =>
    set((s) => ({
      metrics: [...s.metrics, m].slice(-MAX_METRICS),
    })),
  addMetrics: (batch) =>
    set((s) => ({
      metrics: [...s.metrics, ...batch].slice(-MAX_METRICS),
    })),
  setMetrics: (metrics) => set({ metrics: metrics.slice(-MAX_METRICS) }),
}));
