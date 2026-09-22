'use client';
import { useReducer, useCallback } from 'react';
import type { GameState, Player, Card, FloatingMessage } from './types';
import { BOARD, COLOR_GROUP_SIZES, initProperties, nearestRailroad, nearestUtility } from './board';
import { COMMUNITY_CHEST, CHANCE, shuffle } from './cards';

// ─── helpers ────────────────────────────────────────────────────────────────

function rollDie(): number { return Math.floor(Math.random() * 6) + 1; }

function uid(): string { return Math.random().toString(36).slice(2); }

function getProperty(state: GameState, squareId: number) {
  return state.properties.find(p => p.squareId === squareId);
}

function updateProperty(state: GameState, squareId: number, patch: Partial<GameState['properties'][0]>): GameState['properties'] {
  return state.properties.map(p => p.squareId === squareId ? { ...p, ...patch } : p);
}

function updatePlayer(state: GameState, playerId: string, patch: Partial<Player>): Player[] {
  return state.players.map(p => p.id === playerId ? { ...p, ...patch } : p);
}

function addLog(state: GameState, msg: string): string[] {
  return [msg, ...state.log].slice(0, 60);
}

function addFloat(state: GameState, msg: FloatingMessage): FloatingMessage[] {
  return [...state.floatingMsgs, msg].slice(-6);
}

function countRailroads(state: GameState, ownerId: string): number {
  return state.properties.filter(p => {
    const sq = BOARD[p.squareId];
    return sq.type === 'railroad' && p.ownerId === ownerId && !p.mortgaged;
  }).length;
}

function countUtilities(state: GameState, ownerId: string): number {
  return state.properties.filter(p => {
    const sq = BOARD[p.squareId];
    return sq.type === 'utility' && p.ownerId === ownerId && !p.mortgaged;
  }).length;
}

function ownsGroup(state: GameState, ownerId: string, color: string): boolean {
  const groupSquares = BOARD.filter(s => s.color === color && (s.type === 'property'));
  const required = COLOR_GROUP_SIZES[color];
  const owned = state.properties.filter(p => {
    const sq = BOARD[p.squareId];
    return sq.color === color && p.ownerId === ownerId && !p.mortgaged;
  }).length;
  return owned === required && groupSquares.length === required;
}

function calcRent(state: GameState, squareId: number, diceTotal: number): number {
  const sq = BOARD[squareId];
  const prop = getProperty(state, squareId);
  if (!prop || !prop.ownerId || prop.mortgaged) return 0;

  if (sq.type === 'railroad') {
    const count = countRailroads(state, prop.ownerId);
    return sq.railroadRent![count - 1];
  }
  if (sq.type === 'utility') {
    const count = countUtilities(state, prop.ownerId);
    return (sq.utilityMultiplier![count - 1]) * diceTotal;
  }
  if (sq.type === 'property' && sq.rent) {
    const houses = prop.houses;
    let base = sq.rent[houses];
    // Double rent when player owns full group with no houses
    if (houses === 0 && ownsGroup(state, prop.ownerId, sq.color!)) {
      base *= 2;
    }
    return base;
  }
  return 0;
}

function activePlayers(state: GameState): Player[] {
  return state.players.filter(p => !p.isBankrupt);
}

function nextPlayerIndex(state: GameState): number {
  let idx = (state.currentPlayerIndex + 1) % state.players.length;
  while (state.players[idx].isBankrupt) {
    idx = (idx + 1) % state.players.length;
  }
  return idx;
}

// ─── card shuffle state ──────────────────────────────────────────────────────
let chanceDeck = shuffle(CHANCE);
let communityDeck = shuffle(COMMUNITY_CHEST);

function drawCard(deck: 'chance' | 'community'): Card {
  if (deck === 'chance') {
    if (chanceDeck.length === 0) chanceDeck = shuffle(CHANCE);
    const c = chanceDeck[0]; chanceDeck = chanceDeck.slice(1); return c;
  } else {
    if (communityDeck.length === 0) communityDeck = shuffle(COMMUNITY_CHEST);
    const c = communityDeck[0]; communityDeck = communityDeck.slice(1); return c;
  }
}

