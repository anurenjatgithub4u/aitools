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
    id: 'city', name: 'City', place: 'Wander City', country: 'one city · countless stories', emoji: '🏙️',
    routes: [[[15, -60], [15, 86]], [[-130, 80], [104, 80]], [[15, -20], [-40, -60], [-110, -85]], [[15, -60], [100, -120]], [[15, 86], [40, 132], [115, 115]]],
    pump: [29, 10, -Math.PI / 2],
    traffic: [{ kind: 'bus', route: 1, color: 0x2b6fd9, label: 'BMTC' }, { kind: 'bus', route: 0, start: 0.6, color: 0x2b6fd9, label: 'BMTC' }, { kind: 'bus', route: 3, start: 0.3, color: 0x6c3fb0, label: 'BMTC Vayu Vajra' }, { kind: 'bus', route: 4, start: 0.5, color: 0x2fa66a, label: 'BMTC' }, { kind: 'bus', route: 1, start: 0.15, color: 0x2b6fd9, label: 'BMTC' }, { kind: 'police', route: 0, start: 0.2 }],
    spawn: [0, 42], solids: [[0, -25, 22], [-45, 10, 8], [50, 45, 15], [70, 60, 6], [-50, -60, 16], [60, -40, 12], [-20, 60, 24], [88, 12, 8], [96, 28, 8], [-75, 40, 26], [-38, -2, 12], [-110, 70, 22], [-105, 110, 18], [-125, -95, 20], [-70, 118, 12], [115, 128, 18], [40, 150, 22], [100, -130, 30], [100, -154, 46]],
    tagline: 'One big low-poly city, built on the streets of Bengaluru',
    blurb: 'Start at Vidhana Soudha, cross Cubbon Park to Brigade Road and its old stores, ride the Namma Metro from Majestic to Indiranagar, climb Lalbagh rock, drive out to the Infosys campus and the airport, and see if you can get past Silk Board.',
    explorers: 1342,
    theme: { sky: 0xc9def0, ground: 0x74b064, fog: 0xdbe8f0, sun: 0xfff2d8, accent: '#7b3fa0' },
    terrain: { amp: 2, flatRadius: 32 },
    decor: [{ kind: 'rain', count: 60 }, { kind: 'tree', count: 50 }, { kind: 'cherry', count: 35 }, { kind: 'bush', count: 50 }, { kind: 'palm', count: 12 }],
    collectibles: [
      { name: 'Masala dosa', points: 15, color: 0xe0a25a, shape: 'cone' },
      { name: 'Filter coffee', points: 10, color: 0x6b3f2b, shape: 'ring' },
      { name: 'Idli', points: 5, color: 0xf6f2e8, shape: 'sphere' },
      { name: 'Mysore pak', points: 20, color: 0xd9a441, shape: 'box' },
      { name: 'Silk saree', points: 25, color: 0xb0308a, shape: 'gem' },
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
