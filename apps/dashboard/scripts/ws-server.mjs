import { WebSocketServer } from 'ws';

const PORT = 3001;
const MAX_METRICS = 500;

/** @type {unknown[]} */
let metrics = [];

const wss = new WebSocketServer({ port: PORT });

function broadcast(obj) {
  const data = JSON.stringify(obj);
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(data);
  }
}

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
      metrics = [...metrics, msg.payload].slice(-MAX_METRICS);
      broadcast({ type: 'metric', payload: msg.payload });
    }
  });
});

console.log(`[observatory-ws] listening on ws://localhost:${PORT}`);
