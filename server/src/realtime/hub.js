import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

/**
 * WebSocket hub for live dashboard updates (SRS §9.2).
 * Clients connect to ws://host/ws?token=<accessToken>; we push alert events to
 * the matching user.
 */
const clients = new Map(); // userId -> Set<WebSocket>

export function attachWebsocket(server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      const token = url.searchParams.get('token');
      const payload = jwt.verify(token, env.jwt.accessSecret);
      const userId = payload.sub;
      if (!clients.has(userId)) clients.set(userId, new Set());
      clients.get(userId).add(ws);
      ws.send(JSON.stringify({ kind: 'connected' }));

      ws.on('close', () => {
        const set = clients.get(userId);
        set?.delete(ws);
        if (set && set.size === 0) clients.delete(userId);
      });
    } catch {
      ws.close(1008, 'unauthorized');
    }
  });

  // Heartbeat to keep proxies from dropping idle sockets.
  setInterval(() => {
    for (const set of clients.values()) {
      for (const ws of set) {
        if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ kind: 'ping' }));
      }
    }
  }, 30_000).unref?.();

  return wss;
}

export function publishToUser(userId, message) {
  const set = clients.get(userId);
  if (!set) return;
  const data = JSON.stringify(message);
  for (const ws of set) {
    if (ws.readyState === ws.OPEN) ws.send(data);
  }
}
