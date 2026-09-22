'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import './monopoly.css';
import { BOARD, COLOR_GROUP_SIZES } from './engine/board';
import { buildInitialState, useGameState } from './engine/useGameState';
import type { GameState, Player, Square } from './engine/types';
import dynamic from 'next/dynamic';
const MonoCity = dynamic(() => import('./MonoCity'), { ssr: false });

// ─── Color map ────────────────────────────────────────────────────────────────
const COLOR_CSS: Record<string, string> = {
  brown: '#8B4513', light_blue: '#87CEEB', pink: '#FF69B4', orange: '#FF8C00',
  red: '#DC143C', yellow: '#FFD700', green: '#228B22', dark_blue: '#00008B',
  railroad: '#1a1a1a', utility: '#4a4a6a',
};

// ─── Board square positions (pixel coords as %) ───────────────────────────────
// The board is an 11x11 grid with big corners; square 0 (GO) sits bottom-right.
// We map each square ID (0–39) to { col, row } in the CSS grid (1-indexed)
function squareToGrid(id: number): { col: number; row: number } {
  // Bottom row: 0–10 (right to left)
  if (id <= 10) return { col: 11 - id, row: 11 };
  // Left col: 11–19 (bottom to top)
  if (id <= 19) return { col: 1, row: 11 - (id - 10) };
  // Top row: 20–30 (left to right)
  if (id <= 30) return { col: 1 + (id - 20), row: 1 };
  // Right col: 31–39 (top to bottom)
  return { col: 11, row: 2 + (id - 31) };
}

