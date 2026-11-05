/* ============================================================
   APUTU: Baby's Day Out — src/ui/stage.ts
   Small self-running canvases used outside the main game:
     - the home-screen hero (Aputu crawling, Nanny chasing)
     - the Customize preview (tap him to make him giggle)
     - the intro story (four short animated scenes)
   They reuse exactly the same renderers as the game, so what you
   design in Customize is what you see in play.
   ============================================================ */

import type { BabyDrawState, BabyPose, Customization, Expression, WorldDef } from '../types';
import { WORLDS } from '../data/worlds';
import { HAZARD_TYPES } from '../core/hazards';
import { clamp, smoothstep } from '../utils';
import { babyLook, drawBaby } from '../render/baby';
import { drawGuardian } from '../render/guardian';
import { drawHazard } from '../render/hazards';
import { drawBackdrop, drawForeground, drawRoad } from '../render/scenery';
import { drawDangerRing, drawHintTag, drawInterest, drawSpeechBubble } from '../render/overlay';
import { INK, rrect } from '../render/draw';

type Ctx = CanvasRenderingContext2D;
export type SceneFn = (ctx: Ctx, w: number, h: number, t: number, dt: number) => void;

/** Owns a canvas + requestAnimationFrame loop. Start/stop as screens change. */
export class MiniStage {
  private raf = 0;
  private running = false;
  private last = 0;
  private t = 0;
  private w = 0;
  private h = 0;

  constructor(readonly canvas: HTMLCanvasElement, private scene: SceneFn) {}

  setScene(scene: SceneFn): void { this.scene = scene; this.t = 0; }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = rect.width;
    this.h = rect.height;
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.canvas.getContext('2d')!.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.resize();
    this.last = performance.now();
    const loop = (now: number) => {
      if (!this.running) return;
      const dt = Math.min((now - this.last) / 1000, 0.05);
      this.last = now;
      this.t += dt;
      if (this.w && this.h) this.scene(this.canvas.getContext('2d')!, this.w, this.h, this.t, dt);
      else this.resize();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }
}

/** Scenery is designed for tall phone canvases; on small hero canvases draw it
 *  scaled down (so there is room for sky and buildings) and keep characters native. */
function scenery(ctx: Ctx, w: number, h: number, t: number, camX: number, world: WorldDef, roadFrac: number, roadSpan: number) {
  const k = clamp(h / 380, 0.5, 1);
  const vw = w / k, vh = h / k;
  const o = { w: vw, h: vh, camX, time: t, roadTop: vh * roadFrac, roadH: vh * roadSpan, world };
  ctx.save();
  ctx.scale(k, k);
  drawBackdrop(ctx, o);
  drawRoad(ctx, o);
  ctx.restore();
  return {
    // native-pixel road geometry for placing characters
    roadTop: h * roadFrac, roadH: h * roadSpan,
    foreground: () => { ctx.save(); ctx.scale(k, k); drawForeground(ctx, o); ctx.restore(); },
  };
}

const worldAt = (id: string): WorldDef => WORLDS.find(w => w.id === id) ?? WORLDS[0];

/* ---------------- Home hero ---------------- */

export function homeScene(getCust: () => Customization, getWorld: () => WorldDef): SceneFn {
  return (ctx, w, h, t) => {
    const sc = scenery(ctx, w, h, t, t * 46, getWorld(), 0.42, 0.4);
    const cust = getCust();
    drawInterest(ctx, 'butterfly', w * 0.84 + Math.sin(t * 1.3) * 16, sc.roadTop + sc.roadH * 0.2, 0.8, t);

    const look = babyLook(cust);
    const st: BabyDrawState = {
      pose: 'crawl', phase: t * 7.2, time: t, lookBack: t % 9 > 7.4 ? 1 : 0,
      expression: Math.sin(t * 0.8) > 0.55 ? 'laugh' : 'happy',
    };
    drawBaby(ctx, w * 0.56, sc.roadTop + sc.roadH * 0.78, 1.0, look, st);
    drawGuardian(ctx, cust.nanny, w * 0.2 + Math.sin(t * 0.9) * 8, sc.roadTop + sc.roadH * 0.98, 0.76, t * 9, { mood: 'run' });
    sc.foreground();
  };
}

/* ---------------- Customize preview ---------------- */

export interface PreviewController { scene: SceneFn; poke(): void }

export function previewScene(getCust: () => Customization, onGiggle: () => void): PreviewController {
  const cycle: { pose: BabyPose; expression: Expression }[] = [
    { pose: 'crawl', expression: 'happy' }, { pose: 'wave', expression: 'laugh' }, { pose: 'sit', expression: 'happy' },
    { pose: 'clap', expression: 'laugh' }, { pose: 'sniff', expression: 'curious' }, { pose: 'yawn', expression: 'sleepy' },
  ];
  let override: { pose: BabyPose; expression: Expression; until: number } | null = null;
  let clock = 0;

  const scene: SceneFn = (ctx, w, h, t) => {
    clock = t;
    const sc = scenery(ctx, w, h, t, 240 + t * 18, worldAt('residential'), 0.5, 0.34);
    const roadTop = sc.roadTop, roadH = sc.roadH;
    const cust = getCust();
    const slot = cycle[Math.floor(t / 2.6) % cycle.length];
    const cur = override && override.until > t ? override : slot;
    const look = babyLook(cust);
    const st: BabyDrawState = { pose: cur.pose, expression: cur.expression, phase: t * 6, time: t, lookBack: 0 };
    drawGuardian(ctx, cust.nanny, w * 0.17, roadTop + roadH * 0.92, 0.82, t * 2, { mood: 'happy' });
    drawBaby(ctx, w * 0.56, roadTop + roadH * 0.78, 1.9, look, st);
    sc.foreground();
  };

  return {
    scene,
    poke() {
      const poses: BabyPose[] = ['wave', 'clap'];
      override = { pose: poses[Math.floor(Math.random() * 2)], expression: 'laugh', until: clock + 1.6 };
      onGiggle();
    },
  };
}

