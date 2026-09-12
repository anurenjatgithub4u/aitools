import { openArena, type ArenaOpts } from './arena';

// Chess vs an explorer. You are white. Legal moves incl. castling and promotion (to queen),
// check / checkmate / stalemate; the rival searches two plies with a material + mobility eval.

type Piece = 'P' | 'N' | 'B' | 'R' | 'Q' | 'K' | 'p' | 'n' | 'b' | 'r' | 'q' | 'k' | '';
type Board = Piece[];                       // 64 squares, a8 = 0 … h1 = 63
interface Move { from: number; to: number; promo?: Piece; castle?: 'K' | 'Q'; }
interface State { b: Board; white: boolean; castle: { K: boolean; Q: boolean; k: boolean; q: boolean }; half: number }

const GLYPH: Record<string, string> = { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙', k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
const VAL: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
const START = 'rnbqkbnrpppppppp' + ' '.repeat(32) + 'PPPPPPPPRNBQKBNR';

const isWhite = (p: Piece) => p !== '' && p === p.toUpperCase();
const file = (i: number) => i % 8, rank = (i: number) => Math.floor(i / 8);

function attacked(b: Board, sq: number, byWhite: boolean): boolean {
  const f = file(sq), r = rank(sq);
  const at = (df: number, dr: number) => { const nf = f + df, nr = r + dr; return nf < 0 || nf > 7 || nr < 0 || nr > 7 ? null : b[nr * 8 + nf]; };
  const own = (p: Piece | null) => p !== null && p !== '' && isWhite(p) === byWhite;
  // pawns
  const pr = byWhite ? 1 : -1;
  for (const df of [-1, 1]) { const p = at(df, pr); if (own(p) && p!.toLowerCase() === 'p') return true; }
  for (const [df, dr] of [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]]) { const p = at(df, dr); if (own(p) && p!.toLowerCase() === 'n') return true; }
  for (const [df, dr] of [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const p = at(df, dr); if (own(p) && p!.toLowerCase() === 'k') return true;
  }
  for (const [df, dr, kinds] of [[1, 1, 'bq'], [1, -1, 'bq'], [-1, 1, 'bq'], [-1, -1, 'bq'], [1, 0, 'rq'], [-1, 0, 'rq'], [0, 1, 'rq'], [0, -1, 'rq']] as [number, number, string][]) {
    for (let k = 1; k < 8; k++) {
      const p = at(df * k, dr * k);
      if (p === null) break;
      if (p === '') continue;
      if (own(p) && kinds.includes(p.toLowerCase())) return true;
      break;
    }
  }
  return false;
}

function kingSq(b: Board, white: boolean) { return b.indexOf(white ? 'K' : 'k'); }
const inCheck = (s: State, white: boolean) => attacked(s.b, kingSq(s.b, white), !white);

function pseudo(s: State): Move[] {
  const out: Move[] = [], b = s.b, w = s.white;
  const push = (from: number, to: number) => {
    const p = b[from];
    if (p.toLowerCase() === 'p' && (rank(to) === 0 || rank(to) === 7)) out.push({ from, to, promo: w ? 'Q' : 'q' });
    else out.push({ from, to });
  };
  for (let i = 0; i < 64; i++) {
    const p = b[i];
    if (!p || isWhite(p) !== w) continue;
    const f = file(i), r = rank(i), t = p.toLowerCase();
    const ok = (nf: number, nr: number) => nf >= 0 && nf < 8 && nr >= 0 && nr < 8;
    if (t === 'p') {
      const dir = w ? -1 : 1, start = w ? 6 : 1;
      if (ok(f, r + dir) && b[(r + dir) * 8 + f] === '') {
        push(i, (r + dir) * 8 + f);
        if (r === start && b[(r + 2 * dir) * 8 + f] === '') push(i, (r + 2 * dir) * 8 + f);
      }
      for (const df of [-1, 1]) if (ok(f + df, r + dir)) { const q = b[(r + dir) * 8 + f + df]; if (q && isWhite(q) !== w) push(i, (r + dir) * 8 + f + df); }
    } else if (t === 'n' || t === 'k') {
      const steps = t === 'n' ? [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]] : [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
      for (const [df, dr] of steps) if (ok(f + df, r + dr)) { const q = b[(r + dr) * 8 + f + df]; if (!q || isWhite(q) !== w) push(i, (r + dr) * 8 + f + df); }
      if (t === 'k') {
        const home = w ? 60 : 4;
        if (i === home && !attacked(b, home, !w)) {
          if (s.castle[w ? 'K' : 'k'] && b[home + 1] === '' && b[home + 2] === '' && b[home + 3].toLowerCase() === 'r' && !attacked(b, home + 1, !w) && !attacked(b, home + 2, !w)) out.push({ from: i, to: home + 2, castle: 'K' });
          if (s.castle[w ? 'Q' : 'q'] && b[home - 1] === '' && b[home - 2] === '' && b[home - 3] === '' && b[home - 4].toLowerCase() === 'r' && !attacked(b, home - 1, !w) && !attacked(b, home - 2, !w)) out.push({ from: i, to: home - 2, castle: 'Q' });
        }
      }
    } else {
      const dirs = t === 'b' ? [[1, 1], [1, -1], [-1, 1], [-1, -1]] : t === 'r' ? [[1, 0], [-1, 0], [0, 1], [0, -1]] : [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
      for (const [df, dr] of dirs) for (let k = 1; k < 8; k++) {
        const nf = f + df * k, nr = r + dr * k;
        if (!ok(nf, nr)) break;
        const q = b[nr * 8 + nf];
        if (!q) { push(i, nr * 8 + nf); continue; }
        if (isWhite(q) !== w) push(i, nr * 8 + nf);
        break;
      }
    }
  }
  return out;
}

function apply(s: State, m: Move): State {
  const b = s.b.slice(), p = b[m.from];
  const capture = b[m.to] !== '' || p.toLowerCase() === 'p';
  b[m.to] = m.promo ?? p; b[m.from] = '';
  if (m.castle) { const home = m.from; if (m.castle === 'K') { b[home + 1] = b[home + 3]; b[home + 3] = ''; } else { b[home - 1] = b[home - 4]; b[home - 4] = ''; } }
  const castle = { ...s.castle };
  if (p === 'K') { castle.K = castle.Q = false; } if (p === 'k') { castle.k = castle.q = false; }
  for (const sq of [m.from, m.to]) { if (sq === 63) castle.K = false; if (sq === 56) castle.Q = false; if (sq === 7) castle.k = false; if (sq === 0) castle.q = false; }
  return { b, white: !s.white, castle, half: capture ? 0 : s.half + 1 };
}

function legal(s: State): Move[] { return pseudo(s).filter((m) => !inCheck(apply(s, m), s.white)); }

function evaluate(s: State): number {   // from white's view
  let v = 0;
  for (let i = 0; i < 64; i++) {
    const p = s.b[i]; if (!p) continue;
    const base = VAL[p.toLowerCase()];
    const centre = (3.5 - Math.abs(file(i) - 3.5)) + (3.5 - Math.abs(rank(i) - 3.5));   // 0..7
    const adv = p.toLowerCase() === 'p' ? (isWhite(p) ? 6 - rank(i) : rank(i) - 1) * 6 : 0;
    v += (base + centre * 3 + adv) * (isWhite(p) ? 1 : -1);
  }
  return v;
}

function botMove(s: State): Move | null {
  const moves = legal(s);
  if (!moves.length) return null;
  let best: Move[] = [], bestV = Infinity;   // bot is black: minimise white's eval
  for (const m of moves) {
    const s1 = apply(s, m);
    const replies = legal(s1);
    let v: number;
    if (!replies.length) v = inCheck(s1, true) ? -99999 : 0;           // mate for black / stalemate
    else { v = -Infinity; for (const r of replies) v = Math.max(v, evaluate(apply(s1, r))); }
    v += (Math.random() - 0.5) * 12;
    if (v < bestV - 1e-9) { bestV = v; best = [m]; } else if (Math.abs(v - bestV) < 1e-9) best.push(m);
  }
  return best[Math.floor(Math.random() * best.length)];
}

export function openChess(host: HTMLElement, opponent: string, you: string, onDone: (win: boolean | null) => void) {
  const opts: ArenaOpts = { host, icon: '♟️', title: 'Chess', you, opponent, hint: 'You are white. Tap a piece, then a highlighted square.', onDone, onRematch: () => openChess(host, opponent, you, onDone) };
  const A = openArena(opts);
  let s: State = { b: START.split('').map((c) => (c === ' ' ? '' : c) as Piece), white: true, castle: { K: true, Q: true, k: true, q: true }, half: 0 };
  let sel: number | null = null, last: Move | null = null, busy = false;
  const grid = document.createElement('div');
  grid.className = 'chess';
  A.board.appendChild(grid);
  const cells: HTMLElement[] = [];
  for (let i = 0; i < 64; i++) {
    const c = document.createElement('button');
    c.className = `sq ${(file(i) + rank(i)) % 2 ? 'dark' : 'light'}`;
    c.addEventListener('click', () => tap(i));
    grid.appendChild(c); cells.push(c);
  }
  const captured = () => {
    const count = (white: boolean) => { let v = 0; for (const p of s.b) if (p && isWhite(p) === white) v += VAL[p.toLowerCase()]; return v; };
    const d = Math.round((count(true) - count(false)) / 100);
    A.setScore(d > 0 ? `+${d} material` : 'white', d < 0 ? `+${-d} material` : 'black');
  };
  function render() {
    const moves = sel !== null ? legal(s).filter((m) => m.from === sel) : [];
    const ks = inCheck(s, s.white) ? kingSq(s.b, s.white) : -1;
    cells.forEach((c, i) => {
      const p = s.b[i];
      c.textContent = p ? GLYPH[p] : '';
      c.classList.toggle('white', !!p && isWhite(p)); c.classList.toggle('black', !!p && !isWhite(p));
      c.classList.toggle('sel', i === sel);
      c.classList.toggle('can', moves.some((m) => m.to === i));
      c.classList.toggle('cap', moves.some((m) => m.to === i) && !!p);
      c.classList.toggle('last', !!last && (last.from === i || last.to === i));
      c.classList.toggle('check', i === ks);
    });
    captured();
  }
  function endCheck(): boolean {
    const moves = legal(s);
    if (moves.length) { if (s.half >= 100) { A.finish(null, 'Fifty moves without progress', 0); return true; } return false; }
    if (inCheck(s, s.white)) A.finish(!s.white, s.white ? `Checkmate — ${opponent} wins` : 'Checkmate!', 300);
    else A.finish(null, 'Stalemate', 0);
    return true;
  }
  function tap(i: number) {
    if (A.over || busy || !s.white) return;
    const p = s.b[i];
    if (sel !== null) {
      const m = legal(s).find((x) => x.from === sel && x.to === i);
      if (m) { s = apply(s, m); last = m; sel = null; render(); A.setTurn('bot'); A.setStatus(inCheck(s, false) ? 'Check!' : `${opponent} is thinking…`); if (!endCheck()) { busy = true; setTimeout(botTurn, 500 + Math.random() * 600); } return; }
    }
    sel = p && isWhite(p) ? i : null;
    render();
  }
  function botTurn() {
    const m = botMove(s);
    busy = false;
    if (!m) { endCheck(); return; }
    s = apply(s, m); last = m; render();
    A.setTurn('you'); A.setStatus(inCheck(s, true) ? 'Check! Your move.' : 'Your move.');
    endCheck();
  }
  render();
}
