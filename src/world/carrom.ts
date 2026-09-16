import { openArena, type ArenaOpts } from './arena';

// Carrom vs an explorer. You play white from the bottom baseline, the rival plays black from the top.
// Slide the striker along your baseline, drag from it to aim, release to flick. Pocket your colour
// to keep your turn; the red queen is worth 3 to whoever sinks it. First to clear their nine coins wins.

interface Coin { kind: 'w' | 'b' | 'q' | 's'; x: number; y: number; vx: number; vy: number; in: boolean }
const W = 600, FRAME = 30, R = 10, RS = 14, POCKET = 20;
const POCKETS: [number, number][] = [[FRAME + 6, FRAME + 6], [W - FRAME - 6, FRAME + 6], [FRAME + 6, W - FRAME - 6], [W - FRAME - 6, W - FRAME - 6]];

export function openCarrom(host: HTMLElement, opponent: string, you: string, onDone: (win: boolean | null) => void) {
  const opts: ArenaOpts = { host, icon: '🎯', title: 'Carrom', you, opponent, hint: 'Drag the striker sideways to position, drag from it to aim, release to flick.', onDone, onRematch: () => openCarrom(host, opponent, you, onDone) };
  const A = openArena(opts);
  const cv = document.createElement('canvas'); cv.width = cv.height = W; cv.className = 'carrom';
  A.board.appendChild(cv);
  const ctx = cv.getContext('2d')!;
  const coins: Coin[] = [];
  const c = W / 2;
  coins.push({ kind: 'q', x: c, y: c, vx: 0, vy: 0, in: false });
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; coins.push({ kind: i % 2 ? 'w' : 'b', x: c + Math.cos(a) * R * 2.05, y: c + Math.sin(a) * R * 2.05, vx: 0, vy: 0, in: false }); }
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2 + 0.26; coins.push({ kind: i % 2 ? 'b' : 'w', x: c + Math.cos(a) * R * 4.1, y: c + Math.sin(a) * R * 4.1, vx: 0, vy: 0, in: false }); }
  const striker: Coin = { kind: 's', x: c, y: W - 70, vx: 0, vy: 0, in: false };
  let turn: 'you' | 'bot' = 'you', moving = false, queen: 'you' | 'bot' | null = null;
  let drag: 'slide' | 'aim' | null = null, aim = { x: 0, y: 0 };
  const potted = { you: 0, bot: 0 };
  let shotPots: Coin[] = [];
  const ripples: { x: number; y: number; t: number }[] = [];
  const own = (who: 'you' | 'bot') => (who === 'you' ? 'w' : 'b');

  const score = () => A.setScore(`${potted.you} / 9 white${queen === 'you' ? ' + queen' : ''}`, `${potted.bot} / 9 black${queen === 'bot' ? ' + queen' : ''}`);
  const placeStriker = (who: 'you' | 'bot', x: number) => { striker.in = false; striker.vx = striker.vy = 0; striker.x = Math.max(90, Math.min(W - 90, x)); striker.y = who === 'you' ? W - 70 : 70; };

  function step() {
    const all = [striker, ...coins];
    for (let s = 0; s < 3; s++) {
      for (const b of all) {
        if (b.in) continue;
        b.x += b.vx / 3; b.y += b.vy / 3;
        b.vx *= 0.988; b.vy *= 0.988;
        if (Math.hypot(b.vx, b.vy) < 0.04) b.vx = b.vy = 0;
        const r = b === striker ? RS : R;
        for (const [px, py] of POCKETS) if (Math.hypot(b.x - px, b.y - py) < POCKET) { b.in = true; b.vx = b.vy = 0; shotPots.push(b); ripples.push({ x: px, y: py, t: performance.now() }); if (ripples.length > 6) ripples.shift(); break; }
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
    const who = turn, other: 'you' | 'bot' = who === 'you' ? 'bot' : 'you';
    let keep = false, foul = false;
    for (const p of shotPots) {
      if (p === striker) { foul = true; continue; }
      if (p.kind === 'q') { queen = who; keep = true; }
      else if (p.kind === own(who)) { potted[who]++; keep = true; }
      else { potted[other]++; }
    }
    if (foul) {
      // striker in: one of your coins comes back to the centre
      const back = coins.find((k) => k.in && k.kind === own(who));
      if (back) { back.in = false; back.x = c + (Math.random() - 0.5) * 30; back.y = c + (Math.random() - 0.5) * 30; potted[who]--; }
      keep = false;
    }
    shotPots = [];
    score();
    if (potted.you >= 9 || potted.bot >= 9) { const win = potted.you >= 9; A.finish(win, win ? 'All nine white coins pocketed!' : `${opponent} cleared the black coins`, 200); return; }
    turn = keep ? who : other;
    placeStriker(turn, c);
    A.setTurn(turn);
    A.setStatus(turn === 'you' ? (foul ? 'Striker pocketed — a coin came back. Your rival shoots.' : keep ? 'Nice! Shoot again.' : 'Your turn.') : `${opponent} is lining up…`);
    if (turn === 'bot') setTimeout(botShot, 900);
  }

  function shoot(angle: number, power: number) { striker.vx = Math.cos(angle) * power; striker.vy = Math.sin(angle) * power; moving = true; drag = null; }

  function botShot() {
    if (A.over) return;
    let best: { x: number; angle: number; power: number; score: number } | null = null;
    const targets = coins.filter((k) => !k.in && (k.kind === 'b' || (k.kind === 'q' && !queen)));
    for (let sx = 100; sx <= W - 100; sx += 25) for (const k of targets) for (const [px, py] of POCKETS) {
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
    placeStriker('bot', best.x);
    setTimeout(() => shoot(best!.angle + (Math.random() - 0.5) * 0.07, best!.power), 500);
  }

  const pos = (e: PointerEvent) => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (W / r.height) }; };
  cv.addEventListener('pointerdown', (e) => {
    if (A.over || moving || turn !== 'you') return;
    const p = pos(e);
    cv.setPointerCapture(e.pointerId);
    drag = Math.abs(p.y - striker.y) < 30 && Math.abs(p.x - striker.x) < 30 ? 'slide' : 'aim';
    aim = p;
  });
  cv.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const p = pos(e);
    if (drag === 'slide') { striker.x = Math.max(90, Math.min(W - 90, p.x)); if (Math.abs(p.y - striker.y) > 40) drag = 'aim'; }
    aim = p;
  });
  cv.addEventListener('pointerup', () => {
    if (drag === 'aim' && !moving) { const dx = striker.x - aim.x, dy = striker.y - aim.y, d = Math.hypot(dx, dy); if (d > 14) { shoot(Math.atan2(dy, dx), Math.min(24, d / 7)); A.setStatus(''); return; } }
    drag = null;
  });

  const woodGrad = ctx.createLinearGradient(0, 0, W, W);
  woodGrad.addColorStop(0, '#7a5230'); woodGrad.addColorStop(0.5, '#5d3d21'); woodGrad.addColorStop(1, '#7a5230');
  const boardGrad = ctx.createRadialGradient(c, c, 40, c, c, W * 0.75);
  boardGrad.addColorStop(0, '#f7e8c4'); boardGrad.addColorStop(1, '#e6cf9c');
  function draw() {
    ctx.fillStyle = woodGrad; ctx.fillRect(0, 0, W, W);
    for (let i = 0; i < W; i += 9) { ctx.fillStyle = i % 27 ? 'rgba(0,0,0,.06)' : 'rgba(255,255,255,.04)'; ctx.fillRect(0, i, W, 3); }   // grain
    ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 6; ctx.strokeRect(FRAME - 3, FRAME - 3, W - FRAME * 2 + 6, W - FRAME * 2 + 6);
    ctx.fillStyle = boardGrad; ctx.fillRect(FRAME, FRAME, W - FRAME * 2, W - FRAME * 2);
    // corner arrows and the centre flower
    ctx.strokeStyle = 'rgba(160,60,40,.55)'; ctx.lineWidth = 1.5;
    for (const [px, py] of POCKETS) { const dx = Math.sign(c - px), dy = Math.sign(c - py); ctx.beginPath(); ctx.moveTo(px + dx * 40, py + dy * 40); ctx.lineTo(px + dx * 150, py + dy * 150); ctx.stroke(); ctx.beginPath(); ctx.arc(px + dx * 62, py + dy * 62, 9, 0, 7); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(160,60,40,.5)';
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; ctx.beginPath(); ctx.ellipse(c + Math.cos(a) * 28, c + Math.sin(a) * 28, 16, 8, a, 0, 7); ctx.stroke(); }
    ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 2;
    for (const y of [70, W - 70]) { ctx.beginPath(); ctx.moveTo(90, y - 12); ctx.lineTo(W - 90, y - 12); ctx.moveTo(90, y + 12); ctx.lineTo(W - 90, y + 12); ctx.stroke(); }
    for (const x of [70, W - 70]) { ctx.beginPath(); ctx.moveTo(x - 12, 90); ctx.lineTo(x - 12, W - 90); ctx.moveTo(x + 12, 90); ctx.lineTo(x + 12, W - 90); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(c, c, 46, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.arc(c, c, 10, 0, 7); ctx.stroke();
    for (const [px, py] of POCKETS) {
      const pg = ctx.createRadialGradient(px, py, 3, px, py, POCKET); pg.addColorStop(0, '#000'); pg.addColorStop(0.75, '#1a1a1a'); pg.addColorStop(1, '#3a2a1a');
      ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(px, py, POCKET, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(px, py, POCKET - 3, 0, 7); ctx.stroke();
    }
    for (const rp of ripples) { const k = (performance.now() - rp.t) / 500; if (k < 1) { ctx.strokeStyle = `rgba(242,195,27,${1 - k})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(rp.x, rp.y, POCKET + k * 26, 0, 7); ctx.stroke(); } }
    if (drag === 'aim' && turn === 'you' && !moving) {
      const dx = striker.x - aim.x, dy = striker.y - aim.y, d = Math.hypot(dx, dy);
      if (d > 6) {
        const a = Math.atan2(dy, dx), pw = Math.min(1, d / 168);
        ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.moveTo(striker.x, striker.y); ctx.lineTo(striker.x + Math.cos(a) * (120 + pw * 200), striker.y + Math.sin(a) * (120 + pw * 200)); ctx.stroke(); ctx.setLineDash([]);
        // power arc around the striker
        ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.arc(striker.x, striker.y, RS + 10, 0, 7); ctx.stroke();
        ctx.strokeStyle = pw > 0.8 ? '#e74c3c' : pw > 0.45 ? '#f2c31b' : '#3fa66a'; ctx.beginPath(); ctx.arc(striker.x, striker.y, RS + 10, -Math.PI / 2, -Math.PI / 2 + pw * Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 12px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(`${Math.round(pw * 100)}%`, striker.x, striker.y - RS - 18);
      }
    }
    const disc = (x: number, y: number, r: number, base: string, dark: string) => {
      ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.arc(x + 2, y + 3, r, 0, 7); ctx.fill();
      const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, r * 0.1, x, y, r); g.addColorStop(0, '#fff'); g.addColorStop(0.2, base); g.addColorStop(1, dark);
      ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, r * 0.5, 0, 7); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.stroke();
    };
    for (const k of coins) if (!k.in) disc(k.x, k.y, R, k.kind === 'w' ? '#fdf5e0' : k.kind === 'b' ? '#3a3a3a' : '#e04a3a', k.kind === 'w' ? '#c9b48a' : k.kind === 'b' ? '#0d0d0d' : '#7a1d12');
    if (!striker.in) {
      disc(striker.x, striker.y, RS, '#5fd0ee', '#1d6f87');
      if (turn === 'you' && !moving && !drag) { ctx.strokeStyle = 'rgba(63,183,217,.6)'; ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.moveTo(90, striker.y); ctx.lineTo(W - 90, striker.y); ctx.stroke(); ctx.setLineDash([]); }
    }
  }
  let raf = 0;
  const loop = () => { raf = requestAnimationFrame(loop); if (moving && !step()) endShot(); draw(); if (A.over) cancelAnimationFrame(raf); };
  score(); loop();
}