// ─── Confetti ─────────────────────────────────────────────────────────────────
function Confetti() {
  const pieces = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    color: ['#f0c040', '#ff4757', '#2ed573', '#1e90ff', '#ff6b81', '#eccc68'][i % 6],
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 2}s`,
    duration: `${2 + Math.random() * 3}s`,
    size: `${6 + Math.random() * 8}px`,
  }));
  return (
    <div className="mono-confetti-wrap">
      {pieces.map(p => (
        <div key={p.id} className="mono-confetti" style={{ left: p.left, animationDelay: p.delay, animationDuration: p.duration, background: p.color, width: p.size, height: p.size }} />
      ))}
    </div>
  );
}

// ─── Dice ─────────────────────────────────────────────────────────────────────
// a real cube: six faces with pips, spun by CSS so the rolled value ends face-up
const FACE_ROT: Record<number, string> = { 1: 'rotateX(0deg) rotateY(0deg)', 2: 'rotateX(-90deg) rotateY(0deg)', 3: 'rotateY(-90deg)', 4: 'rotateY(90deg)', 5: 'rotateX(90deg)', 6: 'rotateY(180deg)' };
const PIPS: Record<number, [number, number][]> = { 1: [[50, 50]], 2: [[25, 25], [75, 75]], 3: [[25, 25], [50, 50], [75, 75]], 4: [[25, 25], [75, 25], [25, 75], [75, 75]], 5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]], 6: [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]] };
function Face({ n, cls }: { n: number; cls: string }) { return <div className={`mono-face ${cls}`}>{PIPS[n].map(([x, y], i) => <i key={i} style={{ left: `${x}%`, top: `${y}%` }} />)}</div>; }
function Dice({ dice, rolling, doubles }: { dice: [number, number]; rolling: boolean; doubles: boolean }) {
  return (
    <div className="mono-dice-wrap">
      {dice.map((d, i) => (
        <div key={i} className={`mono-die3d${rolling ? ' rolling' : ''}${doubles ? ' doubles' : ''}`} style={{ transform: rolling ? undefined : `${FACE_ROT[d || 1]} rotateZ(${i ? -8 : 6}deg)` }}>
          <div className="mono-cube" style={{ animationDelay: i ? '.06s' : '0s' }}>
            <Face n={1} cls="f1" /><Face n={6} cls="f6" /><Face n={2} cls="f2" /><Face n={5} cls="f5" /><Face n={3} cls="f3" /><Face n={4} cls="f4" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Property detail panel ─────────────────────────────────────────────────────
function PropPanel({ state, playerId, onBuild, onSell, onMortgage, onUnmortgage }: {
  state: GameState; playerId: string;
  onBuild: (id: number) => void; onSell: (id: number) => void;
  onMortgage: (id: number) => void; onUnmortgage: (id: number) => void;
}) {
  const player = state.players.find(p => p.id === playerId)!;
  const myProps = state.properties.filter(p => p.ownerId === playerId);
  if (!myProps.length) return <p style={{ fontSize: '.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>No properties yet</p>;

  const canBuild = (squareId: number) => {
    const sq = BOARD[squareId];
    const prop = state.properties.find(p => p.squareId === squareId)!;
    if (prop.mortgaged || prop.houses >= 5) return false;
    if (!sq.color || !sq.housePrice) return false;
    const groupSize = COLOR_GROUP_SIZES[sq.color];
    const owned = state.properties.filter(p => p.ownerId === playerId && BOARD[p.squareId].color === sq.color).length;
    return owned === groupSize && player.money >= sq.housePrice;
  };

  return (
    <div className="mono-prop-panel">
      <h4>🏠 Properties</h4>
      {myProps.map(prop => {
        const sq = BOARD[prop.squareId];
        return (
          <div key={prop.squareId} className="mono-prop-item">
            <span className="mono-prop-item-name" style={{ borderLeft: `3px solid ${COLOR_CSS[sq.color ?? 'railroad']}`, paddingLeft: 5 }}>
              {prop.mortgaged ? '🔒 ' : ''}{sq.flag ? <img className="mono-prop-flag" src={`/flags/${sq.flag}.png`} alt="" /> : sq.icon ? `${sq.icon} ` : ''}{sq.name.replace(' Airport', '')}
              {prop.houses > 0 && prop.houses < 5 && ` ${prop.houses}🏠`}
              {prop.houses === 5 && ' 🏨'}
            </span>
            <div className="mono-prop-item-btns">
              {sq.housePrice && !prop.mortgaged && <button className="mono-prop-mini-btn" disabled={!canBuild(prop.squareId)} onClick={() => onBuild(prop.squareId)} title="Build">+🏠</button>}
              {prop.houses > 0 && <button className="mono-prop-mini-btn" onClick={() => onSell(prop.squareId)} title="Sell house">-🏠</button>}
              {!prop.mortgaged && prop.houses === 0 && <button className="mono-prop-mini-btn" onClick={() => onMortgage(prop.squareId)} title="Mortgage">💰</button>}
              {prop.mortgaged && <button className="mono-prop-mini-btn" onClick={() => onUnmortgage(prop.squareId)} title="Unmortgage" disabled={player.money < Math.ceil((BOARD[prop.squareId].mortgage ?? 0) * 1.1)}>↩️</button>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Player Card ──────────────────────────────────────────────────────────────
function PlayerCard({ player, isActive, state, onBuild, onSell, onMortgage, onUnmortgage }: {
  player: Player; isActive: boolean; state: GameState;
  onBuild: (id: number) => void; onSell: (id: number) => void;
  onMortgage: (id: number) => void; onUnmortgage: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={`mono-player-card${isActive ? ' active' : ''}${player.isBankrupt ? ' bankrupt' : ''}`}>
      <div className="mono-player-header">
        <span className="mono-player-token" style={{ background: player.color }}>{player.token}</span>
        <div>
          <div className="mono-player-name" style={{ color: player.color }}>{player.name}</div>
          <div className="mono-player-status">
            {player.isBankrupt ? '💀 Bankrupt' : player.inJail ? '🚔 In Jail' : isActive ? '🎯 Playing' : 'Waiting'}
          </div>
        </div>
      </div>
      <div className="mono-player-money">${player.money.toLocaleString()}</div>
      <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '.75rem', cursor: 'pointer', padding: 0, marginBottom: 6 }}
        onClick={() => setExpanded(e => !e)}>
        {expanded ? '▲ Hide properties' : '▼ Show properties'}
      </button>
      {expanded && (
        <PropPanel state={state} playerId={player.id} onBuild={onBuild} onSell={onSell} onMortgage={onMortgage} onUnmortgage={onUnmortgage} />
      )}
    </div>
  );
}

// ─── Board Square ─────────────────────────────────────────────────────────────
function BoardSquare({ sq, state }: { sq: Square; state: GameState }) {
  const prop = state.properties.find(p => p.squareId === sq.id);
  const owner = prop?.ownerId ? state.players.find(p => p.id === prop.ownerId) : null;

  const corners: Record<number, string> = { 0: '🚀\nGO', 10: '🚔\nJAIL', 20: '🅿️\nFREE\nPARKING', 30: '👮\nGO TO\nJAIL' };

  if ([0, 10, 20, 30].includes(sq.id)) {
    return (
      <div className="mono-sq mono-sq-corner">
        <div style={{ whiteSpace: 'pre-line', textAlign: 'center', lineHeight: 1.2, fontSize: 'clamp(8px,1.3vw,13px)' }}>
          {corners[sq.id]}
        </div>
      </div>
    );
  }

  const isBottomRow = sq.id >= 1 && sq.id <= 9;
  const isLeftCol   = sq.id >= 11 && sq.id <= 19;
  const isTopRow    = sq.id >= 21 && sq.id <= 29;
  const isRightCol  = sq.id >= 31 && sq.id <= 39;

  const colorBandStyle: React.CSSProperties = sq.color ? { background: COLOR_CSS[sq.color] } : {};
  const colorBand = sq.color ? <div className="mono-sq-color" style={colorBandStyle} /> : null;

  let rotate = 0;
  if (isLeftCol)  rotate = 90;
  if (isTopRow)   rotate = 180;
  if (isRightCol) rotate = 270;

  return (
    <div className={`mono-sq${prop?.mortgaged ? ' mortgaged' : ''}${isLeftCol ? ' side left' : isRightCol ? ' side right' : ''}`}
      style={isTopRow ? { transform: 'rotate(180deg)' } : undefined}>
      {isBottomRow && colorBand}
      {sq.flag ? <img className="mono-sq-flag" src={`/flags/${sq.flag}.png`} alt="" draggable={false} /> : sq.icon && <div className="mono-sq-icon">{sq.icon}</div>}
      <div className="mono-sq-name">{sq.name.replace(' Airport', '')}</div>
      {sq.price && <div className="mono-sq-price">${sq.price}</div>}
      {!isBottomRow && colorBand}
      {prop && prop.houses > 0 && (
        <div className="mono-sq-houses" style={{ transform: `rotate(${-rotate}deg)` }}>
          {prop.houses === 5
            ? <div className="mono-hotel"><i /></div>
            : Array.from({ length: prop.houses }, (_, i) => <div key={i} className="mono-house"><i /></div>)
          }
        </div>
      )}
      {owner && <div className="mono-sq-owner" style={{ background: owner.color }} />}
    </div>
  );
}

// ─── Card Modal ───────────────────────────────────────────────────────────────
function CardModal({ state, onDismiss, who }: { state: GameState; onDismiss: () => void; who?: string }) {
  const card = state.lastCard;
  if (!card || state.phase !== 'card') return null;

  const action = card.action;
  let amount = 0;
  let isEarn = false;
  if (action.type === 'collect') { amount = action.amount; isEarn = true; }
  if (action.type === 'pay') { amount = -action.amount; }
  if (action.type === 'collect_from_players') { isEarn = true; }

  return (
    <div className="mono-modal-bg" onClick={onDismiss}>
      <div className="mono-modal" onClick={e => e.stopPropagation()}>
        <div className="mono-modal-icon">{card.deck === 'chance' ? '🃏' : '📦'}</div>
        <div className="mono-modal-deck">{who && who !== 'You' ? `${who} draws · ` : ''}{card.deck === 'chance' ? 'Chance' : 'Community Chest'}</div>
        <div className="mono-modal-text">{card.text}</div>
        {amount !== 0 && (
          <div className={`mono-modal-amount ${isEarn ? 'earn' : 'pay'}`}>
            {isEarn ? '+' : ''}{amount < 0 ? `-$${Math.abs(amount)}` : `$${amount}`}
          </div>
        )}
        <button className="mono-btn primary" onClick={onDismiss}>OK</button>
      </div>
    </div>
  );
}

// ─── Buy Modal ────────────────────────────────────────────────────────────────
function BuyModal({ state, onBuy, onDecline }: { state: GameState; onBuy: () => void; onDecline: () => void }) {
  if (state.phase !== 'buying') return null;
  const cur = state.players[state.currentPlayerIndex];
  const sq = BOARD[cur.position];
  const canAfford = cur.money >= (sq.price ?? 0);

  return (
    <div className="mono-modal-bg">
      <div className="mono-modal mono-buy-modal">
        <div className="mono-modal-icon">{sq.flag ? <img className="mono-modal-flag" src={`/flags/${sq.flag}.png`} alt="" /> : (sq.icon ?? '🏙️')}</div>
        {sq.color && <div className="mono-buy-color-band" style={{ background: COLOR_CSS[sq.color] }} />}
        <div className="mono-modal-deck">{sq.type === 'railroad' ? '✈️ Airport' : sq.type === 'utility' ? '⚙️ Utility' : '🌍 Country'}</div>
        <div className="mono-modal-text" style={{ fontWeight: 700, fontSize: '1.2rem' }}>{sq.name}</div>
        <div className="mono-buy-detail">
          <div className="mono-buy-row"><span>Price</span><span>${sq.price}</span></div>
          {sq.rent && <div className="mono-buy-row"><span>Base rent</span><span>${sq.rent[0]}</span></div>}
          {sq.rent && <div className="mono-buy-row"><span>With hotel</span><span>${sq.rent[5]}</span></div>}
          {sq.railroadRent && <div className="mono-buy-row"><span>Rent (1 airport)</span><span>${sq.railroadRent[0]}</span></div>}
          <div className="mono-buy-row"><span>Your money</span><span>${cur.money}</span></div>
          {!canAfford && <div style={{ color: 'var(--red)', fontSize: '.8rem', textAlign: 'center' }}>⚠️ Not enough money!</div>}
        </div>
        <div className="mono-buy-btns">
          <button className="mono-btn primary" disabled={!canAfford} onClick={onBuy}>Buy for ${sq.price}</button>
          <button className="mono-btn danger"  onClick={onDecline}>Pass</button>
        </div>
      </div>
    </div>
  );
}

// ─── Token Layer ──────────────────────────────────────────────────────────────
// Tokens hop square by square toward where the engine put them; `onSettled` fires once everyone has arrived.
const HOP_MS = 150;
function useTokenPositions(state: GameState, onSettled: () => void) {
  const [shown, setShown] = useState<Record<string, number>>(() => Object.fromEntries(state.players.map(p => [p.id, p.position])));
  const [hopping, setHopping] = useState<string | null>(null);
  const settled = useRef(onSettled); settled.current = onSettled;
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      let cur = { ...shown };
      for (const p of state.players) {
        if (cur[p.id] === undefined) cur[p.id] = p.position;
        while (cur[p.id] !== p.position && !cancelled) {
          const from = cur[p.id], to = p.position;
          const fwd = (to - from + 40) % 40, back = (from - to + 40) % 40;
          const jump = (from === 30 && to === 10) || fwd > 12 && back > 4;   // sent to jail / teleported: no lap around the board
          const next = jump ? to : back <= 3 ? (from + 39) % 40 : (from + 1) % 40;
          cur = { ...cur, [p.id]: next };
          setShown(cur); setHopping(p.id);
          await new Promise(r => setTimeout(r, jump ? 420 : HOP_MS));
        }
      }
      if (!cancelled) { setHopping(null); settled.current(); }
    };
    run();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.players.map(p => p.position).join(',')]);
  return { shown, hopping };
}

function TokenLayer({ state, shown, hopping }: { state: GameState; shown: Record<string, number>; hopping: string | null }) {
  const BOARD_SIZE = 560;
  const CORNER = 80;
  const CELL = (BOARD_SIZE - CORNER * 2) / 9;

  function getTokenPosition(playerId: string): { top: number; left: number } {
    const player = state.players.find(p => p.id === playerId)!;
    const pos = shown[playerId] ?? player.position;
    const { col, row } = squareToGrid(pos);
    // Convert grid col/row (1-11) to pixel position within the board
    const getX = (c: number) => c === 1 ? 0 : c === 11 ? BOARD_SIZE - CORNER : CORNER + (c - 2) * CELL;
    const getY = (r: number) => r === 1 ? 0 : r === 11 ? BOARD_SIZE - CORNER : CORNER + (r - 2) * CELL;
    const x = getX(col);
    const y = getY(row);
    return { top: (y / BOARD_SIZE) * 100, left: (x / BOARD_SIZE) * 100 };
  }

  // Offset tokens that share the same square
  const offsets = [{ dx: 12, dy: 12 }, { dx: 30, dy: 12 }, { dx: 12, dy: 30 }, { dx: 30, dy: 30 }];

  return (
    <div className="mono-tokens-layer" style={{ position: 'absolute', inset: 0 }}>
      {state.players.filter(p => !p.isBankrupt).map((player, idx) => {
        const { top, left } = getTokenPosition(player.id);
        const off = offsets[idx];
        return (
          <div key={player.id} className={`mono-token${player.inJail ? ' in-jail' : ''}${hopping === player.id ? ' hop' : ''}${state.players[state.currentPlayerIndex]?.id === player.id ? ' current' : ''}`}
            style={{
              top: `calc(${top}% + ${off.dy}px)`,
              left: `calc(${left}% + ${off.dx}px)`,
              color: player.color,
            }}
            title={`${player.name} — Square ${player.position}: ${BOARD[player.position].name}`}
          >
            <span className="mono-token-glyph" style={{ background: player.color, boxShadow: `0 0 0 2px #fff, 0 4px 8px rgba(0,0,0,.35)` }}>{player.token}</span><span className="mono-token-shadow" />
          </div>
        );
      })}
    </div>
  );
}