// ─── apply card action ───────────────────────────────────────────────────────
function applyCard(state: GameState, card: Card): GameState {
  const cur = state.players[state.currentPlayerIndex];
  const action = card.action;

  if (action.type === 'collect') {
    const players = updatePlayer(state, cur.id, { money: cur.money + action.amount });
    return { ...state, players, log: addLog(state, `${cur.name} collects $${action.amount}.`), floatingMsgs: addFloat(state, { id: uid(), text: `+$${action.amount}`, playerId: cur.id, type: 'earn' }), phase: 'rolling', lastCard: card };
  }
  if (action.type === 'pay') {
    const newMoney = cur.money - action.amount;
    const players = updatePlayer(state, cur.id, { money: newMoney, isBankrupt: newMoney < 0 });
    return { ...state, players, log: addLog(state, `${cur.name} pays $${action.amount}.`), floatingMsgs: addFloat(state, { id: uid(), text: `-$${action.amount}`, playerId: cur.id, type: 'pay' }), phase: newMoney < 0 ? 'bankrupt' : 'rolling', lastCard: card };
  }
  if (action.type === 'advance_go') {
    const players = updatePlayer(state, cur.id, { position: 0, money: cur.money + 200 });
    return { ...state, players, log: addLog(state, `${cur.name} advances to Go and collects $200.`), phase: 'rolling', lastCard: card };
  }
  if (action.type === 'go_to_jail') {
    const players = updatePlayer(state, cur.id, { position: 10, inJail: true, jailTurns: 0 });
    return { ...state, players, log: addLog(state, `${cur.name} goes to Jail!`), phase: 'rolling', lastCard: card, currentPlayerIndex: nextPlayerIndex(state) };
  }
  if (action.type === 'get_out_of_jail') {
    const players = updatePlayer(state, cur.id, { getOutOfJailCards: cur.getOutOfJailCards + 1 });
    return { ...state, players, log: addLog(state, `${cur.name} gets a Get Out of Jail Free card.`), phase: 'rolling', lastCard: card };
  }
  if (action.type === 'move') {
    const newPos = action.to;
    const passedGo = newPos < cur.position;
    const bonus = passedGo ? 200 : 0;
    const players = updatePlayer(state, cur.id, { position: newPos, money: cur.money + bonus });
    return { ...state, players, log: addLog(state, `${cur.name} moves to ${BOARD[newPos].name}.`), phase: 'landing', lastCard: card };
  }
  if (action.type === 'go_back') {
    const newPos = ((cur.position - action.spaces) + 40) % 40;
    const players = updatePlayer(state, cur.id, { position: newPos });
    return { ...state, players, log: addLog(state, `${cur.name} goes back ${action.spaces} spaces to ${BOARD[newPos].name}.`), phase: 'landing', lastCard: card };
  }
  if (action.type === 'move_to_nearest') {
    const dest = action.squareType === 'railroad' ? nearestRailroad(cur.position) : nearestUtility(cur.position);
    const passedGo = dest < cur.position;
    const players = updatePlayer(state, cur.id, { position: dest, money: cur.money + (passedGo ? 200 : 0) });
    return { ...state, players, log: addLog(state, `${cur.name} advances to nearest ${action.squareType}: ${BOARD[dest].name}.`), phase: 'landing', lastCard: card };
  }
  if (action.type === 'pay_per_house') {
    const houses = state.properties.filter(p => p.ownerId === cur.id && p.houses < 5).reduce((s, p) => s + p.houses, 0);
    const hotels = state.properties.filter(p => p.ownerId === cur.id && p.houses === 5).length;
    const total = houses * action.perHouse + hotels * action.perHotel;
    const newMoney = cur.money - total;
    const players = updatePlayer(state, cur.id, { money: newMoney, isBankrupt: newMoney < 0 });
    return { ...state, players, log: addLog(state, `${cur.name} pays $${total} for repairs.`), floatingMsgs: addFloat(state, { id: uid(), text: `-$${total}`, playerId: cur.id, type: 'pay' }), phase: newMoney < 0 ? 'bankrupt' : 'rolling', lastCard: card };
  }
  if (action.type === 'collect_from_players') {
    const amount = action.amount;
    let players = [...state.players];
    let total = 0;
    players = players.map(p => {
      if (p.id === cur.id || p.isBankrupt) return p;
      total += amount;
      return { ...p, money: p.money - amount };
    });
    players = players.map(p => p.id === cur.id ? { ...p, money: p.money + total } : p);
    return { ...state, players, log: addLog(state, `${cur.name} collects $${amount} from each player.`), phase: 'rolling', lastCard: card };
  }
  if (action.type === 'pay_to_players') {
    const amount = action.amount;
    let players = [...state.players];
    const others = players.filter(p => p.id !== cur.id && !p.isBankrupt).length;
    const total = amount * others;
    players = players.map(p => {
      if (p.id === cur.id) return { ...p, money: p.money - total };
      if (p.isBankrupt) return p;
      return { ...p, money: p.money + amount };
    });
    return { ...state, players, log: addLog(state, `${cur.name} pays $${amount} to each player.`), phase: 'rolling', lastCard: card };
  }
  return state;
}

