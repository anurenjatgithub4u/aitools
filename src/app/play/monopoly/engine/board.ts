import type { Square, Property } from './types';

export const BOARD: Square[] = [
  { id: 0,  name: 'GO',                   type: 'go' },
  { id: 1,  name: 'Mediterranean Ave',    type: 'property', color: 'brown',      price: 60,  rent: [2,10,30,90,160,250],    housePrice: 50,  mortgage: 30 },
  { id: 2,  name: 'Community Chest',      type: 'community' },
  { id: 3,  name: 'Baltic Ave',           type: 'property', color: 'brown',      price: 60,  rent: [4,20,60,180,320,450],   housePrice: 50,  mortgage: 30 },
  { id: 4,  name: 'Income Tax',           type: 'tax', taxAmount: 200 },
  { id: 5,  name: 'Reading Railroad',     type: 'railroad', color: 'railroad',   price: 200, railroadRent: [25,50,100,200], mortgage: 100 },
  { id: 6,  name: 'Oriental Ave',         type: 'property', color: 'light_blue', price: 100, rent: [6,30,90,270,400,550],   housePrice: 50,  mortgage: 50 },
  { id: 7,  name: 'Chance',              type: 'chance' },
  { id: 8,  name: 'Vermont Ave',          type: 'property', color: 'light_blue', price: 100, rent: [6,30,90,270,400,550],   housePrice: 50,  mortgage: 50 },
  { id: 9,  name: 'Connecticut Ave',      type: 'property', color: 'light_blue', price: 120, rent: [8,40,100,300,450,600],  housePrice: 50,  mortgage: 60 },
  { id: 10, name: 'Jail / Just Visiting', type: 'jail' },
  { id: 11, name: 'St. Charles Place',    type: 'property', color: 'pink',       price: 140, rent: [10,50,150,450,625,750], housePrice: 100, mortgage: 70 },
  { id: 12, name: 'Electric Company',     type: 'utility',  color: 'utility',    price: 150, utilityMultiplier: [4,10],     mortgage: 75 },
  { id: 13, name: 'States Ave',           type: 'property', color: 'pink',       price: 140, rent: [10,50,150,450,625,750], housePrice: 100, mortgage: 70 },
  { id: 14, name: 'Virginia Ave',         type: 'property', color: 'pink',       price: 160, rent: [12,60,180,500,700,900], housePrice: 100, mortgage: 80 },
  { id: 15, name: 'Pennsylvania Railroad',type: 'railroad', color: 'railroad',   price: 200, railroadRent: [25,50,100,200], mortgage: 100 },
  { id: 16, name: 'St. James Place',      type: 'property', color: 'orange',     price: 180, rent: [14,70,200,550,750,950], housePrice: 100, mortgage: 90 },
  { id: 17, name: 'Community Chest',      type: 'community' },
  { id: 18, name: 'Tennessee Ave',        type: 'property', color: 'orange',     price: 180, rent: [14,70,200,550,750,950], housePrice: 100, mortgage: 90 },
  { id: 19, name: 'New York Ave',         type: 'property', color: 'orange',     price: 200, rent: [16,80,220,600,800,1000],housePrice: 100, mortgage: 100 },
  { id: 20, name: 'Free Parking',         type: 'free_parking' },
  { id: 21, name: 'Kentucky Ave',         type: 'property', color: 'red',        price: 220, rent: [18,90,250,700,875,1050],housePrice: 150, mortgage: 110 },
  { id: 22, name: 'Chance',              type: 'chance' },
  { id: 23, name: 'Indiana Ave',          type: 'property', color: 'red',        price: 220, rent: [18,90,250,700,875,1050],housePrice: 150, mortgage: 110 },
  { id: 24, name: 'Illinois Ave',         type: 'property', color: 'red',        price: 240, rent: [20,100,300,750,925,1100],housePrice:150, mortgage: 120 },
  { id: 25, name: 'B. & O. Railroad',     type: 'railroad', color: 'railroad',   price: 200, railroadRent: [25,50,100,200], mortgage: 100 },
  { id: 26, name: 'Atlantic Ave',         type: 'property', color: 'yellow',     price: 260, rent: [22,110,330,800,975,1150],housePrice:150, mortgage: 130 },
  { id: 27, name: 'Ventnor Ave',          type: 'property', color: 'yellow',     price: 260, rent: [22,110,330,800,975,1150],housePrice:150, mortgage: 130 },
  { id: 28, name: 'Water Works',          type: 'utility',  color: 'utility',    price: 150, utilityMultiplier: [4,10],     mortgage: 75 },
  { id: 29, name: 'Marvin Gardens',       type: 'property', color: 'yellow',     price: 280, rent: [24,120,360,850,1025,1200],housePrice:150,mortgage: 140 },
  { id: 30, name: 'Go To Jail',           type: 'go_to_jail' },
  { id: 31, name: 'Pacific Ave',          type: 'property', color: 'green',      price: 300, rent: [26,130,390,900,1100,1275],housePrice:200,mortgage: 150 },
  { id: 32, name: 'North Carolina Ave',   type: 'property', color: 'green',      price: 300, rent: [26,130,390,900,1100,1275],housePrice:200,mortgage: 150 },
  { id: 33, name: 'Community Chest',      type: 'community' },
  { id: 34, name: 'Pennsylvania Ave',     type: 'property', color: 'green',      price: 320, rent: [28,150,450,1000,1200,1400],housePrice:200,mortgage: 160 },
  { id: 35, name: 'Short Line Railroad',  type: 'railroad', color: 'railroad',   price: 200, railroadRent: [25,50,100,200], mortgage: 100 },
  { id: 36, name: 'Chance',              type: 'chance' },
  { id: 37, name: 'Park Place',           type: 'property', color: 'dark_blue',  price: 350, rent: [35,175,500,1100,1300,1500],housePrice:200,mortgage: 175 },
  { id: 38, name: 'Luxury Tax',           type: 'tax', taxAmount: 75 },
  { id: 39, name: 'Boardwalk',            type: 'property', color: 'dark_blue',  price: 400, rent: [50,200,600,1400,1700,2000],housePrice:200,mortgage: 200 },
];

export const COLOR_GROUP_SIZES: Record<string, number> = {
  brown: 2, light_blue: 3, pink: 3, orange: 3,
  red: 3, yellow: 3, green: 3, dark_blue: 2,
  railroad: 4, utility: 2,
};

export function initProperties(): Property[] {
  return BOARD
    .filter(s => s.type === 'property' || s.type === 'railroad' || s.type === 'utility')
    .map(s => ({ squareId: s.id, ownerId: null, houses: 0, mortgaged: false }));
}

export function getSquare(id: number): Square {
  return BOARD[id];
}

export const RAILROAD_IDS = [5, 15, 25, 35];
export const UTILITY_IDS  = [12, 28];

export function nearestRailroad(pos: number): number {
  if (pos < 5 || pos >= 35) return 5;
  if (pos < 15) return 15;
  if (pos < 25) return 25;
  return 35;
}
export function nearestUtility(pos: number): number {
  if (pos < 12 || pos >= 28) return 12;
  return 28;
}
