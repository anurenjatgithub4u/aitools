import { type Collectible, type Destination } from './destinations';
import type { QuestState } from './quests';
import { store } from './store';

export const hex = (n: number) => '#' + n.toString(16).padStart(6, '0');

export interface Hud {
  points(n: number): void;
  collect(item: Collectible): void;
  online(n: number): void;
  nearest(name: string | null, dist: number): void;
  prompt(text: string | null, driving: boolean): void;
  lift(text: string | null): void;
  run(on: boolean): void;
  dash(d: { fuel: number; boost: number; boosting: boolean; kmh: number; canRefuel: boolean; refuelling: boolean } | null): void;
  muted(m: boolean): void;
  quest(q: QuestState | null): void;
  friends(n: number): void;
  rank(r: number, of: number): void;
  minimap: HTMLCanvasElement;
}

export interface HudActions { jump(): void; drive(): void; lift(): void; run(): void; zoom(delta: number): void; boost(held: boolean): void; refuel(): void; horn(): void; mute(): void; task(): void; befriend(): void }

export function renderHud(root: HTMLElement, d: Destination, points: number, actions: HudActions): Hud {
  root.innerHTML = `
  <div class="hud">
    <a class="brand top-left" href="/"><span class="logo">🌍</span><div><b>WANDER</b><small>ONE PLANET · COUNTLESS WONDERS</small></div></a>
    <div class="quest" id="quest">
      <div class="qhead"><span class="qicon">🎯</span><div><small id="qkicker">TASK</small><b id="qtitle">Looking for a task…</b></div><em id="qtime"></em></div>
      <p id="qdesc">Explore while we line one up. Press T for a task right away.</p>
      <div class="qbar"><i id="qfill"></i></div>
      <div class="qfoot"><span id="qprog"></span><span id="qhint"></span><button id="qbtn">Start task</button></div>
    </div>
    <div class="top-center">
      <div class="chip big">🏆 <b id="pts">${points}</b> points</div>
      <div class="chip" id="online">👥 ${d.explorers} exploring together</div>
      <div class="row"><div class="chip rank" id="rank">🏅 Rank #–</div><div class="chip friends" id="friends">🤝 ${store.friends().length} friends</div></div>
    </div>
    <div class="top-right">
      <a class="round" href="/" title="All worlds">🌍</a>
      <button class="round" id="mute" title="Sound (M)">🔊</button>
      <button class="round" id="help" title="Help">?</button>
    </div>
    <div class="bottom-left">
      <p class="eyebrow">${d.country}</p>
      <h2>${d.name}</h2>
      <p class="sub">${d.place} · ${d.tagline}</p>
    </div>
    <div class="bottom-center">
      <div class="dash" id="dash" hidden>
        <div class="gauge"><span>⛽</span><i><b id="fuelbar"></b></i><em id="fueltxt">100%</em></div>
        <div class="gauge"><span>🚀</span><i><b id="boostbar" class="boost"></b></i><em id="kmh">0 km/h</em></div>
      </div>
      <div class="chip prompt" id="prompt" hidden></div>
      <div class="chip prompt lifting" id="liftprompt" hidden></div>
      <div class="hints"><span>✨ Walk over things to collect</span><span>⌨ WASD move · Shift run/boost · Space jump · E drive · F lift · R refuel · H horn</span><span>🖱 Drag or two-finger swipe to look · wheel / pinch to zoom</span></div>
    </div>
    <div class="bottom-right">
      <div class="minimap"><canvas id="minimap" width="170" height="170"></canvas><span>${d.name}</span></div>
      <a class="chip leave" href="/">Exit</a>
    </div>
    <div class="zoom">
      <button id="zoomin" title="Zoom in">+</button>
      <button id="zoomout" title="Zoom out">−</button>
    </div>
    <div class="actions">
      <button class="act" id="fuelbtn" hidden>⛽<small>Refuel</small></button>
      <button class="act" id="hornbtn" hidden>📯<small>Horn</small></button>
      <button class="act boostbtn" id="boostbtn" hidden>🚀<small>Boost</small></button>
      <button class="act" id="liftbtn" hidden>🙋<small>Lift</small></button>
      <button class="act" id="friendbtn" hidden>🤝<small>Add</small></button>
      <button class="act" id="drive" hidden>🚗<small>Drive</small></button>
      <button class="act" id="jump">⤒<small>Jump</small></button>
      <button class="act" id="run">🏃<small>Run</small></button>
    </div>
    <div id="toasts"></div>
    <div class="help" id="helpbox" hidden>
      <h3>How to play</h3>
      <p><b>Move</b> W A S D or arrow keys · hold <b>Shift</b> to run (or tap the Run button to stay running) · <b>Space</b> to jump.<br><b>Look</b> drag with the mouse, or two-finger swipe on a touchpad · mouse wheel or pinch to zoom.<br><b>Drive</b> walk up to a jeep, tuk-tuk, bike or cycle and press <b>E</b> · W/S accelerate · A/D steer · Space brake · <b>Shift</b> nitro boost · <b>H</b> horn · E to get out.<br><b>Friends</b> walk up to any explorer and press <b>G</b> to send a friend request — most say yes. Friends keep a 🤝 badge every time you visit.<br><b>Tasks</b> timed challenges appear in the top-left card (or press <b>T</b>): find hidden cash, dash through checkpoints, run a taxi job or gather snacks. Finish fast for up to double points.<br><b>Petrol</b> a tank lasts about 5 km (boosting burns double). When it runs dry, coast to the ⛽ station, stop, and press <b>R</b> to fill up. <b>M</b> toggles sound.<br><b>Touch</b> left half = joystick · right half = look · buttons for jump and drive.<br><b>Lifts</b> while driving slowly next to an explorer press <b>F</b> to pick them up, F again to drop them off for +30.<br><b>Collect</b> walk (or drive) over any floating item with a number.</p>
      <p>${d.blurb}</p>
      <button id="closehelp">Got it</button>
    </div>
  </div>`;

  const pts = root.querySelector('#pts')!;
  const online = root.querySelector('#online')!;
  const toasts = root.querySelector('#toasts')!;
  const helpbox = root.querySelector<HTMLElement>('#helpbox')!;
  const promptEl = root.querySelector<HTMLElement>('#prompt')!;
  const driveBtn = root.querySelector<HTMLButtonElement>('#drive')!;
  const jumpBtn = root.querySelector<HTMLButtonElement>('#jump')!;
  const press = (btn: HTMLElement, fn: () => void) => btn.addEventListener('pointerdown', (e) => { e.preventDefault(); fn(); });
  press(jumpBtn, actions.jump);
  // zoom buttons repeat while held
  const hold = (btn: HTMLElement, delta: number) => {
    let timer = 0;
    const stop = () => { clearInterval(timer); timer = 0; };
    btn.addEventListener('pointerdown', (e) => { e.preventDefault(); actions.zoom(delta); stop(); timer = window.setInterval(() => actions.zoom(delta), 80); });
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) btn.addEventListener(ev, stop);
  };
  hold(root.querySelector('#zoomin')!, -1);
  hold(root.querySelector('#zoomout')!, 1);
  const runBtn = root.querySelector<HTMLButtonElement>('#run')!;
  press(runBtn, actions.run);
  press(driveBtn, actions.drive);
  const liftBtn = root.querySelector<HTMLButtonElement>('#liftbtn')!;
  const liftEl = root.querySelector<HTMLElement>('#liftprompt')!;
  press(liftBtn, actions.lift);
  const friendBtn = root.querySelector<HTMLButtonElement>('#friendbtn')!;
  press(friendBtn, actions.befriend);
  const friendsChip = root.querySelector<HTMLElement>('#friends')!;
  const rankChip = root.querySelector<HTMLElement>('#rank')!;
  const dashEl = root.querySelector<HTMLElement>('#dash')!;
  const fuelBar = root.querySelector<HTMLElement>('#fuelbar')!, fuelTxt = root.querySelector<HTMLElement>('#fueltxt')!;
  const boostBar = root.querySelector<HTMLElement>('#boostbar')!, kmhEl = root.querySelector<HTMLElement>('#kmh')!;
  const fuelBtn = root.querySelector<HTMLButtonElement>('#fuelbtn')!;
  const hornBtn = root.querySelector<HTMLButtonElement>('#hornbtn')!;
  const boostBtn = root.querySelector<HTMLButtonElement>('#boostbtn')!;
  const muteBtn = root.querySelector<HTMLButtonElement>('#mute')!;
  press(fuelBtn, actions.refuel);
  press(hornBtn, actions.horn);
  boostBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); actions.boost(true); });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) boostBtn.addEventListener(ev, () => actions.boost(false));
  muteBtn.addEventListener('click', actions.mute);
  const questEl = root.querySelector<HTMLElement>('#quest')!;
  const qTitle = root.querySelector<HTMLElement>('#qtitle')!, qKick = root.querySelector<HTMLElement>('#qkicker')!, qTime = root.querySelector<HTMLElement>('#qtime')!;
  const qDesc = root.querySelector<HTMLElement>('#qdesc')!, qFill = root.querySelector<HTMLElement>('#qfill')!;
  const qProg = root.querySelector<HTMLElement>('#qprog')!, qHint = root.querySelector<HTMLElement>('#qhint')!, qBtn = root.querySelector<HTMLButtonElement>('#qbtn')!;
  qBtn.addEventListener('click', actions.task);
  root.querySelector('#help')!.addEventListener('click', () => (helpbox.hidden = !helpbox.hidden));
  root.querySelector('#closehelp')!.addEventListener('click', () => (helpbox.hidden = true));

  return {
    points(n) { pts.textContent = String(n); pts.parentElement!.classList.remove('pop'); void (pts.parentElement as HTMLElement).offsetWidth; pts.parentElement!.classList.add('pop'); },
    collect(item) {
      const t = document.createElement('div');
      t.className = 'toast';
      t.style.setProperty('--c', hex(item.color));
      t.innerHTML = `${item.points < 0 ? '' : '+'}${item.points} <span>${item.name}</span>`;
      if (item.points < 0) t.classList.add('bad');
      toasts.appendChild(t);
      setTimeout(() => t.remove(), 1600);
    },
    online(n) { online.textContent = `👥 ${n} exploring together`; },
    nearest() { /* the old 'where to next' card is gone; kept for the event signature */ },
    prompt(text, driving) {
      promptEl.hidden = !text;
      promptEl.textContent = text ?? '';
      promptEl.classList.toggle('driving', driving);
      driveBtn.hidden = !text;
      driveBtn.innerHTML = driving ? '🚶<small>Get out</small>' : '🚗<small>Drive</small>';
      jumpBtn.hidden = driving;
      runBtn.hidden = driving;
    },
    run(on) { runBtn.classList.toggle('on', on); runBtn.innerHTML = on ? '🏃<small>Running</small>' : '🚶<small>Walk</small>'; },
    dash(d) {
      dashEl.hidden = !d;
      hornBtn.hidden = boostBtn.hidden = !d;
      fuelBtn.hidden = !d || !d.canRefuel;
      if (!d) return;
      (fuelBar.parentElement!.parentElement as HTMLElement).hidden = d.fuel < 0;   // cycles have no tank
      fuelBar.style.width = `${Math.round(Math.max(0, d.fuel) * 100)}%`;
      fuelBar.classList.toggle('low', d.fuel < 0.2);
      fuelTxt.textContent = d.refuelling ? 'Filling…' : d.fuel <= 0 ? 'EMPTY' : `${Math.round(d.fuel * 100)}% · ${(d.fuel * 5).toFixed(1)} km`;
      boostBar.style.width = `${Math.round(d.boost * 100)}%`;
      boostBtn.classList.toggle('on', d.boosting);
      kmhEl.textContent = `${d.kmh} km/h`;
      fuelBtn.innerHTML = d.refuelling ? '⛽<small>Filling</small>' : '⛽<small>Refuel</small>';
    },
    muted(m) { muteBtn.textContent = m ? '🔇' : '🔊'; },
    quest(q) {
      questEl.className = `quest ${q?.status ?? 'idle'}`;
      if (!q) {
        qKick.textContent = 'TASK'; qTitle.textContent = 'Looking for a task…'; qTime.textContent = '';
        qDesc.textContent = 'Explore while we line one up. Press T for a task right away.';
        qFill.style.width = '0%'; qProg.textContent = ''; qHint.textContent = ''; qBtn.hidden = false;
        return;
      }
      const m = Math.floor(q.remaining / 60), s = Math.floor(q.remaining % 60);
      qKick.textContent = q.status === 'active' ? `TASK · +${q.reward} pts` : q.status === 'done' ? 'TASK COMPLETE' : 'TIME\'S UP';
      qTitle.textContent = q.title;
      qTime.textContent = q.status === 'active' ? `${m}:${s.toString().padStart(2, '0')}` : q.status === 'done' ? '✔' : '✖';
      qDesc.textContent = q.desc;
      qFill.style.width = `${Math.min(100, (q.remaining / q.total) * 100)}%`;
      qFill.classList.toggle('urgent', q.status === 'active' && q.remaining < 15);
      qProg.textContent = q.progress;
      qHint.textContent = q.hint ? `➜ ${q.hint}` : '';
      qBtn.hidden = q.status === 'active';
      qBtn.textContent = 'Next task';
    },
    lift(text) {
      liftEl.hidden = !text; liftEl.textContent = text ?? '';
      const isFriend = !!text && text.includes('friend request');
      liftBtn.hidden = !text || isFriend;
      friendBtn.hidden = !text || !isFriend;
    },
    friends(n) { friendsChip.textContent = `🤝 ${n} friends`; },
    rank(r, of) { rankChip.textContent = `🏅 Rank #${r.toLocaleString()} of ${of.toLocaleString()}`; rankChip.classList.toggle('top', r <= 10); },
    minimap: root.querySelector<HTMLCanvasElement>('#minimap')!,
  };
}
