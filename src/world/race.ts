import { openArena, type ArenaOpts } from './arena';

// Top-down circuit race against the explorer you challenged plus two more drivers.
// Three laps. Keyboard: A/D or ←/→ steer, W/↑ throttle, S/↓ brake. Touch: hold the left / right
// half of the track to steer (the car accelerates on its own).

const W = 900, H = 600, LAPS = 3, TRACK_W = 58;

interface Car { name: string; color: string; x: number; y: number; a: number; v: number; idx: number; lap: number; prog: number; done: number; you: boolean; skill: number; wobble: number }

// closed centre-line: a squashed oval with a kink, sampled into ~260 points
function centreLine(): [number, number][] {
  const pts: [number, number][] = [];
  const cx = W / 2, cy = H / 2 + 10;
  for (let i = 0; i < 260; i++) {
    const t = (i / 260) * Math.PI * 2;
    const rx = 350 * (1 + 0.12 * Math.sin(3 * t + 0.6)), ry = 215 * (1 + 0.16 * Math.cos(2 * t));
    pts.push([cx + Math.cos(t) * rx, cy + Math.sin(t) * ry]);
  }
  return pts;
}

export function openRace(host: HTMLElement, opponent: string, you: string, onDone: (win: boolean | null) => void) {
  const touchOnly = matchMedia('(pointer: coarse)').matches;
  const opts: ArenaOpts = { host, icon: '🏁', title: 'Race · 3 laps', you, opponent, hint: touchOnly ? 'Hold the left or right side of the track to steer — the car drives itself' : 'A/D or ← → steer · S brake · the car accelerates on its own', onDone, onRematch: () => openRace(host, opponent, you, onDone) };
  const A = openArena(opts);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; cv.className = 'racetrack';
  A.board.appendChild(cv);
  const ctx = cv.getContext('2d')!;
  const line = centreLine(), N = line.length;
  const startIdx = 0;
  const [sx0, sy0] = line[startIdx];
  const tangent = (i: number) => { const [ax, ay] = line[(i + N - 1) % N], [bx, by] = line[(i + 1) % N]; return Math.atan2(by - ay, bx - ax); };
  const normalAt = (i: number) => { const a = tangent(i); return [-Math.sin(a), Math.cos(a)] as const; };

  const cars: Car[] = [
    { name: you, color: '#e8c46a', you: true, skill: 0, wobble: 0 } as Car,
    { name: opponent, color: '#e75480', you: false, skill: 1, wobble: 0.3 } as Car,
    { name: 'Ravi', color: '#3fb7d9', you: false, skill: 0.92, wobble: 0.5 } as Car,
    { name: 'Kenji', color: '#2fa66a', you: false, skill: 0.85, wobble: 0.7 } as Car,
  ];
  // grid: two rows of two behind the start line
  const [nx, ny] = normalAt(startIdx), sa = tangent(startIdx);
  cars.forEach((c, i) => {
    const back = 18 + Math.floor(i / 2) * 26, side = (i % 2 ? 1 : -1) * 14;
    c.x = sx0 - Math.cos(sa) * back + nx * side; c.y = sy0 - Math.sin(sa) * back + ny * side;
    c.a = sa; c.v = 0; c.idx = N - 3; c.lap = 0; c.prog = 0; c.done = 0;   // lap becomes 1 when the grid crosses the line
  });
  const keys = new Set<string>();
  let touch: 'l' | 'r' | null = null;
  let countdown = 3.9, t0 = performance.now(), finished: Car[] = [], over = false, elapsed = 0;

  const nearest = (c: Car) => {
    // search around the last index — cars only move forward a little per frame
    let best = c.idx, bd = Infinity;
    for (let k = -6; k <= 12; k++) { const i = (c.idx + k + N) % N; const [px, py] = line[i]; const d = (px - c.x) ** 2 + (py - c.y) ** 2; if (d < bd) { bd = d; best = i; } }
    return { i: best, d: Math.sqrt(bd) };
  };
  const rank = () => [...cars].sort((a, b) => (a.done && b.done ? a.done - b.done : a.done ? -1 : b.done ? 1 : b.prog - a.prog));

  function update(dt: number) {
    elapsed += dt;
    if (countdown > 0) { countdown -= dt; return; }
    for (const c of cars) {
      if (c.done) { c.v *= 0.97; c.x += Math.cos(c.a) * c.v * dt; c.y += Math.sin(c.a) * c.v * dt; continue; }
      let steer = 0, throttle = 1, brake = false;
      if (c.you) {
        if (keys.has('a') || keys.has('arrowleft') || touch === 'l') steer = -1;
        if (keys.has('d') || keys.has('arrowright') || touch === 'r') steer = 1;
        throttle = 1;   // the car accelerates on its own; W is just a habit
        brake = keys.has('s') || keys.has('arrowdown') || keys.has(' ');
      } else {
        // steer toward a point ahead on the centre line, with a lane offset and some wobble
        const ahead = (c.idx + 9) % N;
        const [nx2, ny2] = normalAt(ahead);
        const lane = Math.sin(elapsed * 0.7 + c.wobble * 9) * 12 * c.wobble;
        const tx = line[ahead][0] + nx2 * lane, ty = line[ahead][1] + ny2 * lane;
        const want = Math.atan2(ty - c.y, tx - c.x);
        const diff = Math.atan2(Math.sin(want - c.a), Math.cos(want - c.a));
        steer = Math.max(-1, Math.min(1, diff * 3));
        throttle = 0.86 + c.skill * 0.14;
        brake = Math.abs(diff) > 0.9 && c.v > 140;
      }
      const { i, d } = nearest(c);
      const onTrack = d < TRACK_W / 2 + 6;
      const max = (c.you ? 235 : 215 + c.skill * 22) * (onTrack ? 1 : 0.45);
      const accel = onTrack ? 140 : 60;
      if (brake) c.v = Math.max(0, c.v - 260 * dt);
      else c.v += (max * throttle - c.v) * Math.min(1, dt * (c.v < max * throttle ? accel / 100 : 2.5));
      c.a += steer * (1.9 + Math.min(1, c.v / 200) * 1.4) * dt * Math.min(1, c.v / 60);
      // gentle push back toward the tarmac so nobody escapes the map
      if (d > TRACK_W / 2 + 40) { const [px, py] = line[i]; c.x += (px - c.x) * dt * 2; c.y += (py - c.y) * dt * 2; }
      c.x += Math.cos(c.a) * c.v * dt; c.y += Math.sin(c.a) * c.v * dt;
      // lap counting: crossing from the end of the loop to the start
      if (c.idx > N - 12 && i < 12) c.lap++;
      else if (c.idx < 12 && i > N - 12) c.lap--;
      c.idx = i;
      c.prog = c.lap * N + i;
      if (c.lap > LAPS && !c.done) {
        c.done = finished.length + 1; finished.push(c);
        if (c.you) {
          const place = c.done;
          A.finish(place === 1, place === 1 ? 'You took the chequered flag!' : `Finished ${['', '1st', '2nd', '3rd', '4th'][place]} of 4`, 250);
          over = true;
        }
      }
    }
    // car–car nudges
    for (let a = 0; a < cars.length; a++) for (let b = a + 1; b < cars.length; b++) {
      const p = cars[a], q = cars[b], dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy);
      if (d < 22 && d > 0) { const ov = (22 - d) / 2, ux = dx / d, uy = dy / d; p.x -= ux * ov; p.y -= uy * ov; q.x += ux * ov; q.y += uy * ov; p.v *= 0.96; q.v *= 0.96; }
    }
    const order = rank();
    const me = cars[0];
    const place = order.indexOf(me) + 1;
    A.setScore(`Lap ${Math.max(1, Math.min(LAPS, me.lap))}/${LAPS} · P${place}`, `${opponent}: P${order.indexOf(cars[1]) + 1}`);
    if (!over) A.setStatus(`${order.map((c, k) => `${k + 1}. ${c.name}`).join('   ')}`);
  }

  // ---------- drawing ----------
  const track = new Path2D();
  line.forEach(([x, y], i) => (i ? track.lineTo(x, y) : track.moveTo(x, y)));
  track.closePath();
  const grassPattern = (() => {
    const p = document.createElement('canvas'); p.width = p.height = 24;
    const g = p.getContext('2d')!; g.fillStyle = '#4f9a3e'; g.fillRect(0, 0, 24, 24); g.fillStyle = '#56a445'; g.fillRect(0, 0, 12, 12); g.fillRect(12, 12, 12, 12);
    return ctx.createPattern(p, 'repeat')!;
  })();

  function draw() {
    ctx.fillStyle = grassPattern; ctx.fillRect(0, 0, W, H);
    // kerbs, tarmac, edges
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#c0392b'; ctx.lineWidth = TRACK_W + 14; ctx.stroke(track);
    ctx.strokeStyle = '#f4f4f4'; ctx.lineWidth = TRACK_W + 14; ctx.setLineDash([16, 16]); ctx.stroke(track); ctx.setLineDash([]);
    ctx.strokeStyle = '#4a4a4a'; ctx.lineWidth = TRACK_W; ctx.stroke(track);
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2; ctx.setLineDash([14, 18]); ctx.stroke(track); ctx.setLineDash([]);
    // start / finish chequer
    const [fx, fy] = line[startIdx], fa = tangent(startIdx);
    ctx.save(); ctx.translate(fx, fy); ctx.rotate(fa);
    for (let r = 0; r < 2; r++) for (let k = -4; k < 4; k++) { ctx.fillStyle = (r + k) % 2 ? '#111' : '#fff'; ctx.fillRect(r * 8 - 8, k * 7, 8, 7); }
    ctx.restore();
    // cars (sorted so leaders draw on top)
    for (const c of [...cars].sort((a, b) => a.prog - b.prog)) {
      ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.a);
      ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(-11, -6, 22, 12);
      ctx.fillStyle = c.color; ctx.fillRect(-10, -6, 20, 12);
      ctx.fillStyle = '#222'; ctx.fillRect(2, -5, 5, 10);            // cockpit
      ctx.fillStyle = '#111'; for (const [wx, wy] of [[-7, -7], [-7, 5], [6, -7], [6, 5]]) ctx.fillRect(wx, wy, 4, 2);
      if (c.you) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.strokeRect(-10, -6, 20, 12); }
      ctx.restore();
      ctx.font = 'bold 11px Inter, system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(c.x - 24, c.y - 26, 48, 14);
      ctx.fillStyle = c.color; ctx.fillText(c.name.slice(0, 8), c.x, c.y - 15);
    }
    if (countdown > 0) {
      const n = Math.ceil(countdown - 0.9);
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = n <= 0 ? '#3fa66a' : '#e8c46a'; ctx.font = 'bold 120px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(n <= 0 ? 'GO!' : String(n), W / 2, H / 2);
    }
  }

  const kd = (e: KeyboardEvent) => { keys.add(e.key.toLowerCase()); if (['arrowup', 'arrowdown', ' '].includes(e.key.toLowerCase())) e.preventDefault(); };
  const ku = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
  addEventListener('keydown', kd); addEventListener('keyup', ku);
  const side = (e: PointerEvent) => { const r = cv.getBoundingClientRect(); touch = e.clientX - r.left < r.width / 2 ? 'l' : 'r'; };
  cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture(e.pointerId); side(e); });
  cv.addEventListener('pointermove', (e) => { if (touch) side(e); });
  for (const ev of ['pointerup', 'pointercancel']) cv.addEventListener(ev, () => (touch = null));

  let raf = 0;
  const loop = (now: number) => {
    if (!cv.isConnected) { removeEventListener('keydown', kd); removeEventListener('keyup', ku); cancelAnimationFrame(raf); return; }
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - t0) / 1000); t0 = now;
    if (!A.over) update(dt);
    draw();
  };
  raf = requestAnimationFrame(loop);
}
