/* ============================================================
   APUTU: Baby's Day Out — src/core/hazards.ts
   Hazard type definitions + fix-action config, plus the runtime
   Hazard instance class and difficulty/world filtering helpers.
   ============================================================ */

import type { HazardType, WorldDef } from '../types';

export const HAZARD_TYPES: HazardType[] = [
  { id: 'car', vehicle: true, speed: 55, emoji: '🚗', label: 'Car', color: '#D9364A', fixType: 'tap', fixLabel: 'Stop!', fixHint: 'Tap to stop traffic', width: 104, height: 58 },
  { id: 'motorcycle', vehicle: true, speed: 90, emoji: '🏍️', label: 'Okada', color: '#2E4374', fixType: 'tap', fixLabel: 'Halt!', fixHint: 'Tap to wave it down', width: 80, height: 56 },
  { id: 'gutter', emoji: '🕳️', label: 'Open Gutter', color: '#5B4632', fixType: 'drag', fixLabel: 'Cover placed!', fixHint: 'Drag a plank over it', width: 84, height: 38 },
  { id: 'dog', emoji: '🐕', label: 'Sleepy Dog', color: '#B8763F', fixType: 'tap', fixLabel: 'Shoo!', fixHint: 'Tap to gently shoo', width: 64, height: 44 },
  { id: 'cart', emoji: '🛒', label: 'Market Cart', color: '#3F9C6B', fixType: 'drag', fixLabel: 'Pushed aside!', fixHint: 'Drag the cart away', width: 78, height: 52 },
  { id: 'puddle', emoji: '💧', label: 'Puddle', color: '#4A6FA5', fixType: 'tap', fixLabel: 'Mopped!', fixHint: 'Tap to place a mat', width: 74, height: 34 },
  { id: 'barrel', speed: 45, emoji: '🛢️', label: 'Rolling Barrel', color: '#8C6A4F', fixType: 'tap', fixLabel: 'Redirected!', fixHint: 'Tap to push it aside', width: 58, height: 58 },
  { id: 'goat', speed: 28, emoji: '🐐', label: 'Angry Goat', color: '#C68642', fixType: 'hold', fixLabel: 'Distracted!', fixHint: 'Hold to offer food', width: 66, height: 52 },
  { id: 'construction', emoji: '🚧', label: 'Construction', color: '#F5B942', fixType: 'drag', fixLabel: 'Cone moved!', fixHint: 'Drag cones out of the way', width: 90, height: 60 },
  { id: 'wire', emoji: '⚡', label: 'Loose Wire', color: '#E8963E', fixType: 'hold', fixLabel: 'Power off!', fixHint: 'Hold the switch', width: 54, height: 70 },
  { id: 'bus', vehicle: true, speed: 40, emoji: '🚌', label: 'Bus', color: '#2E7D5B', fixType: 'tap', fixLabel: 'Stopped!', fixHint: 'Tap to signal stop', width: 132, height: 70 },
  { id: 'chicken', speed: 22, emoji: '🐔', label: 'Wild Chicken', color: '#F2637B', fixType: 'tap', fixLabel: 'Scattered!', fixHint: 'Tap to clear the path', width: 46, height: 42 },
];

/** Hazards unlocked at a given world-progress (meters), used to gently
 *  ramp difficulty over a session regardless of which world you're in. */
export function hazardsForDistance(distance: number): HazardType[] {
  if (distance < 150) return HAZARD_TYPES.filter(h => ['car', 'dog', 'puddle'].includes(h.id));
  if (distance < 400) return HAZARD_TYPES.filter(h => ['car', 'dog', 'puddle', 'gutter', 'motorcycle', 'chicken'].includes(h.id));
  if (distance < 800) return HAZARD_TYPES.filter(h => !['wire', 'bus'].includes(h.id));
  return HAZARD_TYPES;
}

/** Hazards allowed in a specific world, further filtered by the
 *  distance-gated difficulty pool. Falls back to the full distance
 *  pool if the world doesn't restrict hazards. */
export function hazardsForWorld(world: WorldDef | null | undefined, distance: number): HazardType[] {
  const byDistance = hazardsForDistance(distance);
  if (!world?.hazardIds) return byDistance;
  const filtered = byDistance.filter(h => world.hazardIds.includes(h.id));
  // Late-game worlds shouldn't start with a single repeated hazard: fall back
  // to the world's full roster whenever the difficulty gate leaves < 2 types.
  if (filtered.length >= 2) return filtered;
  return HAZARD_TYPES.filter(h => world.hazardIds.includes(h.id));
}

/** A single spawned hazard instance in the world. */
export class Hazard {
  type: HazardType;
  worldX: number;
  laneY: number;
  solved = false;
  /** Seconds since the hazard was solved (drives the "fixed" animation). */
  solveT = 0;
  solveProgress = 0;
  spawnTime: number;
  id: string;
  /** Cosmetic variation (car colour, etc). */
  variant: number;
  /** px/sec this particular hazard drifts toward the baby. */
  speed: number;
  /** Phase offset so wheels / legs don't animate in lock-step. */
  phase: number;
  /** True once the baby has crawled past without being blocked. */
  passed = false;

  constructor(type: HazardType, worldX: number, laneY: number) {
    this.type = type;
    this.worldX = worldX;
    this.laneY = laneY;
    this.spawnTime = performance.now();
    this.id = Math.random().toString(36).slice(2);
    this.variant = Math.floor(Math.random() * 4);
    this.speed = (type.speed ?? 0) * (0.85 + Math.random() * 0.3);
    this.phase = Math.random() * Math.PI * 2;
  }
}
