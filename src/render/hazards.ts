/* ============================================================
   APUTU: Baby's Day Out — src/render/hazards.ts
   Vector art for all 12 hazards, each with:
     - an idle animation (spinning wheels, Zzz, flickering sparks)
     - a distinct "fixed!" outcome that plays after the player
       solves it (guard with a stop sign, plank over the gutter,
       carrot for the goat...), so every tap visibly *does*
       something.

   Origin: ground contact point, centred. Vehicles & animals are
   authored facing right and flipped (they approach from the
   right, so they face left toward the baby).
   ============================================================ */

import { clamp, easeOutBack, shade, smoothstep } from '../utils';
import { circle, ellipse, groundShadow, INK, limb, line, poly, rrect, star, type Ctx } from './draw';

export interface HazardDrawState {
  variant: number;
  phase: number;
  time: number;
  solved: boolean;
  /** seconds since solved */
  solveT: number;
  frozen: boolean;
}

const CAR_COLORS = ['#D9364A', '#2E7DD9', '#F5B942', '#3F9C6B'];
const BUS_COLORS = ['#F5B942', '#3F9C6B', '#4A8CE0', '#D9364A'];
const BARREL_COLORS = ['#8C6A4F', '#D9364A', '#4A6FA5', '#3F9C6B'];
const CART_GOODS = [['#F2961E', '#F2961E', '#F7B545'], ['#D9364A', '#D9364A', '#3F9C6B'], ['#3F9C6B', '#7CC06B', '#3F9C6B'], ['#F5D142', '#F5D142', '#E8963E']];

/** Visual size multiplier per hazard so vehicles loom over a toddler. */
const ART_SCALE: Record<string, number> = {
  car: 1.45, bus: 1.45, motorcycle: 1.4, goat: 1.3, dog: 1.25, cart: 1.3,
  barrel: 1.3, construction: 1.25, wire: 1.1, chicken: 1.15, gutter: 1.3, puddle: 1.3,
};

const FLIPPED = new Set(['car', 'motorcycle', 'bus', 'goat', 'chicken', 'dog']);

/** Eased slide-away used for "push it aside" outcomes. */
function aside(solveT: number, dur = 0.9): number {
  return smoothstep(0, dur, solveT);
}

export function drawHazard(ctx: Ctx, id: string, x: number, y: number, scale: number, st: HazardDrawState, size: { w: number; h: number }): void {
  scale *= ART_SCALE[id] ?? 1.2;
  size = { w: size.w / (ART_SCALE[id] ?? 1.2) * 0.9, h: size.h / (ART_SCALE[id] ?? 1.2) * 0.9 };
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  const a = st.solved ? aside(st.solveT) : 0;
  const flip = FLIPPED.has(id) ? -1 : 1;

  // everything that "leaves" after being solved fades while sliding off
  let dx = 0, dy = 0, alpha = 1;
  switch (id) {
    case 'cart': dy = -50 * a; dx = 14 * a; alpha = 1 - 0.55 * a; break;
    case 'barrel': dy = -46 * a; dx = 20 * a; alpha = 1 - 0.6 * a; break;
    case 'construction': dy = -56 * a; dx = -12 * a; alpha = 1 - 0.5 * a; break;
    case 'chicken': dy = -60 * a; dx = 70 * a; alpha = 1 - a; break;
    case 'dog': if (st.solveT > 0.6) { const b = smoothstep(0.6, 1.8, st.solveT); dy = -44 * b; dx = -30 * b; alpha = 1 - b; } break;
    default:
  }
  ctx.globalAlpha = alpha;
  ctx.translate(dx, dy);
  ctx.save();
  ctx.scale(flip, 1);
  drawBody(ctx, id, st);
  ctx.restore();

  if (st.frozen && !st.solved) {
    rrect(ctx, -size.w / 2, -size.h - 6, size.w, size.h + 8, 10, 'rgba(160,220,255,0.45)', { stroke: '#DFF6FF', lw: 2.4 });
    ctx.font = '16px serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#4A8CE0';
    ctx.fillText('❄', size.w * 0.28, -size.h + 6);
  }
  ctx.restore();

  // helpers that stand in the world, not on the hazard (drawn un-translated)
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  if (st.solved) drawSolveExtras(ctx, id, st, size);
  ctx.restore();
}

