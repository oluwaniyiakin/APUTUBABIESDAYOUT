/* ============================================================
   APUTU: Baby's Day Out — src/data/levels.ts
   Player level & title, driven by XP earned from run scores.
   Level n needs 60 * (n-1)^2 total XP, so early levels come
   quickly and later ones stretch out.
   ============================================================ */

export const LEVEL_TITLES = [
  'Curious Cousin', 'Junior Guardian', 'Street Scout', 'Safety Star',
  'Neighbourhood Hero', 'Guardian Angel', 'Legend of the Block',
];

export interface LevelInfo {
  level: number;
  title: string;
  /** XP earned inside the current level. */
  into: number;
  /** XP required to complete the current level. */
  need: number;
}

export function xpForLevel(level: number): number {
  return 60 * (level - 1) * (level - 1);
}

export function levelInfo(xp: number): LevelInfo {
  const level = Math.floor(Math.sqrt(Math.max(0, xp) / 60)) + 1;
  const start = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return {
    level,
    title: LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)],
    into: xp - start,
    need: next - start,
  };
}
