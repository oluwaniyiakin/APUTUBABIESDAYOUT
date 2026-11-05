import { describe, expect, it } from 'vitest';
import { WORLDS, currentWorldForDistance, isWorldUnlocked } from '../src/data/worlds';

describe('worlds data', () => {
  it('has a world unlocked at distance 0', () => {
    const zeroWorlds = WORLDS.filter(w => w.unlockAtDistance === 0);
    expect(zeroWorlds.length).toBeGreaterThanOrEqual(1);
  });

  it('has strictly ascending unlock distances', () => {
    const distances = WORLDS.map(w => w.unlockAtDistance);
    const sorted = [...distances].sort((a, b) => a - b);
    expect(distances).toEqual(sorted);
  });

  it('has unique world ids', () => {
    const ids = WORLDS.map(w => w.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every world has at least one hazard id', () => {
    for (const w of WORLDS) {
      expect(w.hazardIds.length).toBeGreaterThan(0);
    }
  });
});

describe('currentWorldForDistance', () => {
  it('returns the first world for distance 0', () => {
    const world = currentWorldForDistance(0);
    expect(world.unlockAtDistance).toBe(0);
  });

  it('returns the highest unlocked world for a given distance', () => {
    const world = currentWorldForDistance(1000);
    expect(world.unlockAtDistance).toBeLessThanOrEqual(1000);
    // the *next* world (if any) should not yet be unlocked at this distance
    const idx = WORLDS.indexOf(world);
    const next = WORLDS[idx + 1];
    if (next) {
      expect(next.unlockAtDistance).toBeGreaterThan(1000);
    }
  });

  it('returns the final world for a very large distance', () => {
    const world = currentWorldForDistance(999999);
    expect(world).toBe(WORLDS[WORLDS.length - 1]);
  });

  it('never returns undefined, even for negative input', () => {
    const world = currentWorldForDistance(-50);
    expect(world).toBeDefined();
    expect(world.unlockAtDistance).toBe(0);
  });
});

describe('isWorldUnlocked', () => {
  it('returns true for the starting world at distance 0', () => {
    expect(isWorldUnlocked(WORLDS[0].id, 0)).toBe(true);
  });

  it('returns false for the final world at distance 0', () => {
    const lastWorld = WORLDS[WORLDS.length - 1];
    expect(isWorldUnlocked(lastWorld.id, 0)).toBe(false);
  });

  it('returns false for an unknown world id', () => {
    expect(isWorldUnlocked('not-a-real-world', 999999)).toBe(false);
  });
});
