import { DESTINATIONS, type Collectible, type Destination } from './destinations';
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
  minimap: HTMLCanvasElement;
}

export interface HudActions { jump(): void; drive(): void; lift(): void; run(): void }

export function renderHud(root: HTMLElement, d: Destination, points: number, actions: HudActions): Hud {
  const visited = store.visited();
  root.innerHTML = `
  <div class="hud">
    <a class="brand top-left" href="/"><span class="logo">🌍</span><div><b>WANDER</b><small>ONE PLANET · COUNTLESS WONDERS</small></div></a>
    <div class="top-center">
      <div class="chip big">🏆 <b id="pts">${points}</b> points</div>
      <div class="chip" id="online">👥 ${d.explorers} exploring together</div>
    </div>
    <div class="top-right">
      <a class="round" href="/" title="All worlds">🌍</a>
      <button class="round" id="help" title="Help">?</button>
    </div>
    <div class="bottom-left">
      <p class="eyebrow">${d.country} · a little escape</p>
      <h2>${d.name}</h2>
      <p class="sub">${d.place} · ${d.tagline}</p>
    </div>
    <div class="bottom-center">
      <div class="chip prompt" id="prompt" hidden></div>
      <div class="chip prompt lifting" id="liftprompt" hidden></div>
      <div class="next"><span class="key">M</span><div><small>WHERE TO NEXT?</small><b id="hint">Collect anything with a number</b></div></div>
      <div class="hints"><span>✨ Walk over things to collect</span><span>⌨ WASD move · Shift run · Space jump · E drive · F lift</span><span>🖱 Drag or two-finger swipe to look · wheel / pinch to zoom</span></div>
    </div>
    <div class="bottom-right">
      <div class="minimap"><canvas id="minimap" width="170" height="170"></canvas><span>${d.name}</span></div>
      <div class="chip">${visited.size} of ${DESTINATIONS.length} worlds</div>
      <a class="chip leave" href="/">Leave world</a>
    </div>
    <div class="actions">
      <button class="act" id="liftbtn" hidden>🙋<small>Lift</small></button>
      <button class="act" id="drive" hidden>🚗<small>Drive</small></button>
      <button class="act" id="jump">⤒<small>Jump</small></button>
      <button class="act" id="run">🏃<small>Run</small></button>
    </div>
    <div id="toasts"></div>
    <div class="help" id="helpbox" hidden>
      <h3>How to play</h3>
      <p><b>Move</b> W A S D or arrow keys · hold <b>Shift</b> to run (or tap the Run button to stay running) · <b>Space</b> to jump.<br><b>Look</b> drag with the mouse, or two-finger swipe on a touchpad · mouse wheel or pinch to zoom.<br><b>Drive</b> walk up to a jeep or tuk-tuk and press <b>E</b> · W/S accelerate · A/D steer · Space brake · E to get out.<br><b>Touch</b> left half = joystick · right half = look · buttons for jump and drive.<br><b>Lifts</b> while driving slowly next to an explorer press <b>F</b> to pick them up, F again to drop them off for +30.<br><b>Collect</b> walk (or drive) over any floating item with a number.</p>
      <p>${d.blurb}</p>
      <button id="closehelp">Got it</button>
    </div>
  </div>`;

  const pts = root.querySelector('#pts')!;
  const online = root.querySelector('#online')!;
  const hint = root.querySelector('#hint')!;
  const toasts = root.querySelector('#toasts')!;
  const helpbox = root.querySelector<HTMLElement>('#helpbox')!;
  const promptEl = root.querySelector<HTMLElement>('#prompt')!;
  const driveBtn = root.querySelector<HTMLButtonElement>('#drive')!;
  const jumpBtn = root.querySelector<HTMLButtonElement>('#jump')!;
  const press = (btn: HTMLElement, fn: () => void) => btn.addEventListener('pointerdown', (e) => { e.preventDefault(); fn(); });
  press(jumpBtn, actions.jump);
  const runBtn = root.querySelector<HTMLButtonElement>('#run')!;
  press(runBtn, actions.run);
  press(driveBtn, actions.drive);
  const liftBtn = root.querySelector<HTMLButtonElement>('#liftbtn')!;
  const liftEl = root.querySelector<HTMLElement>('#liftprompt')!;
  press(liftBtn, actions.lift);
  root.querySelector('#help')!.addEventListener('click', () => (helpbox.hidden = !helpbox.hidden));
  root.querySelector('#closehelp')!.addEventListener('click', () => (helpbox.hidden = true));

  return {
    points(n) { pts.textContent = String(n); pts.parentElement!.classList.remove('pop'); void (pts.parentElement as HTMLElement).offsetWidth; pts.parentElement!.classList.add('pop'); },
    collect(item) {
      const t = document.createElement('div');
      t.className = 'toast';
      t.style.setProperty('--c', hex(item.color));
      t.innerHTML = `+${item.points} <span>${item.name}</span>`;
      toasts.appendChild(t);
      setTimeout(() => t.remove(), 1600);
    },
    online(n) { online.textContent = `👥 ${n} exploring together`; },
    nearest(name, dist) { hint.textContent = name ? `${name} · ${Math.round(dist)} m away` : 'Collect anything with a number'; },
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
    lift(text) { liftEl.hidden = !text; liftEl.textContent = text ?? ''; liftBtn.hidden = !text; },
    minimap: root.querySelector<HTMLCanvasElement>('#minimap')!,
  };
}
