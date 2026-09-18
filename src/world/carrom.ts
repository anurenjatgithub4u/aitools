// Carrom on a canvas overlay (used when there is no board nearby). Rules and physics live in carromEngine.ts.
// Slide the striker along your baseline, drag from it to aim, release to flick.

import { openArena, type ArenaOpts } from './arena';
import { createCarrom, CARROM, CARROM_POCKETS } from './carromEngine';

const { W, FRAME, R, RS, POCKET } = CARROM;

export function openCarrom(host: HTMLElement, opponent: string, you: string, onDone: (win: boolean | null) => void) {
  const opts: ArenaOpts = { host, icon: '🎯', title: 'Carrom', you, opponent, hint: 'Drag the striker sideways to position, drag from it to aim, release to flick.', onDone, onRematch: () => openCarrom(host, opponent, you, onDone) };
  const A = openArena(opts);
  const cv = document.createElement('canvas'); cv.width = cv.height = W; cv.className = 'carrom';
  A.board.appendChild(cv);
  const ctx = cv.getContext('2d')!;
  const c = W / 2;
  let drag: 'slide' | 'aim' | null = null, aim = { x: 0, y: 0 };
  const ripples: { x: number; y: number; t: number }[] = [];
  const game = createCarrom(opponent, {
    status: (text) => A.setStatus(text),
    turn: (who) => { A.setTurn(who); A.setScore(`${game.potted.you} / 9 white${game.queen === 'you' ? ' + queen' : ''}`, `${game.potted.bot} / 9 black${game.queen === 'bot' ? ' + queen' : ''}`); },
    finish: (win, why) => A.finish(win, why, 200),
    potted: (k) => { const [px, py] = CARROM_POCKETS.reduce((a, b) => (Math.hypot(b[0] - k.x, b[1] - k.y) < Math.hypot(a[0] - k.x, a[1] - k.y) ? b : a)); ripples.push({ x: px, y: py, t: performance.now() }); if (ripples.length > 6) ripples.shift(); },
  });
  const { coins, striker } = game;

  const pos = (e: PointerEvent) => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (W / r.height) }; };
  cv.addEventListener('pointerdown', (e) => {
    if (A.over || game.moving || game.turn !== 'you') return;
    const p = pos(e);
    cv.setPointerCapture(e.pointerId);
    drag = Math.abs(p.y - striker.y) < 30 && Math.abs(p.x - striker.x) < 30 ? 'slide' : 'aim';
    aim = p;
  });
  cv.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const p = pos(e);
    if (drag === 'slide') { striker.x = Math.max(CARROM.MIN_X, Math.min(CARROM.MAX_X, p.x)); if (Math.abs(p.y - striker.y) > 40) drag = 'aim'; }
    aim = p;
  });
  cv.addEventListener('pointerup', () => {
    if (drag === 'aim' && !game.moving) { const dx = striker.x - aim.x, dy = striker.y - aim.y, d = Math.hypot(dx, dy); if (d > 14) { game.shoot(Math.atan2(dy, dx), Math.min(24, d / 7)); A.setStatus(''); drag = null; return; } }
    drag = null;
  });

  const woodGrad = ctx.createLinearGradient(0, 0, W, W);
  woodGrad.addColorStop(0, '#7a5230'); woodGrad.addColorStop(0.5, '#5d3d21'); woodGrad.addColorStop(1, '#7a5230');
  const boardGrad = ctx.createRadialGradient(c, c, 40, c, c, W * 0.75);
  boardGrad.addColorStop(0, '#f7e8c4'); boardGrad.addColorStop(1, '#e6cf9c');
  function draw() {
    ctx.fillStyle = woodGrad; ctx.fillRect(0, 0, W, W);
    for (let i = 0; i < W; i += 9) { ctx.fillStyle = i % 27 ? 'rgba(0,0,0,.06)' : 'rgba(255,255,255,.04)'; ctx.fillRect(0, i, W, 3); }
    ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 6; ctx.strokeRect(FRAME - 3, FRAME - 3, W - FRAME * 2 + 6, W - FRAME * 2 + 6);
    ctx.fillStyle = boardGrad; ctx.fillRect(FRAME, FRAME, W - FRAME * 2, W - FRAME * 2);
    ctx.strokeStyle = 'rgba(160,60,40,.55)'; ctx.lineWidth = 1.5;
    for (const [px, py] of CARROM_POCKETS) { const dx = Math.sign(c - px), dy = Math.sign(c - py); ctx.beginPath(); ctx.moveTo(px + dx * 40, py + dy * 40); ctx.lineTo(px + dx * 150, py + dy * 150); ctx.stroke(); ctx.beginPath(); ctx.arc(px + dx * 62, py + dy * 62, 9, 0, 7); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(160,60,40,.5)';
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; ctx.beginPath(); ctx.ellipse(c + Math.cos(a) * 28, c + Math.sin(a) * 28, 16, 8, a, 0, 7); ctx.stroke(); }
    ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 2;
    for (const y of [70, W - 70]) { ctx.beginPath(); ctx.moveTo(90, y - 12); ctx.lineTo(W - 90, y - 12); ctx.moveTo(90, y + 12); ctx.lineTo(W - 90, y + 12); ctx.stroke(); }
    for (const x of [70, W - 70]) { ctx.beginPath(); ctx.moveTo(x - 12, 90); ctx.lineTo(x - 12, W - 90); ctx.moveTo(x + 12, 90); ctx.lineTo(x + 12, W - 90); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(c, c, 46, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.arc(c, c, 10, 0, 7); ctx.stroke();
    for (const [px, py] of CARROM_POCKETS) {
      const pg = ctx.createRadialGradient(px, py, 3, px, py, POCKET); pg.addColorStop(0, '#000'); pg.addColorStop(0.75, '#1a1a1a'); pg.addColorStop(1, '#3a2a1a');
      ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(px, py, POCKET, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(px, py, POCKET - 3, 0, 7); ctx.stroke();
    }
    for (const rp of ripples) { const k = (performance.now() - rp.t) / 500; if (k < 1) { ctx.strokeStyle = `rgba(242,195,27,${1 - k})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(rp.x, rp.y, POCKET + k * 26, 0, 7); ctx.stroke(); } }
    if (drag === 'aim' && game.turn === 'you' && !game.moving) {
      const dx = striker.x - aim.x, dy = striker.y - aim.y, d = Math.hypot(dx, dy);
      if (d > 6) {
        const a = Math.atan2(dy, dx), pw = Math.min(1, d / 168);
        ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.moveTo(striker.x, striker.y); ctx.lineTo(striker.x + Math.cos(a) * (120 + pw * 200), striker.y + Math.sin(a) * (120 + pw * 200)); ctx.stroke(); ctx.setLineDash([]);
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
      if (game.turn === 'you' && !game.moving && !drag) { ctx.strokeStyle = 'rgba(63,183,217,.6)'; ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.moveTo(90, striker.y); ctx.lineTo(W - 90, striker.y); ctx.stroke(); ctx.setLineDash([]); }
    }
  }
  let raf = 0;
  const loop = () => { raf = requestAnimationFrame(loop); if (A.over) { cancelAnimationFrame(raf); game.dispose(); return; } game.step(); draw(); };
  loop();
}