/* ---------------- Per-hazard bodies ---------------- */

function drawBody(ctx: Ctx, id: string, st: HazardDrawState): void {
  switch (id) {
    case 'car': return car(ctx, st);
    case 'motorcycle': return motorcycle(ctx, st);
    case 'bus': return bus(ctx, st);
    case 'gutter': return gutter(ctx, st);
    case 'dog': return dog(ctx, st);
    case 'cart': return cart(ctx, st);
    case 'puddle': return puddle(ctx, st);
    case 'barrel': return barrel(ctx, st);
    case 'goat': return goat(ctx, st);
    case 'construction': return construction(ctx, st);
    case 'wire': return wire(ctx, st);
    case 'chicken': return chicken(ctx, st);
    default: circle(ctx, 0, -14, 14, '#999');
  }
}

function wheel(ctx: Ctx, x: number, y: number, r: number, spin: number): void {
  circle(ctx, x, y, r, '#2B2B33');
  circle(ctx, x, y, r * 0.55, '#B8BEC6', { lw: 1.4 });
  for (let i = 0; i < 4; i++) {
    const ang = spin + (i * Math.PI) / 2;
    line(ctx, x, y, x + Math.cos(ang) * r * 0.5, y + Math.sin(ang) * r * 0.5, '#6B7280', 1.6);
  }
  circle(ctx, x, y, r * 0.15, '#6B7280', { stroke: null });
}

function car(ctx: Ctx, st: HazardDrawState): void {
  const col = CAR_COLORS[st.variant % 4];
  const moving = !st.solved && !st.frozen;
  const bounce = moving ? Math.sin(st.time * 16 + st.phase) * 0.9 : 0;
  const spin = moving ? st.time * 14 + st.phase : 0;
  groundShadow(ctx, 0, 1, 44);
  if (moving) for (let i = 0; i < 3; i++) circle(ctx, -44 - i * 9 - ((st.time * 20) % 9), -9 - i * 2, 3 + i, `rgba(180,180,180,${0.4 - i * 0.12})`, { stroke: null });
  ctx.translate(0, bounce);
  rrect(ctx, -39, -26, 78, 18, 7, col);
  poly(ctx, [[-21, -26], [-12, -41], [15, -41], [27, -26]], col, { lw: 2.2 });
  poly(ctx, [[-17, -28], [-10, -38], [-1, -38], [-1, -28]], '#BFE3F7', { lw: 1.5 });
  poly(ctx, [[3, -28], [3, -38], [12, -38], [21, -28]], '#BFE3F7', { lw: 1.5 });
  rrect(ctx, -39, -17, 78, 4, 0, shade(col, -0.2), { stroke: null });
  ellipse(ctx, 37, -19, 3.4, 4.4, '#FFF3B0', { lw: 1.2 });
  rrect(ctx, -41, -22, 4, 7, 2, st.solved ? '#FF2D2D' : '#B02A2A', { lw: 1 });
  rrect(ctx, 30, -14, 12, 4, 2, '#B8BEC6', { lw: 1.2 });
  wheel(ctx, -22, -9, 9.5, spin);
  wheel(ctx, 23, -9, 9.5, spin);
}

function motorcycle(ctx: Ctx, st: HazardDrawState): void {
  const col = ['#2E4374', '#D9364A', '#3F9C6B', '#F5B942'][st.variant % 4];
  const moving = !st.solved && !st.frozen;
  const spin = moving ? st.time * 18 + st.phase : 0;
  const bounce = moving ? Math.sin(st.time * 22 + st.phase) * 0.9 : 0;
  groundShadow(ctx, 0, 1, 36);
  ctx.translate(0, bounce);
  wheel(ctx, -21, -10, 10, spin);
  wheel(ctx, 22, -10, 10, spin);
  limb(ctx, [[-21, -10], [-6, -26], [12, -26], [22, -10]], 4.5, col);
  poly(ctx, [[-10, -28], [12, -28], [8, -20], [-12, -20]], col, { lw: 2 });
  line(ctx, 14, -28, 20, -40, INK, 3.4);
  line(ctx, 20, -40, 25, -40, INK, 3.4);
  ellipse(ctx, 26, -33, 3, 3.6, '#FFF3B0', { lw: 1.2 });
  // rider
  limb(ctx, [[-6, -32], [-2, -52]], 11, '#F2B01E');
  limb(ctx, [[-2, -48], [10, -42], [20, -40]], 5, '#8D5524');
  circle(ctx, 0, -62, 8.5, '#8D5524');
  ctx.beginPath(); ctx.arc(0, -63, 9.6, Math.PI, 0); ctx.closePath(); ctx.fillStyle = '#D9364A'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
  rrect(ctx, 3, -66, 7, 4, 1.5, '#1E2E52', { lw: 1 });
}

