// @vitest-environment node
// Smoke-tests every sprite & scene: nothing may throw, and everything must put real pixels on the canvas.
import { describe, expect, it } from 'vitest';
import { createCanvas } from '@napi-rs/canvas';
import { SHOP_OUTFITS } from '../src/data/outfits';
import { WORLDS } from '../src/data/worlds';
import { HAZARD_TYPES } from '../src/core/hazards';
import { babyLook, drawBaby } from '../src/render/baby';
import { GUARDIAN_IDS, drawGuardian } from '../src/render/guardian';
import { drawHazard } from '../src/render/hazards';
import { drawBackdrop, drawForeground, drawRoad } from '../src/render/scenery';
import { Weather } from '../src/render/weather';
import { drawCoin, drawDangerRing, drawHalo, drawHintTag, drawInterest, drawOrbitStars, drawPowerupPickup, drawSpeechBubble } from '../src/render/overlay';
import type { BabyPose, Expression, HairStyle } from '../src/types';

function canvas(w = 260, h = 220) {
  const c = createCanvas(w, h);
  return { c, ctx: c.getContext('2d') as unknown as CanvasRenderingContext2D };
}
function pixels(c: any): number {
  const d = (c.getContext('2d') as any).getImageData(0, 0, c.width, c.height).data as Uint8ClampedArray;
  let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++;
  return n;
}

describe('baby renderer', () => {
  const poses: BabyPose[] = ['crawl', 'sit', 'wave', 'clap', 'sniff', 'pet', 'reach', 'sneeze', 'yawn', 'cry'];
  const faces: Expression[] = ['happy', 'laugh', 'curious', 'surprised', 'sleepy', 'cry', 'pout', 'sneeze'];
  const hairs: HairStyle[] = ['puffs', 'curls', 'locs', 'bald', 'braids'];

  it('draws every outfit x gender x hair combination', () => {
    for (const o of SHOP_OUTFITS) for (const gender of ['boy', 'girl', 'neutral'] as const) for (const hair of hairs) {
      const { c, ctx } = canvas();
      drawBaby(ctx, 130, 150, 1.4, babyLook({ gender, skin: 'tone3', outfit: o.id, hair, nanny: 'nanny' }), { pose: 'crawl', expression: 'happy', phase: 1, time: 1, lookBack: 0 });
      expect(pixels(c)).toBeGreaterThan(1500);
    }
  });
  it('draws every pose and every expression, including looking back', () => {
    const look = babyLook({ gender: 'girl', skin: 'tone1', outfit: 'superhero', hair: 'braids', nanny: 'nanny' });
    for (const pose of poses) for (const expression of faces) for (const lookBack of [0, 1]) {
      const { c, ctx } = canvas();
      drawBaby(ctx, 130, 160, 1.5, look, { pose, expression, phase: 2, time: 3.3, lookBack });
      expect(pixels(c)).toBeGreaterThan(1500);
    }
  });
});

describe('guardians, hazards, scenery', () => {
  it('draws all 13 guardians in every mood', () => {
    expect(GUARDIAN_IDS.length).toBe(13);
    for (const id of GUARDIAN_IDS) for (const mood of ['run', 'idle', 'worried', 'happy', 'carry'] as const) {
      const { c, ctx } = canvas(200, 200);
      drawGuardian(ctx, id, 100, 180, 1, 1.3, { mood });
      expect(pixels(c)).toBeGreaterThan(1200);
    }
  });
  it('draws all hazards idle, solved at several stages, and frozen', () => {
    for (const h of HAZARD_TYPES) for (const [solved, solveT, frozen] of [[false, 0, false], [true, 0.1, false], [true, 0.6, false], [true, 2, false], [false, 0, true]] as const) {
      const { c, ctx } = canvas(300, 220);
      drawHazard(ctx, h.id, 150, 170, 1, { variant: 2, phase: 1, time: 1.7, solved, solveT, frozen }, { w: h.width, h: h.height });
      // chickens and dogs run off after being fixed, so they legitimately vanish
      const leaves = solved && solveT >= 2 && ['chicken', 'dog'].includes(h.id);
      if (leaves) expect(pixels(c)).toBe(0); else expect(pixels(c)).toBeGreaterThan(300);
    }
  });
  it('draws every world (backdrop, road, foreground) day and night', () => {
    for (const world of WORLDS) {
      const { c, ctx } = canvas(390, 500);
      const o = { w: 390, h: 500, camX: 1234, time: 3, roadTop: 170, roadH: 200, world, dark: false };
      drawBackdrop(ctx, o); drawRoad(ctx, o); drawForeground(ctx, o);
      expect(pixels(c)).toBe(390 * 500);
      drawBackdrop(ctx, { ...o, dark: true });
    }
  });
});

describe('weather & overlay sprites', () => {
  it('renders every weather mode', () => {
    for (const mode of ['clear', 'rain', 'storm', 'wind', 'fireflies', 'dust', 'confetti'] as const) {
      const { ctx } = canvas(390, 500);
      const w = new Weather(); w.setMode(mode);
      for (let i = 0; i < 90; i++) { w.update(1 / 60, 390, 500); w.render(ctx, 390, 500); }
    }
  });
  it('fires lightning during a storm', () => {
    const w = new Weather(); let strikes = 0; w.onLightning = () => strikes++;
    w.setMode('storm');
    for (let i = 0; i < 60 * 40; i++) w.update(1 / 60, 390, 500);
    expect(strikes).toBeGreaterThan(2);
  });
  it('draws curiosity objects, coins, pickups, bubbles and rescue effects', () => {
    for (const kind of ['flower', 'butterfly', 'balloon', 'cat'] as const) for (const done of [false, true]) {
      const { c, ctx } = canvas(200, 200);
      drawInterest(ctx, kind, 100, 170, 1.4, 1.2, done, 0.8);
      expect(pixels(c)).toBeGreaterThan(200);
    }
    const { c, ctx } = canvas(300, 200);
    drawCoin(ctx, 40, 100, 12, 1); drawPowerupPickup(ctx, 100, 120, '⭐', '#F5B942', 1);
    drawSpeechBubble(ctx, 150, 100, 'Aputu, wait for me!'); drawHintTag(ctx, 200, 60, '👆', 'Tap to stop traffic', 1);
    drawDangerRing(ctx, 220, 150, 50, 0.7, 1); drawHalo(ctx, 60, 60, 1); drawOrbitStars(ctx, 60, 120, 1);
    expect(pixels(c)).toBeGreaterThan(2000);
  });
});
