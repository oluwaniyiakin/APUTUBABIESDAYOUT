/* ============================================================
   APUTU: Baby's Day Out — src/data/events.ts
   "Challenge Events" — the brief's replacement for boss levels.
   Every so often the street throws a themed curveball at the
   player for a short while, then calms down again.
   ============================================================ */

import type { ChallengeEventDef } from '../types';

export const CHALLENGE_EVENTS: ChallengeEventDef[] = [
  {
    id: 'traffic_jam',
    name: 'Traffic Jam!',
    emoji: '🚦',
    message: 'Vehicles everywhere — keep tapping!',
    duration: 14, spawnMul: 0.55,
    forcedHazards: ['car', 'bus', 'motorcycle'],
    weight: 3,
  },
  {
    id: 'runaway_goat',
    name: 'Runaway Goat!',
    emoji: '🐐',
    message: 'A goat is on the loose — hold to distract it!',
    duration: 12, spawnMul: 0.7,
    forcedHazards: ['goat', 'chicken'],
    weight: 2,
  },
  {
    id: 'heavy_rain',
    name: 'Heavy Rain',
    emoji: '🌧️',
    message: 'Puddles are popping up all over.',
    duration: 16, spawnMul: 0.8,
    forcedHazards: ['puddle', 'gutter', 'car'],
    weather: 'storm',
    weight: 3,
  },
  {
    id: 'power_outage',
    name: 'Power Outage',
    emoji: '🔦',
    message: 'Lights out! Watch for loose wires.',
    duration: 13, spawnMul: 0.8,
    forcedHazards: ['wire', 'barrel', 'cart'],
    dark: true,
    weight: 2,
  },
  {
    id: 'festival_parade',
    name: 'Festival Parade!',
    emoji: '🥁',
    message: 'Drums, dancers and a whole lot of confetti.',
    duration: 14, spawnMul: 0.75,
    forcedHazards: ['cart', 'chicken', 'dog', 'goat'],
    weather: 'confetti',
    coinRain: true,
    weight: 2,
  },
  {
    id: 'broken_light',
    name: 'Broken Traffic Light',
    emoji: '🚥',
    message: 'Nobody is stopping — cars are coming fast!',
    duration: 12, spawnMul: 0.6,
    forcedHazards: ['car', 'motorcycle'],
    weight: 2,
  },
  {
    id: 'golden_hour',
    name: 'Golden Hour',
    emoji: '✨',
    message: 'A lucky break — coins are everywhere!',
    duration: 10, spawnMul: 1.4,
    coinRain: true,
    weather: 'fireflies',
    weight: 1,
  },
];

export function getEvent(id: string): ChallengeEventDef | undefined {
  return CHALLENGE_EVENTS.find(e => e.id === id);
}