function bus(ctx: Ctx, st: HazardDrawState): void {
  const col = BUS_COLORS[st.variant % 4];
  const moving = !st.solved && !st.frozen;
  const spin = moving ? st.time * 10 + st.phase : 0;
  const bounce = moving ? Math.sin(st.time * 12 + st.phase) * 0.7 : 0;
  groundShadow(ctx, 0, 1, 56);
  ctx.translate(0, bounce);
  rrect(ctx, -50, -52, 100, 42, 8, col);
  rrect(ctx, -50, -22, 100, 6, 0, shade(col, -0.25), { stroke: null });
  for (let i = 0; i < 5; i++) rrect(ctx, -44 + i * 17, -46, 13, 14, 3, '#BFE3F7', { lw: 1.5 });
  rrect(ctx, 41, -46, 8, 22, 2, '#BFE3F7', { lw: 1.5 });
  rrect(ctx, -49, -57, 98, 6, 3, shade(col, 0.2), { lw: 1.6 });
  rrect(ctx, 44, -22, 8, 6, 2, '#FFF3B0', { lw: 1 });
  rrect(ctx, -52, -22, 4, 8, 2, st.solved ? '#FF2D2D' : '#B02A2A', { lw: 1 });
  wheel(ctx, -30, -10, 11, spin);
  wheel(ctx, 30, -10, 11, spin);
}

function gutter(ctx: Ctx, st: HazardDrawState): void {
  groundShadow(ctx, 0, 0, 0);
  // rim, dark pit, depth gradient
  rrect(ctx, -32, -12, 64, 16, 6, '#8A7966', { lw: 2.2 });
  rrect(ctx, -28, -10, 56, 11, 5, '#2A211A', { stroke: null });
  ellipse(ctx, -8, -3, 14, 3, '#3C3026', { stroke: null });
  for (let i = 0; i < 5; i++) line(ctx, -22 + i * 11, -9, -22 + i * 11, -1, '#3C3026', 1.2);
  if (!st.solved) {
    // warning marks
    ctx.fillStyle = '#F5B942';
    for (let i = 0; i < 3; i++) poly(ctx, [[-30 + i * 22, 5], [-24 + i * 22, 5], [-18 + i * 22, 10], [-24 + i * 22, 10]], '#F5B942', { lw: 1 });
  }
}

