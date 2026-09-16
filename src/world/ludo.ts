import { openArena, type ArenaOpts } from './arena';

// Ludo, red (you) vs blue (rival). Roll a 6 to leave base, captures on unsafe squares send
// tokens home, exact roll to finish, extra turn on a 6 / capture / finish. First to bring all four home wins.

type Cell = [number, number];
const TRACK: Cell[] = [
  [1, 6], [2, 6], [3, 6], [4, 6], [5, 6], [6, 5], [6, 4], [6, 3], [6, 2], [6, 1], [6, 0], [7, 0], [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5],
  [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6], [14, 7], [14, 8], [13, 8], [12, 8], [11, 8], [10, 8], [9, 8], [8, 9], [8, 10], [8, 11], [8, 12], [8, 13], [8, 14],
  [7, 14], [6, 14], [6, 13], [6, 12], [6, 11], [6, 10], [6, 9], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8], [0, 7], [0, 6],
];
interface Side { name: 'you' | 'bot'; color: string; dark: string; start: number; home: Cell[]; base: Cell[]; tokens: number[] }
const RED: Side = { name: 'you', color: '#e74c3c', dark: '#a93226', start: 39, home: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8]], base: [[1.5, 10.5], [3.5, 10.5], [1.5, 12.5], [3.5, 12.5]], tokens: [0, 0, 0, 0] };
const BLUE: Side = { name: 'bot', color: '#2f6fd1', dark: '#1f4fa0', home: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7]], start: 26, base: [[10.5, 10.5], [12.5, 10.5], [10.5, 12.5], [12.5, 12.5]], tokens: [0, 0, 0, 0] };
const SAFE = new Set([0, 13, 26, 39, 8, 21, 34, 47]);
const FINISH = 57;   // 1..51 track, 52..56 home column, 57 = home

const cellOf = (s: Side, p: number): Cell | null => (p === 0 ? null : p <= 51 ? TRACK[(s.start + p - 1) % 52] : s.home[p - 52]);
const trackIdx = (s: Side, p: number) => (p >= 1 && p <= 51 ? (s.start + p - 1) % 52 : -1);

