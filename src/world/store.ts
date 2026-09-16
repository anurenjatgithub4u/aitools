// Tiny localStorage-backed progress store (points, visited worlds, display name).
const KEY = 'wander.v1';

interface State { name: string; points: number; visited: string[]; friends: string[]; id: string; gender: 'm' | 'f' | null }

const newId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36)).slice(0, 12);

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const st: State = { name: 'Explorer', points: 0, visited: [], friends: [], id: '', gender: null, ...JSON.parse(raw) }; if (!st.id) { st.id = newId(); save(st); } return st; }
  } catch { /* ignore */ }
  const fresh: State = { name: 'Explorer', points: 0, visited: [], friends: [], id: newId(), gender: null };
  save(fresh);
  return fresh;
}
function save(s: State) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

let state: State | null = null;
const st = () => (state ??= load());

export const store = {
  id: () => st().id,
  gender: () => st().gender,
  setGender(g: 'm' | 'f') { st().gender = g; save(st()); },
  clearGender() { st().gender = null; save(st()); },
  name: () => st().name,
  setName(n: string) { st().name = n.trim() || 'Explorer'; save(st()); },
  points: () => st().points,
  setPoints(p: number) { st().points = p; save(st()); },
  visited: () => new Set(st().visited),
  visit(id: string) { if (!st().visited.includes(id)) { st().visited.push(id); save(st()); } },
  friends: () => [...st().friends],
  addFriend(name: string) { if (!st().friends.includes(name)) { st().friends.push(name); save(st()); } },
};
