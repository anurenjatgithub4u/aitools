// Shared overlay for the mini-games: header with both players and whose turn it is,
// a board slot, a status line, and a result panel with rematch. Each game fills `board`.

export interface Arena {
  board: HTMLElement;
  setTurn(who: 'you' | 'bot'): void;
  setStatus(text: string): void;
  setScore(you: string, bot: string): void;
  finish(win: boolean | null, why: string, points: number): void;
  close(): void;
  readonly over: boolean;
}

export interface ArenaOpts {
  host: HTMLElement;
  icon: string;
  title: string;
  you: string;
  opponent: string;
  hint: string;
  onDone(win: boolean | null): void;
  onRematch(): void;
}

const initials = (n: string) => n.trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

export function openArena(o: ArenaOpts): Arena {
  const root = document.createElement('div');
  root.className = 'arena';
  root.innerHTML = `
    <div class="acard">
      <div class="ahead">
        <div class="atitle"><span>${o.icon}</span><b>${o.title}</b></div>
        <div class="aplayers">
          <div class="ap you" id="ap-you"><i style="background:#e8c46a;color:#17332b">${initials(o.you)}</i><div><b>${o.you}</b><small id="ascore-you">you</small></div></div>
          <span class="avs">vs</span>
          <div class="ap bot" id="ap-bot"><i style="background:#e75480">${initials(o.opponent)}</i><div><b>${o.opponent}</b><small id="ascore-bot">rival</small></div></div>
        </div>
        <button class="aquit" id="aquit">✕</button>
      </div>
      <div class="aboard" id="aboard"></div>
      <div class="astatus" id="astatus">${o.hint}</div>
      <div class="aend" id="aend" hidden>
        <div class="aemoji" id="aemoji"></div>
        <h3 id="atitle2"></h3>
        <p id="asub"></p>
        <div class="abtns"><button id="arematch">Rematch</button><button class="primary" id="aback">Back to the city</button></div>
      </div>
    </div>`;
  o.host.appendChild(root);
  const $ = <T extends HTMLElement>(id: string) => root.querySelector<T>('#' + id)!;
  const apYou = $('ap-you'), apBot = $('ap-bot'), status = $('astatus'), end = $('aend');
  let over = false;
  const close = () => { root.remove(); };
  const arena: Arena = {
    board: $('aboard'),
    get over() { return over; },
    setTurn(who) { apYou.classList.toggle('on', who === 'you'); apBot.classList.toggle('on', who === 'bot'); },
    setStatus(t) { status.textContent = t; },
    setScore(y, b) { $('ascore-you').textContent = y; $('ascore-bot').textContent = b; },
    finish(win, why, points) {
      if (over) return;
      over = true;
      end.hidden = false;
      $('aemoji').textContent = win === null ? '🤝' : win ? '🏆' : '😅';
      $('atitle2').textContent = win === null ? 'Draw' : win ? 'You win!' : `${o.opponent} wins`;
      $('asub').textContent = why + (win ? ` · +${points} points` : '');
      apYou.classList.remove('on'); apBot.classList.remove('on');
      o.onDone(win);
    },
    close,
  };
  arena.setTurn('you');
  $('aquit').addEventListener('click', () => { if (!over) { over = true; o.onDone(false); } close(); });
  $('aback').addEventListener('click', close);
  $('arematch').addEventListener('click', () => { close(); o.onRematch(); });
  return arena;
}
