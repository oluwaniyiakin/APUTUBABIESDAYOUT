/* ============================================================
   APUTU: Baby's Day Out — src/render/scenery.ts
   The world behind and around the road. Every neighbourhood gets
   its own look from a small data table (SCENES): a far skyline,
   mid-distance buildings/trees, roadside props, a road surface,
   and what lies beside the road (grass, river, dirt...).

   Props are placed deterministically from a hash of their index,
   so the street is infinite but always looks the same when you
   scroll back over it, and costs nothing to store.
   ============================================================ */

import type { WorldDef } from '../types';
import { clamp, hash01, mix, shade } from '../utils';
import { circle, ellipse, INK, limb, line, poly, rrect, type Ctx } from './draw';

export interface SceneOpts {
  w: number;
  h: number;
  camX: number;
  time: number;
  roadTop: number;
  roadH: number;
  world: WorldDef;
  /** Extra darkness (power outage) so lamps glow even by day. */
  dark?: boolean;
}

type FarKind = 'houses' | 'rooftops' | 'skyline' | 'tall' | 'hills' | 'water' | 'factory';
type BelowKind = 'grass' | 'water' | 'dirt' | 'concrete';
type RoadKind = 'tar' | 'dirt' | 'cobble' | 'planks' | 'bridge';

interface Scene {
  far: FarKind;
  mid: string[];
  side: string[];
  below: BelowKind;
  road: RoadKind;
  crosswalk?: boolean;
}

export const SCENES: Record<string, Scene> = {
  'residential':       { far: 'houses',   mid: ['house', 'tree', 'house', 'palm'], side: ['fence', 'lamp', 'bush', 'flowers'], below: 'grass', road: 'tar', crosswalk: true },
  'marketplace':       { far: 'rooftops', mid: ['stall', 'house', 'stall', 'tree'], side: ['stall', 'crate', 'bunting', 'crate'], below: 'dirt', road: 'dirt' },
  'bus-stop':          { far: 'skyline',  mid: ['building', 'tree', 'building'],    side: ['shelter', 'lamp', 'sign', 'bush'], below: 'concrete', road: 'tar', crosswalk: true },
  'construction-site': { far: 'skyline',  mid: ['crane', 'scaffold', 'pile'],       side: ['cone', 'pile', 'fence', 'cone'], below: 'dirt', road: 'dirt' },
  'playground':        { far: 'hills',    mid: ['tree', 'swing', 'seesaw', 'tree'], side: ['bush', 'bench', 'flowers'], below: 'grass', road: 'cobble' },
  'school-road':       { far: 'houses',   mid: ['school', 'tree', 'house'],         side: ['fence', 'lamp', 'sign', 'bush'], below: 'grass', road: 'tar', crosswalk: true },
  'river-crossing':    { far: 'hills',    mid: ['tree', 'boat', 'palm'],            side: ['post', 'post', 'bush'], below: 'water', road: 'planks' },
  'village-road':      { far: 'hills',    mid: ['hut', 'palm', 'hut', 'tree'],      side: ['fence', 'haystack', 'bush', 'pot'], below: 'dirt', road: 'dirt' },
  'city-center':       { far: 'tall',     mid: ['skyscraper', 'building', 'billboard', 'skyscraper'], side: ['lamp', 'sign', 'bench', 'lamp'], below: 'concrete', road: 'tar', crosswalk: true },
  'park':              { far: 'hills',    mid: ['tree', 'tree', 'bush', 'tree'],    side: ['bench', 'flowers', 'lamp', 'bush'], below: 'grass', road: 'cobble' },
  'farm-road':         { far: 'hills',    mid: ['barn', 'tree', 'haystack'],        side: ['fence', 'haystack', 'fence', 'bush'], below: 'grass', road: 'dirt' },
  'bridge':            { far: 'water',    mid: ['tower'],                           side: ['post', 'post', 'post'], below: 'water', road: 'bridge' },
  'festival-street':   { far: 'rooftops', mid: ['house', 'tree', 'house'],          side: ['bunting', 'lantern', 'stall', 'bunting'], below: 'dirt', road: 'cobble' },
  'night-market':      { far: 'skyline',  mid: ['stall', 'house', 'lantern'],       side: ['lantern', 'stall', 'crate', 'lantern'], below: 'dirt', road: 'cobble' },
  'industrial-zone':   { far: 'factory',  mid: ['warehouse', 'chimney', 'tank'],    side: ['crate', 'fence', 'pipe', 'cone'], below: 'concrete', road: 'tar' },
};

const WALLS = ['#F5D9B0', '#F2C7C0', '#CFE8D5', '#C9DBF2', '#F7E3A1', '#E8C8E8'];
const ROOFS = ['#C0564A', '#8C6A4F', '#4A6FA5', '#3F7C5B', '#B5651D'];
const AWNINGS = ['#D9364A', '#F5B942', '#3F9C6B', '#4A8CE0', '#E94B8A'];

/* ---------------- Public API ---------------- */

