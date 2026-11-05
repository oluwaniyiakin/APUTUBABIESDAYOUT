/* ============================================================
   APUTU: Baby's Day Out — src/data/modes.ts
   Game modes. Each is just a bundle of rule multipliers, so the
   engine has one code path and modes stay data-driven.
   ============================================================ */

import type { GameMode } from '../types';

export const MODES: GameMode[] = [
  {
    id: 'endless',
    name: 'Endless',
    emoji: '♾️',
    tagline: 'The classic adventure',
    description: 'Aputu crawls until a hazard gets him. Speed builds, the street gets busier, and challenge events roll in.',
    speedMul: 1, spawnMul: 1, coinMul: 1,
    rampSpeed: true, failEnds: true, allowFreeSaves: true, eventsEnabled: true,
    stars: [150, 400, 800],
  },
  {
    id: 'zen',
    name: 'Zen',
    emoji: '🌿',
    tagline: 'No pressure, just vibes',
    description: 'A calm, steady stroll. If a hazard gets through, Nanny gives a cuddle and Aputu carries on. Great for little hands.',
    speedMul: 0.8, spawnMul: 1.5, coinMul: 0.5,
    rampSpeed: false, failEnds: false, allowFreeSaves: true, eventsEnabled: false,
    stars: [100, 300, 600],
  },
  {
    id: 'time_attack',
    name: 'Time Attack',
    emoji: '⏱️',
    tagline: '90 seconds, max score',
    description: 'Rack up as many saves and coins as you can before the clock runs out. A miss ends the run early.',
    speedMul: 1.15, spawnMul: 0.85, coinMul: 1.25,
    rampSpeed: false, failEnds: true, allowFreeSaves: true, eventsEnabled: true,
    timeLimit: 90,
    stars: [250, 550, 900],
  },
  {
    id: 'hardcore',
    name: 'Hardcore',
    emoji: '🔥',
    tagline: 'For true guardians',
    description: 'Faster, busier, and no free saves — guardian perks and shields are switched off. Coins pay double.',
    speedMul: 1.25, spawnMul: 0.75, coinMul: 2,
    rampSpeed: true, failEnds: true, allowFreeSaves: false, eventsEnabled: true,
    stars: [200, 500, 1000],
  },
];

export function getMode(id: string): GameMode {
  return MODES.find(m => m.id === id) ?? MODES[0];
}