function dog(ctx: Ctx, st: HazardDrawState): void {
  const fur = ['#B8763F', '#8C6A4F', '#E0B070', '#6B4F38'][st.variant % 4];
  groundShadow(ctx, 0, 1, 30);
  if (!st.solved || st.solveT < 0.25) {
    // curled up, sleeping
    ellipse(ctx, 0, -13, 26, 13, fur);
    ellipse(ctx, 8, -9, 15, 7, shade(fur, 0.18), { stroke: null });
    circle(ctx, -24, -10, 11, fur);
    ellipse(ctx, -31, -15, 6, 9, shade(fur, -0.2), { rot: 0.5 });
    ellipse(ctx, -31, -5, 6, 4, '#2A1B12', { stroke: null });
    line(ctx, -27, -13, -21, -13, INK, 2);
    ellipse(ctx, 22, -22, 8, 5, fur, { rot: -0.7 });
    if (!st.solved) {
      ctx.font = 'bold 12px sans-serif'; ctx.fillStyle = '#4A6FA5';
      const f = (st.time * 0.8) % 1;
      ctx.globalAlpha *= 1 - f;
      ctx.fillText('z', -14 + f * 6, -30 - f * 14);
      ctx.fillText('Z', -6 + f * 8, -38 - f * 16);
      ctx.globalAlpha = 1;
    }
  } else {
    // awake and trotting off
    const t = st.time * 12;
    for (const s of [-1, 1]) {
      limb(ctx, [[-14, -16], [-14 + Math.sin(t + s) * 6, -4]], 5, shade(fur, -0.1));
      limb(ctx, [[14, -16], [14 + Math.sin(t - s) * 6, -4]], 5, shade(fur, -0.1));
    }
    ellipse(ctx, 0, -20, 24, 11, fur);
    circle(ctx, -24, -28, 11, fur);
    ellipse(ctx, -31, -33, 5, 9, shade(fur, -0.2), { rot: 0.6 });
    ellipse(ctx, -33, -24, 6, 4, '#2A1B12', { stroke: null });
    circle(ctx, -26, -30, 1.6, INK, { stroke: null });
    limb(ctx, [[22, -24], [32, -34 + Math.sin(t * 2) * 3]], 4, fur);
  }
}

function cart(ctx: Ctx, st: HazardDrawState): void {
  const goods = CART_GOODS[st.variant % 4];
  groundShadow(ctx, 0, 1, 34);
  limb(ctx, [[-26, -30], [-44, -42]], 4, '#8C6A4F');
  rrect(ctx, -28, -32, 56, 22, 3, '#B9885A');
  for (let i = 1; i < 4; i++) line(ctx, -28 + i * 14, -32, -28 + i * 14, -10, '#8C6A4F', 1.6);
  for (let i = 0; i < 7; i++) circle(ctx, -22 + i * 7.4, -36 - (i % 2) * 3, 5.4, goods[i % 3], { lw: 1.4 });
  rrect(ctx, -30, -12, 60, 4, 0, '#8C6A4F', { stroke: null });
  wheel(ctx, -14, -8, 8, st.solved ? 0 : st.time);
  wheel(ctx, 14, -8, 8, st.solved ? 0 : st.time);
}

function puddle(ctx: Ctx, st: HazardDrawState): void {
  const rip = (st.time * 0.9) % 1;
  ellipse(ctx, 0, -5, 31, 11, '#6FB0E0', { stroke: '#4A8CB5', lw: 2 });
  ellipse(ctx, -6, -7, 19, 6, '#9CD0F0', { stroke: null });
  ellipse(ctx, 8, -4, 8, 2.6, 'rgba(255,255,255,0.6)', { stroke: null });
  if (!st.solved) ellipse(ctx, 0, -5, 8 + rip * 20, 3 + rip * 6, null, { stroke: `rgba(255,255,255,${0.7 - rip * 0.7})`, lw: 1.6 });
}

function barrel(ctx: Ctx, st: HazardDrawState): void {
  const col = BARREL_COLORS[st.variant % 4];
  const moving = !st.solved && !st.frozen;
  const rock = moving ? Math.sin(st.time * 6 + st.phase) * 0.14 : 0;
  groundShadow(ctx, 0, 1, 24);
  ctx.save();
  ctx.translate(0, -2);
  ctx.rotate(rock);
  rrect(ctx, -16, -42, 32, 42, 8, col);
  rrect(ctx, -16, -34, 32, 4, 0, shade(col, -0.35), { stroke: null });
  rrect(ctx, -16, -12, 32, 4, 0, shade(col, -0.35), { stroke: null });
  ellipse(ctx, 0, -42, 16, 5, shade(col, 0.2), { lw: 1.8 });
  poly(ctx, [[-4, -26], [4, -26], [0, -18]], '#F5B942', { lw: 1 });
  ctx.restore();
}

