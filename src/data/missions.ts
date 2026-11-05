/* ============================================================
   APUTU: Baby's Day Out — src/data/missions.ts
   Daily mission templates (3 rotate in per day) and the full
   achievement list. Both are evaluated against per-run /
   lifetime stats produced by the game engine and storage layer.
   ============================================================ */

import type { Achievement, LifetimeStatsForAchievements, MissionTemplate } from '../types';

export const MISSION_TEMPLATES: MissionTemplate[] = [
  { id: 'solve_10', label: 'Solve 10 hazards in one run', target: 10, stat: 'saves', reward: 40 },
  { id: 'solve_20', label: 'Solve 20 hazards in one run', target: 20, stat: 'saves', reward: 70 },
  { id: 'distance_200', label: 'Crawl 200m in one run', target: 200, stat: 'distance', reward: 50 },
  { id: 'distance_500', label: 'Crawl 500m in one run', target: 500, stat: 'distance', reward: 90 },
  { id: 'coins_100', label: 'Collect 100 coins in one run', target: 100, stat: 'coins', reward: 40 },
  { id: 'combo_5', label: 'Reach a 5x combo', target: 5, stat: 'maxCombo', reward: 60 },
  { id: 'combo_8', label: 'Reach an 8x combo', target: 8, stat: 'maxCombo', reward: 100 },
  { id: 'solve_dogs_3', label: 'Shoo 3 dogs in one run', target: 3, stat: 'dogsSolved', reward: 30 },
  { id: 'solve_gutters_3', label: 'Cover 3 open gutters', target: 3, stat: 'guttersSolved', reward: 35 },
  { id: 'no_powerups_run', label: 'Crawl 150m without a power-up', target: 150, stat: 'distanceNoPowerup', reward: 55 },
];

/** Picks 3 pseudo-random-but-daily-stable missions based on today's date string. */
export function getDailyMissions(): { date: string; missions: MissionTemplate[] } {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  let seed = 0;
  for (let i = 0; i < today.length; i++) seed = (seed * 31 + today.charCodeAt(i)) >>> 0;

  const pool = [...MISSION_TEMPLATES];
  const chosen: MissionTemplate[] = [];
  for (let i = 0; i < 3 && pool.length; i++) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    const idx = seed % pool.length;
    chosen.push(pool.splice(idx, 1)[0]);
  }
  return { date: today, missions: chosen };
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_steps', name: 'First Steps', desc: 'Complete your first run', emoji: '👣', check: (s) => s.totalRuns >= 1 },
  { id: 'explorer_100', name: 'Little Explorer', desc: 'Crawl 100m total (lifetime)', emoji: '🧭', check: (s) => s.totalDistance >= 100 },
  { id: 'explorer_1000', name: 'Neighborhood Legend', desc: 'Crawl 1000m total (lifetime)', emoji: '🗺️', check: (s) => s.totalDistance >= 1000 },
  { id: 'explorer_5000', name: 'City Wanderer', desc: 'Crawl 5000m total (lifetime)', emoji: '🌍', check: (s) => s.totalDistance >= 5000 },
  { id: 'saver_50', name: 'Safety Champion', desc: 'Solve 50 hazards total', emoji: '🛟', check: (s) => s.totalSaves >= 50 },
  { id: 'saver_500', name: 'Guardian Angel', desc: 'Solve 500 hazards total', emoji: '👼', check: (s) => s.totalSaves >= 500 },
  { id: 'combo_master', name: 'Combo Master', desc: 'Reach a 10x combo in one run', emoji: '🔥', check: (s) => s.bestCombo >= 10 },
  { id: 'rich_500', name: 'Piggy Bank', desc: 'Collect 500 coins total', emoji: '🐷', check: (s) => s.totalCoins >= 500 },
  { id: 'rich_2000', name: 'Coin Collector', desc: 'Collect 2000 coins total', emoji: '💰', check: (s) => s.totalCoins >= 2000 },
  { id: 'world_market', name: 'Market Regular', desc: 'Reach the Marketplace', emoji: '🧺', check: (s) => s.totalDistance >= 150 },
  { id: 'world_river', name: 'River Crosser', desc: 'Reach the River Crossing', emoji: '🌊', check: (s) => s.totalDistance >= 1150 },
  { id: 'world_industrial', name: 'Tough Streets', desc: 'Reach the Industrial Zone', emoji: '🏭', check: (s) => s.totalDistance >= 3200 },
  { id: 'nanny_collector', name: 'Family Reunion', desc: 'Unlock 5 different nannies', emoji: '👨‍👩‍👧‍👦', check: (s) => (s.nanniesOwned ?? []).length >= 5 },
  { id: 'fashionista', name: 'Fashionista', desc: 'Own 5 different outfits', emoji: '👗', check: (s) => (s.outfitsOwned ?? []).length >= 5 },
  { id: 'daily_streak_3', name: 'Habit Forming', desc: 'Complete daily missions 3 days in a row', emoji: '📅', check: (s) => (s.missionStreak ?? 0) >= 3 },
  { id: 'perfectionist', name: 'Not a Scratch', desc: 'Solve 15+ hazards without a single miss in one run', emoji: '✨', check: (s) => s.bestPerfectRun >= 15 },
];

export function checkNewAchievements(
  stats: LifetimeStatsForAchievements,
  alreadyUnlocked: string[]
): string[] {
  const newly: string[] = [];
  for (const a of ACHIEVEMENTS) {
    if (alreadyUnlocked.includes(a.id)) continue;
    if (a.check(stats)) newly.push(a.id);
  }
  return newly;
}
