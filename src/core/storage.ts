/* ============================================================
   APUTU: Baby's Day Out — src/core/storage.ts
   Single source of truth for everything persisted to
   localStorage: customization, lifetime stats, unlocks,
   missions/streaks, and settings.
   ============================================================ */

import type {
  Customization, MissionState, ProgressData, RunStats, SettingsData,
} from '../types';
import { checkNewAchievements, getDailyMissions } from '../data/missions';
import { levelInfo } from '../data/levels';
import { getMode } from '../data/modes';

const KEYS = {
  CUSTOMIZATION: 'aputu_customization_v2',
  PROGRESS: 'aputu_progress_v2',
  SETTINGS: 'aputu_settings_v1',
  MISSIONS: 'aputu_missions_v1',
  ACHIEVEMENTS: 'aputu_achievements_v1',
} as const;

interface AchievementsData { unlocked: string[]; }
interface StoredMissionState { date: string; progress: Record<string, number>; claimed: string[]; streak: number; lastCompletedDate?: string; }

function read<T extends object>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { ...fallback };
    return { ...fallback, ...JSON.parse(raw) };
  } catch {
    return { ...fallback };
  }
}

function write<T>(key: string, value: T): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota / privacy mode */ }
}

export const Storage = {
  /* ---------------- Customization ---------------- */
  loadCustomization(): Customization {
    return read<Customization>(KEYS.CUSTOMIZATION, {
      gender: 'boy', skin: 'tone2', outfit: 'ankara', hair: 'puffs', nanny: 'nanny',
    });
  },
  saveCustomization(data: Customization): void {
    write(KEYS.CUSTOMIZATION, data);
  },

  /* ---------------- Lifetime progress / economy ---------------- */
  loadProgress(): ProgressData {
    return read<ProgressData>(KEYS.PROGRESS, {
      coins: 0,
      totalDistance: 0,
      bestDistance: 0,
      totalRuns: 0,
      totalSaves: 0,
      totalCoins: 0,
      bestCombo: 0,
      bestPerfectRun: 0,
      outfitsOwned: ['ankara', 'explorer', 'superhero', 'astronaut', 'pirate', 'royal'],
      nanniesOwned: ['nanny'],
      missionStreak: 0,
      bestScores: {},
      discoveries: [],
      totalStars: 0,
      xp: 0,
    });
  },
  saveProgress(data: ProgressData): void {
    write(KEYS.PROGRESS, data);
  },

  /** Applies a finished run to lifetime progress; returns updated progress,
   *  newly unlocked achievements, score/stars and any level-up. */
  applyRunResult(runStats: RunStats): {
    progress: ProgressData;
    newAchievements: string[];
    score: number;
    stars: number;
    newBest: boolean;
    levelUp: { from: number; to: number; title: string } | null;
    xpGained: number;
  } {
    const p = this.loadProgress();
    const modeId = runStats.mode ?? 'endless';
    const mode = getMode(modeId);
    const score = runStats.score ?? (runStats.distance + runStats.saves * 10 + runStats.coins + runStats.maxCombo * 5);
    const stars = mode.stars.filter(t => score >= t).length;
    const levelBefore = levelInfo(p.xp).level;
    const xpGained = Math.max(5, Math.round(score / 3));

    p.coins += runStats.coins;
    p.totalCoins += runStats.coins;
    p.totalDistance += runStats.distance;
    p.bestDistance = Math.max(p.bestDistance, runStats.distance);
    p.totalRuns += 1;
    p.totalSaves += runStats.saves;
    p.bestCombo = Math.max(p.bestCombo, runStats.maxCombo || 0);
    if (runStats.perfect) p.bestPerfectRun = Math.max(p.bestPerfectRun, runStats.saves);
    const newBest = score > (p.bestScores[modeId] ?? 0);
    if (newBest) p.bestScores[modeId] = score;
    p.totalStars += stars;
    p.xp += xpGained;
    this.saveProgress(p);

    const achievements = this.loadAchievements();
    const newly = checkNewAchievements({ ...p }, achievements.unlocked);
    if (newly.length) {
      achievements.unlocked.push(...newly);
      this.saveAchievements(achievements);
    }
    const info = levelInfo(p.xp);
    const levelUp = info.level > levelBefore ? { from: levelBefore, to: info.level, title: info.title } : null;
    return { progress: p, newAchievements: newly, score, stars, newBest, levelUp, xpGained };
  },

  /** Records a scrapbook discovery. Returns true the first time only. */
  discover(id: string): boolean {
    const p = this.loadProgress();
    if (p.discoveries.includes(id)) return false;
    p.discoveries.push(id);
    this.saveProgress(p);
    return true;
  },

  spendCoins(amount: number): boolean {
    const p = this.loadProgress();
    if (p.coins < amount) return false;
    p.coins -= amount;
    this.saveProgress(p);
    return true;
  },

  unlockOutfit(id: string): void {
    const p = this.loadProgress();
    if (!p.outfitsOwned.includes(id)) p.outfitsOwned.push(id);
    this.saveProgress(p);
  },

  unlockNanny(id: string): void {
    const p = this.loadProgress();
    if (!p.nanniesOwned.includes(id)) p.nanniesOwned.push(id);
    this.saveProgress(p);
  },

  /* ---------------- Settings ---------------- */
  loadSettings(): SettingsData {
    return read<SettingsData>(KEYS.SETTINGS, {
      musicOn: true, sfxOn: true, colorblindMode: false, reduceMotion: false,
      hints: true, seenIntro: false, lastMode: 'endless',
    });
  },
  saveSettings(data: SettingsData): void {
    write(KEYS.SETTINGS, data);
  },

  /* ---------------- Daily missions ---------------- */
  loadMissionState(): MissionState & { missions: ReturnType<typeof getDailyMissions>['missions'] } {
    const daily = getDailyMissions();
    const stored = read<StoredMissionState>(KEYS.MISSIONS, {
      date: '', progress: {}, claimed: [], streak: 0, lastCompletedDate: '',
    });

    if (stored.date !== daily.date) {
      const wasYesterdayFull = stored.claimed.length >= 3;
      const streak = wasYesterdayFull ? (stored.streak || 0) + 1 : 0;
      const fresh: StoredMissionState = { date: daily.date, progress: {}, claimed: [], streak };
      write(KEYS.MISSIONS, fresh);
      return { ...fresh, missions: daily.missions };
    }
    return { ...stored, missions: daily.missions };
  },

  updateMissionProgress(runStats: RunStats): void {
    const state = this.loadMissionState();
    const statMap: Record<string, number> = {
      saves: runStats.saves,
      distance: runStats.distance,
      coins: runStats.coins,
      maxCombo: runStats.maxCombo,
      dogsSolved: runStats.hazardTypeCounts?.dog ?? 0,
      guttersSolved: runStats.hazardTypeCounts?.gutter ?? 0,
      distanceNoPowerup: runStats.usedPowerup ? 0 : runStats.distance,
    };

    const boost = runStats.missionBoost ?? 1;
    for (const m of state.missions) {
      const val = Math.floor((statMap[m.stat] ?? 0) * boost);
      state.progress[m.id] = Math.max(state.progress[m.id] ?? 0, val);
    }
    write(KEYS.MISSIONS, {
      date: state.date, progress: state.progress, claimed: state.claimed, streak: state.streak,
    });
  },

  claimMission(missionId: string, reward: number): boolean {
    const state = this.loadMissionState();
    if (state.claimed.includes(missionId)) return false;
    state.claimed.push(missionId);
    write(KEYS.MISSIONS, {
      date: state.date, progress: state.progress, claimed: state.claimed, streak: state.streak,
    });
    const p = this.loadProgress();
    p.coins += reward;
    p.totalCoins += reward;
    if (state.claimed.length >= 3) p.missionStreak = state.streak + 1;
    this.saveProgress(p);
    return true;
  },

  /* ---------------- Achievements ---------------- */
  loadAchievements(): AchievementsData {
    return read<AchievementsData>(KEYS.ACHIEVEMENTS, { unlocked: [] });
  },
  saveAchievements(data: AchievementsData): void {
    write(KEYS.ACHIEVEMENTS, data);
  },
};