function goat(ctx: Ctx, st: HazardDrawState): void {
  const fur = ['#F2EAD8', '#C68642', '#D8D2C4', '#8C6A4F'][st.variant % 4];
  const t = st.time * 8 + st.phase;
  const moving = !st.solved && !st.frozen;
  groundShadow(ctx, 0, 1, 30);
  const sw = moving ? Math.sin(t) * 5 : 0;
  for (const s of [-1, 1]) {
    limb(ctx, [[-14, -18], [-14 + sw * s, -2]], 4.5, shade(fur, -0.2));
    limb(ctx, [[14, -18], [14 - sw * s, -2]], 4.5, shade(fur, -0.2));
  }
  ellipse(ctx, 0, -26, 22, 12, fur);
  line(ctx, -22, -26, -28, -30, shade(fur, -0.2), 4);
  const headDown = st.solved ? 1 : 0;
  const hx = 24, hy = -32 + headDown * 14;
  limb(ctx, [[16, -30], [hx - 4, hy + 2]], 9, fur);
  ellipse(ctx, hx + 2, hy, 10, 8, fur, { rot: 0.2 });
  poly(ctx, [[hx - 2, hy - 6], [hx - 6, hy - 18], [hx + 2, hy - 8]], '#E8D9B0', { lw: 1.6 });
  poly(ctx, [[hx + 3, hy - 6], [hx + 2, hy - 18], [hx + 8, hy - 6]], '#E8D9B0', { lw: 1.6 });
  ellipse(ctx, hx - 8, hy - 2, 6, 3.4, shade(fur, -0.18), { rot: -0.4, lw: 1.4 });
  circle(ctx, hx + 11, hy + 1, 2, INK, { stroke: null });
  poly(ctx, [[hx + 3, hy + 7], [hx + 6, hy + 15], [hx + 9, hy + 7]], '#E8D9B0', { lw: 1.2 });
  if (st.solved) {
    ctx.beginPath(); ctx.arc(hx + 4, hy - 3, 3.4, Math.PI * 1.1, Math.PI * 1.9); ctx.strokeStyle = INK; ctx.lineWidth = 1.8; ctx.stroke();
  } else {
    circle(ctx, hx + 4, hy - 3, 3, '#fff', { lw: 1.2 });
    circle(ctx, hx + 5, hy - 3, 1.6, INK, { stroke: null });
    line(ctx, hx - 1, hy - 8, hx + 8, hy - 5, INK, 2); // grumpy brow
  }
}

function construction(ctx: Ctx, st: HazardDrawState): void {
  groundShadow(ctx, 0, 1, 34);
  // barrier
  rrect(ctx, -34, -34, 6, 34, 1, '#6B7280');
  rrect(ctx, 28, -34, 6, 34, 1, '#6B7280');
  rrect(ctx, -34, -42, 68, 14, 2, '#FFFFFF', { lw: 2 });
  ctx.save();
  ctx.beginPath(); ctx.rect(-34, -42, 68, 14); ctx.clip();
  for (let i = -6; i < 8; i++) poly(ctx, [[-34 + i * 12, -28], [-28 + i * 12, -28], [-18 + i * 12, -42], [-24 + i * 12, -42]], '#E8651E', { stroke: null });
  ctx.restore();
  // blinking lamp
  const on = Math.floor(st.time * 3) % 2 === 0 && !st.solved;
  circle(ctx, 0, -48, 5, on ? '#FFC93C' : '#B8893A', { lw: 1.6 });
  if (on) circle(ctx, 0, -48, 10, 'rgba(255,200,60,0.3)', { stroke: null });
  // cones
  for (const cx of [-44, 44]) {
    poly(ctx, [[cx - 8, 0], [cx + 8, 0], [cx + 3, -26], [cx - 3, -26]], '#F2761E', { lw: 1.8 });
    rrect(ctx, cx - 5, -17, 10, 4, 0, '#fff', { stroke: null });
    rrect(ctx, cx - 10, -3, 20, 4, 1, '#C95A12', { lw: 1.4 });
  }
}

