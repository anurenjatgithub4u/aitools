// FindurAI realtime relay. One process, many city rooms, no database.
//
// Client → server:  {t:'join', id, n, g, room}   first message
//                   {t:'s'|'c'|'f'|'fa'|'bye', ...} afterwards (see src/world/net.ts for the shapes)
// Server → client:  {t:'who', peers:[latest state packet per player]}  right after join
//                   every relayed message from other players in the same room
//                   {t:'bye', id}  when someone disconnects

import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';

const PORT = Number(process.env.PORT || 8787);
const MAX_ROOM = Number(process.env.MAX_ROOM || 60);      // players per city
const MAX_MSG = 600;                                       // bytes
const RATE = 25;                                           // messages / second / client

/** room -> Map<id, { ws, name, gender, last: latest state packet | null }> */
const rooms = new Map();

const server = createServer((req, res) => {
  if (req.url === '/health') {
    let players = 0; for (const r of rooms.values()) players += r.size;
    res.writeHead(200, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
    res.end(JSON.stringify({ ok: true, rooms: rooms.size, players }));
    return;
  }
  res.writeHead(404); res.end();
});

const wss = new WebSocketServer({ server, path: '/multiplayer', maxPayload: 4096 });

wss.on('connection', (ws) => {
  let room = null, id = null, budget = RATE, alive = true;
  const refill = setInterval(() => { budget = RATE; }, 1000);
  const pingT = setInterval(() => { if (!alive) return ws.terminate(); alive = false; ws.ping(); }, 25000);
  ws.on('pong', () => { alive = true; });

  const relay = (msg) => {
    const raw = JSON.stringify(msg);
    for (const [pid, p] of room) if (pid !== id && p.ws.readyState === 1) p.ws.send(raw);
  };

  ws.on('message', (data) => {
    if (data.length > MAX_MSG || --budget < 0) return;
    let m; try { m = JSON.parse(String(data)); } catch { return; }
    if (!m || typeof m !== 'object') return;

    if (m.t === 'join') {
      if (room) return;
      const name = String(m.n || 'Explorer').slice(0, 24), gender = m.g === 'f' ? 'f' : 'm';
      const roomId = String(m.room || 'city').slice(0, 32);
      id = String(m.id || '').slice(0, 40);
      if (!id) return ws.close(4001, 'missing id');
      room = rooms.get(roomId) ?? (rooms.set(roomId, new Map()), rooms.get(roomId));
      if (room.size >= MAX_ROOM) return ws.close(4002, 'room full');
      room.get(id)?.ws.close(4003, 'replaced');           // same id reconnecting from elsewhere
      room.set(id, { ws, name, gender, last: null });
      // everyone already here: their latest state, or just who they are if they have not moved yet
      ws.send(JSON.stringify({ t: 'who', peers: [...room].filter(([, p]) => p.ws !== ws).map(([pid, p]) => p.last ?? { t: 'hi', id: pid, n: p.name, g: p.gender }) }));
      relay({ t: 'hi', id, n: name, g: gender });
      return;
    }
    if (!room || !id) return;
    if (m.id !== id) return;                               // no spoofing
    if (m.t === 's') room.get(id).last = m;
    if (m.t === 'c') m.text = String(m.text || '').slice(0, 160);
    if (m.t === 'g') m.gift = String(m.gift || '').slice(0, 4);
    if (['s', 'c', 'f', 'fa', 'bye', 'hi', 'g', 'inv'].includes(m.t)) relay(m);
  });

  const leave = () => {
    clearInterval(refill); clearInterval(pingT);
    if (!room || !id) return;
    if (room.get(id)?.ws === ws) { room.delete(id); relay({ t: 'bye', id }); }
    if (room.size === 0) for (const [k, r] of rooms) if (r === room) rooms.delete(k);
    room = null;
  };
  ws.on('close', leave);
  ws.on('error', leave);
});

server.listen(PORT, () => console.log(`findurai realtime listening on :${PORT}  (ws path /multiplayer)`));
