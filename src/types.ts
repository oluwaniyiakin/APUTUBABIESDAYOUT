/* ============================================================
   APUTU: Baby's Day Out — src/types.ts
   Shared type definitions. Kept in one file so data modules,
   core engine modules, and UI modules all agree on shapes
   without circular type-only imports.
   ============================================================ */

export type Gender = 'boy' | 'girl' | 'neutral';
export type HairStyle = 'puffs' | 'curls' | 'locs' | 'bald' | 'braids';
export type SkinToneId = 'tone1' | 'tone2' | 'tone3' | 'tone4' | 'tone5';
export type FixType = 'tap' | 'drag' | 'hold';

export interface Customization {
  gender: Gender;
  skin: SkinToneId;
  outfit: string;
  hair: HairStyle;
  nanny: string;
}

export interface OutfitColors {
  body: string;
  accent: string;
}

export interface ShopOutfit extends OutfitColors {
  id: string;
  name: string;
  cost: number;
  starter?: boolean;
}

export interface NannyPerk {
  type:
    | 'none' | 'extra_life' | 'slow_start' | 'coin_boost' | 'combo_grace'
    | 'wider_window' | 'auto_solve' | 'shield_start' | 'community_watch'
    | 'xp_boost' | 'traffic_control' | 'hazard_immunity';
  value?: number;
  label: string;
}

export interface Nanny {
  id: string;
  name: string;
  emoji: string;
  cost: number;
  unlocked: boolean;
  perk: NannyPerk;
  rescueLines: string[];
}

export interface WorldColors {
  skyTop: string; skyBottom: string;
  road: string; roadShade: string;
  ground: string; groundShade: string;
  buildings: string;
}

export interface WorldDef {
  id: string;
  name: string;
  subtitle: string;
  unlockAtDistance: number;
  colors: WorldColors;
  hazardIds: string[];
  ambience: string;
  flavor: string;
  nightMode?: boolean;
}

export interface HazardType {
  id: string;
  emoji: string;
  label: string;
  color: string;
  fixType: FixType;
  fixLabel: string;
  fixHint: string;
  width: number;
  height: number;
  /** px/sec the hazard drifts toward the baby (0 = stationary). */
  speed?: number;
  /** Vehicles are affected by Freeze Traffic and the Police perk. */
  vehicle?: boolean;
}

export interface PowerupType {
  id: string;
  name: string;
  emoji: string;
  color: string;
  duration: number; // seconds, 0 = instant/charge-based
  rarity: number;
  description: string;
}

export interface MissionTemplate {
  id: string;
  label: string;
  target: number;
  stat: 'saves' | 'distance' | 'coins' | 'maxCombo' | 'dogsSolved' | 'guttersSolved' | 'distanceNoPowerup';
  reward: number;
}

export interface Achievement {
  id: string;
  name: string;
  desc: string;
  emoji: string;
  check: (stats: LifetimeStatsForAchievements) => boolean;
}

export interface LifetimeStatsForAchievements {
  totalRuns: number;
  totalDistance: number;
  totalSaves: number;
  bestCombo: number;
  totalCoins: number;
  nanniesOwned?: string[];
  outfitsOwned?: string[];
  missionStreak?: number;
  bestPerfectRun: number;
}

export interface ProgressData {
  coins: number;
  totalDistance: number;
  bestDistance: number;
  totalRuns: number;
  totalSaves: number;
  totalCoins: number;
  bestCombo: number;
  bestPerfectRun: number;
  outfitsOwned: string[];
  nanniesOwned: string[];
  missionStreak: number;
  bestScores: Record<string, number>;
  discoveries: string[];
  totalStars: number;
  xp: number;
}

export interface SettingsData {
  musicOn: boolean;
  sfxOn: boolean;
  colorblindMode: boolean;
  reduceMotion: boolean;
  hints: boolean;
  seenIntro: boolean;
  lastMode: string;
}

export interface MissionState {
  date: string;
  progress: Record<string, number>;
  claimed: string[];
  streak: number;
}

export interface RunStats {
  distance: number;
  coins: number;
  saves: number;
  maxCombo: number;
  perfect: boolean;
  usedPowerup: boolean;
  hazardTypeCounts: Record<string, number>;
  mode?: string;
  score?: number;
  stars?: number;
  /** Multiplier applied to daily-mission progress (Teacher perk). */
  missionBoost?: number;
}


/* ---------------- Visual / behaviour types ---------------- */

export type Expression =
  | 'happy' | 'laugh' | 'curious' | 'surprised' | 'sleepy' | 'cry' | 'pout' | 'sneeze';

export type BabyPose =
  | 'crawl' | 'sit' | 'wave' | 'clap' | 'sniff' | 'pet' | 'reach' | 'sneeze' | 'yawn' | 'cry';

export interface BabyLook {
  gender: Gender;
  skin: string;      // hex
  hair: HairStyle;
  hairColor: string; // hex
  outfitId: string;
  body: string;      // outfit main colour
  accent: string;    // outfit accent colour
}

export interface BabyDrawState {
  pose: BabyPose;
  expression: Expression;
  phase: number;     // crawl / animation phase in radians
  time: number;      // seconds, for blinking etc
  lookBack: number;  // 0..1, how far the head is turned back
}

export type WeatherMode = 'clear' | 'rain' | 'storm' | 'wind' | 'fireflies' | 'dust' | 'confetti';

export interface GameMode {
  id: string;
  name: string;
  emoji: string;
  tagline: string;
  description: string;
  speedMul: number;        // multiplies crawl speed
  spawnMul: number;        // multiplies hazard spawn interval (lower = busier)
  coinMul: number;
  rampSpeed: boolean;      // speed grows over time
  failEnds: boolean;       // a missed hazard ends the run
  allowFreeSaves: boolean; // nanny perks / shields / extra lives work
  eventsEnabled: boolean;
  timeLimit?: number;      // seconds (Time Attack)
  /** Score needed for 1, 2 and 3 stars. */
  stars: [number, number, number];
}

export interface ChallengeEventDef {
  id: string;
  name: string;
  emoji: string;
  message: string;
  duration: number;        // seconds
  spawnMul: number;        // multiplies the spawn interval while active
  forcedHazards?: string[];
  weather?: WeatherMode;
  dark?: boolean;
  coinRain?: boolean;
  weight: number;
}

export interface ScrapbookEntry {
  id: string;              // e.g. hazard:car, world:park, moment:flower
  kind: 'hazard' | 'world' | 'moment';
  title: string;
  caption: string;
}

export type InterestKind = 'flower' | 'butterfly' | 'balloon' | 'cat';

export interface GameOverInfo {
  mode: GameMode;
  guardianId: string;
  distance: number;
  coins: number;
  saves: number;
  score: number;
  stars: number;
  bestScore: number;
  newBest: boolean;
  rescueLine: string;
  newAchievements: string[];
  levelUp: { from: number; to: number; title: string } | null;
  xpGained: number;
  timeUp: boolean;
}