function wire(ctx: Ctx, st: HazardDrawState): void {
  groundShadow(ctx, -18, 1, 12);
  rrect(ctx, -22, -86, 8, 86, 1, '#8C6A4F');
  rrect(ctx, -34, -84, 32, 5, 1, '#6B4F38', { lw: 1.6 });
  circle(ctx, -32, -86, 3, '#CFE8F5', { lw: 1 });
  const live = !st.solved;
  const sway = live ? Math.sin(st.time * 5) * 3 : 0;
  ctx.beginPath();
  ctx.moveTo(-32, -84);
  ctx.bezierCurveTo(-20, -60, 6 + sway, -50, 16 + sway, -8);
  ctx.strokeStyle = INK; ctx.lineWidth = 4.2; ctx.lineCap = 'round'; ctx.stroke();
  ctx.strokeStyle = live ? '#D9364A' : '#7A7A7A'; ctx.lineWidth = 2.4; ctx.stroke();
  if (live) {
    const f = Math.floor(st.time * 14) % 3;
    for (let i = 0; i < 4; i++) {
      const ang = (i / 4) * Math.PI * 2 + f;
      line(ctx, 16 + sway, -8, 16 + sway + Math.cos(ang) * (7 + f * 2), -8 + Math.sin(ang) * (7 + f * 2), i % 2 ? '#FFE35A' : '#9FE3FF', 2);
    }
    circle(ctx, 16 + sway, -8, 3, '#FFFFFF', { stroke: null });
    poly(ctx, [[0, -26], [10, -26], [5, -38]], '#FFD43B', { lw: 1.6 });
    ctx.font = 'bold 9px sans-serif'; ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.fillText('!', 5, -28);
  }
}

function chicken(ctx: Ctx, st: HazardDrawState): void {
  const tone = ['#FFFFFF', '#E0B070', '#8C6A4F', '#F2EAD8'][st.variant % 4];
  const t = st.time * 10 + st.phase;
  const peck = Math.max(0, Math.sin(t)) * 8;
  const run = st.solved ? 1 : 0;
  groundShadow(ctx, 0, 1, 22);
  for (const s of [-1, 1]) line(ctx, s * 5, -16, s * 5 + Math.sin(t * (1 + run) + s) * 4, -1, '#E8963E', 2.6);
  poly(ctx, [[-14, -22], [-26, -32 - Math.sin(t) * 2], [-18, -16]], shade(tone, -0.12), { lw: 1.8 });
  ellipse(ctx, 0, -24, 16, 12, tone);
  ellipse(ctx, -2, -22, 9, 5, shade(tone, -0.1), { stroke: null, rot: 0.3 });
  const hx = 14 + peck * 0.4, hy = -38 + peck;
  limb(ctx, [[8, -30], [hx, hy + 3]], 7, tone);
  circle(ctx, hx + 1, hy, 7, tone);
  poly(ctx, [[hx - 3, hy - 6], [hx, hy - 12], [hx + 3, hy - 7], [hx + 6, hy - 11], [hx + 7, hy - 5]], '#D9364A', { lw: 1.2 });
  poly(ctx, [[hx + 6, hy - 1], [hx + 13, hy + 1], [hx + 6, hy + 3]], '#F2B01E', { lw: 1.2 });
  circle(ctx, hx + 2, hy - 1, 1.6, INK, { stroke: null });
  poly(ctx, [[hx + 3, hy + 4], [hx + 6, hy + 9], [hx + 8, hy + 4]], '#D9364A', { lw: 1 });
}

/* ---------------- "Fixed!" extras ---------------- */