// ─── main reducer ────────────────────────────────────────────────────────────
type Action =
  | { type: 'ROLL_DICE' }
  | { type: 'LAND_RESOLVED' }
  | { type: 'BUY_PROPERTY' }
  | { type: 'DECLINE_PROPERTY' }
  | { type: 'PAY_JAIL' }
  | { type: 'USE_JAIL_CARD' }
  | { type: 'BUILD_HOUSE'; squareId: number }
  | { type: 'SELL_HOUSE'; squareId: number }
  | { type: 'MORTGAGE'; squareId: number }
  | { type: 'UNMORTGAGE'; squareId: number }
  | { type: 'END_TURN' }
  | { type: 'CLEAR_FLOATS' }
  | { type: 'DISMISS_CARD' }
  | { type: 'RESET'; numPlayers: number };

function reducer(state: GameState, action: Action): GameState {
  const cur = state.players[state.currentPlayerIndex];

  switch (action.type) {
    case 'ROLL_DICE': {
      if (state.phase !== 'rolling') return state;
      const d1 = rollDie(), d2 = rollDie();
      const isDoubles = d1 === d2;
      const newDoubles = isDoubles ? state.doubles + 1 : 0;

      // In jail
      if (cur.inJail) {
        if (isDoubles) {
          const newPos = (cur.position + d1 + d2) % 40;
          const players = updatePlayer(state, cur.id, { position: newPos, inJail: false, jailTurns: 0 });
          return { ...state, players, dice: [d1, d2], doubles: 0, log: addLog(state, `${cur.name} rolled doubles and got out of Jail! Moves to ${BOARD[newPos].name}.`), phase: 'landing' };
        }
        const newTurns = cur.jailTurns + 1;
        if (newTurns >= 3) {
          const players = updatePlayer(state, cur.id, { inJail: false, jailTurns: 0, money: cur.money - 50 });
          const st2: GameState = { ...state, players, dice: [d1, d2] as [number, number], doubles: 0, log: addLog(state, `${cur.name} paid $50 to get out of Jail.`) };

          const newPos = (cur.position + d1 + d2) % 40;
          const players2 = updatePlayer(st2, cur.id, { position: newPos });
          return { ...st2, players: players2, phase: 'landing' };
        }
        const players = updatePlayer(state, cur.id, { jailTurns: newTurns });
        const nextIdx = nextPlayerIndex(state);
        return { ...state, players, dice: [d1, d2], doubles: 0, log: addLog(state, `${cur.name} is stuck in Jail (turn ${newTurns}/3).`), currentPlayerIndex: nextIdx, phase: 'rolling' };
      }

      // Rolled 3 doubles → go to jail
      if (newDoubles >= 3) {
        const players = updatePlayer(state, cur.id, { position: 10, inJail: true, jailTurns: 0 });
        return { ...state, players, dice: [d1, d2], doubles: 0, log: addLog(state, `${cur.name} rolled 3 doubles — Go to Jail!`), phase: 'rolling', currentPlayerIndex: nextPlayerIndex(state) };
      }

      const newPos = (cur.position + d1 + d2) % 40;
      const passedGo = newPos < cur.position;
      let players = updatePlayer(state, cur.id, { position: newPos, money: cur.money + (passedGo ? 200 : 0) });
      const logMsg = `${cur.name} rolled ${d1}+${d2}=${d1+d2}, moves to ${BOARD[newPos].name}${passedGo?' (collected $200)':''}${isDoubles?' — DOUBLES!':''}`;
      return { ...state, players, dice: [d1, d2], doubles: newDoubles, log: addLog(state, logMsg), phase: 'landing' };
    }

    case 'LAND_RESOLVED': {
      const sq = BOARD[cur.position];
      let nextState = { ...state };

      if (sq.type === 'go_to_jail') {
        const players = updatePlayer(state, cur.id, { position: 10, inJail: true, jailTurns: 0 });
        return { ...state, players, log: addLog(state, `${cur.name} goes to Jail!`), phase: 'rolling', currentPlayerIndex: nextPlayerIndex(state), doubles: 0 };
      }

      if (sq.type === 'tax') {
        const tax = sq.taxAmount!;
        const newMoney = cur.money - tax;
        const players = updatePlayer(state, cur.id, { money: newMoney, isBankrupt: newMoney < 0 });
        return { ...state, players, log: addLog(state, `${cur.name} pays $${tax} in tax.`), floatingMsgs: addFloat(state, { id: uid(), text: `-$${tax}`, playerId: cur.id, type: 'pay' }), phase: newMoney < 0 ? 'bankrupt' : 'rolling', ...(newMoney >= 0 ? { currentPlayerIndex: nextPlayerIndex(state), doubles: 0 } : {}) };
      }

      if (sq.type === 'chance') {
        const card = drawCard('chance');
        nextState = { ...state, lastCard: card, phase: 'card' };
        return applyCard({ ...nextState, phase: 'card' }, card);
      }

      if (sq.type === 'community') {
        const card = drawCard('community');
        nextState = { ...state, lastCard: card, phase: 'card' };
        return applyCard({ ...nextState, phase: 'card' }, card);
      }

      if (sq.type === 'free_parking') {
        const pot = state.freeParkingPot;
        if (pot > 0) {
          const players = updatePlayer(state, cur.id, { money: cur.money + pot });
          return { ...state, players, freeParkingPot: 0, log: addLog(state, `${cur.name} wins the Free Parking jackpot of $${pot}!`), floatingMsgs: addFloat(state, { id: uid(), text: `+$${pot} 🅿️`, playerId: cur.id, type: 'earn' }), phase: 'rolling', currentPlayerIndex: nextPlayerIndex(state), doubles: 0 };
        }
        return { ...state, log: addLog(state, `${cur.name} is at Free Parking.`), phase: 'rolling', currentPlayerIndex: nextPlayerIndex(state), doubles: 0 };
      }

      if (sq.type === 'property' || sq.type === 'railroad' || sq.type === 'utility') {
        const prop = getProperty(state, sq.id);
        if (!prop) return { ...state, phase: 'rolling', currentPlayerIndex: nextPlayerIndex(state) };

        if (!prop.ownerId) {
          // Offer to buy
          return { ...state, phase: 'buying', log: addLog(state, `${cur.name} landed on ${sq.name}. Buy for $${sq.price}?`) };
        }

        if (prop.ownerId === cur.id || prop.mortgaged) {
          return { ...state, phase: 'rolling', currentPlayerIndex: nextPlayerIndex(state), doubles: 0, log: addLog(state, `${cur.name} owns ${sq.name}.`) };
        }

        // Pay rent
        const rent = calcRent(state, sq.id, state.dice[0] + state.dice[1]);
        const owner = state.players.find(p => p.id === prop.ownerId)!;
        const newCurMoney = cur.money - rent;
        let players = updatePlayer(state, cur.id, { money: newCurMoney, isBankrupt: newCurMoney < 0 });
        players = players.map(p => p.id === owner.id ? { ...p, money: p.money + rent } : p);
        const nextPhase = newCurMoney < 0 ? 'bankrupt' : 'rolling';
        return { ...state, players, log: addLog(state, `${cur.name} pays $${rent} rent to ${owner.name} for ${sq.name}.`), floatingMsgs: addFloat(state, { id: uid(), text: `-$${rent}`, playerId: cur.id, type: 'pay' }), phase: nextPhase, ...(nextPhase === 'rolling' ? { currentPlayerIndex: nextPlayerIndex(state), doubles: 0 } : {}), };
      }

      return { ...state, phase: 'rolling', currentPlayerIndex: nextPlayerIndex(state), doubles: 0 };
    }

    case 'BUY_PROPERTY': {
      if (state.phase !== 'buying') return state;
      const sq = BOARD[cur.position];
      if (!sq.price) return state;
      const newMoney = cur.money - sq.price;
      if (newMoney < 0) return { ...state, log: addLog(state, `${cur.name} cannot afford ${sq.name}.`), phase: 'rolling', currentPlayerIndex: nextPlayerIndex(state), doubles: 0 };
      const players = updatePlayer(state, cur.id, { money: newMoney });
      const properties = updateProperty(state, sq.id, { ownerId: cur.id });
      return { ...state, players, properties, log: addLog(state, `${cur.name} buys ${sq.name} for $${sq.price}.`), floatingMsgs: addFloat(state, { id: uid(), text: `-$${sq.price}`, playerId: cur.id, type: 'pay' }), phase: 'rolling', currentPlayerIndex: nextPlayerIndex(state), doubles: 0 };
    }

    case 'DECLINE_PROPERTY': {
      return { ...state, phase: 'rolling', currentPlayerIndex: nextPlayerIndex(state), doubles: 0, log: addLog(state, `${cur.name} declines to buy ${BOARD[cur.position].name}.`) };
    }

    case 'PAY_JAIL': {
      if (!cur.inJail || cur.money < 50) return state;
      const players = updatePlayer(state, cur.id, { inJail: false, jailTurns: 0, money: cur.money - 50 });
      return { ...state, players, log: addLog(state, `${cur.name} pays $50 to get out of Jail.`), phase: 'rolling' };
    }

    case 'USE_JAIL_CARD': {
      if (!cur.inJail || cur.getOutOfJailCards <= 0) return state;
      const players = updatePlayer(state, cur.id, { inJail: false, jailTurns: 0, getOutOfJailCards: cur.getOutOfJailCards - 1 });
      return { ...state, players, log: addLog(state, `${cur.name} uses Get Out of Jail Free card.`), phase: 'rolling' };
    }

    case 'BUILD_HOUSE': {
      const sq = BOARD[action.squareId];
      if (!sq.housePrice || !sq.color) return state;
      if (!ownsGroup(state, cur.id, sq.color)) return state;
      const prop = getProperty(state, action.squareId);
      if (!prop || prop.houses >= 5 || cur.money < sq.housePrice) return state;
      const players = updatePlayer(state, cur.id, { money: cur.money - sq.housePrice });
      const properties = updateProperty(state, action.squareId, { houses: prop.houses + 1 });
      const label = prop.houses + 1 === 5 ? 'a hotel' : `house #${prop.houses + 1}`;
      return { ...state, players, properties, log: addLog(state, `${cur.name} builds ${label} on ${sq.name}.`) };
    }

    case 'SELL_HOUSE': {
      const sq = BOARD[action.squareId];
      if (!sq.housePrice) return state;
      const prop = getProperty(state, action.squareId);
      if (!prop || prop.houses <= 0) return state;
      const players = updatePlayer(state, cur.id, { money: cur.money + Math.floor(sq.housePrice / 2) });
      const properties = updateProperty(state, action.squareId, { houses: prop.houses - 1 });
      return { ...state, players, properties, log: addLog(state, `${cur.name} sells a house on ${sq.name} for $${Math.floor(sq.housePrice / 2)}.`) };
    }

    case 'MORTGAGE': {
      const sq = BOARD[action.squareId];
      const prop = getProperty(state, action.squareId);
      if (!prop || prop.ownerId !== cur.id || prop.mortgaged || !sq.mortgage) return state;
      const players = updatePlayer(state, cur.id, { money: cur.money + sq.mortgage });
      const properties = updateProperty(state, action.squareId, { mortgaged: true });
      return { ...state, players, properties, log: addLog(state, `${cur.name} mortgages ${sq.name} for $${sq.mortgage}.`) };
    }

    case 'UNMORTGAGE': {
      const sq = BOARD[action.squareId];
      const prop = getProperty(state, action.squareId);
      if (!prop || prop.ownerId !== cur.id || !prop.mortgaged || !sq.mortgage) return state;
      const cost = Math.ceil(sq.mortgage * 1.1);
      if (cur.money < cost) return state;
      const players = updatePlayer(state, cur.id, { money: cur.money - cost });
      const properties = updateProperty(state, action.squareId, { mortgaged: false });
      return { ...state, players, properties, log: addLog(state, `${cur.name} unmortgages ${sq.name} for $${cost}.`) };
    }

    case 'END_TURN': {
      const active = activePlayers(state);
      if (active.length === 1) {
        return { ...state, phase: 'won', winner: active[0].id };
      }
      return { ...state, phase: 'rolling', currentPlayerIndex: nextPlayerIndex(state), doubles: 0 };
    }

    case 'CLEAR_FLOATS': {
      return { ...state, floatingMsgs: [] };
    }

    case 'RESET': return buildInitialState(action.numPlayers);

    case 'DISMISS_CARD': {
      return { ...state, lastCard: null };
    }

    default:
      return state;
  }
}

