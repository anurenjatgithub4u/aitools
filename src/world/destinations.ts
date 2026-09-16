import type { TerrainProfile } from './terrain';

export type Shape = 'sphere' | 'box' | 'gem' | 'ring' | 'cone';
export interface Collectible { name: string; points: number; color: number; shape: Shape }
export type DecorKind = 'tree' | 'rain' | 'palm' | 'pine' | 'cypress' | 'cactus' | 'rock' | 'bush' | 'cherry';

export interface Destination {
  id: string;
  name: string;
  place: string;
  country: string;
  emoji: string;
  tagline: string;
  blurb: string;
  explorers: number; // baseline "exploring together" count
  theme: { sky: number; ground: number; fog: number; sun: number; accent: string };
  terrain: TerrainProfile;
  decor: { kind: DecorKind; count: number }[];
  collectibles: Collectible[];
  spawn?: [number, number];        // where the player appears (default: in front of the landmark)
  routes?: [number, number][][];   // road polylines (x, z) that traffic drives back and forth along
  pump?: [number, number, number]; // petrol station x, z, heading (default: beside the first road, or near spawn)
  traffic?: { kind: 'bus' | 'police'; route: number; start?: number; color?: number; label?: string }[];
  solids?: [number, number, number][]; // x, z, radius circles kept clear of trees (collision itself comes from the meshes)
}