// ─── Game Log ─────────────────────────────────────────────────────────────────
function GameLog({ log }: { log: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div className="mono-log" ref={ref}>
      <div className="mono-log-title">📋 Game Log</div>
      {log.map((entry, i) => <div key={i} className="mono-log-entry">{entry}</div>)}
    </div>
  );
}

// ─── Setup Screen ─────────────────────────────────────────────────────────────
const SEATS: [string, string, string][] = [['🎩', 'You', '#d94a3d'], ['🚗', 'Mia', '#3f8fd6'], ['🐶', 'Arjun', '#2fa66a'], ['🚢', 'Zara', '#e8b43a']];
function SetupScreen({ onStart }: { onStart: (n: number) => void }) {
  return (
    <div className="mono-setup">
      <div className="mono-setup-card">
        <div className="mono-setup-title">🎩 Monopoly</div>
        <div className="mono-setup-sub">World tour · you vs three explorers</div>
        <div className="mono-seats">
          {SEATS.map(([tok, name, color]) => (
            <div key={name} className="mono-seat" style={{ borderColor: color }}>
              <span className="mono-seat-token" style={{ background: color }}>{tok}</span>
              <b>{name}</b>
              <small>{name === 'You' ? 'that is you' : 'city explorer'}</small>
            </div>
          ))}
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '.85rem', marginBottom: 20, lineHeight: 1.6 }}>
          Buy countries, build houses and hotels, collect rent from anyone who lands there. The explorers take their turns on their own.
        </div>
        <button className="mono-start-btn" onClick={() => onStart(4)}>
          🎲 Start the tour
        </button>
      </div>
      <div style={{ color: 'var(--text-muted)', fontSize: '.78rem', textAlign: 'center', maxWidth: 360 }}>
        Classic rules: dice, rent, Chance and Community Chest, jail, taxes, bankruptcy. Last one standing wins.
      </div>
    </div>
  );
}

