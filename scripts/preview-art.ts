/* ============================================================
   APUTU: Baby's Day Out — scripts/preview-art.ts
   Renders contact sheets of the game's vector art to PNG files
   in docs/previews/ using @napi-rs/canvas, so artists/devs can
   eyeball sprites without launching a browser.

   Run:  npm run preview:art
   ============================================================ */

import { createCanvas } from '@napi-rs/canvas';
import { mkdirSync, writeFileSync } from 'node:fs';
import { babyLook, drawBaby } from '../src/render/baby';
import type { BabyDrawState, Customization } from '../src/types';

const OUT = 'docs/previews';
mkdirSync(OUT, { recursive: true });

function sheet(w: number, h: number, bg = '#FCEFDD') {
  const c = createCanvas(w, h);
  const ctx = c.getContext('2d') as unknown as CanvasRenderingContext2D;
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  return { c, ctx };
}
function save(c: ReturnType<typeof createCanvas>, name: string) {
  writeFileSync(`${OUT}/${name}.png`, c.toBuffer('image/png'));
  console.log('wrote', `${OUT}/${name}.png`);
}
const st = (o: Partial<BabyDrawState> = {}): BabyDrawState =>
  ({ pose: 'crawl', expression: 'happy', phase: 0.8, time: 1.3, lookBack: 0, ...o });
const cust = (o: Partial<Customization> = {}): Customization =>
  ({ gender: 'boy', skin: 'tone2', outfit: 'ankara', hair: 'puffs', nanny: 'nanny', ...o });

/* ---- Sheet 1: poses and expressions ---- */
{
  const { c, ctx } = sheet(1000, 420);
  const look = babyLook(cust());
  const poses: Partial<BabyDrawState>[] = [
    { pose: 'crawl', phase: 0.2 }, { pose: 'crawl', phase: 2.0, expression: 'laugh' }, { pose: 'sniff', expression: 'curious' },
    { pose: 'pet', expression: 'laugh' }, { pose: 'crawl', lookBack: 1, expression: 'happy', phase: 1 },
  ];
  poses.forEach((p, i) => drawBaby(ctx, 100 + i * 190, 150, 1.7, look, st(p)));
  const sitting: Partial<BabyDrawState>[] = [
    { pose: 'sit' }, { pose: 'wave', expression: 'laugh' }, { pose: 'clap', expression: 'laugh' }, { pose: 'reach', expression: 'surprised' },
    { pose: 'cry', expression: 'cry' }, { pose: 'sneeze', expression: 'sneeze' }, { pose: 'yawn', expression: 'sleepy' },
  ];
  sitting.forEach((p, i) => drawBaby(ctx, 70 + i * 140, 340, 1.5, look, st(p)));
  save(c, 'baby-poses');
}

/* ---- Sheet 2: every outfit ---- */
{
  const ids = ['ankara', 'explorer', 'superhero', 'astronaut', 'pirate', 'royal', 'robot', 'princess', 'tinyking', 'tinyqueen', 'winter', 'traditional', 'safari', 'festival'];
  const { c, ctx } = sheet(1050, 460);
  ids.forEach((id, i) => {
    const col = i % 5, row = Math.floor(i / 5);
    const girl = ['princess', 'tinyqueen', 'traditional'].includes(id);
    const look = babyLook(cust({ outfit: id, gender: girl ? 'girl' : 'boy', skin: (['tone1', 'tone2', 'tone3', 'tone4', 'tone5'] as const)[i % 5], hair: (['puffs', 'curls', 'locs', 'braids', 'bald'] as const)[i % 5] }));
    drawBaby(ctx, 100 + col * 205, 120 + row * 150, 1.5, look, st({ phase: 0.9 + i * 0.3 }));
  });
  save(c, 'baby-outfits');
}

/* ---- Sheet 3: guardians ---- */
import { GUARDIAN_IDS, drawGuardian } from '../src/render/guardian';
{
  const { c, ctx } = sheet(1100, 330);
  GUARDIAN_IDS.forEach((id, i) => {
    const col = i % 7, row = Math.floor(i / 7);
    drawGuardian(ctx, id, 80 + col * 155, 150 + row * 160, 1.15, 1 + i * 0.7, { mood: i % 3 === 0 ? 'worried' : i % 3 === 1 ? 'run' : 'happy' });
  });
  save(c, 'guardians');
}

/* ---- Sheet 4: hazards (idle on top row, solved on bottom row) ---- */
import { drawHazard } from '../src/render/hazards';
import { HAZARD_TYPES } from '../src/core/hazards';
{
  const { c, ctx } = sheet(1250, 380, '#E3C79A');
  HAZARD_TYPES.forEach((h, i) => {
    const col = i % 6, row = Math.floor(i / 6);
    const base = { variant: i % 4, phase: 0.5, time: 1.1 + i * 0.13, frozen: false };
    drawHazard(ctx, h.id, 110 + col * 200, 100 + row * 120, 1.3, { ...base, solved: false, solveT: 0 }, { w: h.width, h: h.height });
  });
  // solved row
  HAZARD_TYPES.forEach((h, i) => {
    if (i >= 6) return;
    const base = { variant: i % 4, phase: 0.5, time: 1.1 + i * 0.13, frozen: false };
    drawHazard(ctx, h.id, 130 + i * 200, 340, 1.3, { ...base, solved: true, solveT: 0.5 }, { w: h.width, h: h.height });
  });
  save(c, 'hazards');
}

/* ---- Sheets 5+: every world with baby + guardian + hazards in the scene ---- */
import { WORLDS } from '../src/data/worlds';
import { drawBackdrop, drawForeground, drawRoad } from '../src/render/scenery';
{
  const W = 390, H = 250;
  const groups = [WORLDS.slice(0, 8), WORLDS.slice(8)];
  groups.forEach((group, gi) => {
    const { c, ctx } = sheet(W * 2, H * Math.ceil(group.length / 2), '#fff');
    group.forEach((world, i) => {
      const ox = (i % 2) * W, oy = Math.floor(i / 2) * H;
      ctx.save();
      ctx.translate(ox, oy);
      ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
      const o = { w: W, h: H, camX: 300 + i * 500, time: 2.4, roadTop: H * 0.4, roadH: H * 0.38, world };
      drawBackdrop(ctx, o);
      drawRoad(ctx, o);
      const ids = world.hazardIds;
      ids.slice(0, 2).forEach((hid, k) => {
        const ht = HAZARD_TYPES.find(h => h.id === hid)!;
        drawHazard(ctx, hid, 250 + k * 90, H * 0.52 + k * 28, 0.8 + 0.2 * k, { variant: k, phase: 0, time: 2, solved: false, solveT: 0, frozen: false }, { w: ht.width, h: ht.height });
      });
      drawGuardian(ctx, 'nanny', 50, H * 0.74, 0.7, 2.0, { mood: 'run' });
      drawBaby(ctx, 130, H * 0.62, 0.95, babyLook(cust({ outfit: ['superhero', 'ankara', 'explorer', 'pirate'][i % 4] })), st({ phase: 1.2 + i }));
      drawForeground(ctx, o);
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, 150, 18);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif'; ctx.fillText(world.name, 6, 13);
      ctx.restore();
    });
    save(c, `worlds-${gi + 1}`);
  });
}
