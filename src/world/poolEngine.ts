// 8-ball pool rules + physics with no drawing at all, so the same game can run on the 2D overlay
// or on the real table inside the Neon Palace. Table space is 900 × 500 units, balls have radius 11.
// Simplified rules: first pot decides your group (solids 1–7 / stripes 9–15); pot the 8 after your
// group to win, pot it early (or with the cue) and you lose; scratch = ball in hand.

export interface PoolBall { n: number; x: number; y: number; vx: number; vy: number; in: boolean }
export type Who = 'you' | 'bot';

export const POOL = { W: 900, H: 500, RAIL: 34, R: 11, POCKET: 22 } as const;
export const POOL_COLORS: Record<number, number> = {
  0: 0xffffff, 1: 0xf2c31b, 2: 0x2f6fd1, 3: 0xd94a3d, 4: 0x6a3fb0, 5: 0xf27d3a, 6: 0x2fa66a, 7: 0x8a2a2a, 8: 0x111111,
  9: 0xf2c31b, 10: 0x2f6fd1, 11: 0xd94a3d, 12: 0x6a3fb0, 13: 0xf27d3a, 14: 0x2fa66a, 15: 0x8a2a2a,
};
const { W, H, RAIL, R, POCKET } = POOL;
export const POOL_POCKETS: [number, number][] = [[RAIL, RAIL], [W / 2, RAIL - 6], [W - RAIL, RAIL], [RAIL, H - RAIL], [W / 2, H - RAIL + 6], [W - RAIL, H - RAIL]];
export const isSolid = (n: number) => n >= 1 && n <= 7;
export const isStripe = (n: number) => n >= 9;

export interface PoolEvents {
  status(text: string): void;                 // what the HUD should say now
  turn(who: Who): void;
  finish(win: boolean, why: string): void;
  potted?(n: number): void;                   // a ball dropped (for a sound / animation)
  botAim?(angle: number, power: number): void; // the bot has decided; the view can animate the cue before the balls move
}

export interface PoolGame {
  balls: PoolBall[]; cue: PoolBall;
  readonly turn: Who; readonly moving: boolean; readonly ballInHand: boolean; readonly over: boolean; readonly groups: { you: 'solid' | 'stripe' | null };
  groupName(who: Who): string; remaining(who: Who): number; mine(who: Who, n: number): boolean;
  step(): void;                                // one frame of physics; ends the shot when everything stops
  shoot(angle: number, power: number): void;   // angle in radians, power ≈ 6..24
  placeCue(x: number, y: number): boolean;     // ball in hand
  autoPlaceCue(): void;
  botDecide(): { angle: number; power: number } | null;
  dispose(): void;
}

