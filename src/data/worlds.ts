/* ============================================================
   APUTU: Baby's Day Out — src/data/worlds.ts
   All playable neighborhoods. Each world defines its visual
   theme (sky/road/ground colors), which hazard ids are allowed
   to spawn in it, unlock requirements, and flavor text.

   Worlds are unlocked by total lifetime distance crawled
   (Storage.loadProgress().totalDistance).
   ============================================================ */

import type { WorldDef } from '../types';

export const WORLDS: WorldDef[] = [
  {
    id: 'residential',
    name: 'Residential Street',
    subtitle: 'Where it all begins',
    unlockAtDistance: 0,
    colors: {
      skyTop: '#8FD3F4', skyBottom: '#BEE3F5',
      road: '#D9C7A8', roadShade: '#C7B292',
      ground: '#3F9C6B', groundShade: '#2C7A50',
      buildings: 'rgba(46, 67, 116, 0.25)',
    },
    hazardIds: ['car', 'dog', 'puddle', 'motorcycle', 'chicken'],
    ambience: 'birds',
    flavor: 'Quiet houses, parked cars, and a very determined toddler.',
  },
  {
    id: 'marketplace',
    name: 'Marketplace',
    subtitle: 'Loud, colorful, chaotic',
    unlockAtDistance: 150,
    colors: {
      skyTop: '#9FD8E8', skyBottom: '#F5E4C3',
      road: '#E3C79A', roadShade: '#CBA96F',
      ground: '#D9364A', groundShade: '#A82638',
      buildings: 'rgba(217, 150, 62, 0.3)',
    },
    hazardIds: ['cart', 'chicken', 'motorcycle', 'gutter', 'goat', 'dog'],
    ambience: 'market',
    flavor: 'Fruit stalls, fabric sellers, and a hundred reasons to be curious.',
  },
  {
    id: 'bus-stop',
    name: 'Bus Stop',
    subtitle: 'Big vehicles, bigger hazards',
    unlockAtDistance: 320,
    colors: {
      skyTop: '#8FBEE8', skyBottom: '#DDEAF5',
      road: '#B8B0A2', roadShade: '#9A9284',
      ground: '#5B7A9C', groundShade: '#3F5A78',
      buildings: 'rgba(46, 67, 116, 0.35)',
    },
    hazardIds: ['bus', 'car', 'motorcycle', 'puddle', 'construction'],
    ambience: 'traffic',
    flavor: 'Commuters, danfo buses, and engines everywhere.',
  },
  {
    id: 'construction-site',
    name: 'Construction Site',
    subtitle: 'Watch every step',
    unlockAtDistance: 500,
    colors: {
      skyTop: '#E8C88F', skyBottom: '#F5DFC0',
      road: '#C7A96F', roadShade: '#A5895A',
      ground: '#8C6A4F', groundShade: '#6B4F38',
      buildings: 'rgba(140, 106, 79, 0.4)',
    },
    hazardIds: ['construction', 'barrel', 'wire', 'gutter', 'car'],
    ambience: 'construction',
    flavor: 'Cranes, cones, and half-built walls. Extra caution needed.',
  },
  {
    id: 'playground',
    name: 'Playground',
    subtitle: 'Fun for everyone (carefully)',
    unlockAtDistance: 680,
    colors: {
      skyTop: '#A6E3F2', skyBottom: '#F5F0DC',
      road: '#E8D9B0', roadShade: '#D0C090',
      ground: '#F5B942', groundShade: '#D99A2C',
      buildings: 'rgba(242, 99, 123, 0.25)',
    },
    hazardIds: ['chicken', 'puddle', 'dog', 'cart'],
    ambience: 'playground',
    flavor: 'Swings, seesaws, and other babies to wave at.',
  },
  {
    id: 'school-road',
    name: 'School Road',
    subtitle: 'Rush hour for tiny feet',
    unlockAtDistance: 900,
    colors: {
      skyTop: '#93CDEA', skyBottom: '#E4EEF5',
      road: '#D4C7AC', roadShade: '#B8AB90',
      ground: '#3F9C6B', groundShade: '#2C7A50',
      buildings: 'rgba(46, 67, 116, 0.3)',
    },
    hazardIds: ['car', 'motorcycle', 'bus', 'gutter', 'cart'],
    ambience: 'school',
    flavor: 'Uniforms, backpacks, and buses lining up.',
  },
  {
    id: 'river-crossing',
    name: 'River Crossing',
    subtitle: 'Water everywhere',
    unlockAtDistance: 1150,
    colors: {
      skyTop: '#7FC8E8', skyBottom: '#CDEAF2',
      road: '#8FA8B8', roadShade: '#6F8898',
      ground: '#2E4374', groundShade: '#1E2E52',
      buildings: 'rgba(46, 67, 116, 0.2)',
    },
    hazardIds: ['puddle', 'gutter', 'barrel', 'construction'],
    ambience: 'river',
    flavor: 'Floating bridges and boats drifting lazily by.',
  },
  {
    id: 'village-road',
    name: 'Village Road',
    subtitle: 'Dust, goats, and open sky',
    unlockAtDistance: 1400,
    colors: {
      skyTop: '#F0D9A0', skyBottom: '#FBEFD4',
      road: '#D4B683', roadShade: '#B89860',
      ground: '#C68642', groundShade: '#9C6830',
      buildings: 'rgba(140, 106, 79, 0.3)',
    },
    hazardIds: ['goat', 'chicken', 'dog', 'cart', 'motorcycle'],
    ambience: 'village',
    flavor: 'Wide open paths and a whole lot of livestock.',
  },
  {
    id: 'city-center',
    name: 'City Center',
    subtitle: 'Fast, tall, and busy',
    unlockAtDistance: 1650,
    colors: {
      skyTop: '#7FA8E0', skyBottom: '#C4D6F0',
      road: '#A8A8A8', roadShade: '#888888',
      ground: '#3A2A1E', groundShade: '#241811',
      buildings: 'rgba(46, 67, 116, 0.5)',
    },
    hazardIds: ['car', 'bus', 'motorcycle', 'construction', 'wire'],
    ambience: 'city',
    flavor: 'Skyscrapers and a river of honking cars.',
  },
  {
    id: 'park',
    name: 'The Park',
    subtitle: 'A little green pocket',
    unlockAtDistance: 1900,
    colors: {
      skyTop: '#A0E0C8', skyBottom: '#E8F5EA',
      road: '#D9C7A8', roadShade: '#C0AE8C',
      ground: '#3F9C6B', groundShade: '#276B47',
      buildings: 'rgba(63, 156, 107, 0.25)',
    },
    hazardIds: ['dog', 'chicken', 'puddle', 'cart'],
    ambience: 'park',
    flavor: 'Picnics, ducks, and a very tempting pond.',
  },
  {
    id: 'farm-road',
    name: 'Farm Road',
    subtitle: 'Animals as far as the eye can see',
    unlockAtDistance: 2150,
    colors: {
      skyTop: '#B8DCEE', skyBottom: '#F0E8CC',
      road: '#C4A876', roadShade: '#A88B58',
      ground: '#8C6A4F', groundShade: '#6B4F38',
      buildings: 'rgba(140, 106, 79, 0.2)',
    },
    hazardIds: ['goat', 'chicken', 'dog', 'barrel', 'gutter'],
    ambience: 'farm',
    flavor: 'Barns, tractors, and curious farm animals.',
  },
  {
    id: 'bridge',
    name: 'The Bridge',
    subtitle: 'Nowhere to go but forward',
    unlockAtDistance: 2400,
    colors: {
      skyTop: '#6FA8D8', skyBottom: '#B8D8E8',
      road: '#8C8C8C', roadShade: '#6E6E6E',
      ground: '#2E4374', groundShade: '#1A2A50',
      buildings: 'rgba(46, 67, 116, 0.15)',
    },
    hazardIds: ['construction', 'barrel', 'car', 'wire'],
    ambience: 'bridge',
    flavor: 'High above the water, cables humming in the wind.',
  },
  {
    id: 'festival-street',
    name: 'Festival Street',
    subtitle: 'Music, color, celebration',
    unlockAtDistance: 2650,
    colors: {
      skyTop: '#F2637B', skyBottom: '#FBEFD4',
      road: '#E8963E', roadShade: '#C97324',
      ground: '#5B3A8E', groundShade: '#3E2760',
      buildings: 'rgba(245, 185, 66, 0.35)',
    },
    hazardIds: ['cart', 'chicken', 'motorcycle', 'goat', 'dog'],
    ambience: 'festival',
    flavor: 'Drums, dancers, and streamers everywhere Aputu looks.',
  },
  {
    id: 'night-market',
    name: 'Night Market',
    subtitle: 'Lanterns and long shadows',
    unlockAtDistance: 2900,
    colors: {
      skyTop: '#1E2E52', skyBottom: '#3E2760',
      road: '#4A3A2E', roadShade: '#2E241C',
      ground: '#241611', groundShade: '#140C08',
      buildings: 'rgba(245, 185, 66, 0.4)',
    },
    hazardIds: ['cart', 'motorcycle', 'gutter', 'wire', 'car'],
    ambience: 'night',
    flavor: 'Fairy lights, sizzling suya, and low visibility.',
    nightMode: true,
  },
  {
    id: 'industrial-zone',
    name: 'Industrial Zone',
    subtitle: 'The toughest streets yet',
    unlockAtDistance: 3200,
    colors: {
      skyTop: '#6E7A8C', skyBottom: '#B0B8C0',
      road: '#7A7A7A', roadShade: '#5C5C5C',
      ground: '#3A2A1E', groundShade: '#241811',
      buildings: 'rgba(58, 42, 30, 0.5)',
    },
    hazardIds: ['barrel', 'wire', 'construction', 'bus', 'car'],
    ambience: 'industrial',
    flavor: 'Warehouses, forklifts, and every hazard at once.',
  },
];

/** Returns the highest-unlocked world for a given total lifetime distance. */
export function currentWorldForDistance(totalDistance: number): WorldDef {
  let best = WORLDS[0];
  for (const w of WORLDS) {
    if (totalDistance >= w.unlockAtDistance) best = w;
  }
  return best;
}

export function isWorldUnlocked(worldId: string, totalDistance: number): boolean {
  const w = WORLDS.find(w => w.id === worldId);
  if (!w) return false;
  return totalDistance >= w.unlockAtDistance;
}