function drawSolveExtras(ctx: Ctx, id: string, st: HazardDrawState, size: { w: number; h: number }): void {
  const t = st.solveT;
  const pop = easeOutBack(clamp(t / 0.35, 0, 1));
  switch (id) {
    case 'car': case 'motorcycle': case 'bus': {
      // crossing guard steps out in front of the vehicle and holds up a STOP sign
      const gx = -(size.w / 2 + 26);
      ctx.save();
      ctx.translate(gx, 0);
      ctx.scale(pop, pop);
      groundShadow(ctx, 0, 1, 12);
      limb(ctx, [[0, -22], [-3, -2]], 6, '#3A3F4B');
      limb(ctx, [[0, -22], [3, -2]], 6, '#3A3F4B');
      rrect(ctx, -8, -46, 16, 26, 5, '#F2761E', { lw: 1.8 });
      rrect(ctx, -8, -36, 16, 3, 0, '#FFFFFF', { stroke: null });
      circle(ctx, 0, -54, 7.5, '#8D5524');
      ctx.beginPath(); ctx.arc(0, -56, 8.4, Math.PI, 0); ctx.closePath(); ctx.fillStyle = '#F2B01E'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.8; ctx.stroke();
      limb(ctx, [[-4, -42], [-14, -58]], 5, '#8D5524');
      line(ctx, -14, -58, -14, -80, '#8C6A4F', 3);
      poly(ctx, [[-22, -88], [-6, -88], [0, -82], [0, -70], [-6, -64], [-22, -64], [-28, -70], [-28, -82]].map(([px, py]) => [px + 8, py + 4] as [number, number]), '#D9364A', { lw: 2 });
      ctx.font = 'bold 8px sans-serif'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText('STOP', -6, -73);
      ctx.restore();
      break;
    }
    case 'gutter': {
      // a sturdy wooden plank bridges the gap
      const k = easeOutBack(clamp(t / 0.4, 0, 1));
      ctx.save();
      ctx.translate(0, -14 * (1 - k));
      ctx.globalAlpha = clamp(t / 0.2, 0, 1);
      rrect(ctx, -38, -10, 76, 11, 2, '#C8955A', { lw: 2 });
      for (let i = 0; i < 4; i++) line(ctx, -26 + i * 18, -9, -26 + i * 18, -1, '#8C6A4F', 1.4);
      circle(ctx, -32, -5, 1.6, '#6B4F38', { stroke: null });
      circle(ctx, 32, -5, 1.6, '#6B4F38', { stroke: null });
      ctx.restore();
      break;
    }
    case 'puddle': {
      ctx.save();
      ctx.globalAlpha = clamp(t / 0.25, 0, 1);
      poly(ctx, [[-30, -9], [26, -11], [32, 0], [-26, 2]], '#F5C518', { lw: 2 });
      for (let i = 0; i < 4; i++) line(ctx, -20 + i * 15, -9, -16 + i * 15, 1, '#E8963E', 2);
      ctx.restore();
      break;
    }
    case 'goat': {
      const k = easeOutBack(clamp(t / 0.35, 0, 1));
      ctx.save();
      ctx.translate(46 * -1, 0);
      ctx.scale(k, k);
      poly(ctx, [[-4, -4], [4, -4], [0, -22]].map(([px, py]) => [px, py] as [number, number]), '#F2761E', { lw: 1.6 });
      poly(ctx, [[-5, -21], [0, -30], [5, -21]], '#3F9C6B', { lw: 1.2 });
      ctx.restore();
      heartsFloat(ctx, -4, -52, t);
      break;
    }
    case 'wire': {
      ctx.save();
      ctx.globalAlpha = clamp(t / 0.2, 0, 1);
      rrect(ctx, 14, -34, 18, 24, 3, '#6B7280', { lw: 1.8 });
      circle(ctx, 23, -26, 3.4, '#3FD16B', { lw: 1 });
      rrect(ctx, 18, -18, 10, 4, 1, '#E8E8E8', { lw: 1 });
      ctx.font = 'bold 7px sans-serif'; ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.fillText('OFF', 23, -12);
      ctx.restore();
      break;
    }
    case 'construction': case 'cart': case 'barrel': case 'chicken': case 'dog': {
      if (t < 1.2) { star(ctx, 0, -50 - t * 20, 7, `rgba(255,214,70,${1 - t / 1.2})`, t * 4); }
      break;
    }
    default:
  }
}

function heartsFloat(ctx: Ctx, x: number, y: number, t: number): void {
  for (let i = 0; i < 3; i++) {
    const k = (t * 0.7 + i * 0.33) % 1;
    ctx.globalAlpha = 1 - k;
    ctx.fillStyle = '#F2637B';
    ctx.beginPath();
    const hx = x + (i - 1) * 12 + Math.sin(k * 6 + i) * 3, hy = y - k * 24;
    ctx.moveTo(hx, hy + 3);
    ctx.bezierCurveTo(hx - 6, hy - 3, hx - 3, hy - 8, hx, hy - 4);
    ctx.bezierCurveTo(hx + 3, hy - 8, hx + 6, hy - 3, hx, hy + 3);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
