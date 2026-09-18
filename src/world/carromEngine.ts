// Carrom rules + physics with no drawing, shared by the 2D overlay and the board inside the Neon Palace.
// Board space is 600 × 600 units; you play white from the bottom baseline (y = 530), the rival plays
// black from the top (y = 70). Pocket your colour to keep the turn; the red queen is worth 3; striker in
// a pocket brings one of your coins back. First to clear nine coins wins.

export interface Coin { kind: 'w' | 'b' | 'q' | 's'; x: number; y: number; vx: number; vy: number; in: boolean }
export type Who = 'you' | 'bot';
export const CARROM = { W: 600, FRAME: 30, R: 10, RS: 14, POCKET: 20, BASE_YOU: 530, BASE_BOT: 70, MIN_X: 90, MAX_X: 510 } as const;
const { W, FRAME, R, RS, POCKET } = CARROM;
export const CARROM_POCKETS: [number, number][] = [[FRAME + 6, FRAME + 6], [W - FRAME - 6, FRAME + 6], [FRAME + 6, W - FRAME - 6], [W - FRAME - 6, W - FRAME - 6]];

export interface CarromEvents {
  status(text: string): void;
  turn(who: Who): void;
  finish(win: boolean, why: string): void;
  potted?(c: Coin): void;
  botAim?(x: number, angle: number, power: number): void;   // the bot placed its striker and is about to flick
}

export interface CarromGame {
  coins: Coin[]; striker: Coin;
  readonly turn: Who; readonly moving: boolean; readonly over: boolean; readonly queen: Who | null; readonly potted: { you: number; bot: number };
  step(): void;
  placeStriker(who: Who, x: number): void;
  shoot(angle: number, power: number): void;
  botDecide(): { x: number; angle: number; power: number } | null;
  dispose(): void;
}