export function drawBackdrop(ctx: Ctx, o: SceneOpts): void {
  const { w, h, world } = o;
  const c = world.colors;
  const scene = SCENES[world.id] ?? SCENES.residential;
  const night = !!world.nightMode;

  const sky = ctx.createLinearGradient(0, 0, 0, o.roadTop);
  sky.addColorStop(0, c.skyTop);
  sky.addColorStop(1, c.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  drawCelestial(ctx, o, night);
  drawClouds(ctx, o, night);
  drawFar(ctx, o, scene.far);

  // mid distance, then roadside props, standing on the back edge of the road
  layer(o, 190, 0.45, scene.mid, (kind, x, r, i) => drawProp(ctx, kind, x, o.roadTop - 26, 0.8 + r * 0.35, r, o, night, i));
  // a soft haze to push the mid layer back
  const haze = ctx.createLinearGradient(0, o.roadTop - 140, 0, o.roadTop - 20);
  haze.addColorStop(0, mix(c.skyBottom, '#FFFFFF', 0.3) + '00');
  haze.addColorStop(1, mix(c.skyBottom, '#FFFFFF', 0.3) + '44');
  ctx.fillStyle = haze;
  ctx.fillRect(0, o.roadTop - 140, w, 120);
  layer(o, 120, 0.88, scene.side, (kind, x, r, i) => drawProp(ctx, kind, x, o.roadTop - 4, 0.85 + r * 0.25, r, o, night, i));
}

export function drawRoad(ctx: Ctx, o: SceneOpts): void {
  const { w, h, world, roadTop, roadH, camX } = o;
  const c = world.colors;
  const scene = SCENES[world.id] ?? SCENES.residential;
  const roadBottom = roadTop + roadH;

  // ground beside the road (below it on screen)
  drawBelow(ctx, o, scene.below, roadBottom);

  // surface
  const g = ctx.createLinearGradient(0, roadTop, 0, roadBottom);
  const wood = scene.road === 'planks';
  g.addColorStop(0, wood ? '#C9A06A' : c.road);
  g.addColorStop(1, wood ? '#A57C46' : c.roadShade);
  ctx.fillStyle = g;
  ctx.fillRect(0, roadTop, w, roadH);

  const first = Math.floor(camX / 40) - 1;
  ctx.save();
  ctx.beginPath(); ctx.rect(0, roadTop, w, roadH); ctx.clip();
  switch (scene.road) {
    case 'tar':
      for (let i = first; i < first + w / 40 + 3; i++) {
        const x = i * 40 - camX;
        for (let k = 0; k < 3; k++) circle(ctx, x + hash01(i, k) * 40, roadTop + hash01(i, k + 5) * roadH, 1.2 + hash01(i, k + 9) * 1.4, 'rgba(0,0,0,0.12)', { stroke: null });
      }
      break;
    case 'dirt':
      for (let i = first; i < first + w / 40 + 3; i++) {
        const x = i * 40 - camX;
        for (let k = 0; k < 4; k++) ellipse(ctx, x + hash01(i, k) * 40, roadTop + hash01(i, k + 4) * roadH, 2.6, 1.4, 'rgba(110,80,40,0.2)', { stroke: null });
      }
      break;
    case 'cobble': {
      const cw = 22;
      const offX = -(camX % cw);
      for (let row = 0; row < roadH / 14 + 1; row++) {
        const shift = row % 2 ? cw / 2 : 0;
        for (let x = offX - cw + shift; x < w + cw; x += cw) rrect(ctx, x, roadTop + row * 14, cw - 2, 12, 3, null, { stroke: 'rgba(80,60,40,0.25)', lw: 1.2 });
      }
      break;
    }
    case 'planks':
      for (let i = first; i < first + w / 40 + 3; i++) {
        const x = i * 40 - camX;
        line(ctx, x, roadTop, x, roadBottom, 'rgba(70,45,20,0.4)', 2);
        circle(ctx, x + 4, roadTop + 6, 1.4, 'rgba(50,30,10,0.5)', { stroke: null });
        circle(ctx, x + 4, roadBottom - 6, 1.4, 'rgba(50,30,10,0.5)', { stroke: null });
      }
      break;
    case 'bridge':
      for (let i = first; i < first + w / 90 + 3; i++) {
        const x = i * 90 - camX;
        line(ctx, x, roadTop, x, roadBottom, 'rgba(0,0,0,0.18)', 3);
      }
      break;
  }
  ctx.restore();

  // lane markings
  if (scene.road === 'tar' || scene.road === 'bridge') {
    ctx.setLineDash([22, 20]);
    ctx.lineDashOffset = camX;
    line(ctx, 0, roadTop + roadH * 0.5, w, roadTop + roadH * 0.5, 'rgba(255,230,140,0.75)', 4);
    ctx.setLineDash([]);
  }
  if (scene.crosswalk) {
    const period = 1500;
    const k = Math.floor((camX + w) / period);
    for (let n = k - 1; n <= k; n++) {
      const x0 = n * period + 700 - camX;
      for (let s = 0; s < 6; s++) rrect(ctx, x0 + s * 16, roadTop + 2, 9, roadH - 4, 0, 'rgba(255,255,255,0.85)', { stroke: null });
    }
  }

  // kerbs
  rrect(ctx, 0, roadTop - 5, w, 7, 0, shade(c.road, 0.3), { stroke: 'rgba(60,40,20,0.35)', lw: 1.4 });
  rrect(ctx, 0, roadBottom - 1, w, 6, 0, shade(c.road, 0.2), { stroke: 'rgba(60,40,20,0.35)', lw: 1.4 });

  // night / festival warm glow handled by the caller (overlay)
  void h;
}

export function drawForeground(ctx: Ctx, o: SceneOpts): void {
  const scene = SCENES[o.world.id] ?? SCENES.residential;
  if (scene.below !== 'grass' && scene.below !== 'dirt') return;
  const { h, camX, time } = o;
  const sp = 64, par = 1.25;
  const off = camX * par;
  for (let i = Math.floor(off / sp) - 1; i < Math.floor((off + o.w) / sp) + 2; i++) {
    if (hash01(i, 21) < 0.3) continue;
    const x = i * sp + hash01(i, 22) * 40 - off;
    const base = h + 2;
    const sway = Math.sin(time * 2 + i) * 2;
    const col = scene.below === 'grass' ? '#2E8A57' : '#8C6A3F';
    for (let b = -1; b <= 1; b++) {
      limb(ctx, [[x + b * 5, base], [x + b * 6 + sway, base - 18 - hash01(i, b + 30) * 10]], 4, col, null);
    }
    if (scene.below === 'grass' && hash01(i, 23) > 0.55) {
      const fc = ['#F2637B', '#F5B942', '#FFFFFF', '#B58CFF'][Math.floor(hash01(i, 24) * 4)];
      circle(ctx, x + sway, base - 30, 3.6, fc, { stroke: INK, lw: 1 });
      circle(ctx, x + sway, base - 30, 1.2, '#F5B942', { stroke: null });
    }
  }
}

/* ---------------- Sky ---------------- */

function drawCelestial(ctx: Ctx, o: SceneOpts, night: boolean): void {
  const { w, h } = o;
  if (night) {
    circle(ctx, w - 56, 62, 46, 'rgba(255,245,200,0.12)', { stroke: null });
    circle(ctx, w - 56, 62, 24, '#FFF6D2', { stroke: null });
    circle(ctx, w - 48, 56, 22, mix(o.world.colors.skyTop, '#3E2760', 0.3), { stroke: null });
    for (let i = 0; i < 32; i++) {
      const tw = 0.4 + 0.6 * Math.abs(Math.sin(o.time * (0.8 + hash01(i, 3)) + i));
      ctx.fillStyle = `rgba(255,255,255,${tw * 0.9})`;
      ctx.fillRect(hash01(i, 1) * w, hash01(i, 2) * (o.roadTop * 0.7), 2, 2);
    }
  } else {
    const rg = ctx.createRadialGradient(w - 52, 58, 6, w - 52, 58, 90);
    rg.addColorStop(0, 'rgba(255,236,160,0.9)');
    rg.addColorStop(1, 'rgba(255,236,160,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(w - 160, 0, 160, 160);
    circle(ctx, w - 52, 58, 24, '#FFE08A', { stroke: null });
    circle(ctx, w - 52, 58, 17, '#FFF1B8', { stroke: null });
  }
  void h;
}

function drawClouds(ctx: Ctx, o: SceneOpts, night: boolean): void {
  const { w, camX, time } = o;
  const span = w + 260;
  for (let i = 0; i < 5; i++) {
    const speed = 5 + hash01(i, 7) * 6;
    let x = ((hash01(i, 8) * span + time * speed - camX * 0.04) % span + span) % span - 130;
    const y = 30 + hash01(i, 9) * (o.roadTop * 0.38);
    const s = 0.7 + hash01(i, 10) * 0.7;
    const col = night ? 'rgba(180,170,220,0.25)' : 'rgba(255,255,255,0.88)';
    ctx.fillStyle = col;
    for (const [dx, dy, r] of [[0, 0, 20], [22, -8, 24], [46, 0, 19], [18, 6, 18], [34, 6, 18]] as const) {
      ctx.beginPath(); ctx.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2); ctx.fill();
    }
    x += 0;
  }
}

function drawFar(ctx: Ctx, o: SceneOpts, kind: FarKind): void {
  const { w, camX, roadTop, world } = o;
  const base = roadTop - 24;
  const tint = mix(world.colors.skyBottom, world.colors.ground, 0.45);
  const dark = shade(tint, -0.12);
  const par = 0.14;
  const off = camX * par;

  if (kind === 'hills') {
    for (let layer = 0; layer < 2; layer++) {
      ctx.beginPath(); ctx.moveTo(0, base + 10);
      for (let x = 0; x <= w; x += 12) {
        const wx = x + off * (1 + layer * 0.6);
        ctx.lineTo(x, base - 34 - layer * 14 - Math.sin(wx * 0.011 + layer * 2) * 22 - Math.sin(wx * 0.027) * 9);
      }
      ctx.lineTo(w, base + 10); ctx.closePath();
      ctx.fillStyle = layer ? shade(world.colors.ground, 0.35) : shade(world.colors.ground, 0.5);
      ctx.globalAlpha = 0.55; ctx.fill(); ctx.globalAlpha = 1;
    }
    return;
  }
  if (kind === 'water') {
    ctx.fillStyle = shade(world.colors.skyBottom, -0.08);
    ctx.fillRect(0, base - 6, w, 30);
    for (let i = 0; i < 6; i++) line(ctx, (i * 80 + o.time * 6) % (w + 40) - 20, base + 3 + (i % 3) * 5, (i * 80 + o.time * 6) % (w + 40) + 20, base + 3 + (i % 3) * 5, 'rgba(255,255,255,0.4)', 2);
    return;
  }
  const spacing = 70;
  for (let i = Math.floor(off / spacing) - 1; i < Math.floor((off + w) / spacing) + 2; i++) {
    const x = i * spacing - off;
    const r = hash01(i, 40);
    const bw = 36 + r * 36;
    let bh = 34 + hash01(i, 41) * 40;
    if (kind === 'tall') bh = 70 + hash01(i, 41) * 90;
    if (kind === 'skyline') bh = 40 + hash01(i, 41) * 70;
    if (kind === 'factory') bh = 36 + hash01(i, 41) * 30;
    if (kind === 'houses' || kind === 'rooftops') {
      rrect(ctx, x, base - bh, bw, bh + 10, 2, tint, { stroke: null });
      poly(ctx, [[x - 3, base - bh], [x + bw / 2, base - bh - 16 - r * 8], [x + bw + 3, base - bh]], dark, { stroke: null });
    } else {
      rrect(ctx, x, base - bh, bw, bh + 10, 1, tint, { stroke: null });
      ctx.fillStyle = dark;
      for (let wy = 8; wy < bh - 6; wy += 12) for (let wx = 6; wx < bw - 6; wx += 12) ctx.fillRect(x + wx, base - bh + wy, 5, 6);
      if (kind === 'factory' && r > 0.5) rrect(ctx, x + bw - 14, base - bh - 28, 9, 30, 1, dark, { stroke: null });
    }
  }
}

/* ---------------- Ground beside the road ---------------- */

function drawBelow(ctx: Ctx, o: SceneOpts, kind: BelowKind, y0: number): void {
  const { w, h, camX, time, world } = o;
  const c = world.colors;
  if (kind === 'water') {
    const g = ctx.createLinearGradient(0, y0, 0, h);
    g.addColorStop(0, '#5FB4E0'); g.addColorStop(1, '#2E6FA8');
    ctx.fillStyle = g; ctx.fillRect(0, y0, w, h - y0);
    for (let row = 0; row < 6; row++) {
      ctx.beginPath();
      for (let x = 0; x <= w; x += 8) {
        const yy = y0 + 16 + row * 22 + Math.sin((x + camX * (0.5 + row * 0.1)) * 0.05 + time * 1.6 + row) * 3;
        x ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy);
      }
      ctx.strokeStyle = `rgba(255,255,255,${0.35 - row * 0.04})`; ctx.lineWidth = 2; ctx.stroke();
    }
    return;
  }
  const pal: Record<string, [string, string]> = {
    grass: ['#5DB872', '#33905A'], dirt: ['#CBA46C', '#A9804A'], concrete: ['#A3A9B1', '#7E858E'],
  };
  const [p1, p2] = pal[kind] ?? pal.grass;
  const g = ctx.createLinearGradient(0, y0, 0, h);
  g.addColorStop(0, mix(p1, c.ground, 0.12)); g.addColorStop(1, mix(p2, c.groundShade, 0.12));
  ctx.fillStyle = g; ctx.fillRect(0, y0, w, h - y0);
  if (kind === 'concrete') {
    for (let i = Math.floor(camX / 60) - 1; i < Math.floor((camX + w) / 60) + 2; i++) line(ctx, i * 60 - camX, y0, i * 60 - camX, h, 'rgba(0,0,0,0.12)', 2);
    line(ctx, 0, y0 + 26, w, y0 + 26, 'rgba(0,0,0,0.1)', 2);
  } else if (kind === 'dirt') {
    for (let i = Math.floor(camX / 36) - 1; i < Math.floor((camX + w) / 36) + 2; i++) ellipse(ctx, i * 36 - camX + hash01(i, 50) * 30, y0 + 10 + hash01(i, 51) * (h - y0 - 14), 4, 2, 'rgba(70,45,20,0.25)', { stroke: null });
  }
}

