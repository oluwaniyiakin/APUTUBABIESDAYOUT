import { beforeEach, describe, expect, it } from 'vitest';
import { Storage } from '../src/core/storage';
import type { RunStats } from '../src/types';

describe('Storage — customization', () => {
  beforeEach(() => localStorage.clear());

  it('returns sensible defaults when nothing is saved', () => {
    const c = Storage.loadCustomization();
    expect(c.gender).toBe('boy');
    expect(c.outfit).toBe('ankara');
    expect(c.nanny).toBe('nanny');
  });

  it('round-trips a saved customization', () => {
    Storage.saveCustomization({ gender: 'girl', skin: 'tone4', outfit: 'pirate', hair: 'braids', nanny: 'grandma' });
    const c = Storage.loadCustomization();
    expect(c).toEqual({ gender: 'girl', skin: 'tone4', outfit: 'pirate', hair: 'braids', nanny: 'grandma' });
  });
});

describe('Storage — progress & economy', () => {
  beforeEach(() => localStorage.clear());

  it('starts with the 6 starter outfits owned', () => {
    const p = Storage.loadProgress();
    expect(p.outfitsOwned).toContain('ankara');
    expect(p.outfitsOwned.length).toBe(6);
  });

  it('spendCoins fails when balance is insufficient', () => {
    const ok = Storage.spendCoins(100);
    expect(ok).toBe(false);
  });

  it('spendCoins succeeds and deducts balance', () => {
    const p = Storage.loadProgress();
    p.coins = 200;
    Storage.saveProgress(p);
    const ok = Storage.spendCoins(150);
    expect(ok).toBe(true);
    expect(Storage.loadProgress().coins).toBe(50);
  });

  it('unlockOutfit is idempotent', () => {
    Storage.unlockOutfit('robot');
    Storage.unlockOutfit('robot');
    const p = Storage.loadProgress();
    expect(p.outfitsOwned.filter(id => id === 'robot').length).toBe(1);
  });

  it('applyRunResult accumulates lifetime totals', () => {
    const stats: RunStats = {
      distance: 120, coins: 40, saves: 8, maxCombo: 4,
      perfect: true, usedPowerup: false, hazardTypeCounts: { dog: 2 },
    };
    const { progress } = Storage.applyRunResult(stats);
    expect(progress.totalDistance).toBe(120);
    expect(progress.coins).toBe(40);
    expect(progress.totalRuns).toBe(1);
    expect(progress.bestDistance).toBe(120);
  });

  it('applyRunResult unlocks the first_steps achievement on the first run', () => {
    const stats: RunStats = {
      distance: 10, coins: 5, saves: 1, maxCombo: 1,
      perfect: false, usedPowerup: false, hazardTypeCounts: {},
    };
    const { newAchievements } = Storage.applyRunResult(stats);
    expect(newAchievements).toContain('first_steps');
  });

  it('does not re-unlock an already-unlocked achievement', () => {
    const stats: RunStats = {
      distance: 10, coins: 5, saves: 1, maxCombo: 1,
      perfect: false, usedPowerup: false, hazardTypeCounts: {},
    };
    Storage.applyRunResult(stats);
    const { newAchievements } = Storage.applyRunResult(stats);
    expect(newAchievements).not.toContain('first_steps');
  });
});

describe('Storage — daily missions', () => {
  beforeEach(() => localStorage.clear());

  it('always returns exactly 3 missions for today', () => {
    const state = Storage.loadMissionState();
    expect(state.missions.length).toBe(3);
  });

  it('is deterministic for the same calendar day', () => {
    const a = Storage.loadMissionState();
    const b = Storage.loadMissionState();
    expect(a.missions.map(m => m.id)).toEqual(b.missions.map(m => m.id));
  });

  it('claimMission grants the reward exactly once', () => {
    const state = Storage.loadMissionState();
    const mission = state.missions[0];
    state.progress[mission.id] = mission.target; // mark complete
    // manually persist progress the way updateMissionProgress would
    const runStats: RunStats = {
      distance: mission.stat === 'distance' ? mission.target : 0,
      coins: mission.stat === 'coins' ? mission.target : 0,
      saves: mission.stat === 'saves' ? mission.target : 0,
      maxCombo: mission.stat === 'maxCombo' ? mission.target : 0,
      perfect: false, usedPowerup: false, hazardTypeCounts: {},
    };
    Storage.updateMissionProgress(runStats);

    const before = Storage.loadProgress().coins;
    const firstClaim = Storage.claimMission(mission.id, mission.reward);
    const secondClaim = Storage.claimMission(mission.id, mission.reward);
    const after = Storage.loadProgress().coins;

    expect(firstClaim).toBe(true);
    expect(secondClaim).toBe(false);
    expect(after - before).toBe(mission.reward);
  });
});