export function createCarrom(opponent: string, ev: CarromEvents, botDelayMs = 900): CarromGame {
  const coins: Coin[] = [];
  const c = W / 2;
  coins.push({ kind: 'q', x: c, y: c, vx: 0, vy: 0, in: false });
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; coins.push({ kind: i % 2 ? 'w' : 'b', x: c + Math.cos(a) * R * 2.05, y: c + Math.sin(a) * R * 2.05, vx: 0, vy: 0, in: false }); }
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2 + 0.26; coins.push({ kind: i % 2 ? 'b' : 'w', x: c + Math.cos(a) * R * 4.1, y: c + Math.sin(a) * R * 4.1, vx: 0, vy: 0, in: false }); }
  const striker: Coin = { kind: 's', x: c, y: CARROM.BASE_YOU, vx: 0, vy: 0, in: false };
  let turn: Who = 'you', moving = false, over = false, queen: Who | null = null, timer = 0;
  const potted = { you: 0, bot: 0 };
  let shotPots: Coin[] = [];
  const own = (who: Who) => (who === 'you' ? 'w' : 'b');

  function placeStriker(who: Who, x: number) { striker.in = false; striker.vx = striker.vy = 0; striker.x = Math.max(CARROM.MIN_X, Math.min(CARROM.MAX_X, x)); striker.y = who === 'you' ? CARROM.BASE_YOU : CARROM.BASE_BOT; }

  function physics() {
    const all = [striker, ...coins];
    for (let s = 0; s < 3; s++) {
      for (const b of all) {
        if (b.in) continue;
        b.x += b.vx / 3; b.y += b.vy / 3;
        b.vx *= 0.988; b.vy *= 0.988;
        if (Math.hypot(b.vx, b.vy) < 0.04) b.vx = b.vy = 0;
        const r = b === striker ? RS : R;
        for (const [px, py] of CARROM_POCKETS) if (Math.hypot(b.x - px, b.y - py) < POCKET) { b.in = true; b.vx = b.vy = 0; shotPots.push(b); ev.potted?.(b); break; }
        if (b.in) continue;
        if (b.x < FRAME + r) { b.x = FRAME + r; b.vx = -b.vx * 0.75; }
        if (b.x > W - FRAME - r) { b.x = W - FRAME - r; b.vx = -b.vx * 0.75; }
        if (b.y < FRAME + r) { b.y = FRAME + r; b.vy = -b.vy * 0.75; }
        if (b.y > W - FRAME - r) { b.y = W - FRAME - r; b.vy = -b.vy * 0.75; }
      }
      for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
        const a = all[i], b = all[j];
        if (a.in || b.in) continue;
        const ra = a === striker ? RS : R, rb = b === striker ? RS : R;
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
        if (d < ra + rb && d > 0) {
          const nx = dx / d, ny = dy / d, ov = ra + rb - d;
          a.x -= nx * ov / 2; a.y -= ny * ov / 2; b.x += nx * ov / 2; b.y += ny * ov / 2;
          const ma = a === striker ? 1.6 : 1, mb = b === striker ? 1.6 : 1;
          const p = (2 * ((a.vx - b.vx) * nx + (a.vy - b.vy) * ny)) / (ma + mb);
          if (p > 0) { a.vx -= p * mb * nx; a.vy -= p * mb * ny; b.vx += p * ma * nx; b.vy += p * ma * ny; }
        }
      }
    }
    return all.some((b) => !b.in && (b.vx || b.vy));
  }

  function endShot() {
    moving = false;
    const who = turn, other: Who = who === 'you' ? 'bot' : 'you';
    let keep = false, foul = false;
    for (const p of shotPots) {
      if (p === striker) { foul = true; continue; }
      if (p.kind === 'q') { queen = who; keep = true; }
      else if (p.kind === own(who)) { potted[who]++; keep = true; }
      else potted[other]++;
    }
    if (foul) {
      const back = coins.find((k) => k.in && k.kind === own(who));
      if (back) { back.in = false; back.x = c + (Math.random() - 0.5) * 30; back.y = c + (Math.random() - 0.5) * 30; potted[who]--; }
      keep = false;
    }
    shotPots = [];
    if (potted.you >= 9 || potted.bot >= 9) { over = true; const win = potted.you >= 9; ev.finish(win, win ? 'All nine white coins pocketed!' : `${opponent} cleared the black coins`); return; }
    turn = keep ? who : other;
    placeStriker(turn, c);
    ev.turn(turn);
    ev.status(turn === 'you' ? (foul ? 'Striker pocketed — a coin came back. Your rival shoots.' : keep ? 'Nice! Shoot again.' : 'Your turn.') : `${opponent} is lining up…`);
    if (turn === 'bot') timer = window.setTimeout(botGo, botDelayMs);
  }

  function shoot(angle: number, power: number) { if (over || moving) return; striker.vx = Math.cos(angle) * power; striker.vy = Math.sin(angle) * power; moving = true; }

  function botDecide() {
    if (over) return null;
    let best: { x: number; angle: number; power: number; score: number } | null = null;
    const targets = coins.filter((k) => !k.in && (k.kind === 'b' || (k.kind === 'q' && !queen)));
    for (let sx = 100; sx <= W - 100; sx += 25) for (const k of targets) for (const [px, py] of CARROM_POCKETS) {
      const toP = Math.atan2(py - k.y, px - k.x);
      const gx = k.x - Math.cos(toP) * (R + RS), gy = k.y - Math.sin(toP) * (R + RS);
      if (gy < 90) continue;
      const angle = Math.atan2(gy - 70, gx - sx);
      const cut = Math.abs(Math.atan2(Math.sin(angle - toP), Math.cos(angle - toP)));
      if (cut > 1.1) continue;
      const d = Math.hypot(gx - sx, gy - 70);
      let blocked = false;
      for (const o of coins) { if (o.in || o === k) continue; const t = (o.x - sx) * Math.cos(angle) + (o.y - 70) * Math.sin(angle); if (t > 0 && t < d && Math.hypot(o.x - (sx + Math.cos(angle) * t), o.y - (70 + Math.sin(angle) * t)) < R + RS) { blocked = true; break; } }
      if (blocked) continue;
      const s = cut * 2 + Math.hypot(px - k.x, py - k.y) / 250 + d / 500;
      if (!best || s < best.score) best = { x: sx, angle, power: Math.min(20, 9 + d / 50 + Math.hypot(px - k.x, py - k.y) / 40), score: s };
    }
    if (!best) { const k = targets[0] ?? coins.find((q) => !q.in)!; best = { x: c, angle: Math.atan2(k.y - 70, k.x - c), power: 12, score: 9 }; }
    return { x: best.x, angle: best.angle + (Math.random() - 0.5) * 0.07, power: best.power };
  }

  function botGo() {
    const d = botDecide(); if (!d) return;
    placeStriker('bot', d.x);
    ev.botAim?.(d.x, d.angle, d.power);
    timer = window.setTimeout(() => shoot(d.angle, d.power), 600);
  }

  ev.turn(turn); ev.status('Your turn.');
  return {
    coins, striker,
    get turn() { return turn; }, get moving() { return moving; }, get over() { return over; }, get queen() { return queen; }, get potted() { return potted; },
    step() { if (moving && !physics()) endShot(); },
    placeStriker, shoot, botDecide,
    dispose() { over = true; clearTimeout(timer); },
  };
}