/* ---------------- Layers & props ---------------- */

function layer(o: SceneOpts, spacing: number, parallax: number, kinds: string[], cb: (kind: string, x: number, r: number, i: number) => void): void {
  const off = o.camX * parallax;
  for (let i = Math.floor(off / spacing) - 1; i < Math.floor((off + o.w) / spacing) + 2; i++) {
    if (hash01(i, 3 + Math.round(parallax * 10)) < 0.18) continue;
    const r = hash01(i, 1);
    const kind = kinds[Math.floor(hash01(i, 2 + Math.round(parallax * 10)) * kinds.length) % kinds.length];
    const x = i * spacing + (hash01(i, 4) - 0.5) * spacing * 0.35 - off;
    cb(kind, x, r, i);
  }
}

function glow(ctx: Ctx, x: number, y: number, r: number, color = 'rgba(255,220,120,0.55)'): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color); g.addColorStop(1, 'rgba(255,220,120,0)');
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
}

function drawProp(ctx: Ctx, kind: string, x: number, y: number, s: number, r: number, o: SceneOpts, night: boolean, i: number): void {
  if (x < -140 || x > o.w + 140) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  const t = o.time;
  const wall = WALLS[i < 0 ? 0 : Math.floor(r * WALLS.length) % WALLS.length];
  const roof = ROOFS[Math.floor(hash01(i, 6) * ROOFS.length)];
  const awn = AWNINGS[Math.floor(hash01(i, 7) * AWNINGS.length)];
  const lit = night || !!o.dark;
  switch (kind) {
    case 'house': {
      rrect(ctx, -34, -52, 68, 52, 3, wall);
      poly(ctx, [[-42, -50], [0, -84], [42, -50]], roof, { lw: 2.4 });
      rrect(ctx, -8, -30, 16, 30, 3, '#8C6A4F', { lw: 1.8 });
      circle(ctx, 4, -15, 1.5, '#F5B942', { stroke: null });
      for (const wx of [-26, 14]) { rrect(ctx, wx, -42, 12, 14, 2, lit ? '#FFE9A0' : '#BFE3F7', { lw: 1.6 }); line(ctx, wx + 6, -42, wx + 6, -28, INK, 1); }
      if (lit) glow(ctx, 0, -35, 40);
      break;
    }
    case 'hut': {
      rrect(ctx, -26, -34, 52, 34, 6, '#C9985E');
      for (let k = -2; k <= 2; k++) line(ctx, k * 9, -34, k * 9, 0, 'rgba(110,70,30,0.35)', 1.5);
      poly(ctx, [[-36, -30], [0, -68], [36, -30]], '#D9B15A', { lw: 2.2 });
      for (let k = -3; k <= 3; k++) line(ctx, k * 8, -32 + Math.abs(k) * 2, k * 4, -62 + Math.abs(k) * 2, 'rgba(140,100,30,0.5)', 1.3);
      rrect(ctx, -7, -24, 14, 24, 7, '#6B4F38', { lw: 1.6 });
      break;
    }
    case 'tree': {
      rrect(ctx, -5, -42, 10, 42, 3, '#8C6A4F', { lw: 2 });
      const gc = o.world.colors.ground === '#D9364A' ? '#4FA05E' : '#3F9C6B';
      for (const [dx, dy, rr] of [[-16, -54, 20], [14, -56, 21], [0, -72, 24], [0, -50, 22]] as const) circle(ctx, dx, dy, rr, shade(gc, hash01(i, 11) * 0.12), { lw: 2 });
      circle(ctx, -8, -78, 5, shade(gc, 0.25), { stroke: null });
      break;
    }
    case 'palm': {
      limb(ctx, [[0, 0], [4, -30], [-2, -60], [2, -84]], 8, '#A0764A');
      for (let k = 0; k < 6; k++) {
        const a = -Math.PI / 2 + (k - 2.5) * 0.55 + Math.sin(t * 1.4 + k) * 0.06;
        limb(ctx, [[2, -84], [2 + Math.cos(a) * 20, -84 + Math.sin(a) * 14], [2 + Math.cos(a) * 40, -84 + Math.sin(a) * 18 + 14]], 5, '#3F9C6B');
      }
      circle(ctx, 0, -82, 4, '#8C5A2B', { lw: 1.4 });
      break;
    }
    case 'bush': {
      for (const [dx, rr] of [[-14, 12], [0, 15], [15, 12]] as const) circle(ctx, dx, -rr + 4, rr, '#3F9C6B', { lw: 1.8 });
      break;
    }
    case 'flowers': {
      for (let k = 0; k < 5; k++) {
        const fx = -20 + k * 10;
        line(ctx, fx, 0, fx, -12 - (k % 2) * 4, '#3F9C6B', 2);
        circle(ctx, fx, -14 - (k % 2) * 4, 4.2, ['#F2637B', '#F5B942', '#B58CFF', '#FFFFFF', '#F2637B'][k], { lw: 1.2 });
        circle(ctx, fx, -14 - (k % 2) * 4, 1.4, '#F5B942', { stroke: null });
      }
      break;
    }
    case 'lamp': {
      rrect(ctx, -3, -72, 6, 72, 2, '#4B5563', { lw: 1.8 });
      limb(ctx, [[0, -72], [14, -78]], 4, '#4B5563');
      ellipse(ctx, 16, -76, 9, 5, lit ? '#FFE9A0' : '#E8E8E8', { lw: 1.6 });
      if (lit) glow(ctx, 16, -70, 56);
      break;
    }
    case 'fence': {
      for (let k = -3; k <= 3; k++) rrect(ctx, k * 10 - 3, -24, 6, 24, 1.5, '#F5ECD6', { lw: 1.4 });
      rrect(ctx, -34, -18, 68, 4, 0, '#E8D9B0', { lw: 1.2 });
      break;
    }
    case 'stall': {
      rrect(ctx, -30, -22, 60, 22, 2, '#B9885A', { lw: 1.8 });
      line(ctx, -28, -58, -28, -22, '#8C6A4F', 3); line(ctx, 28, -58, 28, -22, '#8C6A4F', 3);
      for (let k = 0; k < 6; k++) poly(ctx, [[-34 + k * 12, -58], [-22 + k * 12, -58], [-22 + k * 12, -44], [-28 + k * 12, -40], [-34 + k * 12, -44]], k % 2 ? '#FFFFFF' : awn, { lw: 1.4 });
      for (let k = 0; k < 6; k++) circle(ctx, -22 + k * 9, -26, 4.4, ['#F2961E', '#D9364A', '#3F9C6B'][k % 3], { lw: 1.2 });
      if (lit) glow(ctx, 0, -44, 44);
      break;
    }
    case 'crate': {
      rrect(ctx, -16, -20, 32, 20, 2, '#C8955A', { lw: 1.8 });
      line(ctx, -16, -10, 16, -10, '#8C6A4F', 1.4);
      rrect(ctx, -10, -36, 22, 16, 2, '#B9885A', { lw: 1.8 });
      break;
    }
    case 'shelter': {
      rrect(ctx, -34, -52, 68, 5, 2, '#4A6FA5', { lw: 1.8 });
      line(ctx, -32, -50, -32, 0, '#6B7280', 3); line(ctx, 32, -50, 32, 0, '#6B7280', 3);
      rrect(ctx, -30, -46, 60, 34, 2, 'rgba(200,230,255,0.4)', { lw: 1.4 });
      rrect(ctx, -22, -14, 44, 5, 1, '#8C6A4F', { lw: 1.4 });
      rrect(ctx, 34, -70, 5, 70, 1, '#6B7280', { lw: 1.4 });
      circle(ctx, 36, -74, 9, '#F5B942', { lw: 1.6 });
      break;
    }
    case 'sign': {
      rrect(ctx, -2, -50, 4, 50, 1, '#6B7280', { lw: 1.4 });
      poly(ctx, [[-14, -50], [14, -50], [14, -74], [-14, -74]], '#2E7DD9', { lw: 1.8 });
      circle(ctx, 0, -62, 6, '#FFFFFF', { stroke: null });
      break;
    }
    case 'building': {
      const bw = 56 + r * 30, bh = 90 + r * 60;
      rrect(ctx, -bw / 2, -bh, bw, bh, 2, shade(wall, -0.08));
      for (let wy = 12; wy < bh - 14; wy += 20) for (let wx = -bw / 2 + 8; wx < bw / 2 - 12; wx += 18) rrect(ctx, wx, -bh + wy, 11, 12, 1.5, lit && hash01(wy + i, wx) > 0.4 ? '#FFE9A0' : '#BFE3F7', { lw: 1.2 });
      rrect(ctx, -9, -26, 18, 26, 2, '#6B7280', { lw: 1.6 });
      break;
    }
    case 'skyscraper': {
      const bw = 50 + r * 22, bh = 150 + r * 90;
      rrect(ctx, -bw / 2, -bh, bw, bh, 2, mix('#6F88B0', wall, 0.15));
      for (let wy = 10; wy < bh - 10; wy += 14) for (let wx = -bw / 2 + 6; wx < bw / 2 - 8; wx += 12) rect(ctx, wx, -bh + wy, 7, 8, lit && hash01(wy, wx + i) > 0.35 ? '#FFE9A0' : '#CFE8F7');
      line(ctx, 0, -bh, 0, -bh - 18, '#6B7280', 2);
      circle(ctx, 0, -bh - 20, 2.4, '#D9364A', { stroke: null });
      break;
    }
    case 'billboard': {
      rrect(ctx, -3, -50, 6, 50, 1, '#6B7280'); rrect(ctx, -34, -96, 68, 44, 3, '#FFFFFF', { lw: 2 });
      rrect(ctx, -30, -92, 60, 36, 2, awn, { stroke: null });
      ctx.font = 'bold 13px sans-serif'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText('BABY ON', 0, -78); ctx.fillText('BOARD!', 0, -62);
      break;
    }
    case 'crane': {
      rrect(ctx, -4, -130, 8, 130, 1, '#E8A91E', { lw: 1.8 });
      rrect(ctx, -20, -132, 90, 7, 1, '#E8A91E', { lw: 1.8 });
      line(ctx, 60, -125, 60, -86 + Math.sin(t * 1.5) * 4, INK, 1.6);
      rrect(ctx, 52, -86 + Math.sin(t * 1.5) * 4, 16, 8, 1, '#D9364A', { lw: 1.4 });
      for (let k = 0; k < 6; k++) line(ctx, -4, -k * 22, 4, -(k + 1) * 22, '#B8861B', 1.4);
      break;
    }
    case 'scaffold': {
      for (let lv = 0; lv < 3; lv++) { rrect(ctx, -34, -lv * 30 - 4, 68, 4, 0, '#B9885A', { lw: 1.4 }); }
      for (const px of [-32, 0, 32]) line(ctx, px, 0, px, -88, '#8C8C8C', 3);
      line(ctx, -32, 0, 0, -30, '#8C8C8C', 1.6); line(ctx, 0, -30, 32, -60, '#8C8C8C', 1.6);
      rrect(ctx, -30, -90, 36, 22, 1, shade(wall, -0.1), { lw: 1.6 });
      break;
    }
    case 'pile': {
      poly(ctx, [[-34, 0], [-6, -30], [10, -22], [34, 0]], '#C7A96F', { lw: 1.8 });
      poly(ctx, [[-4, 0], [18, -18], [38, 0]], '#B8935A', { lw: 1.6 });
      break;
    }
    case 'cone': {
      poly(ctx, [[-9, 0], [9, 0], [3, -28], [-3, -28]], '#F2761E', { lw: 1.8 });
      rrect(ctx, -5.5, -17, 11, 4, 0, '#FFF', { stroke: null });
      rrect(ctx, -11, -3, 22, 4, 1, '#C95A12', { lw: 1.4 });
      break;
    }
    case 'swing': {
      line(ctx, -32, 0, -10, -64, '#E8651E', 4); line(ctx, 32, 0, 10, -64, '#E8651E', 4); line(ctx, -10, -64, 10, -64, '#E8651E', 5);
      const a = Math.sin(t * 2 + i) * 0.45;
      ctx.save(); ctx.translate(0, -64); ctx.rotate(a);
      line(ctx, -7, 0, -7, 40, '#6B7280', 1.6); line(ctx, 7, 0, 7, 40, '#6B7280', 1.6);
      rrect(ctx, -11, 38, 22, 5, 2, '#3F9C6B', { lw: 1.4 });
      ctx.restore();
      break;
    }
    case 'seesaw': {
      poly(ctx, [[-8, 0], [8, 0], [0, -18]], '#6B7280', { lw: 1.8 });
      const a = Math.sin(t * 1.6 + i) * 0.22;
      ctx.save(); ctx.translate(0, -18); ctx.rotate(a);
      rrect(ctx, -40, -4, 80, 7, 3, '#F5B942', { lw: 1.8 });
      circle(ctx, -36, -10, 5, '#F2637B', { lw: 1.2 }); circle(ctx, 36, -10, 5, '#4A8CE0', { lw: 1.2 });
      ctx.restore();
      break;
    }
    case 'bench': {
      rrect(ctx, -26, -22, 52, 6, 2, '#B9885A', { lw: 1.6 }); rrect(ctx, -26, -30, 52, 6, 2, '#B9885A', { lw: 1.6 });
      line(ctx, -22, -16, -22, 0, '#4B5563', 3); line(ctx, 22, -16, 22, 0, '#4B5563', 3);
      break;
    }
    case 'school': {
      rrect(ctx, -60, -62, 120, 62, 3, '#E8B46B');
      poly(ctx, [[-66, -62], [0, -96], [66, -62]], '#C0564A', { lw: 2.4 });
      for (let k = -2; k <= 2; k++) if (k) rrect(ctx, k * 20 - 6, -48, 12, 16, 2, '#BFE3F7', { lw: 1.6 });
      rrect(ctx, -9, -34, 18, 34, 3, '#8C6A4F', { lw: 1.8 });
      line(ctx, 0, -96, 0, -116, '#6B7280', 2);
      poly(ctx, [[0, -116], [18 + Math.sin(t * 3) * 2, -112], [0, -106]], '#3F9C6B', { lw: 1.2 });
      ctx.font = 'bold 9px sans-serif'; ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.fillText('SCHOOL', 0, -66);
      break;
    }
    case 'boat': {
      const bob = Math.sin(t * 1.5 + i) * 2;
      poly(ctx, [[-36, -12 + bob], [36, -12 + bob], [26, 4 + bob], [-26, 4 + bob]], '#C0564A', { lw: 2 });
      line(ctx, 0, -12 + bob, 0, -58 + bob, '#6B4F38', 3);
      poly(ctx, [[2, -56 + bob], [26, -20 + bob], [2, -20 + bob]], '#FFFFFF', { lw: 1.6 });
      break;
    }
    case 'post': {
      rrect(ctx, -4, -34, 8, 34, 2, '#8C6A4F', { lw: 1.8 });
      line(ctx, 4, -26, 60, -26, '#8C6A4F', 3);
      break;
    }
    case 'haystack': {
      ctx.beginPath(); ctx.ellipse(0, -2, 30, 10, 0, 0, Math.PI * 2); ctx.fillStyle = '#C7A455'; ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, -26, 24, 28, 0, Math.PI, 0); ctx.closePath(); ctx.fillStyle = '#E5C568'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
      for (let k = -2; k <= 2; k++) line(ctx, k * 8, -24, k * 10, -2, 'rgba(140,100,30,0.4)', 1.4);
      break;
    }
    case 'pot': {
      ctx.beginPath(); ctx.ellipse(0, -14, 14, 16, 0, 0, Math.PI * 2); ctx.fillStyle = '#C9764A'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
      rrect(ctx, -8, -34, 16, 8, 2, '#C9764A', { lw: 1.8 });
      break;
    }
    case 'barn': {
      rrect(ctx, -44, -48, 88, 48, 2, '#B5382F');
      poly(ctx, [[-50, -46], [-30, -78], [30, -78], [50, -46]], '#8C2A24', { lw: 2.2 });
      rrect(ctx, -16, -34, 32, 34, 1, '#F5ECD6', { lw: 1.8 }); line(ctx, -16, -34, 16, 0, '#B5382F', 2); line(ctx, 16, -34, -16, 0, '#B5382F', 2);
      break;
    }
    case 'bunting': {
      line(ctx, -50, -68, -50, 0, '#8C6A4F', 3); line(ctx, 50, -68, 50, 0, '#8C6A4F', 3);
      ctx.beginPath(); ctx.moveTo(-50, -68); ctx.quadraticCurveTo(0, -48, 50, -68); ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.stroke();
      for (let k = 0; k < 9; k++) {
        const u = (k + 0.5) / 9, fx = -50 + u * 100, fy = -68 + 4 * u * (1 - u) * 20;
        poly(ctx, [[fx - 5, fy], [fx + 5, fy], [fx + Math.sin(t * 3 + k) * 1.5, fy + 12]], AWNINGS[k % 5], { lw: 1.2 });
      }
      break;
    }
    case 'lantern': {
      line(ctx, 0, -76, 0, -58, INK, 1.6);
      ellipse(ctx, 0, -48, 10, 13, '#E8421E', { lw: 1.8 });
      rrect(ctx, -5, -62, 10, 4, 1, '#F5B942', { lw: 1.2 }); rrect(ctx, -5, -37, 10, 4, 1, '#F5B942', { lw: 1.2 });
      line(ctx, 0, -33, 0, -26, '#F5B942', 2);
      glow(ctx, 0, -48, lit ? 62 : 32, 'rgba(255,170,70,0.5)');
      rrect(ctx, -3, -76, 6, 76, 1, '#6B4F38', { lw: 1.6 });
      break;
    }
    case 'warehouse': {
      rrect(ctx, -52, -56, 104, 56, 2, '#8C97A6');
      poly(ctx, [[-56, -54], [0, -78], [56, -54]], '#6B7585', { lw: 2.2 });
      rrect(ctx, -18, -34, 36, 34, 1, '#4B5563', { lw: 1.6 });
      for (let k = 0; k < 5; k++) line(ctx, -18, -30 + k * 7, 18, -30 + k * 7, '#6B7585', 1.4);
      break;
    }
    case 'chimney': {
      rrect(ctx, -12, -110, 24, 110, 2, '#A0522D');
      rrect(ctx, -15, -118, 30, 10, 2, '#7A3E22', { lw: 1.6 });
      for (let k = 0; k < 3; k++) circle(ctx, 4 + k * 8 + ((t * 8) % 8), -128 - k * 14 - ((t * 10) % 10), 8 + k * 3, `rgba(220,220,220,${0.6 - k * 0.15})`, { stroke: null });
      break;
    }
    case 'tank': {
      rrect(ctx, -26, -64, 52, 64, 10, '#B0B8C0'); ellipse(ctx, 0, -64, 26, 7, '#D0D6DC', { lw: 1.8 });
      line(ctx, -26, -40, 26, -40, '#8C97A6', 2); line(ctx, 30, 0, 30, -56, '#6B7280', 3);
      break;
    }
    case 'pipe': {
      rrect(ctx, -40, -22, 80, 12, 6, '#8C97A6', { lw: 1.8 }); line(ctx, -40, -16, 40, -16, '#B0B8C0', 2);
      rrect(ctx, -6, -34, 12, 14, 2, '#6B7585', { lw: 1.6 });
      break;
    }
    case 'tower': {
      rrect(ctx, -9, -150, 18, 150, 2, '#D9564A', { lw: 2 }); rrect(ctx, -20, -160, 40, 12, 3, '#D9564A', { lw: 2 });
      for (let k = 0; k < 6; k++) line(ctx, 0, -150, -120 + k * 8, -34, 'rgba(70,40,40,0.5)', 1.4);
      for (let k = 0; k < 6; k++) line(ctx, 0, -150, 120 - k * 8, -34, 'rgba(70,40,40,0.5)', 1.4);
      break;
    }
    default:
  }
  ctx.restore();
}

function rect(ctx: Ctx, x: number, y: number, w: number, h: number, fill: string): void {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
}

export function sceneFor(worldId: string): Scene {
  return SCENES[worldId] ?? SCENES.residential;
}

export const clampScene = clamp;
