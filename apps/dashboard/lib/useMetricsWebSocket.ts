'use client';

import { useEffect, useSyncExternalStore } from 'react';
import type { Metric } from '@observatory/shared';
import { useMetricStore } from './store';

const WS_URL = 'ws://127.0.0.1:3001';
const DEBOUNCE_MS = 120;

function num(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function parseMetricPayload(raw: unknown): Metric | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const ts = num(o.timestamp);
  if (ts == null) return null;

  if (o.type === 'lcp') {
    const value = num(o.value);
    if (value == null) return null;
    return { type: 'lcp', value, timestamp: ts };
  }
  if (o.type === 'cls') {
    const value = num(o.value);
    if (value == null) return null;
    return { type: 'cls', value, timestamp: ts };
  }
  if (o.type === 'longtask') {
    const duration = num(o.duration);
    if (duration == null) return null;
    return { type: 'longtask', duration, timestamp: ts };
  }
  if (o.type === 'resource' && typeof o.name === 'string') {
    const duration = num(o.duration);
    if (duration == null) return null;
    return { type: 'resource', name: o.name, duration, timestamp: ts };
  }
  return null;
}

/**
 * Single shared WebSocket for the tab. React 18 Strict Mode runs effects twice in dev; closing the socket
 * in effect cleanup caused "closed before connection is established" and broke the live feed.
 */
let sharedWs: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

const pending: Metric[] = [];
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

let connectionListeners = new Set<() => void>();
let connectedState = false;

function notifyConnection() {
  connectionListeners.forEach((fn) => fn());
}

function setConnected(next: boolean) {
  if (connectedState === next) return;
  connectedState = next;
  notifyConnection();
}

function flushPending() {
  const batch = pending.splice(0, pending.length);
  if (batch.length) useMetricStore.getState().addMetrics(batch);
}

function scheduleFlush() {
  if (debounceTimer) return;
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    flushPending();
  }, DEBOUNCE_MS);
}

function queueMetric(m: Metric) {
  pending.push(m);
  scheduleFlush();
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    ensureSharedSocket();
  }, 1500);
}

function wireSocket(ws: WebSocket) {
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
      useMetricStore.getState().setMetrics(list);
      return;
    }
    if (m.type === 'metric') {
      const metric = parseMetricPayload(m.payload);
      if (metric) queueMetric(metric);
    }
  });

  ws.addEventListener('open', () => {
    setConnected(true);
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  });

  ws.addEventListener('close', () => {
    setConnected(false);
    sharedWs = null;
    scheduleReconnect();
  });

  ws.addEventListener('error', () => {
    setConnected(false);
  });
}

function ensureSharedSocket(): WebSocket {
  if (sharedWs && (sharedWs.readyState === WebSocket.OPEN || sharedWs.readyState === WebSocket.CONNECTING)) {
    if (sharedWs.readyState === WebSocket.OPEN) setConnected(true);
    return sharedWs;
  }

  const ws = new WebSocket(WS_URL);
  sharedWs = ws;
  wireSocket(ws);
  if (ws.readyState === WebSocket.OPEN) setConnected(true);
  return ws;
}

function subscribeConnection(onStoreChange: () => void) {
  connectionListeners.add(onStoreChange);
  return () => {
    connectionListeners.delete(onStoreChange);
  };
}

function getConnectionSnapshot() {
  return connectedState;
}

function getServerSnapshot() {
  return false;
}

export function useMetricsWebSocket(): { connected: boolean } {
  const connected = useSyncExternalStore(subscribeConnection, getConnectionSnapshot, getServerSnapshot);

  useEffect(() => {
    ensureSharedSocket();
  }, []);

  return { connected };
}