/* ---------------- Intro story ---------------- */

export interface IntroSlide { title: string; text: string }

export const INTRO_SLIDES: IntroSlide[] = [
  { title: 'A quiet morning…', text: "It's a sunny morning on Aputu's street. Nanny is on the phone, chatting away, and little Aputu is happily clapping on the floor." },
  { title: 'The open door', text: 'Nobody notices that the front door is open. Aputu has noticed, though. Aputu notices everything.' },
  { title: 'Off he goes!', text: "Out the door and down the street! Aputu has never been this brave — or this fast — and he has absolutely no idea what a hazard is." },
  { title: 'You are his guardian angel', text: "You can't steer him, but you can clear his path. Tap, drag or hold hazards before he reaches them. And if it goes wrong, Nanny is never far behind." },
];

export function introScene(getSlide: () => number, getCust: () => Customization): SceneFn {
  return (ctx, w, h, t) => {
    const slide = getSlide();
    const world = worldAt('residential');
    const roadTop = h * 0.5, roadH = h * 0.3;
    const cust = getCust();
    const look = babyLook(cust);
    const y = (lane: number) => roadTop + roadH * lane;
    const mk = (camX: number) => ({ w, h, camX, time: t, roadTop, roadH, world });

    if (slide === 0) {
      const o = mk(120);
      drawBackdrop(ctx, o); drawRoad(ctx, o);
      drawBaby(ctx, w * 0.64, y(0.7), 1.25, look, { pose: 'clap', expression: 'laugh', phase: 0, time: t, lookBack: 0 });
      drawGuardian(ctx, cust.nanny, w * 0.24, y(0.9), 0.95, t, { mood: 'happy' });
      // phone
      rrect(ctx, w * 0.24 + 18, y(0.9) - 98, 9, 15, 2, '#2E4374', { lw: 1.4 });
      drawSpeechBubble(ctx, w * 0.24 + 6, y(0.9) - 118, '…and then I said to her…', clamp(Math.sin(t * 1.2) + 1.2, 0, 1), 130);
      drawForeground(ctx, o);
    } else if (slide === 1) {
      const o = mk(120);
      drawBackdrop(ctx, o); drawRoad(ctx, o);
      const k = smoothstep(0.4, 4, t);
      drawGuardian(ctx, cust.nanny, w * 0.2, y(0.9), 0.95, t * 0.5, { mood: 'idle', facing: -1 });
      drawBaby(ctx, w * (0.4 + 0.42 * k), y(0.62), 1.2, look, { pose: 'crawl', expression: 'laugh', phase: t * 6, time: t, lookBack: 0 });
      drawSpeechBubble(ctx, w * 0.2 + 10, y(0.9) - 112, 'Mm-hmm… yes… really?', 1, 120);
      drawForeground(ctx, o);
    } else if (slide === 2) {
      const o = mk(t * 90);
      drawBackdrop(ctx, o); drawRoad(ctx, o);
      drawInterest(ctx, 'butterfly', w * 0.82, y(0.3), 1.1, t);
      drawBaby(ctx, w * 0.6, y(0.65), 1.2, look, { pose: 'crawl', expression: 'laugh', phase: t * 11, time: t, lookBack: 0 });
      const gx = -50 + smoothstep(1, 4, t) * w * 0.28;
      drawGuardian(ctx, cust.nanny, gx, y(0.92), 0.95, t * 10, { mood: t > 1.8 ? 'worried' : 'run' });
      if (t > 1.8) drawSpeechBubble(ctx, gx + 10, y(0.92) - 114, 'APUTU?!', 1, 100);
      drawForeground(ctx, o);
    } else {
      const o = mk(t * 40);
      drawBackdrop(ctx, o); drawRoad(ctx, o);
      const cycle = t % 5;
      const solved = cycle > 2.6;
      const car = HAZARD_TYPES.find(hz => hz.id === 'car')!;
      const cx = w * 0.84 - (solved ? 0 : (cycle / 2.6) * 20);
      if (!solved) drawDangerRing(ctx, cx, y(0.6) - 4, 62, clamp(cycle / 2.6, 0, 1), t);
      drawHazard(ctx, 'car', cx, y(0.6), 1, { variant: 0, phase: 0, time: t, solved, solveT: Math.max(0, cycle - 2.6), frozen: false }, { w: car.width, h: car.height });
      if (!solved) drawHintTag(ctx, cx, y(0.6) - 92, '👆', 'Tap to stop traffic', t);
      drawBaby(ctx, w * 0.45, y(0.62), 1.15, look, { pose: 'crawl', expression: 'happy', phase: t * 7, time: t, lookBack: 0 });
      drawGuardian(ctx, cust.nanny, w * 0.14, y(0.92), 0.9, t * 9, { mood: 'run' });
      drawForeground(ctx, o);
    }
    void INK;
  };
}
