import { type Collectible, type Destination } from './destinations';
import type { QuestState } from './quests';
import type { MeetAction } from './world';
import { store } from './store';
import { randomIcebreakers } from './chat';

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
  hurt(): void;
  hearts(): void;
  pick(p: { title: string; sub?: string; options: string[] } | null, choose?: (i: number) => void): void;
  mode(action: { icon: string; label: string; button?: boolean; arrows?: boolean; pace?: boolean; table?: 'pool' | 'carrom'; run?: boolean } | null): void;
  table(power: number, pos: number | null): void;
  meet(m: { name: string; friend: boolean; real: boolean } | null): void;
  chat(from: string, text: string, mine: boolean): void;
  friendRequest(req: { id: string; name: string } | null): void;
  net(status: 'connecting' | 'online' | 'offline', kind: 'ws' | 'local'): void;
  minimap: HTMLCanvasElement;
  bigmap: HTMLCanvasElement;
  onMapToggle(fn: (open: boolean) => void): void;
}

export interface HudActions { jump(): void; drive(): void; lift(): void; run(): void; zoom(delta: number): void; boost(held: boolean): void; refuel(): void; horn(): void; mute(): void; task(): void; befriend(): void; interact(a: MeetAction): void; say(text: string): void; answerRequest(id: string, yes: boolean): void; zombies(): void; kick(): void; batMove(dir: number): void; pace(): void; setPower(v: number): void; setPos(v: number): void; exitMode(): void }

