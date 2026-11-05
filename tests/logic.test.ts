import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { EventManager } from '../src/core/events';
import { Baby } from '../src/core/baby';
import { HAZARD_TYPES, Hazard } from '../src/core/hazards';
import { Storage } from '../src/core/storage';
import { CHALLENGE_EVENTS } from '../src/data/events';
import { MODES, getMode } from '../src/data/modes';
import { SCRAPBOOK } from '../src/data/scrapbook';
import { NANNIES } from '../src/data/nannies';
import { WORLDS } from '../src/data/worlds';
import { levelInfo, xpForLevel } from '../src/data/levels';
import { SCENES } from '../src/render/scenery';
import { hash01, mix, shade } from '../src/utils';
import type { RunStats } from '../src/types';

const cust = { gender: 'boy', skin: 'tone2', outfit: 'ankara', hair: 'puffs', nanny: 'nanny' } as const;

describe('EventManager', () => {
  it('stays quiet until its first delay, then starts and ends an event', () => {
    const em = new EventManager();
    em.reset(5);
    let started = null as any, ended = null as any;
    for (let t = 0; t < 4.9; t += 0.1) expect(em.update(0.1, true).started).toBeUndefined();
    for (let t = 0; t < 60 && !ended; t += 0.1) {
      const tick = em.update(0.1, true);
      if (tick.started) started = tick.started;
      if (tick.ended) ended = tick.ended;
    }
    expect(started).toBeTruthy();
    expect(ended).toBe(started);
    expect(em.current).toBeNull();
  });
  it('never schedules while disabled', () => {
    const em = new EventManager(); em.reset(0);
    for (let i = 0; i < 1000; i++) expect(em.update(0.1, false).started).toBeUndefined();
  });
  it('never repeats the same event twice in a row', () => {
    const em = new EventManager();
    let prev = '';
    for (let i = 0; i < 300; i++) {
      const e = em.pick(); (em as any).last = e.id;
      expect(e.id).not.toBe(prev); prev = e.id;
    }
  });
  it('only forces hazards that exist', () => {
    const ids = new Set(HAZARD_TYPES.map(h => h.id));
    for (const e of CHALLENGE_EVENTS) for (const id of e.forcedHazards ?? []) expect(ids.has(id)).toBe(true);
  });
});

describe('Baby behaviour', () => {
  it('crawls forward and its gait advances', () => {
    const b = new Baby({ ...cust });
    for (let i = 0; i < 60; i++) b.update(1 / 60, false);
    expect(b.progress).toBeGreaterThan(30);
    expect(b.phase).toBeGreaterThan(3);
  });
  it('stops moving while sniffing a flower, then resumes', () => {
    const b = new Baby({ ...cust });
    for (let i = 0; i < 30; i++) b.update(1 / 60, false);
    b.startAction('sniff', 1);
    for (let i = 0; i < 10; i++) b.update(1 / 60, false);
    const at = b.progress;
    for (let i = 0; i < 30; i++) b.update(1 / 60, false);
    expect(b.progress).toBeCloseTo(at, 0);
    for (let i = 0; i < 60; i++) b.update(1 / 60, false);
    expect(b.action).toBe('none');
    expect(b.progress).toBeGreaterThan(at + 5);
  });
  it('drifts toward whatever he is curious about', () => {
    const b = new Baby({ ...cust });
    b.laneY = 0.2; b.steer = 0.8;
    for (let i = 0; i < 120; i++) b.update(1 / 60, false);
    expect(b.laneY).toBeGreaterThan(0.7);
  });
  it('slows down when blocked and chains onActionEnd', () => {
    const b = new Baby({ ...cust });
    for (let i = 0; i < 60; i++) b.update(1 / 60, false);
    const fast = b.speed;
    for (let i = 0; i < 60; i++) b.update(1 / 60, true);
    expect(b.speed).toBeLessThan(fast * 0.4);
    let ended = '';
    b.onActionEnd = a => { ended = a; };
    b.startAction('wave', 0.2);
    for (let i = 0; i < 30; i++) b.update(1 / 60, false);
    expect(ended).toBe('wave');
  });
  it('turns round to grin at his guardian now and then', () => {
    const b = new Baby({ ...cust });
    let max = 0;
    for (let i = 0; i < 60 * 40; i++) { b.update(1 / 60, false); max = Math.max(max, b.lookBack); }
    expect(max).toBeGreaterThan(0.8);
  });
  it('shows an emotion that fits what he is doing', () => {
    const b = new Baby({ ...cust });
    b.startAction('cry', 99); expect(b.expression).toBe('cry');
    b.startAction('sneeze', 1); expect(b.expression).toBe('sneeze');
    b.startAction('sniff', 1); expect(b.pose).toBe('sniff');
  });
});

