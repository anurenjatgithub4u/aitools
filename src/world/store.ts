// Tiny localStorage-backed progress store (points, visited worlds, display name).
const KEY = 'wander.v1';

interface State { name: string; points: number; visited: string[] }

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { name: 'Explorer', points: 0, visited: [], ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { name: 'Explorer', points: 0, visited: [] };
}
function save(s: State) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

let state: State | null = null;
const st = () => (state ??= load());

export const store = {
  name: () => st().name,
  setName(n: string) { st().name = n.trim() || 'Explorer'; save(st()); },
  points: () => st().points,
  setPoints(p: number) { st().points = p; save(st()); },
  visited: () => new Set(st().visited),
  visit(id: string) { if (!st().visited.includes(id)) { st().visited.push(id); save(st()); } },
};
