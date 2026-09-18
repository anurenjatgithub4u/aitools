// 8-ball pool on a canvas overlay (used when there is no real table nearby). Rules and physics live in poolEngine.ts.

import { openArena, type ArenaOpts } from './arena';
import { createPool, POOL, POOL_COLORS, POOL_POCKETS, isStripe } from './poolEngine';

const { W, H, RAIL, R, POCKET } = POOL;
const hex = (c: number) => '#' + c.toString(16).padStart(6, '0');

export function openPool(host: HTMLElement, opponent: string, you: string, onDone: (win: boolean) => void) {
  const opts: ArenaOpts = { host, icon: '🎱', title: '8-ball pool', you, opponent, hint: 'Drag from the cue ball to aim · longer drag = harder shot', onDone, onRematch: () => openPool(host, opponent, you, onDone) };
  const A = openArena(opts);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; cv.className = 'pooltable';
  A.board.appendChild(cv);
  const ctx = cv.getContext('2d')!;
  let aim: { x: number; y: number } | null = null;
  let over = false;

  const game = createPool(opponent, {
    status: (text) => { if (!over) A.setStatus(game.turn === 'you' ? (game.ballInHand ? 'Ball in hand — tap the table to place the cue ball' : 'Your shot: drag from the cue ball to aim, longer drag = harder') : text); },
    turn: (who) => { A.setTurn(who); A.setScore(game.groups.you ? `${game.groupName('you')} · ${game.remaining('you')} left` : 'open table', game.groups.you ? `${game.groupName('bot')} · ${game.remaining('bot')} left` : 'open table'); },
    finish: (win, why) => { over = true; A.finish(win, why, 250); },
  });
  const { balls, cue } = game;

  // ---- input
  const pos = (e: PointerEvent) => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) }; };
  cv.addEventListener('pointerdown', (e) => {
    if (over || game.moving || game.turn !== 'you') return;
    const p = pos(e);
    if (game.ballInHand) { game.placeCue(p.x, p.y); return; }
    cv.setPointerCapture(e.pointerId);
    aim = p;
  });
  cv.addEventListener('pointermove', (e) => { if (aim) aim = pos(e); });
  cv.addEventListener('pointerup', () => {
    if (!aim || game.moving) { aim = null; return; }
    const dx = cue.x - aim.x, dy = cue.y - aim.y, d = Math.hypot(dx, dy);
    aim = null;
    if (d < 12) return;
    game.shoot(Math.atan2(dy, dx), Math.min(24, d / 9));
  });

  // ---- draw
  function draw() {
    ctx.fillStyle = '#5a3a2a'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#1e7a4c'; ctx.fillRect(RAIL, RAIL, W - RAIL * 2, H - RAIL * 2);
    ctx.fillStyle = '#111';
    for (const [px, py] of POOL_POCKETS) { ctx.beginPath(); ctx.arc(px, py, POCKET, 0, 7); ctx.fill(); }
    ctx.strokeStyle = 'rgba(255,255,255,.15)'; ctx.beginPath(); ctx.moveTo(W * 0.27, RAIL); ctx.lineTo(W * 0.27, H - RAIL); ctx.stroke();
    if (aim && !game.moving) {
      const dx = cue.x - aim.x, dy = cue.y - aim.y, d = Math.hypot(dx, dy);
      if (d > 4) {
        const a = Math.atan2(dy, dx);
        ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.setLineDash([6, 6]); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cue.x, cue.y); ctx.lineTo(cue.x + Math.cos(a) * 320, cue.y + Math.sin(a) * 320); ctx.stroke(); ctx.setLineDash([]);
        ctx.strokeStyle = '#c9a86a'; ctx.lineWidth = 6; ctx.lineCap = 'round';
        const back = Math.min(90, d * 0.5);
        ctx.beginPath(); ctx.moveTo(cue.x - Math.cos(a) * (R + 6 + back), cue.y - Math.sin(a) * (R + 6 + back)); ctx.lineTo(cue.x - Math.cos(a) * (R + 160 + back), cue.y - Math.sin(a) * (R + 160 + back)); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.fillRect(W - RAIL - 160, H - RAIL + 8, 150 * Math.min(1, d / 216), 6);
      }
    }
    for (const b of balls) {
      if (b.in) continue;
      ctx.beginPath(); ctx.arc(b.x, b.y, R, 0, 7); ctx.fillStyle = isStripe(b.n) ? '#fff' : hex(POOL_COLORS[b.n]); ctx.fill();
      if (isStripe(b.n)) { ctx.save(); ctx.beginPath(); ctx.arc(b.x, b.y, R, 0, 7); ctx.clip(); ctx.fillStyle = hex(POOL_COLORS[b.n]); ctx.fillRect(b.x - R, b.y - R * 0.55, R * 2, R * 1.1); ctx.restore(); }
      if (b.n) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(b.x, b.y, R * 0.45, 0, 7); ctx.fill(); ctx.fillStyle = '#111'; ctx.font = 'bold 8px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(b.n), b.x, b.y + 0.5); }
      ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(b.x, b.y, R, 0, 7); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(b.x - 3, b.y - 3, 3, 0, 7); ctx.fill();
    }
    if (game.ballInHand && game.turn === 'you') { ctx.strokeStyle = '#f2c31b'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(cue.x, cue.y, R + 6, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
  }

  let raf = 0;
  const loop = () => {
    if (!cv.isConnected) { cancelAnimationFrame(raf); game.dispose(); return; }
    raf = requestAnimationFrame(loop);
    if (A.over && !over) { over = true; game.dispose(); }
    game.step();
    draw();
  };
  loop();
}