export function renderHud(root: HTMLElement, d: Destination, points: number, actions: HudActions): Hud {
  root.innerHTML = `
  <div class="hud">
    <a class="brand top-left" href="/"><span class="logo">🌍</span><div><b>FINDURAI</b><small>ONE CITY · COUNTLESS STORIES</small></div></a>
    <div class="quest" id="quest">
      <div class="qhead"><span class="qicon">🎯</span><div><small id="qkicker">TASK</small><b id="qtitle">Looking for a task…</b></div><em id="qtime"></em></div>
      <div class="qboard" id="qboard" hidden>
        <div class="side" id="qba"><small></small><b></b><span></span></div>
        <div class="mid"><i id="qbicon">🏏</i><em id="qbtime"></em></div>
        <div class="side" id="qbb"><small></small><b></b><span></span></div>
      </div>
      <p class="qline" id="qline" hidden></p>
      <p id="qdesc">Explore while we line one up. Press T for a task right away.</p>
      <div class="qbar"><i id="qfill"></i></div>
      <div class="qfoot"><span id="qprog"></span><span id="qhint"></span><button id="qbtn">Start task</button></div>
    </div>
    <div class="top-center">
      <div class="chip big">🏆 <b id="pts">${points}</b> points</div>
      <div class="chip online" id="online"><i class="dot"></i> connecting…</div>
      <div class="row"><div class="chip rank" id="rank">🏅 Rank #–</div><div class="chip friends" id="friends">🤝 ${store.friends().length} friends</div><button class="chip zombie" id="zombiebtn" title="Zombie night (Z)">🧟 Zombie night</button></div>
    </div>
    <div class="top-right">
      <a class="round" href="/" title="All worlds">🌍</a>
      <button class="round" id="chatbtn" title="Chat (C)">💬</button>
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
      <div class="meet" id="meet" hidden>
        <div class="mhead"><div><b id="meetname"></b><small id="meetsub"></small></div><button class="mclose" id="meetclose" title="Close">✕</button></div>
        <div class="mrow" id="meetmain">
          <button data-a="friend" id="meetfriend">🤝<small>Friend</small></button>
          <button data-a="game">🎮<small>Game</small></button>
          <button data-a="hangout">🏖️<small>Hangout</small></button>
          <button data-a="gift">🎁<small>Gift</small></button>
          <button data-a="chat">💬<small>Chat</small></button>
        </div>
        <div class="ice" id="ice"><small>Ask them</small><div id="icebtns"></div><button id="icemore" title="Other questions">↻</button></div>
        <div class="mrow games" id="meetgames" hidden>
          <button data-a="race">🏁<small>Race</small></button>
          <button data-a="football">⚽<small>Football</small></button>
          <button data-a="cricket">🏏<small>Cricket</small></button>
          <button data-a="zombies">🧟<small>Zombies</small></button>
          <button data-a="hunt">💰<small>Prize hunt</small></button>
          <button data-a="pool">🎱<small>8-ball</small></button>
          <button data-a="carrom">🎯<small>Carrom</small></button>
          <button data-a="chess">♟️<small>Chess</small></button>
          <button data-a="ludo">🎲<small>Ludo</small></button>
          <button data-a="casino" class="go">🎰<small>Go to casino</small></button>
          <button data-a="back">←<small>Back</small></button>
        </div>
      </div>
      <div class="hints"><span>✨ Walk over things to collect</span><span>⌨ WASD move · Shift run/boost · Space jump · E drive · F lift · R refuel · H horn</span><span>🖱 Drag or two-finger swipe to look · wheel / pinch to zoom</span></div>
    </div>
    <div class="bottom-right">
      <div class="minimap" id="minimapbox" title="Open map"><canvas id="minimap" width="170" height="170"></canvas><span>${d.name} · tap</span></div>
      <a class="chip leave" href="/" title="Restart at the plaza">↻ Restart</a>
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
      <button class="act arrow" id="pacebtn" hidden>⚡<small>Speed</small></button>
      <button class="act arrow" id="batl" hidden>◀<small>Left</small></button>
      <button class="act arrow" id="batr" hidden>▶<small>Right</small></button>
      <button class="act kick" id="kickbtn" hidden>⚽<small>Kick</small></button>
      <button class="act exit" id="exitbtn" hidden>✕<small>Exit</small></button>
      <button class="act" id="jump">⤒<small>Jump</small></button>
      <button class="act" id="run">🏃<small>Run</small></button>
    </div>
    <div class="tablectl" id="tablectl" hidden>
      <div class="trow"><span>Aim</span><button type="button" class="tbtn" id="aiml" title="Aim left (A)">◀</button><button type="button" class="tbtn" id="aimr" title="Aim right (D)">▶</button><small>hold · Shift = fine</small></div>
      <label class="trow" id="posrow"><span>Striker</span><input type="range" id="posrng" min="0" max="100" value="50"></label>
      <label class="trow"><span>Power</span><input type="range" id="pwrrng" min="5" max="100" value="60"><b id="pwrval">60%</b></label>
      <div class="trow btns"><button type="button" class="act kick" id="strikebtn">🎱<small>Shoot</small></button><button type="button" class="act exit" id="texit" title="Leave the game (Esc)">✕<small>Exit</small></button></div>
    </div>
    <div class="freq" id="freq" hidden><b id="freqname"></b> wants to be your friend<div><button id="freqyes">Accept 🤝</button><button id="freqno">Not now</button></div></div>
    <div class="chatbox" id="chat" hidden>
      <div class="chead"><b>💬 Chat</b><small>people nearby can hear you</small><button type="button" id="cclose" title="Close">✕</button></div>
      <div class="clog" id="clog"></div>
      <form id="cform"><input id="cinput" maxlength="120" placeholder="Say something to people nearby…" autocomplete="off"><button type="submit">Send</button></form>
    </div>
    <div class="bubble" id="bubble" hidden></div>
    <div class="bigmap" id="bigmap" hidden>
      <div class="bmcard">
        <div class="bmhead"><b>🗺️ City map</b><button id="bmclose">✕</button></div>
        <canvas id="bigmapcv" width="640" height="640"></canvas>
        <div class="bmlegend"><span><i style="background:#e8c46a"></i>You</span><span><i style="background:#fff"></i>Explorers</span><span><i style="background:#e75480"></i>Friends</span><span><i style="background:#3fb7d9"></i>Vehicles</span><span><i style="background:#f27d3a"></i>Buses</span><span><i style="background:#2b7bc9"></i>Metro</span><span><i style="background:#d94a3d"></i>Petrol</span><span><i style="background:rgba(255,215,90,.6)"></i>Hidden cash</span></div>
      </div>
    </div>
    <div id="toasts"></div>
    <div id="hurt" class="hurtflash"></div>
    <div class="pick" id="pick" hidden><b id="picktitle"></b><small id="picksub"></small><div class="popts" id="pickopts"></div><button class="pcancel" id="pickcancel">Not now</button></div>
    <div class="help" id="helpbox" hidden>
      <h3>How to play</h3>
      <p><b>Move</b> W A S D or arrow keys · hold <b>Shift</b> to run (or tap the Run button to stay running) · <b>Space</b> to jump.<br><b>Look</b> drag with the mouse, or two-finger swipe on a touchpad · mouse wheel or pinch to zoom.<br><b>Drive</b> walk up to a jeep, tuk-tuk, bike or cycle and press <b>E</b> · W/S accelerate · A/D steer · Space brake · <b>Shift</b> nitro boost · <b>H</b> horn · E to get out.<br><b>People</b> walk up to any explorer and a card appears: send a <b>friend</b> request (G), start a <b>game</b> — race, football, prize hunt, 8-ball, carrom, chess or Ludo — <b>hang out</b> (they walk with you for a while) or <b>chat</b> (C opens the chat box; people nearby answer). Friends keep a 🤝 badge every time you visit.<br><b>Tasks</b> timed challenges appear in the top-left card (or press <b>T</b>): find hidden cash, dash through checkpoints, run a taxi job or gather snacks. Finish fast for up to double points.<br><b>Petrol</b> a tank lasts about 5 km (boosting burns double). When it runs dry, coast to the ⛽ station, stop, and press <b>R</b> to fill up. <b>M</b> toggles sound.<br><b>Touch</b> left half = joystick · right half = look · buttons for jump and drive.<br><b>Football</b> walk onto the City Stadium pitch and press <b>E</b> (or pick Football from an explorer's card): five-a-side, 90 seconds. Run into the ball to dribble (it sticks to your feet), <b>Space</b> / the Jump button to shoot — harder while running, and aimed toward the goal when you face it.<br><b>Cricket</b> walk onto the strip at the FindurAI Cricket Ground (Eastside) and press <b>E</b>, or pick Cricket on an explorer's card: pick 1, 2, 3 or 5 overs a side (2, 3 or 5 wickets). You bat first: press <b>Bat</b> / <b>Space</b> as the ball reaches you — perfect timing drives it for six, early pulls it high (catchable), late nicks it along the ground. Then you bowl: ◀ ▶ aim the line, <b>Speed</b> (or W/S) picks slow, medium or fast, and press <b>Bowl</b> / <b>Space</b> at the top of your action (bar in the green) for a good ball; loose balls get punished. Wickets +25, dots +5, win the match +200.<br><b>Neon Palace</b> the casino &amp; club at the end of Neon Lane: walk onto the dance floor and press <b>E</b> to dance (with whoever is with you), or press <b>E</b> at a pool table for real 8-ball — ◀ ▶ / A D aim (Shift for fine aim), the Power slider or W/S sets the strength, <b>Shoot</b> strikes. Press <b>E</b> at the carrom board by the bar: the Striker slider or Q/E slides the striker along your baseline, ◀ ▶ aim, Power slider or W/S, <b>Flick</b>. <b>Exit</b> (or Esc) leaves any game. Lasers, DJ, bar, slots.<br><b>Dates</b> press <b>E</b> with someone at the coffee table at Chai Corner, the pier bench, the candle-lit table on the sand, the campfire, the sunset bench at the lighthouse, the Sunset Wheel or the marina boat. <b>Gift</b> on any card sends a rose, ice cream, chai, teddy, chocolate or a note.<br><b>Zombie night</b> press <b>Z</b> or the 🧟 chip: waves of zombies shamble toward you — walkers, headless ones, runners, crawlers, hoppers that leap at you, bloaters that burst in a cloud, and brutes that take a beating and hit like a truck. <b>Space</b> / Jump punches the one in front of you (three hits each), vehicles crush them. Every bite drains your ❤ health — clear a wave to heal, die and you wake up back downtown.<br><b>Lifts</b> while driving slowly next to an explorer press <b>F</b> to pick them up, F again to drop them off for +30.<br><b>Collect</b> walk (or drive) over any floating item with a number.</p>
      <p>${d.blurb}</p>
      <div class="me" id="mecard"></div>
      <button id="closehelp">Got it</button> <button id="changeavatar" class="ghost">🧍 Change my explorer</button>
      <p class="helplinks"><a href="/about/">About FindurAI</a> · <a href="/games/">All games</a> · <a href="/little-kerala/">For Little Kerala players</a></p>
    </div>
  </div>`;

  const pts = root.querySelector('#pts')!;
  const online = root.querySelector<HTMLElement>('#online')!;
  const toasts = root.querySelector('#toasts')!;
  const helpbox = root.querySelector<HTMLElement>('#helpbox')!;
  const promptEl = root.querySelector<HTMLElement>('#prompt')!;
  const driveBtn = root.querySelector<HTMLButtonElement>('#drive')!;
  const jumpBtn = root.querySelector<HTMLButtonElement>('#jump')!;
  const press = (btn: HTMLElement, fn: () => void) => btn.addEventListener('pointerdown', (e) => { e.preventDefault(); fn(); });
  press(jumpBtn, actions.jump);
  const kickBtn = root.querySelector<HTMLButtonElement>('#kickbtn')!;
  press(kickBtn, actions.kick);
  const batL = root.querySelector<HTMLButtonElement>('#batl')!, batR = root.querySelector<HTMLButtonElement>('#batr')!, paceBtn = root.querySelector<HTMLButtonElement>('#pacebtn')!;
  press(paceBtn, actions.pace);
  const aimL = root.querySelector<HTMLButtonElement>('#aiml')!, aimR = root.querySelector<HTMLButtonElement>('#aimr')!;
  for (const [btn, dir] of [[batL, -1], [batR, 1], [aimL, -1], [aimR, 1]] as const) { btn.addEventListener('pointerdown', (e) => { e.preventDefault(); actions.batMove(dir); }); for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) btn.addEventListener(ev, () => actions.batMove(0)); }
  // table games: sliders for power and striker position, Shoot / Flick, Exit
  const tableEl = root.querySelector<HTMLElement>('#tablectl')!, posRow = root.querySelector<HTMLElement>('#posrow')!, posRng = root.querySelector<HTMLInputElement>('#posrng')!, pwrRng = root.querySelector<HTMLInputElement>('#pwrrng')!, pwrVal = root.querySelector<HTMLElement>('#pwrval')!, strikeBtn = root.querySelector<HTMLButtonElement>('#strikebtn')!, exitBtn = root.querySelector<HTMLButtonElement>('#exitbtn')!;
  let sliding = false, modeOn = false, modeRun = false;
  for (const r of [posRng, pwrRng]) { r.addEventListener('pointerdown', () => (sliding = true)); for (const ev of ['pointerup', 'pointercancel']) r.addEventListener(ev, () => { sliding = false; r.blur(); }); r.addEventListener('change', () => r.blur()); }
  pwrRng.addEventListener('input', () => { pwrVal.textContent = `${pwrRng.value}%`; actions.setPower(+pwrRng.value / 100); });
  posRng.addEventListener('input', () => actions.setPos(+posRng.value / 100));
  press(strikeBtn, actions.kick);
  press(exitBtn, actions.exitMode); press(root.querySelector('#texit')!, actions.exitMode);
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
  // meet card
  const meetEl = root.querySelector<HTMLElement>('#meet')!, meetName = root.querySelector<HTMLElement>('#meetname')!;
  let dismissed = '';
  root.querySelector('#meetclose')!.addEventListener('click', (e) => { e.stopPropagation(); dismissed = meetName.textContent ?? ''; meetEl.hidden = true; });
  const meetMain = root.querySelector<HTMLElement>('#meetmain')!, meetGames = root.querySelector<HTMLElement>('#meetgames')!;
  const meetFriend = root.querySelector<HTMLElement>('#meetfriend')!;
  // stop the tap reaching the world canvas (which would start a camera drag), then act on release
  meetEl.addEventListener('pointerdown', (e) => { e.stopPropagation(); const b = (e.target as HTMLElement).closest('button'); if (b) b.classList.add('pressed'); });
  meetEl.addEventListener('pointercancel', () => meetEl.querySelectorAll('.pressed').forEach((b) => b.classList.remove('pressed')));
  // icebreakers: three openers on the card; tapping one says it out loud
  const iceBtns = root.querySelector<HTMLElement>('#icebtns')!;
  const rollIce = () => { iceBtns.innerHTML = ''; for (const q of randomIcebreakers(3)) { const b = document.createElement('button'); b.className = 'iceq'; b.textContent = q; b.addEventListener('click', (e) => { e.stopPropagation(); actions.say(q); rollIce(); }); iceBtns.appendChild(b); } };
  root.querySelector('#icemore')!.addEventListener('click', (e) => { e.stopPropagation(); rollIce(); });
  meetEl.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('button') as HTMLElement | null;
    if (btn && (btn.classList.contains('iceq') || btn.id === 'icemore' || btn.id === 'meetclose')) return;
    meetEl.querySelectorAll('.pressed').forEach((b) => b.classList.remove('pressed'));
    if (!btn) return;
    e.preventDefault();
    const a = btn.dataset.a!;
    const iceRow = root.querySelector<HTMLElement>('#ice')!;
    if (a === 'game') { meetMain.hidden = true; meetGames.hidden = false; iceRow.hidden = true; return; }
    if (a === 'back') { meetMain.hidden = false; meetGames.hidden = true; iceRow.hidden = false; return; }
    meetMain.hidden = false; meetGames.hidden = true; iceRow.hidden = false;
    if (a === 'chat') { chatEl.hidden = false; cinput.focus(); }
    actions.interact(a as MeetAction);
  });
  // friend requests from real players
  const freq = root.querySelector<HTMLElement>('#freq')!, freqName = root.querySelector<HTMLElement>('#freqname')!;
  let freqId = '';
  root.querySelector('#freqyes')!.addEventListener('click', () => actions.answerRequest(freqId, true));
  root.querySelector('#freqno')!.addEventListener('click', () => actions.answerRequest(freqId, false));
  // chat
  const chatEl = root.querySelector<HTMLElement>('#chat')!, clog = root.querySelector<HTMLElement>('#clog')!;
  const cinput = root.querySelector<HTMLInputElement>('#cinput')!, bubble = root.querySelector<HTMLElement>('#bubble')!;
  let bubbleTimer = 0;
  root.querySelector('#chatbtn')!.addEventListener('click', () => { chatEl.hidden = !chatEl.hidden; if (!chatEl.hidden) cinput.focus(); });
  root.querySelector('#cclose')!.addEventListener('click', () => { chatEl.hidden = true; cinput.blur(); });
  root.querySelector<HTMLFormElement>('#cform')!.addEventListener('submit', (e) => { e.preventDefault(); const v = cinput.value; cinput.value = ''; if (v.trim()) actions.say(v); });
  cinput.addEventListener('keydown', (e) => { if (e.key === 'Escape') { chatEl.hidden = true; cinput.blur(); } e.stopPropagation(); });
  addEventListener('keydown', (e) => { if (e.key.toLowerCase() === 'c' && (e.target as HTMLElement).tagName !== 'INPUT') { chatEl.hidden = !chatEl.hidden; if (!chatEl.hidden) cinput.focus(); } });
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
  const qBoard = root.querySelector<HTMLElement>('#qboard')!, qLine = root.querySelector<HTMLElement>('#qline')!, qbIcon = root.querySelector<HTMLElement>('#qbicon')!, qbTime = root.querySelector<HTMLElement>('#qbtime')!;
  const qSide = (id: string, s: { name: string; score: string; sub?: string; on?: boolean }) => { const el = root.querySelector<HTMLElement>(id)!; el.classList.toggle('on', !!s.on); el.querySelector('small')!.textContent = s.name; el.querySelector('b')!.textContent = s.score; el.querySelector('span')!.textContent = s.sub ?? ''; };
  qBtn.addEventListener('click', actions.task);
  const zombieBtn = root.querySelector<HTMLButtonElement>('#zombiebtn')!, hurtEl = root.querySelector<HTMLElement>('#hurt')!;
  zombieBtn.addEventListener('click', actions.zombies);
  let hurtT = 0;
  root.querySelector('#help')!.addEventListener('click', () => (helpbox.hidden = !helpbox.hidden));
  root.querySelector('#closehelp')!.addEventListener('click', () => (helpbox.hidden = true));
  root.querySelector('#changeavatar')!.addEventListener('click', () => { store.clearGender(); location.reload(); });
  const meCard = root.querySelector<HTMLElement>('#mecard')!;
  const renderMe = () => {
    const gifts = store.gifts();
    const counts = new Map<string, number>(); for (const g of gifts) counts.set(g.gift, (counts.get(g.gift) ?? 0) + 1);
    meCard.innerHTML = `<b>${store.name()}</b> · ${store.gender() === 'f' ? 'she/her' : 'he/him'} · ${store.points().toLocaleString()} pts · ${store.friends().length} friends
      <div class="gifts">${gifts.length ? [...counts.entries()].map(([g, n]) => `<span>${g}<i>${n}</i></span>`).join('') : '<em>No gifts yet — someone will get round to it.</em>'}</div>
      ${gifts.length ? `<small>Latest: ${gifts.slice(-3).reverse().map((g) => `${g.gift} from ${g.from}`).join(' · ')}</small>` : ''}
      <small>Dates: ${store.dates().length} of 7 spots · gifts sent: ${store.giftsSent()}</small>`;
  };
  root.querySelector('#help')!.addEventListener('click', renderMe);

  return {
    points(n) { pts.textContent = String(n); pts.parentElement!.classList.remove('pop'); void (pts.parentElement as HTMLElement).offsetWidth; pts.parentElement!.classList.add('pop'); },
    collect(item) {
      const t = document.createElement('div');
      t.className = 'toast';
      t.style.setProperty('--c', hex(item.color));
      t.innerHTML = `${item.points === 0 ? '' : `${item.points < 0 ? '' : '+'}${item.points} `}<span>${item.name}</span>`;
      if (item.points < 0) t.classList.add('bad');
      toasts.appendChild(t);
      setTimeout(() => t.remove(), 1600);
    },
    online(n) { online.innerHTML = `<i class="dot"></i> ${n === 1 ? 'Only you here right now — invite a friend' : `${n} here right now`}`; },
    nearest() { /* the old 'where to next' card is gone; kept for the event signature */ },
    prompt(text, driving) {
      promptEl.hidden = !text;
      promptEl.textContent = text ?? '';
      promptEl.classList.toggle('driving', driving);
      driveBtn.hidden = !text || document.body.classList.contains('inmode');   // Drive doubles as E; useless mid-game
      driveBtn.innerHTML = driving ? '🚶<small>Get out</small>' : '🚗<small>Drive</small>';
      jumpBtn.hidden = driving || modeOn;                 // mid-game the mode() rules win
      runBtn.hidden = driving || (modeOn && !modeRun);
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
      questEl.className = `quest ${q?.status ?? 'idle'}${q?.board ? ' scorecard' : ''}`;
      qBoard.hidden = qLine.hidden = !q?.board; document.body.classList.toggle('scorecard', !!q?.board);
      if (q?.board) { const b = q.board; qbIcon.textContent = b.icon; qbTime.textContent = q.timeText ?? ''; qSide('#qba', b.a); qSide('#qbb', b.b); qLine.textContent = b.line; }
      if (!q) {
        qKick.textContent = 'TASK'; qTitle.textContent = 'Looking for a task…'; qTime.textContent = '';
        qDesc.textContent = 'Explore while we line one up. Press T for a task right away.';
        qFill.style.width = '0%'; qProg.textContent = ''; qHint.textContent = ''; qBtn.hidden = false;
        return;
      }
      const m = Math.floor(q.remaining / 60), s = Math.floor(q.remaining % 60);
      qKick.textContent = q.status === 'active' ? `TASK · +${q.reward} pts` : q.status === 'done' ? 'TASK COMPLETE' : 'TIME\'S UP';
      qTitle.textContent = q.title;
      qTime.textContent = q.timeText ?? (q.status === 'active' ? `${m}:${s.toString().padStart(2, '0')}` : q.status === 'done' ? '✔' : '✖');
      qDesc.textContent = q.desc;
      qFill.style.width = `${Math.min(100, q.fill !== undefined ? q.fill * 100 : (q.remaining / q.total) * 100)}%`;
      qFill.classList.toggle('urgent', q.status === 'active' && (q.fill !== undefined ? q.fill < 0.2 : q.remaining < 15));
      qProg.textContent = q.progress;
      qHint.textContent = q.hint ? `➜ ${q.hint}` : '';
      qBtn.hidden = q.status === 'active';
      qBtn.textContent = 'Next task';
    },
    lift(text) {
      liftEl.hidden = !text; liftEl.textContent = text ?? '';
      const isFriend = !!text && text.includes('friend request');
      liftBtn.hidden = !text || isFriend || text.startsWith('City limits');
      friendBtn.hidden = !text || !isFriend;
    },
    friends(n) { friendsChip.textContent = `🤝 ${n} friends`; },
    meet(m) {
      meetEl.classList.toggle('real', !!m?.real);
      if (!m) dismissed = '';
      meetEl.hidden = !m || dismissed === m.name;
      meetMain.hidden = false; meetGames.hidden = true; root.querySelector<HTMLElement>('#ice')!.hidden = false;
      if (!m) return;
      meetName.textContent = m.name;
      root.querySelector<HTMLElement>('#meetsub')!.textContent = m.real ? (m.friend ? 'Real player · your friend' : 'Real player · say hi') : m.friend ? 'Local · your friend' : 'Local explorer';
      meetFriend.hidden = m.friend;
      if (meetEl.dataset.who !== m.name) { meetEl.dataset.who = m.name; rollIce(); }
    },
    friendRequest(req) { freq.hidden = !req; if (req) { freqId = req.id; freqName.textContent = req.name; } },
    net(status, kind) {
      online.dataset.net = status;
      online.title = kind === 'ws' ? (status === 'online' ? 'Connected — friends can see you' : status === 'connecting' ? 'Connecting…' : 'Offline — reconnecting') : 'Local mode: other tabs of this browser can see you';
    },
    chat(from, text, mine) {
      const row = document.createElement('div');
      row.className = `cmsg ${mine ? 'mine' : from ? '' : 'sys'}`;
      row.innerHTML = from ? `<b>${from}</b> ${text}` : text;
      clog.appendChild(row);
      while (clog.children.length > 40) clog.firstElementChild!.remove();
      clog.scrollTop = clog.scrollHeight;
      if (!mine && chatEl.hidden) {
        bubble.textContent = from ? `${from}: ${text}` : text;
        bubble.hidden = false;
        clearTimeout(bubbleTimer);
        bubbleTimer = window.setTimeout(() => (bubble.hidden = true), 4000);
      }
    },
    rank(r, of) { rankChip.textContent = `🏅 Rank #${r.toLocaleString()} of ${of.toLocaleString()}`; rankChip.classList.toggle('top', r <= 10); },
    mode(a) {
      const tbl = a?.table; modeOn = !!a; modeRun = !!a?.run;
      kickBtn.hidden = !a || a.button === false || !!tbl; if (a && a.button !== false) (tbl ? strikeBtn : kickBtn).innerHTML = `${a.icon}<small>${a.label}</small>`;
      batL.hidden = batR.hidden = !a?.arrows || !!tbl; paceBtn.hidden = !a?.pace;
      exitBtn.hidden = !a || !!tbl; jumpBtn.hidden = !!a; runBtn.hidden = !!a && !a.run;
      tableEl.hidden = !tbl; posRow.hidden = tbl !== 'carrom';
      document.body.classList.toggle('inmode', !!a); document.body.classList.toggle('tablemode', !!tbl);
    },
    table(power, pos) { if (sliding) return; pwrRng.value = String(Math.round(power * 100)); pwrVal.textContent = `${pwrRng.value}%`; if (pos !== null) posRng.value = String(Math.round(pos * 100)); },
    pick(p, choose) {
      const el = root.querySelector<HTMLElement>('#pick')!, opts = root.querySelector<HTMLElement>('#pickopts')!;
      el.hidden = !p;
      if (!p) return;
      root.querySelector<HTMLElement>('#picktitle')!.textContent = p.title;
      root.querySelector<HTMLElement>('#picksub')!.textContent = p.sub ?? '';
      opts.innerHTML = '';
      p.options.forEach((o, i) => { const b = document.createElement('button'); b.textContent = o; b.addEventListener('click', () => { el.hidden = true; choose?.(i); }); opts.appendChild(b); });
      root.querySelector<HTMLElement>('#pickcancel')!.onclick = () => { el.hidden = true; };
    },
    hearts() { const h = document.createElement('div'); h.className = 'hearts'; for (let i = 0; i < 9; i++) { const e = document.createElement('i'); e.textContent = ['💖', '💗', '💕', '✨'][i % 4]; e.style.setProperty('--dx', `${(i - 4) * 28}px`); e.style.animationDelay = `${i * 60}ms`; h.appendChild(e); } root.appendChild(h); setTimeout(() => h.remove(), 1900); },
    hurt() { hurtEl.classList.add('on'); clearTimeout(hurtT); hurtT = window.setTimeout(() => hurtEl.classList.remove('on'), 180); },
    minimap: root.querySelector<HTMLCanvasElement>('#minimap')!,
    bigmap: root.querySelector<HTMLCanvasElement>('#bigmapcv')!,
    onMapToggle(fn) { const box = root.querySelector<HTMLElement>('#bigmap')!; const open = () => { box.hidden = false; fn(true); }; const close = () => { box.hidden = true; fn(false); }; root.querySelector('#minimapbox')!.addEventListener('click', open); root.querySelector('#bmclose')!.addEventListener('click', close); box.addEventListener('click', (e) => { if (e.target === box) close(); }); },
  };
}