describe('progression data', () => {
  it('levels increase monotonically and start at level 1', () => {
    expect(levelInfo(0).level).toBe(1);
    let last = 0;
    for (let xp = 0; xp < 20000; xp += 37) { const l = levelInfo(xp).level; expect(l).toBeGreaterThanOrEqual(last); last = l; }
    expect(levelInfo(xpForLevel(5)).level).toBe(5);
    expect(levelInfo(xpForLevel(5) - 1).level).toBe(4);
  });
  it('modes have ascending star thresholds and sensible rules', () => {
    expect(new Set(MODES.map(m => m.id)).size).toBe(MODES.length);
    for (const m of MODES) { expect(m.stars[0]).toBeLessThan(m.stars[1]); expect(m.stars[1]).toBeLessThan(m.stars[2]); }
    expect(getMode('time_attack').timeLimit).toBe(90);
    expect(getMode('hardcore').allowFreeSaves).toBe(false);
    expect(getMode('zen').failEnds).toBe(false);
    expect(getMode('nope').id).toBe('endless');
  });
  it('scrapbook covers every hazard, world and curiosity moment exactly once', () => {
    const ids = SCRAPBOOK.map(e => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const h of HAZARD_TYPES) expect(ids).toContain(`hazard:${h.id}`);
    for (const w of WORLDS) expect(ids).toContain(`world:${w.id}`);
    for (const k of ['flower', 'butterfly', 'balloon', 'cat']) expect(ids).toContain(`moment:${k}`);
  });
  it('every world has a scenery definition', () => {
    for (const w of WORLDS) expect(SCENES[w.id]).toBeDefined();
  });
});

describe('moving hazards', () => {
  it('vehicles and animals approach; fixed obstacles do not', () => {
    for (const id of ['car', 'bus', 'motorcycle', 'goat', 'chicken', 'barrel']) expect(HAZARD_TYPES.find(h => h.id === id)!.speed).toBeGreaterThan(0);
    for (const id of ['gutter', 'puddle', 'cart', 'construction', 'wire', 'dog']) expect(HAZARD_TYPES.find(h => h.id === id)!.speed ?? 0).toBe(0);
    for (const id of ['car', 'bus', 'motorcycle']) expect(HAZARD_TYPES.find(h => h.id === id)!.vehicle).toBe(true);
  });
  it('instances jitter speed within a sane band', () => {
    const car = HAZARD_TYPES.find(h => h.id === 'car')!;
    for (let i = 0; i < 50; i++) { const h = new Hazard(car, 0, 0.5); expect(h.speed).toBeGreaterThan(car.speed! * 0.84); expect(h.speed).toBeLessThan(car.speed! * 1.16); }
  });
});

describe('storage: scores, discoveries, boosts', () => {
  beforeEach(() => localStorage.clear());
  const run = (o: Partial<RunStats> = {}): RunStats => ({ distance: 100, coins: 50, saves: 10, maxCombo: 5, perfect: false, usedPowerup: false, hazardTypeCounts: {}, mode: 'endless', ...o });

  it('discover() is true only the first time', () => {
    expect(Storage.discover('hazard:car')).toBe(true);
    expect(Storage.discover('hazard:car')).toBe(false);
    expect(Storage.loadProgress().discoveries).toEqual(['hazard:car']);
  });
  it('awards stars by mode thresholds and tracks per-mode best scores', () => {
    const a = Storage.applyRunResult(run({ distance: 400, coins: 100, saves: 20, maxCombo: 6 })); // 400+200+100+30 = 730 -> 2 stars
    expect(a.score).toBe(730); expect(a.stars).toBe(2); expect(a.newBest).toBe(true);
    const b = Storage.applyRunResult(run({ distance: 10, coins: 0, saves: 0, maxCombo: 0 }));
    expect(b.newBest).toBe(false);
    expect(b.stars).toBe(0);
    const z = Storage.applyRunResult(run({ mode: 'zen' }));
    expect(z.newBest).toBe(true); // zen has its own board
    expect(Storage.loadProgress().bestScores.endless).toBe(730);
  });
  it('levels the player up when XP crosses a threshold', () => {
    const p = Storage.loadProgress(); p.xp = 55; Storage.saveProgress(p);
    const r = Storage.applyRunResult(run());
    expect(r.levelUp).toEqual(expect.objectContaining({ from: 1, to: 2 }));
  });
  it('Teacher perk multiplies daily-mission progress', () => {
    const m = Storage.loadMissionState().missions[0];
    const stat = m.stat;
    const r = run({ distance: 100, coins: 100, saves: 10, maxCombo: 10, missionBoost: 2 });
    Storage.updateMissionProgress(r);
    const base = ({ saves: 10, distance: 100, coins: 100, maxCombo: 10, dogsSolved: 0, guttersSolved: 0, distanceNoPowerup: 100 } as any)[stat];
    expect(Storage.loadMissionState().progress[m.id]).toBe(base * 2);
  });
});

describe('colour & random helpers', () => {
  it('shade() stays within black..white and mix() interpolates', () => {
    expect(shade('#808080', 1)).toBe('#ffffff');
    expect(shade('#808080', -1)).toBe('#000000');
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080');
  });
  it('hash01() is deterministic and in [0,1)', () => {
    for (let i = -50; i < 500; i++) { const v = hash01(i, 3); expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThan(1); expect(hash01(i, 3)).toBe(v); }
  });
});

describe('every advertised guardian perk is actually implemented', () => {
  const src = readdirSync('src/core').map(f => readFileSync(`src/core/${f}`, 'utf8')).join('\n');
  for (const n of NANNIES) {
    if (n.perk.type === 'none') continue;
    it(`${n.name}: ${n.perk.type}`, () => { expect(src).toContain(`'${n.perk.type}'`); });
  }
});
