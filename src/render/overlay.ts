/* ============================================================
   APUTU: Baby's Day Out — src/render/overlay.ts
   Small sprites and UI-in-the-world: speech bubbles, hint tags,
   danger rings, the "curiosity" objects Aputu gets distracted by
   (flowers, butterflies, balloons, a friendly cat), coins,
   power-up pickups and rescue effects (halo, orbiting stars).
   ============================================================ */

import type { InterestKind } from '../types';
import { clamp, shade } from '../utils';
import { circle, ellipse, heart, INK, limb, line, poly, rrect, star, type Ctx } from './draw';

/* ---------------- Speech bubble & hints ---------------- */

export function drawSpeechBubble(ctx: Ctx, x: number, y: number, text: string, alpha = 1, maxW = 150): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = 'bold 13px "Baloo 2", "Nunito", sans-serif';
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const wd of words) {
    const test = cur ? cur + ' ' + wd : wd;
    if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = wd; } else cur = test;
  }
  if (cur) lines.push(cur);
  const w = Math.max(...lines.map(l => ctx.measureText(l).width)) + 18;
  const h = lines.length * 16 + 12;
  const bx = clamp(x - w * 0.3, 6, 9999), by = y - h - 12;
  rrect(ctx, bx, by, w, h, 10, '#FFFFFF', { lw: 2 });
  poly(ctx, [[x - 6, by + h - 1], [x + 6, by + h - 1], [x - 2, by + h + 11]], '#FFFFFF', { stroke: null });
  line(ctx, x - 6, by + h, x - 2, by + h + 11, INK, 2);
  line(ctx, x + 6, by + h, x - 2, by + h + 11, INK, 2);
  ctx.fillStyle = INK;
  ctx.textAlign = 'left';
  lines.forEach((l, i) => ctx.fillText(l, bx + 9, by + 17 + i * 16));
  ctx.restore();
}

export function drawHintTag(ctx: Ctx, x: number, y: number, icon: string, text: string, pulse: number): void {
  ctx.save();
  ctx.font = 'bold 12px "Baloo 2", "Nunito", sans-serif';
  const tw = ctx.measureText(text).width;
  const w = tw + 38, h = 26;
  const bx = x - w / 2, by = y - h - Math.sin(pulse * 5) * 2;
  rrect(ctx, bx, by, w, h, 13, 'rgba(255,248,238,0.96)', { stroke: '#F5B942', lw: 2.2 });
  ctx.font = '15px serif'; ctx.textAlign = 'left'; ctx.fillStyle = INK;
  ctx.fillText(icon, bx + 8, by + 18);
  ctx.font = 'bold 12px "Baloo 2", "Nunito", sans-serif';
  ctx.fillText(text, bx + 28, by + 17);
  poly(ctx, [[x - 5, by + h - 1], [x + 5, by + h - 1], [x, by + h + 7]], 'rgba(255,248,238,0.96)', { stroke: null });
  ctx.restore();
}

/** Warning ring that tightens and reddens as the baby closes in. urgency: 0 = far, 1 = imminent. */
export function drawDangerRing(ctx: Ctx, x: number, y: number, r: number, urgency: number, time: number): void {
  const k = clamp(urgency, 0, 1);
  const pulse = 0.5 + 0.5 * Math.sin(time * (6 + k * 10));
  const col = k < 0.5 ? `rgba(245,185,66,${0.45 + 0.3 * pulse})` : `rgba(217,54,74,${0.5 + 0.4 * pulse})`;
  ctx.save();
  ctx.strokeStyle = col;
  ctx.lineWidth = 3 + k * 2;
  ctx.setLineDash([9, 7]);
  ctx.lineDashOffset = -time * 30;
  ctx.beginPath();
  ctx.ellipse(x, y, r + pulse * 3, (r + pulse * 3) * 0.55, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

/* ---------------- Curiosity objects ---------------- */

export function drawInterest(ctx: Ctx, kind: InterestKind, x: number, y: number, scale: number, time: number, done = false, t = 0): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  switch (kind) {
    case 'flower': {
      const sway = Math.sin(time * 2) * 2;
      limb(ctx, [[0, 0], [sway * 0.5, -14], [sway, -30]], 3.4, '#3F9C6B');
      poly(ctx, [[0, -10], [-12, -18], [-4, -6]], '#58B26F', { lw: 1.4 });
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ellipse(ctx, sway + Math.cos(a) * 8, -34 + Math.sin(a) * 8, 6, 4.2, '#F7A8D0', { rot: a, lw: 1.4 });
      }
      circle(ctx, sway, -34, 5, '#F5B942', { lw: 1.4 });
      break;
    }
    case 'butterfly': {
      const flap = Math.abs(Math.sin(time * 14));
      ctx.translate(0, -34 + Math.sin(time * 4) * 6);
      for (const s of [-1, 1]) {
        ellipse(ctx, s * 8 * flap + s * 2, -4, 9 * flap + 2, 9, '#7E5BEF', { lw: 1.4, rot: s * 0.4 });
        ellipse(ctx, s * 6 * flap + s * 2, 7, 6 * flap + 1.5, 6, '#B58CFF', { lw: 1.4, rot: -s * 0.4 });
        circle(ctx, s * 8 * flap + s * 2, -5, 2, '#FFF', { stroke: null });
      }
      ellipse(ctx, 0, 0, 2.6, 8, INK, { stroke: null });
      line(ctx, 0, -7, -4, -13, INK, 1.2); line(ctx, 0, -7, 4, -13, INK, 1.2);
      break;
    }
    case 'balloon': {
      const rise = done ? t * 60 : 0;
      const sway = Math.sin(time * 2 + 1) * 3;
      ctx.translate(sway, -rise);
      ctx.beginPath(); ctx.moveTo(0, -18); ctx.quadraticCurveTo(-6, 6, 2, 22); ctx.strokeStyle = '#6B7280'; ctx.lineWidth = 1.4; ctx.stroke();
      ellipse(ctx, 0, -48, 15, 19, '#E8344B', { lw: 2 });
      ellipse(ctx, -5, -55, 4, 7, 'rgba(255,255,255,0.55)', { stroke: null, rot: 0.4 });
      poly(ctx, [[-3, -29], [3, -29], [0, -25]], '#B8202F', { lw: 1.2 });
      break;
    }
    case 'cat': {
      const purr = Math.sin(time * 12) * (done ? 1 : 0);
      limb(ctx, [[16, -10], [26, -18], [24, -32 + Math.sin(time * 3) * 3]], 5, '#E8963E');
      ellipse(ctx, 0, -14, 18, 14, '#E8963E', { lw: 2 });
      ellipse(ctx, 2, -8, 9, 8, '#FFE8C2', { stroke: null });
      circle(ctx, -8, -32 + purr * 0.5, 12, '#E8963E', { lw: 2 });
      poly(ctx, [[-18, -38], [-16, -52], [-8, -42]], '#E8963E', { lw: 1.8 });
      poly(ctx, [[0, -42], [4, -52], [4, -38]], '#E8963E', { lw: 1.8 });
      if (done) { ctx.beginPath(); ctx.arc(-11, -33, 2.6, Math.PI * 1.1, Math.PI * 1.9); ctx.arc(-3, -33, 2.6, Math.PI * 1.1, Math.PI * 1.9); ctx.strokeStyle = INK; ctx.lineWidth = 1.8; ctx.stroke(); }
      else { circle(ctx, -11, -33, 2, INK, { stroke: null }); circle(ctx, -3, -33, 2, INK, { stroke: null }); }
      poly(ctx, [[-8, -30], [-10, -27], [-6, -27]], '#F2637B', { stroke: null });
      line(ctx, -14, -29, -22, -30, INK, 1); line(ctx, -2, -29, 6, -30, INK, 1);
      if (done) for (let i = 0; i < 3; i++) heart(ctx, -8 + i * 8, -56 - ((t * 20 + i * 8) % 22), 4, `rgba(242,99,123,${1 - ((t * 20 + i * 8) % 22) / 22})`);
      break;
    }
  }
  ctx.restore();
}