// Every world we have built. Only THE CITY is playable right now; the rest are kept for later.
export const ALL_DESTINATIONS: Destination[] = [
  {
    id: 'kochi', name: 'Kochi', place: 'Fort Kochi · Kerala', country: 'India', emoji: '🎣',
    routes: [[[15, -42], [15, 86]], [[-56, 70], [74, 70]]],
    pump: [29, 2, -Math.PI / 2],
    traffic: [{ kind: 'bus', route: 0, color: 0xd94a3d }, { kind: 'bus', route: 1, start: 0.5, color: 0x2f8f3a }, { kind: 'police', route: 0, start: 0.7 }],
    spawn: [0, 34], solids: [[0, -22, 13], [25, -38, 7], [42, 42, 13], [57, 60, 4], [-60, -10, 3], [-60, 4, 3], [-60, 18, 3], [-20, 48, 20], [78, 76, 6], [-84, -66, 2.5]],
    tagline: 'Queen of the Arabian Sea',
    blurb: 'Watch the Chinese fishing nets at sunset, walk past Santa Cruz Basilica to Mattancherry Palace and the Jew Town clock tower, catch the ferry at the jetty, and follow the metro from Aluva to Vyttila.',
    explorers: 1187,
    theme: { sky: 0xbfe3ef, ground: 0x6fb35e, fog: 0xd6ebef, sun: 0xfff0cf, accent: '#1e6b3a' },
    terrain: { amp: 1.2, flatRadius: 22, base: 2, island: 105, water: { level: 0, color: 0x4a97a8 } },
    decor: [{ kind: 'palm', count: 100 }, { kind: 'rain', count: 20 }, { kind: 'tree', count: 20 }, { kind: 'bush', count: 40 }],
    collectibles: [
      { name: 'Puttu', points: 10, color: 0xf3ead6, shape: 'cone' },
      { name: 'Banana chips', points: 5, color: 0xf2c94c, shape: 'ring' },
      { name: 'Kappa & meen', points: 20, color: 0xc7823a, shape: 'box' },
      { name: 'Kathakali mask', points: 25, color: 0x2f8f3a, shape: 'gem' },
      { name: 'Spices', points: 15, color: 0xd9782b, shape: 'sphere' },
    ],
  },
  {
    id: 'city', name: 'City', place: 'FindurAI City', country: 'one city · countless stories', emoji: '🏙️',
    routes: [[[15, -100], [15, 150]], [[-125, 60], [165, 60]], [[-125, -62], [20, -62]], [[165, -120], [165, 140]]],
    pump: [40, 84, Math.PI],
    traffic: [{ kind: 'bus', route: 0, color: 0x2b6fd9, label: 'City bus' }, { kind: 'bus', route: 1, start: 0.4, color: 0x2fa66a, label: 'Beach line' }, { kind: 'bus', route: 3, start: 0.6, color: 0xf27d3a, label: 'Coast line' }, { kind: 'police', route: 0, start: 0.2 }],
    spawn: [0, 36],
    tagline: 'An imaginary city made for hanging out',
    blurb: 'Meet at Downtown Plaza, grab a coffee on Café Row, bar-hop along Neon Lane, wander the college and school campuses, jog around Central Park, then head east to Sunset Beach and the pier. Drive, race, play, and chat — with real people.',
    explorers: 1342,
    theme: { sky: 0xc9def0, ground: 0x74b064, fog: 0xdbe8f0, sun: 0xfff2d8, accent: '#7b3fa0' },
    terrain: { amp: 1.6, flatRadius: 40, base: 3, rim: 262, coast: 215, water: { level: 0, color: 0x3a8fc4 } },
    decor: [{ kind: 'rain', count: 70 }, { kind: 'tree', count: 120 }, { kind: 'cherry', count: 40 }, { kind: 'bush', count: 90 }, { kind: 'palm', count: 30 }, { kind: 'pine', count: 150 }],
    collectibles: [
      { name: 'Cold coffee', points: 10, color: 0x8a5a2b, shape: 'ring' },
      { name: 'Burger', points: 15, color: 0xe0a25a, shape: 'sphere' },
      { name: 'Ice cream', points: 5, color: 0xff7ab8, shape: 'cone' },
      { name: 'Concert ticket', points: 20, color: 0x6a3fb0, shape: 'box' },
      { name: 'Sunglasses', points: 25, color: 0x1a1a1a, shape: 'gem' },
    ],
  },
  {
    id: 'taj-mahal', name: 'Taj Mahal', place: 'Agra', country: 'India', emoji: '🕌',
    spawn: [0, 95], solids: [[0, 0, 13], [19, 19, 2], [-19, 19, 2], [19, -19, 2], [-19, -19, 2], [-11, 100, 5], [11, 100, 5]],
    tagline: 'A marble love letter on the Yamuna',
    blurb: 'Wander the Mughal gardens, follow the reflecting pool and circle the ivory-white mausoleum at golden hour.',
    explorers: 812,
    theme: { sky: 0xbfe3f0, ground: 0x7cc36b, fog: 0xd8ecf3, sun: 0xfff1d0, accent: '#e8c46a' },
    terrain: { amp: 2, flatRadius: 75 },
    decor: [{ kind: 'tree', count: 70 }, { kind: 'cypress', count: 30 }, { kind: 'bush', count: 40 }],
    collectibles: [
      { name: 'Chai', points: 10, color: 0xb9743a, shape: 'cone' },
      { name: 'Petha', points: 15, color: 0xf6e7a8, shape: 'box' },
      { name: 'Marigold', points: 5, color: 0xf7a51c, shape: 'sphere' },
      { name: 'Kite', points: 20, color: 0xe74c6f, shape: 'gem' },
    ],
  },
  {
    id: 'eiffel-tower', name: 'Eiffel Tower', place: 'Paris', country: 'France', emoji: '🗼',
    solids: [[10, 10, 1.5], [-10, 10, 1.5], [10, -10, 1.5], [-10, -10, 1.5]],
    tagline: 'Iron lace over the Champ de Mars',
    blurb: 'Stroll the lawns beneath the iron lady, collect croissants and macarons, and look up — way up.',
    explorers: 1043,
    theme: { sky: 0xcfe1f4, ground: 0x86b86f, fog: 0xe3edf6, sun: 0xfff4e0, accent: '#c9a96e' },
    terrain: { amp: 1.5, flatRadius: 60 },
    decor: [{ kind: 'tree', count: 90 }, { kind: 'bush', count: 30 }],
    collectibles: [
      { name: 'Croissant', points: 15, color: 0xe3a24b, shape: 'ring' },
      { name: 'Macaron', points: 10, color: 0xf2a6c8, shape: 'sphere' },
      { name: 'Baguette', points: 20, color: 0xd4a256, shape: 'box' },
      { name: 'Beret', points: 25, color: 0x2b2b3a, shape: 'cone' },
    ],
  },
  {
    id: 'pyramids-of-giza', name: 'Pyramids of Giza', place: 'Giza', country: 'Egypt', emoji: '🐪',
    spawn: [10, 70], solids: [[0, 0, 30], [-48, -34, 22], [44, -44, 14], [34, 30, 7]],
    tagline: 'Forty-five centuries look down upon you',
    blurb: 'Cross the dunes between the three great pyramids and pay your respects to the Sphinx.',
    explorers: 655,
    theme: { sky: 0xf4dcb4, ground: 0xe2c184, fog: 0xf5e2c3, sun: 0xffe9b8, accent: '#d9a441' },
    terrain: { amp: 3, flatRadius: 95 },
    decor: [{ kind: 'palm', count: 24 }, { kind: 'rock', count: 40 }],
    collectibles: [
      { name: 'Papyrus', points: 15, color: 0xe9d8a6, shape: 'box' },
      { name: 'Scarab', points: 25, color: 0x2f8f8a, shape: 'gem' },
      { name: 'Date', points: 5, color: 0x7a3f1d, shape: 'sphere' },
      { name: 'Camel bell', points: 20, color: 0xd9b23a, shape: 'ring' },
    ],
  },
];

export const DESTINATIONS: Destination[] = ALL_DESTINATIONS.filter((d) => d.id === 'city');
export const CITY = DESTINATIONS[0];

export const byId = (id: string) => DESTINATIONS.find((d) => d.id === id);