// ─── initial state ────────────────────────────────────────────────────────────
const TOKENS = ['🎩', '🚗', '🐶', '🚢'];
const COLORS = ['#d94a3d', '#3f8fd6', '#2fa66a', '#e8b43a'];   // red, blue, green, yellow
const NAMES  = ['You', 'Mia', 'Arjun', 'Zara'];

export function buildInitialState(numPlayers: number): GameState {
  chanceDeck = shuffle(CHANCE);
  communityDeck = shuffle(COMMUNITY_CHEST);
  return {
    players: Array.from({ length: numPlayers }, (_, i) => ({
      id: `p${i}`, name: NAMES[i], token: TOKENS[i], color: COLORS[i],
      money: 1500, position: 0, inJail: false, jailTurns: 0,
      isBankrupt: false, getOutOfJailCards: 0,
    })),
    properties: initProperties(),
    currentPlayerIndex: 0,
    phase: 'rolling',
    dice: [1, 1],
    doubles: 0,
    lastCard: null,
    log: ['Game started! You go first — Mia, Arjun and Zara are waiting.'],
    winner: null,
    floatingMsgs: [],
    auctionSquareId: null,
    freeParkingPot: 0,
  };
}

export function useGameState(numPlayers: number) {
  const [state, dispatch] = useReducer(reducer, undefined, () => buildInitialState(numPlayers));
  return {
    state,
    rollDice:       () => dispatch({ type: 'ROLL_DICE' }),
    landResolved:   () => dispatch({ type: 'LAND_RESOLVED' }),
    buyProperty:    () => dispatch({ type: 'BUY_PROPERTY' }),
    declineProperty:() => dispatch({ type: 'DECLINE_PROPERTY' }),
    payJail:        () => dispatch({ type: 'PAY_JAIL' }),
    useJailCard:    () => dispatch({ type: 'USE_JAIL_CARD' }),
    buildHouse:     (squareId: number) => dispatch({ type: 'BUILD_HOUSE', squareId }),
    sellHouse:      (squareId: number) => dispatch({ type: 'SELL_HOUSE', squareId }),
    mortgage:       (squareId: number) => dispatch({ type: 'MORTGAGE', squareId }),
    unmortgage:     (squareId: number) => dispatch({ type: 'UNMORTGAGE', squareId }),
    endTurn:        () => dispatch({ type: 'END_TURN' }),
    clearFloats:    () => dispatch({ type: 'CLEAR_FLOATS' }),
    dismissCard:    () => dispatch({ type: 'DISMISS_CARD' }),
    restart:        (n: number) => dispatch({ type: 'RESET', numPlayers: n }),
  };
}
