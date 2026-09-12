// 8-ball pool: a canvas overlay played against one of the explorers.
// Simplified rules: first pot decides your group (solids 1–7 / stripes 9–15); pot the 8 after
// your group to win, pot it early (or with the cue) and you lose; scratch = ball in hand.

interface Ball { n: number; x: number; y: number; vx: number; vy: number; in: boolean }

const W = 900, H = 500, RAIL = 34, R = 11, POCKET = 22;
const COLORS: Record<number, string> = {
  0: '#ffffff', 1: '#f2c31b', 2: '#2f6fd1', 3: '#d94a3d', 4: '#6a3fb0', 5: '#f27d3a', 6: '#2fa66a', 7: '#8a2a2a', 8: '#111111',
  9: '#f2c31b', 10: '#2f6fd1', 11: '#d94a3d', 12: '#6a3fb0', 13: '#f27d3a', 14: '#2fa66a', 15: '#8a2a2a',
};
const POCKETS: [number, number][] = [[RAIL, RAIL], [W / 2, RAIL - 6], [W - RAIL, RAIL], [RAIL, H - RAIL], [W / 2, H - RAIL + 6], [W - RAIL, H - RAIL]];

export function openPool(host: HTMLElement, opponent: string, you: string, onDone: (win: boolean) => void) {
  const root = document.createElement('div');
  root.className = 'pool';
  root.innerHTML = `
    <div class="ptop"><b>🎱 8-ball</b><span id="pturn"></span><span id="pgroups"></span><button id="pquit">✕ Quit</button></div>
    <canvas id="pc" width="${W}" height="${H}"></canvas>
    <div class="phint" id="phint">Drag from the cue ball to aim · release to shoot</div>
    <div class="pend" id="pend" hidden><h3 id="ptitle"></h3><p id="psub"></p><button id="pclose">Back to the city</button></div>`;
  host.appendChild(root);
  const cv = root.querySelector<HTMLCanvasElement>('#pc')!, ctx = cv.getContext('2d')!;
  const turnEl = root.querySelector('#pturn')!, groupsEl = root.querySelector('#pgroups')!, hintEl = root.querySelector('#phint')!;
  const endEl = root.querySelector<HTMLElement>('#pend')!;

  // ---- state
  const balls: Ball[] = [];
  const mk = (n: number, x: number, y: number) => balls.push({ n, x, y, vx: 0, vy: 0, in: false });
  mk(0, W * 0.27, H / 2);
  const order = [1, 9, 2, 10, 8, 3, 11, 4, 12, 5, 13, 6, 14, 7, 15];
  let k = 0;
  for (let row = 0; row < 5; row++) for (let i = 0; i <= row; i++) mk(order[k++], W * 0.66 + row * R * 1.74, H / 2 + (i - row / 2) * R * 2.05);
  let turn: 'you' | 'bot' = 'you';
  let groups: { you: 'solid' | 'stripe' | null } = { you: null };
  let moving = false, ballInHand = false, over = false;
  let aim: { x: number; y: number } | null = null;
  const cue = balls[0];
  const isSolid = (n: number) => n >= 1 && n <= 7, isStripe = (n: number) => n >= 9;
  const mine = (who: 'you' | 'bot', n: number) => {
    const g = who === 'you' ? groups.you : groups.you === 'solid' ? 'stripe' : groups.you === 'stripe' ? 'solid' : null;
    return g === null ? n !== 8 && n !== 0 : g === 'solid' ? isSolid(n) : isStripe(n);
  };
  const remaining = (who: 'you' | 'bot') => balls.filter((b) => !b.in && b.n !== 0 && b.n !== 8 && mine(who, b.n)).length;
  const groupName = (who: 'you' | 'bot') => (groups.you === null ? 'open table' : (who === 'you') === (groups.you === 'solid') ? 'solids' : 'stripes');

  const status = () => {
    turnEl.textContent = over ? '' : turn === 'you' ? `Your shot${ballInHand ? ' · ball in hand: click to place' : ''}` : `${opponent} is thinking…`;
    groupsEl.textContent = groups.you ? `You: ${groupName('you')} (${remaining('you')} left) · ${opponent}: ${groupName('bot')} (${remaining('bot')} left)` : 'Open table — first pot picks your group';
    hintEl.textContent = turn === 'you' ? (ballInHand ? 'Tap anywhere on the table to place the cue ball' : 'Drag from the cue ball to aim · longer drag = harder shot') : '';
  };

  // ---- physics
  let potted: number[] = [], firstHit: number | null = null;
  function step() {
    let any = false;
    for (let s = 0; s < 3; s++) {
      for (const b of balls) {
        if (b.in) continue;
        b.x += b.vx / 3; b.y += b.vy / 3;
        b.vx *= 0.9935; b.vy *= 0.9935;
        if (Math.hypot(b.vx, b.vy) < 0.05) { b.vx = 0; b.vy = 0; }
        // pockets
        for (const [px, py] of POCKETS) if (Math.hypot(b.x - px, b.y - py) < POCKET) { b.in = true; b.vx = b.vy = 0; potted.push(b.n); break; }
        if (b.in) continue;
        // cushions
        if (b.x < RAIL + R) { b.x = RAIL + R; b.vx = -b.vx * 0.8; }
        if (b.x > W - RAIL - R) { b.x = W - RAIL - R; b.vx = -b.vx * 0.8; }
        if (b.y < RAIL + R) { b.y = RAIL + R; b.vy = -b.vy * 0.8; }
        if (b.y > H - RAIL - R) { b.y = H - RAIL - R; b.vy = -b.vy * 0.8; }
      }
      // ball-ball
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
    cue.vx = Math.cos(angle) * power; cue.vy = Math.sin(angle) * power;
    moving = true; potted = []; firstHit = null; aim = null; status();
  }

  function endShot() {
    moving = false;
    const who = turn, other: 'you' | 'bot' = who === 'you' ? 'bot' : 'you';
    const eight = potted.includes(8), scratch = potted.includes(0);
    if (eight) {
      const cleared = remaining(who) === 0 && groups.you !== null;
      return finish(cleared && !scratch ? who === 'you' : who !== 'you', cleared && !scratch ? `${who === 'you' ? 'You' : opponent} sank the 8-ball to win` : `${who === 'you' ? 'You' : opponent} sank the 8-ball too early`);
    }
    if (scratch) { cue.in = false; cue.vx = cue.vy = 0; cue.x = W * 0.27; cue.y = H / 2; }
    // assign groups on the first pot (no first-hit foul while the table is open)
    const wasOpen = groups.you === null;
    if (groups.you === null) { const first = potted.find((n) => n !== 0 && n !== 8); if (first !== undefined) groups.you = (who === 'you') === isSolid(first) ? 'solid' : 'stripe'; }
    const good = potted.some((n) => n !== 0 && n !== 8 && mine(who, n));
    const foul = scratch || firstHit === null || (!wasOpen && firstHit !== 8 && !mine(who, firstHit));
    if (foul || !good) { turn = other; ballInHand = scratch && turn === 'you'; if (scratch && turn === 'bot') { cue.x = W * 0.27; cue.y = H / 2; } }
    status();
    if (turn === 'bot' && !over) setTimeout(botShot, 900);
  }

  function finish(win: boolean, why: string) {
    over = true;
    endEl.hidden = false;
    endEl.querySelector('#ptitle')!.textContent = win ? '🏆 You win!' : `${opponent} wins`;
    endEl.querySelector('#psub')!.textContent = why + (win ? ' · +250 points' : '');
    status();
    onDone(win);
  }

  // ---- bot: aim the easiest ball of its group at the nearest pocket, with a little wobble
  function botShot() {
    if (over) return;
    const targets = balls.filter((b) => !b.in && b.n !== 0 && (remaining('bot') === 0 ? b.n === 8 : mine('bot', b.n) && b.n !== 8));
    let best: { angle: number; power: number; score: number } | null = null;
    for (const b of targets) for (const [px, py] of POCKETS) {
      const toP = Math.atan2(py - b.y, px - b.x);
      const gx = b.x - Math.cos(toP) * R * 2, gy = b.y - Math.sin(toP) * R * 2;       // ghost ball
      const angle = Math.atan2(gy - cue.y, gx - cue.x);
      const cut = Math.abs(Math.atan2(Math.sin(angle - toP), Math.cos(angle - toP)));
      if (cut > 1.2) continue;
      // blocked path?
      const d = Math.hypot(gx - cue.x, gy - cue.y);
      let blocked = false;
      for (const o of balls) {
        if (o.in || o === cue || o === b) continue;
        const t = ((o.x - cue.x) * Math.cos(angle) + (o.y - cue.y) * Math.sin(angle));
        if (t > 0 && t < d && Math.hypot(o.x - (cue.x + Math.cos(angle) * t), o.y - (cue.y + Math.sin(angle) * t)) < R * 2) { blocked = true; break; }
      }
      if (blocked) continue;
      const dist = Math.hypot(px - b.x, py - b.y);
      const score = cut * 2 + dist / 300 + d / 600;
      if (!best || score < best.score) best = { angle, power: Math.min(22, 8 + dist / 40 + d / 60), score };
    }
    if (!best) { const b = targets[0] ?? balls.find((x) => !x.in && x.n !== 0)!; best = { angle: Math.atan2(b.y - cue.y, b.x - cue.x), power: 12, score: 9 }; }
    const wobble = (Math.random() - 0.5) * 0.06;   // ~±1.7°: beatable but not a pushover
    shoot(best.angle + wobble, best.power);
  }

  // ---- input
  const pos = (e: PointerEvent) => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) }; };
  cv.addEventListener('pointerdown', (e) => {
    if (over || moving || turn !== 'you') return;
    const p = pos(e);
    if (ballInHand) {
      if (p.x > RAIL + R && p.x < W - RAIL - R && p.y > RAIL + R && p.y < H - RAIL - R && !balls.some((b) => !b.in && b.n !== 0 && Math.hypot(b.x - p.x, b.y - p.y) < R * 2.2)) { cue.x = p.x; cue.y = p.y; ballInHand = false; status(); }
      return;
    }
    cv.setPointerCapture(e.pointerId);
    aim = p;
  });
  cv.addEventListener('pointermove', (e) => { if (aim) aim = pos(e); });
  cv.addEventListener('pointerup', () => {
    if (!aim || moving) { aim = null; return; }
    const dx = cue.x - aim.x, dy = cue.y - aim.y, d = Math.hypot(dx, dy);
    aim = null;
    if (d < 12) return;
    shoot(Math.atan2(dy, dx), Math.min(24, d / 9));
  });

  // ---- draw
  function draw() {
    ctx.fillStyle = '#5a3a2a'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#1e7a4c'; ctx.fillRect(RAIL, RAIL, W - RAIL * 2, H - RAIL * 2);
    ctx.fillStyle = '#111';
    for (const [px, py] of POCKETS) { ctx.beginPath(); ctx.arc(px, py, POCKET, 0, 7); ctx.fill(); }
    ctx.strokeStyle = 'rgba(255,255,255,.15)'; ctx.beginPath(); ctx.moveTo(W * 0.27, RAIL); ctx.lineTo(W * 0.27, H - RAIL); ctx.stroke();
    if (aim && !moving) {
      const dx = cue.x - aim.x, dy = cue.y - aim.y, d = Math.hypot(dx, dy);
      if (d > 4) {
        const a = Math.atan2(dy, dx);
        ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.setLineDash([6, 6]); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cue.x, cue.y); ctx.lineTo(cue.x + Math.cos(a) * 320, cue.y + Math.sin(a) * 320); ctx.stroke(); ctx.setLineDash([]);
        // cue stick
        ctx.strokeStyle = '#c9a86a'; ctx.lineWidth = 6; ctx.lineCap = 'round';
        const back = Math.min(90, d * 0.5);
        ctx.beginPath(); ctx.moveTo(cue.x - Math.cos(a) * (R + 6 + back), cue.y - Math.sin(a) * (R + 6 + back)); ctx.lineTo(cue.x - Math.cos(a) * (R + 160 + back), cue.y - Math.sin(a) * (R + 160 + back)); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.fillRect(W - RAIL - 160, H - RAIL + 8, 150 * Math.min(1, d / 216), 6);
      }
    }
    for (const b of balls) {
      if (b.in) continue;
      ctx.beginPath(); ctx.arc(b.x, b.y, R, 0, 7); ctx.fillStyle = isStripe(b.n) ? '#fff' : COLORS[b.n]; ctx.fill();
      if (isStripe(b.n)) { ctx.save(); ctx.beginPath(); ctx.arc(b.x, b.y, R, 0, 7); ctx.clip(); ctx.fillStyle = COLORS[b.n]; ctx.fillRect(b.x - R, b.y - R * 0.55, R * 2, R * 1.1); ctx.restore(); }
      if (b.n) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(b.x, b.y, R * 0.45, 0, 7); ctx.fill(); ctx.fillStyle = '#111'; ctx.font = 'bold 8px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(b.n), b.x, b.y + 0.5); }
      ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(b.x, b.y, R, 0, 7); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(b.x - 3, b.y - 3, 3, 0, 7); ctx.fill();
    }
    if (ballInHand && turn === 'you') { ctx.strokeStyle = '#f2c31b'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(cue.x, cue.y, R + 6, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
  }

  let raf = 0;
  const loop = () => {
    raf = requestAnimationFrame(loop);
    if (moving && !step()) endShot();
    draw();
  };
  loop();
  status();

  const close = () => { cancelAnimationFrame(raf); root.remove(); };
  root.querySelector('#pquit')!.addEventListener('click', () => { if (!over) { over = true; onDone(false); } close(); });
  root.querySelector('#pclose')!.addEventListener('click', close);
}