export function createPool(opponent: string, ev: PoolEvents, botDelayMs = 900): PoolGame {
  const balls: PoolBall[] = [];
  const mk = (n: number, x: number, y: number) => balls.push({ n, x, y, vx: 0, vy: 0, in: false });
  mk(0, W * 0.27, H / 2);
  const order = [1, 9, 2, 10, 8, 3, 11, 4, 12, 5, 13, 6, 14, 7, 15];
  let k = 0;
  for (let row = 0; row < 5; row++) for (let i = 0; i <= row; i++) mk(order[k++], W * 0.66 + row * R * 1.74, H / 2 + (i - row / 2) * R * 2.05);
  const cue = balls[0];
  let turn: Who = 'you';
  const groups: { you: 'solid' | 'stripe' | null } = { you: null };
  let moving = false, ballInHand = false, over = false, botTimer = 0;
  let potted: number[] = [], firstHit: number | null = null;

  const mine = (who: Who, n: number) => {
    const g = who === 'you' ? groups.you : groups.you === 'solid' ? 'stripe' : groups.you === 'stripe' ? 'solid' : null;
    return g === null ? n !== 8 && n !== 0 : g === 'solid' ? isSolid(n) : isStripe(n);
  };
  const remaining = (who: Who) => balls.filter((b) => !b.in && b.n !== 0 && b.n !== 8 && mine(who, b.n)).length;
  const groupName = (who: Who) => (groups.you === null ? 'open table' : (who === 'you') === (groups.you === 'solid') ? 'solids' : 'stripes');
  const status = () => {
    ev.turn(turn);
    if (!over) ev.status(turn === 'you' ? (ballInHand ? 'Ball in hand — place the cue ball' : 'Your shot') : `${opponent} is lining one up…`);
  };

  function physics() {
    let any = false;
    for (let s = 0; s < 3; s++) {
      for (const b of balls) {
        if (b.in) continue;
        b.x += b.vx / 3; b.y += b.vy / 3;
        b.vx *= 0.9935; b.vy *= 0.9935;
        if (Math.hypot(b.vx, b.vy) < 0.05) { b.vx = 0; b.vy = 0; }
        for (const [px, py] of POOL_POCKETS) if (Math.hypot(b.x - px, b.y - py) < POCKET) { b.in = true; b.vx = b.vy = 0; potted.push(b.n); ev.potted?.(b.n); break; }
        if (b.in) continue;
        if (b.x < RAIL + R) { b.x = RAIL + R; b.vx = -b.vx * 0.8; }
        if (b.x > W - RAIL - R) { b.x = W - RAIL - R; b.vx = -b.vx * 0.8; }
        if (b.y < RAIL + R) { b.y = RAIL + R; b.vy = -b.vy * 0.8; }
        if (b.y > H - RAIL - R) { b.y = H - RAIL - R; b.vy = -b.vy * 0.8; }
      }
      for (let i = 0; i < balls.length; i++) for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i], c = balls[j];
        if (a.in || c.in) continue;
        const dx = c.x - a.x, dy = c.y - a.y, d = Math.hypot(dx, dy);
        if (d < R * 2 && d > 0) {
          const nx = dx / d, ny = dy / d, overlap = R * 2 - d;
          a.x -= nx * overlap / 2; a.y -= ny * overlap / 2; c.x += nx * overlap / 2; c.y += ny * overlap / 2;
          const p = (a.vx - c.vx) * nx + (a.vy - c.vy) * ny;
          if (p > 0) {
            a.vx -= p * nx; a.vy -= p * ny; c.vx += p * nx; c.vy += p * ny;
            if (firstHit === null && (a.n === 0 || c.n === 0)) firstHit = a.n === 0 ? c.n : a.n;
          }
        }
      }
    }
    for (const b of balls) if (!b.in && (b.vx || b.vy)) any = true;
    return any;
  }

  function shoot(angle: number, power: number) {
    if (over || moving) return;
    cue.vx = Math.cos(angle) * power; cue.vy = Math.sin(angle) * power;
    moving = true; potted = []; firstHit = null; ballInHand = false;
    ev.status(turn === 'you' ? 'Nice…' : `${opponent} shoots`);
  }

  function endShot() {
    moving = false;
    const who = turn, other: Who = who === 'you' ? 'bot' : 'you';
    const eight = potted.includes(8), scratch = potted.includes(0);
    if (eight) {
      const cleared = remaining(who) === 0 && groups.you !== null;
      return finish(cleared && !scratch ? who === 'you' : who !== 'you', cleared && !scratch ? `${who === 'you' ? 'You' : opponent} sank the 8-ball to win` : `${who === 'you' ? 'You' : opponent} sank the 8-ball too early`);
    }
    if (scratch) { cue.in = false; cue.vx = cue.vy = 0; cue.x = W * 0.27; cue.y = H / 2; }
    const wasOpen = groups.you === null;
    if (groups.you === null) { const first = potted.find((n) => n !== 0 && n !== 8); if (first !== undefined) groups.you = (who === 'you') === isSolid(first) ? 'solid' : 'stripe'; }
    const good = potted.some((n) => n !== 0 && n !== 8 && mine(who, n));
    const foul = scratch || firstHit === null || (!wasOpen && firstHit !== 8 && !mine(who, firstHit));
    if (foul || !good) { turn = other; ballInHand = scratch && turn === 'you'; if (scratch && turn === 'bot') autoPlaceCue(); }
    status();
    if (turn === 'bot' && !over) botTimer = window.setTimeout(botGo, botDelayMs);
  }

  function finish(win: boolean, why: string) { over = true; ev.finish(win, why); }

  function botDecide(): { angle: number; power: number } | null {
    if (over) return null;
    const targets = balls.filter((b) => !b.in && b.n !== 0 && (remaining('bot') === 0 ? b.n === 8 : mine('bot', b.n) && b.n !== 8));
    let best: { angle: number; power: number; score: number } | null = null;
    for (const b of targets) for (const [px, py] of POOL_POCKETS) {
      const toP = Math.atan2(py - b.y, px - b.x);
      const gx = b.x - Math.cos(toP) * R * 2, gy = b.y - Math.sin(toP) * R * 2;
      const angle = Math.atan2(gy - cue.y, gx - cue.x);
      const cut = Math.abs(Math.atan2(Math.sin(angle - toP), Math.cos(angle - toP)));
      if (cut > 1.2) continue;
      const d = Math.hypot(gx - cue.x, gy - cue.y);
      let blocked = false;
      for (const o of balls) {
        if (o.in || o === cue || o === b) continue;
        const t = (o.x - cue.x) * Math.cos(angle) + (o.y - cue.y) * Math.sin(angle);
        if (t > 0 && t < d && Math.hypot(o.x - (cue.x + Math.cos(angle) * t), o.y - (cue.y + Math.sin(angle) * t)) < R * 2) { blocked = true; break; }
      }
      if (blocked) continue;
      const dist = Math.hypot(px - b.x, py - b.y);
      const score = cut * 2 + dist / 300 + d / 600;
      if (!best || score < best.score) best = { angle, power: Math.min(22, 8 + dist / 40 + d / 60), score };
    }
    if (!best) { const b = targets[0] ?? balls.find((x) => !x.in && x.n !== 0)!; best = { angle: Math.atan2(b.y - cue.y, b.x - cue.x), power: 12, score: 9 }; }
    return { angle: best.angle + (Math.random() - 0.5) * 0.06, power: best.power };
  }

  function botGo() {
    const d = botDecide();
    if (!d) return;
    if (ev.botAim) { ev.botAim(d.angle, d.power); botTimer = window.setTimeout(() => shoot(d.angle, d.power), 700); }
    else shoot(d.angle, d.power);
  }

  function placeCue(x: number, y: number) {
    if (x > RAIL + R && x < W - RAIL - R && y > RAIL + R && y < H - RAIL - R && !balls.some((b) => !b.in && b.n !== 0 && Math.hypot(b.x - x, b.y - y) < R * 2.2)) { cue.x = x; cue.y = y; ballInHand = false; status(); return true; }
    return false;
  }
  function autoPlaceCue() {
    for (let tries = 0; tries < 60; tries++) { const x = W * 0.27 + (tries % 6) * R * 2.5, y = H / 2 + (Math.floor(tries / 6) - 5) * R * 2.5; if (placeCue(x, y)) return; }
    cue.x = W * 0.27; cue.y = H / 2; ballInHand = false;
  }

  status();
  return {
    balls, cue,
    get turn() { return turn; }, get moving() { return moving; }, get ballInHand() { return ballInHand; }, get over() { return over; }, get groups() { return groups; },
    groupName, remaining, mine,
    step() { if (moving && !physics()) endShot(); },
    shoot, placeCue, autoPlaceCue, botDecide,
    dispose() { over = true; clearTimeout(botTimer); },
  };
}
