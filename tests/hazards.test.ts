import { describe, expect, it } from 'vitest';
import { HAZARD_TYPES, Hazard, hazardsForDistance, hazardsForWorld } from '../src/core/hazards';
import { WORLDS } from '../src/data/worlds';

describe('hazards data', () => {
  it('has unique hazard ids', () => {
    const ids = HAZARD_TYPES.map(h => h.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every hazard has a valid fixType', () => {
    const validTypes = ['tap', 'drag', 'hold'];
    for (const h of HAZARD_TYPES) {
      expect(validTypes).toContain(h.fixType);
    }
  });

  it('every hazard referenced by a world exists in HAZARD_TYPES', () => {
    const knownIds = new Set(HAZARD_TYPES.map(h => h.id));
    for (const w of WORLDS) {
      for (const id of w.hazardIds) {
        expect(knownIds.has(id)).toBe(true);
      }
    }
  });
});

describe('hazardsForDistance', () => {
  it('returns only the easiest hazards very early on', () => {
    const early = hazardsForDistance(0);
    const easyIds = ['car', 'dog', 'puddle'];
    expect(early.every(h => easyIds.includes(h.id))).toBe(true);
  });

  it('returns the full hazard pool at high distance', () => {
    const late = hazardsForDistance(10000);
    expect(late.length).toBe(HAZARD_TYPES.length);
  });

  it('never returns an empty pool', () => {
    for (const d of [0, 100, 300, 500, 1000, 5000]) {
      expect(hazardsForDistance(d).length).toBeGreaterThan(0);
    }
  });
});

describe('hazardsForWorld', () => {
  it('filters down to only hazards allowed by the world', () => {
    const world = WORLDS.find(w => w.id === 'residential')!;
    const pool = hazardsForWorld(world, 10000); // max distance pool
    expect(pool.every(h => world.hazardIds.includes(h.id))).toBe(true);
  });

  it('falls back to the distance pool when world is null', () => {
    const withoutWorld = hazardsForWorld(null, 0);
    const distanceOnly = hazardsForDistance(0);
    expect(withoutWorld.map(h => h.id).sort()).toEqual(distanceOnly.map(h => h.id).sort());
  });
});

describe('Hazard instance', () => {
  it('starts unsolved with zero solve progress', () => {
    const type = HAZARD_TYPES[0];
    const h = new Hazard(type, 100, 0.5);
    expect(h.solved).toBe(false);
    expect(h.solveProgress).toBe(0);
  });

  it('assigns a unique id to each instance', () => {
    const type = HAZARD_TYPES[0];
    const a = new Hazard(type, 0, 0.5);
    const b = new Hazard(type, 0, 0.5);
    expect(a.id).not.toBe(b.id);
  });
});
