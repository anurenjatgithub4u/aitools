// Realtime transport for the city: every player broadcasts a small state packet a few
// times a second; everyone else renders it. Two backends behind one interface:
//   • WsTransport — our own relay (server/index.mjs) at NEXT_PUBLIC_REALTIME_URL; the live site
//   • LocalTransport — BroadcastChannel across tabs of this browser; used when no URL is configured

export type Gender = 'm' | 'f';

export type NetMsg =
  | { t: 's'; id: string; n: string; g: Gender; x: number; z: number; ry: number; w: number; j: number; v: string; h: number; ts: number; p?: string } // state (p = id of the driver whose car I am riding in)
  | { t: 'c'; id: string; n: string; text: string }                 // chat
  | { t: 'f'; id: string; to: string; n: string }                   // friend request
  | { t: 'fa'; id: string; to: string; n: string }                  // friend accepted
  | { t: 'hi'; id: string; n: string; g: Gender }                   // just joined — please send me your state now
  | { t: 'who'; peers: (Extract<NetMsg, { t: 's' }> | Extract<NetMsg, { t: 'hi' }>)[] }   // server: everyone already here
  | { t: 'g'; id: string; to: string; n: string; gift: string }                     // a gift
  | { t: 'inv'; id: string; to: string; n: string; kind: string; x: number; z: number }   // "come to the pier bench / my apartment"
  | { t: 'lift'; id: string; to: string; n: string; on: boolean; seat: number }   // driver: hop in / out of my car
  | { t: 'bye'; id: string };

export type NetStatus = 'connecting' | 'online' | 'offline';

export interface Transport {
  readonly kind: 'ws' | 'local';
  send(msg: NetMsg): void;
  onMessage(cb: (msg: NetMsg) => void): void;
  onStatus(cb: (s: NetStatus) => void): void;
  close(): void;
}

class LocalTransport implements Transport {
  readonly kind = 'local' as const;
  private ch: BroadcastChannel | null;
  private cbs: ((m: NetMsg) => void)[] = [];
  constructor(room: string) {
    this.ch = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(`findurai:${room}`);
    if (this.ch) this.ch.onmessage = (e) => this.cbs.forEach((cb) => cb(e.data as NetMsg));
  }
  send(msg: NetMsg) { this.ch?.postMessage(msg); }
  onMessage(cb: (m: NetMsg) => void) { this.cbs.push(cb); }
  onStatus(cb: (s: NetStatus) => void) { cb(this.ch ? 'online' : 'offline'); }
  close() { this.ch?.close(); }
}

class WsTransport implements Transport {
  readonly kind = 'ws' as const;
  private ws: WebSocket | null = null;
  private cbs: ((m: NetMsg) => void)[] = [];
  private statusCbs: ((s: NetStatus) => void)[] = [];
  private status: NetStatus = 'connecting';
  private attempt = 0;
  private timer = 0;
  private stopped = false;
  private queue: NetMsg[] = [];

  constructor(private url: string, private room: string, private self: { id: string; name: string; gender: Gender }) {
    this.open();
  }

  private setStatus(s: NetStatus) { if (s !== this.status) { this.status = s; this.statusCbs.forEach((cb) => cb(s)); } }

  private open() {
    if (this.stopped) return;
    this.setStatus(this.attempt ? 'offline' : 'connecting');
    let ws: WebSocket;
    try { ws = new WebSocket(this.url); } catch { this.retry(); return; }
    this.ws = ws;
    ws.onopen = () => {
      this.attempt = 0;
      ws.send(JSON.stringify({ t: 'join', id: this.self.id, n: this.self.name, g: this.self.gender, room: this.room }));
      this.setStatus('online');
      for (const m of this.queue.splice(0)) ws.send(JSON.stringify(m));
    };
    ws.onmessage = (e) => { let m: NetMsg; try { m = JSON.parse(String(e.data)); } catch { return; } this.cbs.forEach((cb) => cb(m)); };
    ws.onclose = () => { if (this.ws === ws) { this.ws = null; this.retry(); } };
    ws.onerror = () => ws.close();
  }

  private retry() {
    if (this.stopped) return;
    this.setStatus('offline');
    const wait = Math.min(15000, 800 * 2 ** this.attempt++) + Math.random() * 400;
    clearTimeout(this.timer);
    this.timer = window.setTimeout(() => this.open(), wait);
  }

  send(msg: NetMsg) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
    else if (msg.t !== 's' && this.queue.length < 20) this.queue.push(msg);   // chat / friend requests survive a blip
  }
  onMessage(cb: (m: NetMsg) => void) { this.cbs.push(cb); }
  onStatus(cb: (s: NetStatus) => void) { this.statusCbs.push(cb); cb(this.status); }
  close() { this.stopped = true; clearTimeout(this.timer); this.ws?.close(); }
}

export function createTransport(room: string, self: { id: string; name: string; gender: Gender }): Transport {
  const url = process.env.NEXT_PUBLIC_REALTIME_URL;
  if (url) return new WsTransport(url, room, self);
  return new LocalTransport(room);
}
