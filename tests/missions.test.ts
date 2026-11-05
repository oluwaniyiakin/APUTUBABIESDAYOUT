import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS, MISSION_TEMPLATES, checkNewAchievements, getDailyMissions } from '../src/data/missions';

describe('mission templates', () => {
  it('has unique mission ids', () => {
    const ids = MISSION_TEMPLATES.map(m => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every mission has a positive target and reward', () => {
    for (const m of MISSION_TEMPLATES) {
      expect(m.target).toBeGreaterThan(0);
      expect(m.reward).toBeGreaterThan(0);
    }
  });
});

describe('getDailyMissions', () => {
  it('always returns exactly 3 missions', () => {
    const { missions } = getDailyMissions();
    expect(missions.length).toBe(3);
  });

  it('returns 3 distinct missions (no duplicates)', () => {
    const { missions } = getDailyMissions();
    const ids = missions.map(m => m.id);
    expect(new Set(ids).size).toBe(3);
  });

  it('is deterministic within the same call session (same date)', () => {
    const a = getDailyMissions();
    const b = getDailyMissions();
    expect(a.missions.map(m => m.id)).toEqual(b.missions.map(m => m.id));
    expect(a.date).toBe(b.date);
  });
});

describe('achievements', () => {
  it('has unique achievement ids', () => {
    const ids = ACHIEVEMENTS.map(a => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every achievement has a check function', () => {
    for (const a of ACHIEVEMENTS) {
      expect(typeof a.check).toBe('function');
    }
  });
});

describe('checkNewAchievements', () => {
  const baseStats = {
    totalRuns: 0, totalDistance: 0, totalSaves: 0, bestCombo: 0,
    totalCoins: 0, bestPerfectRun: 0,
  };

  it('returns first_steps once totalRuns >= 1', () => {
    const newly = checkNewAchievements({ ...baseStats, totalRuns: 1 }, []);
    expect(newly).toContain('first_steps');
  });

  it('does not return an already-unlocked achievement', () => {
    const newly = checkNewAchievements({ ...baseStats, totalRuns: 1 }, ['first_steps']);
    expect(newly).not.toContain('first_steps');
  });

  it('can unlock multiple achievements at once', () => {
    const newly = checkNewAchievements(
      { ...baseStats, totalRuns: 1, totalDistance: 5000, totalSaves: 500 },
      []
    );
    expect(newly).toContain('first_steps');
    expect(newly).toContain('explorer_5000');
    expect(newly).toContain('saver_500');
  });

  it('returns an empty array when nothing new qualifies', () => {
    const newly = checkNewAchievements(baseStats, []);
    expect(newly).toEqual([]);
  });
});
