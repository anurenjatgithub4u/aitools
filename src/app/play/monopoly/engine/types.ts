// All TypeScript types for the Monopoly game engine

export type SquareType =
  | 'go' | 'property' | 'railroad' | 'utility'
  | 'tax' | 'chance' | 'community' | 'jail' | 'free_parking' | 'go_to_jail';

export type ColorGroup =
  | 'brown' | 'light_blue' | 'pink' | 'orange'
  | 'red' | 'yellow' | 'green' | 'dark_blue'
  | 'railroad' | 'utility';

export interface Square {
  id: number;
  name: string;
  type: SquareType;
  color?: ColorGroup;
  price?: number;
  rent?: number[];
  housePrice?: number;
  mortgage?: number;
  railroadRent?: number[];
  utilityMultiplier?: number[];
  taxAmount?: number;
}

export interface Property {
  squareId: number;
  ownerId: string | null;
  houses: number;
  mortgaged: boolean;
}

export interface Player {
  id: string;
  name: string;
  token: string;
  color: string;
  money: number;
  position: number;
  inJail: boolean;
  jailTurns: number;
  isBankrupt: boolean;
  getOutOfJailCards: number;
}

export type CardDeck = 'chance' | 'community';

export interface Card {
  id: string;
  deck: CardDeck;
  text: string;
  action: CardAction;
}

export type CardAction =
  | { type: 'collect'; amount: number }
  | { type: 'pay'; amount: number }
  | { type: 'move'; to: number }
  | { type: 'move_to_nearest'; squareType: 'railroad' | 'utility' }
  | { type: 'go_to_jail' }
  | { type: 'get_out_of_jail' }
  | { type: 'advance_go' }
  | { type: 'pay_per_house'; perHouse: number; perHotel: number }
  | { type: 'collect_from_players'; amount: number }
  | { type: 'pay_to_players'; amount: number }
  | { type: 'go_back'; spaces: number };

export type GamePhase =
  | 'setup'
  | 'rolling'
  | 'moving'
  | 'landing'
  | 'buying'
  | 'card'
  | 'building'
  | 'jail_decision'
  | 'bankrupt'
  | 'won';

export interface FloatingMessage {
  id: string;
  text: string;
  playerId: string;
  type: 'earn' | 'pay' | 'info';
}

export interface GameState {
  players: Player[];
  properties: Property[];
  currentPlayerIndex: number;
  phase: GamePhase;
  dice: [number, number];
  doubles: number;
  lastCard: Card | null;
  log: string[];
  winner: string | null;
  floatingMsgs: FloatingMessage[];
  auctionSquareId: number | null;
  freeParkingPot: number;
}