/* ---------------- Collectables ---------------- */

export function drawCoin(ctx: Ctx, x: number, y: number, r: number, time: number, phase = 0): void {
  const w = Math.max(0.15, Math.abs(Math.cos(time * 4 + phase)));
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath(); ctx.ellipse(0, 3, r * 0.8, r * 0.28, 0, 0, Math.PI * 2); ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fill();
  ellipse(ctx, 0, -r, r * w, r, '#F5B942', { lw: 1.8 });
  ellipse(ctx, 0, -r, r * w * 0.62, r * 0.62, '#FFD96B', { stroke: '#D99A2C', lw: 1.2 });
  if (w > 0.5) { ctx.fillStyle = '#D99A2C'; ctx.font = `bold ${Math.round(r * 0.9)}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText('★', 0, -r * 0.62); }
  ctx.restore();
}

export function drawPowerupPickup(ctx: Ctx, x: number, y: number, emoji: string, color: string, time: number, phase = 0): void {
  const bob = Math.sin(time * 3 + phase) * 5;
  ctx.save();
  ctx.translate(x, y + bob - 26);
  ctx.beginPath(); ctx.arc(0, 0, 25, 0, Math.PI * 2);
  const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 25);
  g.addColorStop(0, '#FFFFFF'); g.addColorStop(1, color + '55');
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.stroke();
  ctx.font = '24px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(emoji, 0, 1);
  for (let i = 0; i < 3; i++) star(ctx, Math.cos(time * 2 + i * 2.1) * 31, Math.sin(time * 2 + i * 2.1) * 31, 3.4, '#FFF3A0', time);
  ctx.restore();
}

/* ---------------- Rescue effects ---------------- */

export function drawHalo(ctx: Ctx, x: number, y: number, t: number): void {
  ctx.save();
  ctx.globalAlpha = clamp(t * 2, 0, 0.9);
  ctx.translate(x, y - Math.sin(t * 3) * 3);
  for (const s of [-1, 1]) {
    ctx.save(); ctx.scale(s, 1);
    ellipse(ctx, 22, 4, 22, 10, 'rgba(255,255,255,0.85)', { rot: -0.5, stroke: 'rgba(200,220,255,0.9)', lw: 2 });
    ellipse(ctx, 18, 14, 16, 7, 'rgba(255,255,255,0.7)', { rot: -0.2, stroke: 'rgba(200,220,255,0.9)', lw: 1.6 });
    ctx.restore();
  }
  ellipse(ctx, 0, -18, 13, 4, null, { stroke: '#F5B942', lw: 3.4 });
  ctx.restore();
}

export function drawOrbitStars(ctx: Ctx, x: number, y: number, t: number, count = 5): void {
  for (let i = 0; i < count; i++) {
    const a = t * 3.2 + (i / count) * Math.PI * 2;
    star(ctx, x + Math.cos(a) * 26, y + Math.sin(a) * 9, 5 + (i % 2) * 2, i % 2 ? '#F5B942' : '#FFE9A0', t * 2);
  }
}

export const tint = shade;
