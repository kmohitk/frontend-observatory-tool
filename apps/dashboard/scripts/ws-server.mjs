import http from 'node:http';
import { WebSocketServer } from 'ws';

const PORT = 3001;
const HOST = '0.0.0.0';
const MAX_METRICS = 500;

/** @type {unknown[]} */
let metrics = [];

function broadcast(obj) {
  const data = JSON.stringify(obj);
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(data);
  }
}

function ingestMetric(payload) {
  metrics = [...metrics, payload].slice(-MAX_METRICS);
  broadcast({ type: 'metric', payload });
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'OPTIONS' && req.url === '/ingest') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/ingest') {
    let body = '';
    req.on('data', (c) => {
      body += c;
    });
    req.on('end', () => {
      try {
        const msg = JSON.parse(body);
        if (msg?.type === 'metric' && msg.payload != null) {
          ingestMetric(msg.payload);
        }
      } catch {
        /* ignore */
      }
      res.writeHead(204);
      res.end();
    });
    req.on('error', () => {
      res.writeHead(400);
      res.end();
    });
    return;
  }

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        ok: true,
        wsClients: wss.clients.size,
        metricsBuffered: metrics.length,
      }),
    );
    return;
  }

  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'snapshot', payload: metrics }));

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(String(raw));
    } catch {
      return;
    }
    if (msg?.type === 'metric' && msg.payload != null) {
      ingestMetric(msg.payload);
    }
  });
});

server.listen(PORT, HOST, () => {
  console.log(`[observatory-ws] HTTP + WebSocket on http://127.0.0.1:${PORT}`);
  console.log(`[observatory-ws] Ingest: POST http://127.0.0.1:${PORT}/ingest`);
  console.log(`[observatory-ws] Health: GET http://127.0.0.1:${PORT}/health`);
});
