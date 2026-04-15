'use client';

import { useEffect, useRef, useState } from 'react';
import type { Metric } from '@observatory/shared';
import { useMetricStore } from './store';

const WS_URL = 'ws://localhost:3001';
const DEBOUNCE_MS = 120;

function parseMetricPayload(raw: unknown): Metric | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (o.type === 'lcp' && typeof o.value === 'number' && typeof o.timestamp === 'number') {
    return o as Metric;
  }
  if (o.type === 'cls' && typeof o.value === 'number' && typeof o.timestamp === 'number') {
    return o as Metric;
  }
  if (o.type === 'longtask' && typeof o.duration === 'number' && typeof o.timestamp === 'number') {
    return o as Metric;
  }
  if (
    o.type === 'resource' &&
    typeof o.name === 'string' &&
    typeof o.duration === 'number' &&
    typeof o.timestamp === 'number'
  ) {
    return o as Metric;
  }
  return null;
}

export function useMetricsWebSocket(): { connected: boolean } {
  const addMetrics = useMetricStore((s) => s.addMetrics);
  const setMetrics = useMetricStore((s) => s.setMetrics);
  const [connected, setConnected] = useState(false);

  const addMetricsRef = useRef(addMetrics);
  const setMetricsRef = useRef(setMetrics);
  addMetricsRef.current = addMetrics;
  setMetricsRef.current = setMetrics;

  useEffect(() => {
    const pending: Metric[] = [];
    let timer: ReturnType<typeof setTimeout> | null = null;

    const flush = () => {
      const batch = pending.splice(0, pending.length);
      if (batch.length) addMetricsRef.current(batch);
    };

    const scheduleFlush = () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        flush();
      }, DEBOUNCE_MS);
    };

    const queueMetric = (m: Metric) => {
      pending.push(m);
      scheduleFlush();
    };

    let ws: WebSocket | null = null;
    let closed = false;

    const connect = () => {
      ws = new WebSocket(WS_URL);

      ws.addEventListener('open', () => {
        if (closed) return;
        setConnected(true);
      });

      ws.addEventListener('close', () => {
        setConnected(false);
        if (!closed) setTimeout(connect, 1500);
      });

      ws.addEventListener('error', () => {
        try {
          ws?.close();
        } catch {
          /* ignore */
        }
      });

      ws.addEventListener('message', (ev) => {
        let msg: unknown;
        try {
          msg = JSON.parse(String(ev.data));
        } catch {
          return;
        }
        if (!msg || typeof msg !== 'object') return;
        const m = msg as Record<string, unknown>;
        if (m.type === 'snapshot' && Array.isArray(m.payload)) {
          const list = m.payload.map(parseMetricPayload).filter(Boolean) as Metric[];
          setMetricsRef.current(list);
          return;
        }
        if (m.type === 'metric') {
          const metric = parseMetricPayload(m.payload);
          if (metric) queueMetric(metric);
        }
      });
    };

    connect();

    return () => {
      closed = true;
      if (timer) clearTimeout(timer);
      flush();
      setConnected(false);
      try {
        ws?.close();
      } catch {
        /* ignore */
      }
    };
  }, []);

  return { connected };
}