export function openLudo(host: HTMLElement, opponent: string, you: string, onDone: (win: boolean | null) => void) {
  const opts: ArenaOpts = { host, icon: '🎲', title: 'Ludo', you, opponent, hint: 'Roll the dice. A 6 lets a token out of the base.', onDone, onRematch: () => openLudo(host, opponent, you, onDone) };
  const A = openArena(opts);
  const me: Side = { ...RED, tokens: [0, 0, 0, 0] }, bot: Side = { ...BLUE, tokens: [0, 0, 0, 0] };
  const S = 40, N = 15;
  const wrap = document.createElement('div'); wrap.className = 'ludo';
  wrap.innerHTML = `<canvas width="${S * N}" height="${S * N}"></canvas><div class="dice"><div class="die" id="die"></div><button id="roll">Roll the dice</button></div>`;
  A.board.appendChild(wrap);
  const cv = wrap.querySelector('canvas')!, ctx = cv.getContext('2d')!;
  const die = wrap.querySelector<HTMLElement>('#die')!, rollBtn = wrap.querySelector<HTMLButtonElement>('#roll')!;
  let turn: Side = me, roll = 0, movable: number[] = [], busy = false;
  const other = (s: Side) => (s === me ? bot : me);
  // dice face drawn with pips; `rolling` cycles random faces before settling
  const FACES: Record<number, number[]> = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  const setDie = (v: number) => { die.innerHTML = Array.from({ length: 9 }, (_, i) => `<b class="${FACES[v].includes(i) ? 'on' : ''}"></b>`).join(''); };
  const rollAnim = (final: number, done: () => void) => {
    let n = 0; die.classList.add('rolling');
    const tick = () => { n++; setDie(1 + Math.floor(Math.random() * 6)); if (n < 9) setTimeout(tick, 60 + n * 12); else { setDie(final); die.classList.remove('rolling'); done(); } };
    tick();
  };
  setDie(6);
  // token positions animate between cells; `anim` holds in-flight hops
  const anim = new Map<string, { from: Cell; to: Cell; t0: number }>();
  const pulse = { t: 0 };

  const score = () => A.setScore(`${me.tokens.filter((t) => t === FINISH).length} / 4 home`, `${bot.tokens.filter((t) => t === FINISH).length} / 4 home`);

  function canMove(s: Side, i: number, r: number) {
    const p = s.tokens[i];
    if (p === FINISH) return false;
    if (p === 0) return r === 6;
    return p + r <= FINISH;
  }
  function doMove(s: Side, i: number, r: number): { capture: boolean; finished: boolean } {
    const p = s.tokens[i];
    const np = p === 0 ? 1 : p + r;
    const from: Cell = p === 0 ? s.base[i] : (() => { const c = cellOf(s, p)!; return [c[0] + 0.5, c[1] + 0.5] as Cell; })();
    const toC = cellOf(s, np)!;
    anim.set(`${s.name}${i}`, { from, to: [toC[0] + 0.5, toC[1] + 0.5], t0: performance.now() });
    s.tokens[i] = np;
    let capture = false;
    const ti = trackIdx(s, np);
    if (ti >= 0 && !SAFE.has(ti)) {
      const o = other(s);
      o.tokens.forEach((op, j) => { if (trackIdx(o, op) === ti) { o.tokens[j] = 0; capture = true; } });
    }
    return { capture, finished: np === FINISH };
  }

  function draw() {
    ctx.fillStyle = '#fbf6ea'; ctx.fillRect(0, 0, S * N, S * N);
    const box = (x: number, y: number, w: number, h: number, c: string) => { ctx.fillStyle = c; ctx.fillRect(x * S, y * S, w * S, h * S); };
    const rr = (x: number, y: number, w: number, h: number, r: number, c: string) => { ctx.fillStyle = c; ctx.beginPath(); ctx.roundRect(x * S, y * S, w * S, h * S, r); ctx.fill(); };
    // bases (four colours for looks; only red and blue play)
    box(0, 9, 6, 6, RED.color); box(9, 9, 6, 6, BLUE.color); box(0, 0, 6, 6, '#3fa66a'); box(9, 0, 6, 6, '#f2c31b');
    for (const [x, y] of [[0, 9], [9, 9], [0, 0], [9, 0]]) { rr(x + 0.9, y + 0.9, 4.2, 4.2, 18, 'rgba(0,0,0,.15)'); rr(x + 0.8, y + 0.8, 4.2, 4.2, 18, '#fff'); }
    for (const [x, y] of [[0, 9], [9, 9], [0, 0], [9, 0]]) for (const [dx, dy] of [[1.5, 1.5], [3.5, 1.5], [1.5, 3.5], [3.5, 3.5]]) { ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.beginPath(); ctx.arc((x + dx) * S, (y + dy) * S, S * 0.42, 0, 7); ctx.fill(); }
    // track grid
    ctx.strokeStyle = 'rgba(0,0,0,.12)';
    for (const [x, y] of TRACK) { box(x, y, 1, 1, '#fff'); ctx.strokeRect(x * S, y * S, S, S); }
    for (const [x, y] of me.home) box(x, y, 1, 1, RED.color + '66');
    for (const [x, y] of bot.home) box(x, y, 1, 1, BLUE.color + '66');
    for (const [x, y] of [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]]) box(x, y, 1, 1, '#f2c31b66');
    for (const [x, y] of [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]]) box(x, y, 1, 1, '#3fa66a66');
    for (const s of [me, bot]) { const [x, y] = TRACK[s.start]; box(x, y, 1, 1, s.color + 'aa'); }
    for (const i of SAFE) { const [x, y] = TRACK[i]; ctx.fillStyle = '#f2c31b'; ctx.font = `${S * 0.62}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('★', (x + 0.5) * S, (y + 0.5) * S + 1); }
    // arrows into the home lanes
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.font = `${S * 0.5}px sans-serif`;
    ctx.fillText('▲', 7.5 * S, 13.5 * S); ctx.fillText('◀', 13.5 * S, 7.5 * S); ctx.fillText('▼', 7.5 * S, 1.5 * S); ctx.fillText('▶', 1.5 * S, 7.5 * S);
    // centre
    ctx.fillStyle = RED.color; ctx.beginPath(); ctx.moveTo(6 * S, 9 * S); ctx.lineTo(7.5 * S, 7.5 * S); ctx.lineTo(9 * S, 9 * S); ctx.fill();
    ctx.fillStyle = BLUE.color; ctx.beginPath(); ctx.moveTo(9 * S, 6 * S); ctx.lineTo(7.5 * S, 7.5 * S); ctx.lineTo(9 * S, 9 * S); ctx.fill();
    ctx.fillStyle = '#3fa66a'; ctx.beginPath(); ctx.moveTo(6 * S, 6 * S); ctx.lineTo(7.5 * S, 7.5 * S); ctx.lineTo(6 * S, 9 * S); ctx.fill();
    ctx.fillStyle = '#f2c31b'; ctx.beginPath(); ctx.moveTo(6 * S, 6 * S); ctx.lineTo(7.5 * S, 7.5 * S); ctx.lineTo(9 * S, 6 * S); ctx.fill();
    // centre gloss
    ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.arc(7.5 * S, 7.5 * S, S * 0.9, 0, 7); ctx.fill();
    // tokens (hop animation between cells, pulse on movable ones)
    const now = performance.now();
    pulse.t = now / 1000;
    const stacks = new Map<string, number>();
    for (const s of [me, bot]) s.tokens.forEach((p, i) => {
      let cx: number, cy: number;
      if (p === 0) { [cx, cy] = s.base[i]; } else { const c = cellOf(s, p)!; const key = c.join(','); const n = stacks.get(key) ?? 0; stacks.set(key, n + 1); cx = c[0] + 0.5 + (n % 2) * 0.22 - 0.11; cy = c[1] + 0.5 + Math.floor(n / 2) * 0.22 - 0.11; }
      let lift = 0;
      const a = anim.get(`${s.name}${i}`);
      if (a) {
        const k = Math.min(1, (now - a.t0) / 420);
        if (k >= 1) anim.delete(`${s.name}${i}`);
        else { const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; cx = a.from[0] + (a.to[0] - a.from[0]) * e; cy = a.from[1] + (a.to[1] - a.from[1]) * e; lift = Math.sin(k * Math.PI) * 10; }
      }
      const glow = s === turn && movable.includes(i) && !a;
      const r = S * (glow ? 0.4 + Math.sin(pulse.t * 6) * 0.03 : 0.36);
      ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(cx * S, cy * S + 5, r * 0.9, r * 0.5, 0, 0, 7); ctx.fill();
      const gy = cy * S - lift;
      const grad = ctx.createRadialGradient(cx * S - r * 0.35, gy - r * 0.35, r * 0.1, cx * S, gy, r);
      grad.addColorStop(0, '#fff'); grad.addColorStop(0.25, s.color); grad.addColorStop(1, s.dark);
      ctx.beginPath(); ctx.arc(cx * S, gy, r, 0, 7); ctx.fillStyle = grad; ctx.fill();
      ctx.lineWidth = glow ? 4 : 1.5; ctx.strokeStyle = glow ? '#fff' : 'rgba(0,0,0,.35)'; ctx.stroke();
      if (glow) { ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx * S, gy, r + 6 + Math.sin(pulse.t * 6) * 2, 0, 7); ctx.stroke(); }
    });
  }

  let raf = 0;
  const loop = () => { if (!cv.isConnected) { cancelAnimationFrame(raf); return; } raf = requestAnimationFrame(loop); draw(); };
  raf = requestAnimationFrame(loop);

  function startTurn(s: Side) {
    turn = s; roll = 0; movable = [];
    A.setTurn(s.name);
    if (s === me) { rollBtn.disabled = false; A.setStatus('Your turn — roll the dice.'); }
    else { rollBtn.disabled = true; A.setStatus(`${opponent} is rolling…`); setTimeout(botTurn, 800); }
    draw();
  }

  function rolled(s: Side, then: (ok: boolean) => void) {
    roll = 1 + Math.floor(Math.random() * 6);
    rollAnim(roll, () => {
      movable = s.tokens.map((_, i) => i).filter((i) => canMove(s, i, roll));
      if (!movable.length) { A.setStatus(`${s === me ? 'You' : opponent} rolled ${roll} — no move.`); setTimeout(() => startTurn(other(s)), 900); then(false); return; }
      then(true);
    });
  }

  function after(s: Side, res: { capture: boolean; finished: boolean }) {
    score(); draw();
    if (s.tokens.every((t) => t === FINISH)) { A.finish(s === me, s === me ? 'All four tokens home!' : `${opponent} got all four home`, 200); return; }
    if (roll === 6 || res.capture || res.finished) { A.setStatus(res.capture ? 'Capture! Roll again.' : res.finished ? 'Token home! Roll again.' : 'Six! Roll again.'); setTimeout(() => startTurn(s), 700); }
    else startTurn(other(s));
  }

  rollBtn.addEventListener('click', () => {
    if (turn !== me || roll || busy || A.over) return;
    rollBtn.disabled = true;
    rolled(me, (ok) => { if (ok) { A.setStatus(`You rolled ${roll} — tap a glowing token.`); if (movable.length === 1) setTimeout(() => pick(movable[0]), 400); } });
  });
  cv.addEventListener('click', (e) => {
    if (turn !== me || !roll || busy || A.over) return;
    const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * N, y = (e.clientY - r.top) / r.height * N;
    for (const i of movable) {
      const p = me.tokens[i];
      const c: Cell = p === 0 ? me.base[i] : (() => { const cc = cellOf(me, p)!; return [cc[0] + 0.5, cc[1] + 0.5] as Cell; })();
      if (Math.hypot(c[0] - x, c[1] - y) < 0.7) { pick(i); return; }
    }
  });
  function pick(i: number) { busy = true; const res = doMove(me, i, roll); movable = []; setTimeout(() => { busy = false; after(me, res); }, 450); }

  function botTurn() {
    if (A.over) return;
    rolled(bot, (ok) => { if (ok) botPick(); });
  }
  function botPick() {
    // prefer: finish > capture > leave base > furthest along
    let best = movable[0], bestV = -Infinity;
    for (const i of movable) {
      const p = bot.tokens[i], np = p === 0 ? 1 : p + roll;
      let v = np;
      if (np === FINISH) v += 100;
      const ti = trackIdx(bot, np);
      if (ti >= 0 && !SAFE.has(ti) && me.tokens.some((mp) => trackIdx(me, mp) === ti)) v += 80;
      if (p === 0) v += 30;
      if (ti >= 0 && SAFE.has(ti)) v += 8;
      if (v > bestV) { bestV = v; best = i; }
    }
    A.setStatus(`${opponent} rolled ${roll}.`);
    setTimeout(() => { const res = doMove(bot, best, roll); movable = []; setTimeout(() => after(bot, res), 450); }, 600);
  }

  score(); startTurn(me);
}