// ─── Win Screen ───────────────────────────────────────────────────────────────
function WinScreen({ winner, players, onRestart }: { winner: string; players: Player[]; onRestart: () => void }) {
  const p = players.find(pl => pl.id === winner)!;
  return (
    <div className="mono-win">
      <Confetti />
      <div className="mono-win-trophy">🏆</div>
      <div className="mono-win-title">{p.token} {p.name} wins!</div>
      <div className="mono-win-sub">Final balance: ${p.money.toLocaleString()}</div>
      <button className="mono-btn primary" style={{ fontSize: '1rem', padding: '12px 32px' }} onClick={onRestart}>
        Play Again
      </button>
    </div>
  );
}

// ─── Main Game ────────────────────────────────────────────────────────────────
export default function MonopolyGame() {
  const [numPlayers, setNumPlayers] = useState(0);
  const [gameKey, setGameKey] = useState(0);
  const [diceRolling, setDiceRolling] = useState(false);
  const [showFloats, setShowFloats] = useState(false);

  const { state, rollDice, landResolved, buyProperty, declineProperty, payJail, useJailCard, buildHouse, sellHouse, mortgage, unmortgage, endTurn, dismissCard, restart } = useGameState(4);

  const handleRoll = useCallback(() => {
    setDiceRolling(true);
    setTimeout(() => {
      setDiceRolling(false);
      rollDice();
    }, 520);
  }, [rollDice]);

  // the token walks the squares first; the landing resolves once it has arrived
  const [arrived, setArrived] = useState(true);
  const { shown, hopping } = useTokenPositions(state, () => setArrived(true));
  useEffect(() => { setArrived(false); }, [state.players.map(p => p.position).join(',')]);
  useEffect(() => {
    if (state.phase === 'landing' && arrived) {
      const t = setTimeout(() => landResolved(), 350);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, arrived]);
  // the three explorers take their own turns: roll, buy what they can afford, build when they own a set, end
  const rolledThisTurn = useRef(false);
  useEffect(() => { rolledThisTurn.current = false; }, [state.currentPlayerIndex]);
  useEffect(() => {
    const cur = state.players[state.currentPlayerIndex];
    if (!cur || cur.id === 'p0' || state.phase === 'won') return;
    const think = (fn: () => void, ms: number) => { const t = setTimeout(fn, ms); return () => clearTimeout(t); };
    if (cur.isBankrupt) return think(endTurn, 600);
    if (state.phase === 'bankrupt') return think(endTurn, 1600);
    if (state.phase === 'card') return think(dismissCard, 1600);
    if (state.phase === 'buying') {
      const sq = BOARD[cur.position]; const price = sq.price ?? 0;
      return think(() => (cur.money - price >= 120 ? buyProperty() : declineProperty()), 1100);
    }
    if (state.phase === 'rolling') {
      if (cur.inJail && !rolledThisTurn.current) return think(() => { rolledThisTurn.current = true; if (cur.money >= 200) payJail(); else handleRoll(); }, 900);
      if (!rolledThisTurn.current || state.doubles > 0) return think(() => { rolledThisTurn.current = true; handleRoll(); }, 900);
      // done rolling: build one house on a complete set if flush, then end the turn
      return think(() => {
        const mine = state.properties.filter(p => p.ownerId === cur.id && !p.mortgaged && p.houses < 5);
        const set = mine.find(p => { const sq = BOARD[p.squareId]; if (!sq.color || !sq.housePrice) return false; const n = state.properties.filter(q => q.ownerId === cur.id && BOARD[q.squareId].color === sq.color).length; return n === COLOR_GROUP_SIZES[sq.color] && cur.money > sq.housePrice + 250; });
        if (set) buildHouse(set.squareId);
        endTurn();
      }, 900);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, state.currentPlayerIndex, state.doubles, state.players[state.currentPlayerIndex]?.inJail, state.players[state.currentPlayerIndex]?.isBankrupt]);
  const ownedCount = state.properties.filter(p => p.ownerId).length;
  const houseCount = state.properties.reduce((n, p) => n + p.houses, 0);

  // Clear floating messages after 2s
  useEffect(() => {
    if (state.floatingMsgs.length > 0) {
      const t = setTimeout(() => {}, 2000);
      return () => clearTimeout(t);
    }
  }, [state.floatingMsgs]);

  if (!numPlayers) return <div className="mono-root"><SetupScreen onStart={n => { restart(n); setNumPlayers(n); }} /></div>;

  const cur = state.players[state.currentPlayerIndex];

  if (state.phase === 'won' && state.winner) {
    return <div className="mono-root"><WinScreen winner={state.winner} players={state.players} onRestart={() => { setNumPlayers(0); setGameKey(k => k + 1); }} /></div>;
  }

  const half = Math.ceil(state.players.length / 2);
  const leftPlayers = state.players.slice(0, half);
  const rightPlayers = state.players.slice(half);

  return (
    <div className="mono-root" key={gameKey}>
      {/* Card Modal */}
      {state.lastCard && state.phase === 'card' && <CardModal state={state} onDismiss={dismissCard} who={state.players[state.currentPlayerIndex]?.name} />}
      {/* Buy Modal */}
      {state.phase === 'buying' && state.players[state.currentPlayerIndex]?.id === 'p0' && <BuyModal state={state} onBuy={buyProperty} onDecline={declineProperty} />}

      {/* Floating messages */}
      <div className="mono-floats">
        {state.floatingMsgs.map((msg, i) => (
          <div key={msg.id} className={`mono-float ${msg.type}`}
            style={{ top: `${-40 + i * 30}px`, left: `${(i % 3) * 60 - 60}px` }}>
            {msg.text}
          </div>
        ))}
      </div>

      <div className="mono-game">
        {/* Header */}
        <div className="mono-header">
          <a className="mono-logo" href="/" title="Back to FindurAI City">🌍 <span>FINDURAI</span> · 🎩 Monopoly</a>
          {!cur.isBankrupt && (
            <div className="mono-turn-badge">
              <div className="mono-turn-dot" style={{ background: cur.color }} />
              <span className="mono-turn-name">{cur.id === 'p0' ? 'Your turn' : `${cur.name} is playing…`}</span>
              {cur.inJail && <span style={{ fontSize: '.7rem', color: 'var(--text-muted)' }}>(In Jail)</span>}
            </div>
          )}
          <button className="mono-restart-btn" onClick={() => { setNumPlayers(0); setGameKey(k => k + 1); }}>
            ↺ New Game
          </button>
        </div>

        {/* Left players */}
        <div className="mono-left">
          {leftPlayers.map(p => (
            <PlayerCard key={p.id} player={p} isActive={p.id === cur.id} state={state}
              onBuild={buildHouse} onSell={sellHouse} onMortgage={mortgage} onUnmortgage={unmortgage} />
          ))}
          <GameLog log={state.log} />
        </div>

        {/* Board */}
        <div className="mono-board-wrap">
          <div className="mono-stage">
          <div className="mono-board">
            {/* Bottom row: squares 0–10 */}
            {BOARD.slice(0, 11).map(sq => {
              const { col, row } = squareToGrid(sq.id);
              return <div key={sq.id} style={{ gridColumn: col, gridRow: row }}><BoardSquare sq={sq} state={state} /></div>;
            })}
            {/* Left col: squares 11–19 */}
            {BOARD.slice(11, 20).map(sq => {
              const { col, row } = squareToGrid(sq.id);
              return <div key={sq.id} style={{ gridColumn: col, gridRow: row }}><BoardSquare sq={sq} state={state} /></div>;
            })}
            {/* Top row: squares 20–30 */}
            {BOARD.slice(20, 31).map(sq => {
              const { col, row } = squareToGrid(sq.id);
              return <div key={sq.id} style={{ gridColumn: col, gridRow: row }}><BoardSquare sq={sq} state={state} /></div>;
            })}
            {/* Right col: squares 31–39 */}
            {BOARD.slice(31, 40).map(sq => {
              const { col, row } = squareToGrid(sq.id);
              return <div key={sq.id} style={{ gridColumn: col, gridRow: row }}><BoardSquare sq={sq} state={state} /></div>;
            })}

            {/* Center: the city grows as the board fills up */}
            <div className="mono-board-center">
              <MonoCity owned={ownedCount} houses={houseCount} active={state.phase !== 'card' && state.phase !== 'buying'} />
              <div className="mono-board-center-title">MONOPOLY</div>
              <div className="mono-board-center-dice">
                <Dice dice={state.dice} rolling={diceRolling} doubles={state.doubles > 0} />
              </div>
              {state.freeParkingPot > 0 && (
                <div className="mono-pot">🅿️ Pot ${state.freeParkingPot}</div>
              )}
            </div>

            {/* Tokens */}
            <TokenLayer state={state} shown={shown} hopping={hopping} />
          </div>
          </div>
        </div>

        {/* Right players */}
        <div className="mono-right">
          {rightPlayers.map(p => (
            <PlayerCard key={p.id} player={p} isActive={p.id === cur.id} state={state}
              onBuild={buildHouse} onSell={sellHouse} onMortgage={mortgage} onUnmortgage={unmortgage} />
          ))}
        </div>

        {/* Controls */}
        <div className="mono-controls">
          <div className="mono-phase-tag">
            {state.phase === 'rolling'  && '🎲 Roll'}
            {state.phase === 'moving'   && '🚶 Moving'}
            {state.phase === 'landing'  && '📍 Landing'}
            {state.phase === 'buying'   && '🏙️ Buy?'}
            {state.phase === 'card'     && '🃏 Card'}
            {state.phase === 'building' && '🏠 Build'}
            {state.phase === 'bankrupt' && '💀 Bankrupt'}
          </div>

          {/* Jail actions */}
          {cur.id !== 'p0' && state.phase !== 'bankrupt' && <span className="mono-action-label">🤖 {cur.name} is taking their turn…</span>}
          {cur.id === 'p0' && cur.inJail && state.phase === 'rolling' && (
            <>
              <button className="mono-btn primary" onClick={handleRoll}>🎲 Roll for Doubles</button>
              <button className="mono-btn" disabled={cur.money < 50} onClick={payJail}>💰 Pay $50</button>
              {cur.getOutOfJailCards > 0 && <button className="mono-btn success" onClick={useJailCard}>🃏 Use Card</button>}
            </>
          )}

          {/* Normal roll */}
          {cur.id === 'p0' && !cur.inJail && state.phase === 'rolling' && (
            <button className="mono-btn primary" onClick={handleRoll}>🎲 Roll Dice</button>
          )}

          {/* Bankrupt */}
          {state.phase === 'bankrupt' && (
            <>
              <span style={{ color: 'var(--red)', fontWeight: 600 }}>💀 {cur.name} is bankrupt!</span>
              <button className="mono-btn danger" onClick={endTurn}>Continue</button>
            </>
          )}

          <div className="mono-action-label">
            {state.doubles > 0 && state.phase === 'rolling' && !cur.inJail && (
              <span style={{ color: 'var(--gold)' }}>✨ Rolled doubles! Roll again.</span>
            )}
            {state.phase === 'landing' && <span>📍 Moving to {BOARD[cur.position].name}…</span>}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginLeft: 'auto' }}>
            {cur.id === 'p0' && state.phase === 'rolling' && state.doubles === 0 && !cur.inJail && (
              <button className="mono-btn" onClick={endTurn}>⏭ End Turn</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
