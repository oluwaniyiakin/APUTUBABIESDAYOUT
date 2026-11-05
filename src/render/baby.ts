/* ============================================================
   APUTU: Baby's Day Out — src/render/baby.ts
   Draws Aputu. Everything is vector: a crawling toddler with a
   proper hands-and-knees gait, a round head with expressive
   eyes/mouth, five hair styles, gender variants, and an
   accessory for each outfit (cape, helmet, crown, bandana...).

   Coordinates are local: origin is the ground directly under the
   baby, +x is the direction he faces, -y is up. The caller picks
   position and scale.
   ============================================================ */

import type { BabyDrawState, BabyLook, Customization, Expression } from '../types';
import { SKIN_TONES, HAIR_COLORS } from '../core/baby';
import { SHOP_OUTFITS } from '../data/outfits';
import { clamp, shade } from '../utils';
import { circle, ellipse, groundShadow, INK, limb, line, poly, rrect, type Ctx, type Pt } from './draw';

/** Resolves a saved Customization into concrete colours for drawing. */
export function babyLook(c: Customization): BabyLook {
  const outfit = SHOP_OUTFITS.find(o => o.id === c.outfit) ?? SHOP_OUTFITS[0];
  return {
    gender: c.gender,
    skin: SKIN_TONES[c.skin] ?? SKIN_TONES.tone2,
    hair: c.hair,
    hairColor: HAIR_COLORS[c.hair] === 'transparent' ? '#2A1B12' : HAIR_COLORS[c.hair],
    outfitId: outfit.id,
    body: outfit.body,
    accent: outfit.accent,
  };
}

interface Rig {
  upright: boolean;
  torso: { cx: number; cy: number; rx: number; ry: number; rot: number };
  diaper: { cx: number; cy: number; r: number };
  head: { x: number; y: number };
  shoulder: Pt;
  hip: Pt;
  nearArm: Pt[];
  farArm: Pt[];
  nearLeg: Pt[];
  farLeg: Pt[];
}

const HEAD_R = 18;

function crawlLeg(hip: Pt, ph: number): Pt[] {
  const lift = Math.max(0, Math.cos(ph));
  const sw = Math.sin(ph);
  return [hip, [hip[0] + 9 + sw * 7, hip[1] + 12 - lift * 5], [hip[0] - 6 + sw * 6, hip[1] + 16 - lift * 6]];
}

function crawlArm(sh: Pt, ph: number): Pt[] {
  const lift = Math.max(0, Math.cos(ph));
  return [sh, [sh[0] + 3 + Math.sin(ph) * 5, sh[1] + 13], [sh[0] + 5 + Math.sin(ph) * 10, sh[1] + 22 - lift * 9]];
}

function computeRig(st: BabyDrawState): Rig {
  const t = st.time;
  const p = st.phase;
  const bob = Math.sin(p * 2) * 1.3;

  const crawlBase = (): Rig => {
    const shoulder: Pt = [14, -27 + bob];
    const hip: Pt = [-18, -19 + bob];
    return {
      upright: false,
      torso: { cx: -4, cy: -25 + bob, rx: 25, ry: 14, rot: -0.06 },
      diaper: { cx: -24, cy: -22 + bob, r: 13 },
      head: { x: 30, y: -40 + bob * 1.5 },
      shoulder, hip,
      nearArm: crawlArm(shoulder, p),
      farArm: crawlArm(shoulder, p + Math.PI),
      nearLeg: crawlLeg(hip, p + Math.PI),
      farLeg: crawlLeg(hip, p),
    };
  };

  const sitBase = (): Rig => {
    const shoulder: Pt = [4, -42];
    const hip: Pt = [2, -12];
    return {
      upright: true,
      torso: { cx: 0, cy: -29, rx: 14, ry: 19, rot: 0 },
      diaper: { cx: -1, cy: -12, r: 15 },
      head: { x: 5, y: -62 },
      shoulder, hip,
      nearArm: [shoulder, [14, -26], [22, -9]],
      farArm: [shoulder, [10, -27], [30, -10]],
      nearLeg: [hip, [18, -12], [34, -9]],
      farLeg: [hip, [16, -15], [28, -15]],
    };
  };

  switch (st.pose) {
    case 'sniff': {
      const r = crawlBase();
      const ph = 0.4;
      r.nearArm = crawlArm(r.shoulder, ph);
      r.farArm = crawlArm(r.shoulder, ph + 2.4);
      r.nearLeg = crawlLeg(r.hip, ph + Math.PI);
      r.farLeg = crawlLeg(r.hip, ph);
      r.torso.rot = 0.14;
      r.head = { x: 38, y: -24 + Math.sin(t * 7) * 1.5 };
      return r;
    }
    case 'pet': {
      const r = crawlBase();
      r.nearArm = [r.shoulder, [28, -22], [44 + Math.sin(t * 9) * 3, -17 + Math.cos(t * 9) * 3]];
      r.head = { x: 32, y: -37 };
      return r;
    }
    case 'sit': return sitBase();
    case 'wave': {
      const r = sitBase();
      r.nearArm = [r.shoulder, [18, -52], [24 + Math.sin(t * 11) * 6, -74 + Math.abs(Math.cos(t * 11)) * 4]];
      return r;
    }
    case 'clap': {
      const r = sitBase();
      const cx = 20 + Math.sin(t * 15) * 4;
      r.nearArm = [r.shoulder, [14, -38], [cx, -46]];
      r.farArm = [r.shoulder, [12, -36], [cx - 1, -44]];
      return r;
    }
    case 'reach': {
      const r = sitBase();
      r.head = { x: 9, y: -61 };
      r.nearArm = [r.shoulder, [16, -62], [22, -84 + Math.sin(t * 6) * 2]];
      r.farArm = [r.shoulder, [10, -64], [13, -86 + Math.sin(t * 6 + 1) * 2]];
      return r;
    }
    case 'cry': {
      const r = sitBase();
      r.head = { x: 3, y: -59 + Math.sin(t * 14) * 0.8 };
      r.nearArm = [r.shoulder, [13, -50], [13, -60]];
      r.farArm = [r.shoulder, [9, -50], [17, -57]];
      return r;
    }
    case 'sneeze': {
      const r = sitBase();
      r.nearArm = [r.shoulder, [14, -46], [19, -54]];
      return r;
    }
    case 'yawn': {
      const r = sitBase();
      r.nearArm = [r.shoulder, [14, -46], [18, -53]];
      return r;
    }
    default: return crawlBase();
  }
}

/* ---------------- Public draw ---------------- */

export interface BabyDrawOpts {
  facing?: 1 | -1;
  alpha?: number;
  shadow?: boolean;
}

export function drawBaby(ctx: Ctx, x: number, y: number, scale: number, look: BabyLook, st: BabyDrawState, opts: BabyDrawOpts = {}): void {
  const facing = opts.facing ?? 1;
  const rig = computeRig(st);

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale * facing, scale);
  if (opts.alpha !== undefined) ctx.globalAlpha = opts.alpha;

  if (opts.shadow !== false) groundShadow(ctx, rig.upright ? 8 : -2, 1, rig.upright ? 30 : 40);

  const skin = look.skin;
  const skinDark = shade(skin, -0.18);

  // cape + backpack sit behind the body
  if (look.outfitId === 'superhero') drawCape(ctx, rig, look, st);
  if (look.outfitId === 'explorer') drawBackpack(ctx, rig, look);

  // far limbs
  limb(ctx, rig.farLeg, 10, skinDark);
  circle(ctx, rig.farLeg[2][0], rig.farLeg[2][1], 5, skinDark);
  limb(ctx, rig.farArm, 8, skinDark);
  circle(ctx, rig.farArm[2][0], rig.farArm[2][1], 4.6, skinDark);

  // shirt
  drawShirt(ctx, rig, look);

  // diaper
  const d = rig.diaper;
  ellipse(ctx, d.cx, d.cy, d.r, d.r * 0.92, '#FFFFFF');
  ellipse(ctx, d.cx + 2, d.cy + 3, d.r * 0.55, d.r * 0.3, '#EEF2F5', { stroke: null });
  rrect(ctx, d.cx + (rig.upright ? 6 : 8), d.cy - 6, 6, 4, 1.5, look.accent, { lw: 1.2 });

  // near leg + arm
  limb(ctx, rig.nearLeg, 10, skin);
  circle(ctx, rig.nearLeg[2][0], rig.nearLeg[2][1], 5.4, skin);
  limb(ctx, rig.nearArm, 8, skin);
  circle(ctx, rig.nearArm[2][0], rig.nearArm[2][1], 4.8, skin);

  // head (flip when looking back)
  const dir = st.lookBack > 0.5 ? -1 : 1;
  drawHead(ctx, rig.head.x - st.lookBack * 6, rig.head.y, dir, look, st);

  ctx.restore();
}

/* ---------------- Body parts ---------------- */

function drawShirt(ctx: Ctx, rig: Rig, look: BabyLook): void {
  const t = rig.torso;
  ctx.save();
  ctx.translate(t.cx, t.cy);
  ctx.rotate(t.rot);
  ellipse(ctx, 0, 0, t.rx, t.ry, look.body);
  // clip pattern to the shirt
  ctx.beginPath();
  ctx.ellipse(0, 0, t.rx - 1, t.ry - 1, 0, 0, Math.PI * 2);
  ctx.clip();
  const a = look.accent;
  switch (look.outfitId) {
    case 'ankara':
      for (let i = -3; i <= 3; i++) for (let j = -1; j <= 1; j++) {
        circle(ctx, i * 8 + (j % 2 ? 4 : 0), j * 8, 2.6, a, { stroke: null });
        circle(ctx, i * 8 + (j % 2 ? 4 : 0), j * 8, 1, '#FFF3C4', { stroke: null });
      }
      break;
    case 'traditional':
      for (let i = -4; i <= 4; i++) poly(ctx, [[i * 7 - 3, 8], [i * 7, 1], [i * 7 + 3, 8]], a, { stroke: null });
      break;
    case 'festival':
      for (let i = -3; i <= 3; i++) for (let j = -1; j <= 1; j++) {
        circle(ctx, i * 8 + j * 3, j * 8, 1.8, a, { stroke: null });
      }
      break;
    case 'robot':
      line(ctx, -t.rx, 0, t.rx, 0, a, 1.5);
      line(ctx, -4, -t.ry, -4, t.ry, a, 1.5);
      circle(ctx, 8, -3, 2.5, '#E8F3FF', { stroke: INK, lw: 1 });
      break;
    case 'astronaut':
      rrect(ctx, 2, -6, 11, 9, 2, a, { lw: 1 });
      circle(ctx, 7.5, -1.5, 2, '#F5B942', { stroke: null });
      break;
    case 'superhero':
      poly(ctx, [[2, -5], [8, -7], [14, -5], [11, 3], [8, 5], [5, 3]], '#F5B942', { lw: 1.2 });
      break;
    case 'pirate':
      for (let i = -3; i <= 3; i++) rrect(ctx, i * 9 - 3, -t.ry, 5, t.ry * 2, 0, i % 2 ? a : '#F5EFE0', { stroke: null });
      break;
    default:
      rrect(ctx, -t.rx, 2, t.rx * 2, 6, 0, a, { stroke: null });
  }
  ctx.restore();
  // redraw outline over the clipped pattern
  ctx.save();
  ctx.translate(t.cx, t.cy);
  ctx.rotate(t.rot);
  ellipse(ctx, 0, 0, t.rx, t.ry, null);
  ctx.restore();
}

function drawCape(ctx: Ctx, rig: Rig, look: BabyLook, st: BabyDrawState): void {
  const sh = rig.shoulder;
  const w = Math.sin(st.phase * 2 + 1) * 5 + Math.sin(st.time * 6) * 2;
  const tail = rig.upright ? [-34, 8] : [-66, -2];
  poly(ctx, [
    [sh[0] - 2, sh[1] - 6],
    [sh[0] + 8, sh[1] + 4],
    [sh[0] + tail[0] * 0.5, sh[1] + 20 + w],
    [sh[0] + tail[0], sh[1] + 30 + tail[1] + w],
    [sh[0] + tail[0] * 0.55, sh[1] + 18 + w * 0.4],
    [sh[0] + tail[0] * 0.2, sh[1] + 2],
  ], look.body, { lw: 2 });
  line(ctx, sh[0] + tail[0] * 0.2, sh[1] + 2, sh[0] + tail[0] * 0.55, sh[1] + 18 + w * 0.4, look.accent, 3);
  line(ctx, sh[0] + tail[0] * 0.55, sh[1] + 18 + w * 0.4, sh[0] + tail[0], sh[1] + 30 + tail[1] + w, look.accent, 3);
}

function drawBackpack(ctx: Ctx, rig: Rig, look: BabyLook): void {
  const t = rig.torso;
  const x = t.cx - (rig.upright ? 20 : 10);
  const y = t.cy - (rig.upright ? 12 : 22);
  rrect(ctx, x, y, 15, 17, 4, look.accent);
  rrect(ctx, x + 2, y + 9, 11, 6, 2, shade(look.accent, -0.2), { lw: 1 });
  circle(ctx, x + 7.5, y + 6, 1.6, '#F5B942', { stroke: null });
}

/* ---------------- Head, face, hair ---------------- */

function drawHead(ctx: Ctx, cx: number, cy: number, dir: 1 | -1, look: BabyLook, st: BabyDrawState): void {
  const R = HEAD_R;
  const skin = look.skin;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(dir, 1);
  if (st.pose === 'cry') ctx.rotate(-0.12);
  if (st.expression === 'curious') ctx.rotate(0.14);   // the adorable head-tilt
  if (st.pose === 'yawn') ctx.rotate(-0.1);

  drawHairBack(ctx, R, look);

  // head + ear
  ellipse(ctx, 0, 0, R, R * 0.96, skin);
  ellipse(ctx, -R * 0.1, -R * 0.45, R * 0.55, R * 0.28, shade(skin, 0.14), { stroke: null });
  circle(ctx, -R * 0.7, R * 0.16, 4.4, shade(skin, -0.08), { lw: 1.6 });
  circle(ctx, -R * 0.7, R * 0.16, 1.6, shade(skin, -0.26), { stroke: null });

  if (look.outfitId === 'superhero') drawMask(ctx, R, look);

  drawFace(ctx, R, look, st);
  drawHairFront(ctx, R, look);
  drawHat(ctx, R, look, st);

  if (st.pose === 'sneeze' || st.expression === 'sneeze') {
    // little "achoo" puff
    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = INK;
    ctx.fillText('ACHOO!', R * 0.9, -R * 0.9);
  }
  ctx.restore();
}

function drawFace(ctx: Ctx, R: number, look: BabyLook, st: BabyDrawState): void {
  const ex = st.expression;
  const girl = look.gender === 'girl';
  const eyeY = -R * 0.04;
  const eyes: Pt[] = [[R * 0.1, eyeY], [R * 0.56, eyeY]];
  const blink = st.time % 3.7 < 0.13;
  const closed = ex === 'laugh' || ex === 'cry' || ex === 'sneeze' || blink;

  // cheeks first so eyes sit on top
  const blush = look.skin.toLowerCase() < '#a00000' ? 'rgba(255,120,110,0.28)' : 'rgba(255,110,120,0.42)';
  ellipse(ctx, R * 0.3, R * 0.36, 5.5, 3.6, blush, { stroke: null });
  ellipse(ctx, R * 0.82, R * 0.3, 4, 3, blush, { stroke: null });

  // nose
  circle(ctx, R * 0.98, R * 0.1, 2.3, shade(look.skin, -0.12), { lw: 1.2 });

  eyes.forEach(([x, y], i) => {
    if (closed) {
      ctx.beginPath();
      if (ex === 'cry') ctx.arc(x, y + 2, 4, Math.PI * 1.1, Math.PI * 1.9, true);
      else if (ex === 'sneeze') { ctx.moveTo(x - 3.5, y - 2.5); ctx.lineTo(x + 2, y); ctx.lineTo(x - 3.5, y + 2.5); }
      else ctx.arc(x, y + 2, 4, Math.PI * 1.1, Math.PI * 1.9);
      ctx.strokeStyle = INK; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.stroke();
    } else {
      const big = ex === 'surprised' ? 1.25 : 1;
      ellipse(ctx, x, y, 4.4 * big, 5.6 * big, '#FFFFFF', { lw: 1.4 });
      circle(ctx, x + 0.8, y + 0.6, 3.1 * big, '#2A1B12', { stroke: null });
      circle(ctx, x + 1.9, y - 1, 1.2, '#FFFFFF', { stroke: null });
      if (ex === 'sleepy') ellipse(ctx, x, y - 2.6, 5.2, 3.6, look.skin, { stroke: INK, lw: 1.2 });
    }
    if (girl) {
      line(ctx, x + 3.6, y - 3.4, x + 6.4, y - 5.8, INK, 1.6);
      line(ctx, x + 4.4, y - 1.6, x + 7.4, y - 2.8, INK, 1.4);
    }
    // eyebrows
    ctx.beginPath();
    const by = y - 8.5;
    if (ex === 'curious' && i === 1) { ctx.moveTo(x - 4, by - 2); ctx.quadraticCurveTo(x, by - 5, x + 4, by - 2); }
    else if (ex === 'cry' || ex === 'pout') { ctx.moveTo(x - 4, by + 1.5); ctx.lineTo(x + 4, by - 1.5); if (i === 0) { ctx.moveTo(x - 4, by - 1.5); ctx.lineTo(x + 4, by + 1.5); } }
    else if (ex === 'surprised') { ctx.moveTo(x - 4, by - 2); ctx.quadraticCurveTo(x, by - 4.5, x + 4, by - 2); }
    else { ctx.moveTo(x - 3.5, by); ctx.quadraticCurveTo(x, by - 1.6, x + 3.5, by); }
    ctx.strokeStyle = shade(look.skin, -0.55); ctx.lineWidth = 1.8; ctx.lineCap = 'round'; ctx.stroke();
  });

  // mouth
  const mx = R * 0.52, my = R * 0.5;
  ctx.lineCap = 'round';
  switch (ex) {
    case 'laugh':
      ctx.beginPath(); ctx.ellipse(mx, my - 3, 8.5, 9, 0, 0, Math.PI); ctx.closePath();
      ctx.fillStyle = '#7A1F1F'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
      ellipse(ctx, mx, my + 3.5, 4.4, 2.6, '#F2788C', { stroke: null });
      break;
    case 'surprised':
      ellipse(ctx, mx, my, 3.6, 4.6, '#7A1F1F', { lw: 1.8 });
      break;
    case 'curious':
      ellipse(ctx, mx + 1, my, 2.8, 3.3, '#7A1F1F', { lw: 1.6 });
      break;
    case 'cry':
      ellipse(ctx, mx, my + 1, 7, 5.5, '#7A1F1F', { lw: 2 });
      ellipse(ctx, mx, my + 3, 3.8, 2, '#F2788C', { stroke: null });
      for (const [x] of eyes) {
        const k = (st.time * 1.6 + x * 0.1) % 1;
        ellipse(ctx, x + 2, eyeY + 8 + k * 14, 2, 3.2, '#8FD3F4', { stroke: '#4A8CB5', lw: 1 });
      }
      break;
    case 'sneeze':
      ellipse(ctx, mx, my, 6, 6.5, '#7A1F1F', { lw: 2 });
      break;
    case 'pout':
      ctx.beginPath(); ctx.arc(mx, my + 5, 5, Math.PI * 1.15, Math.PI * 1.85);
      ctx.strokeStyle = INK; ctx.lineWidth = 2.2; ctx.stroke();
      break;
    case 'sleepy':
      ctx.beginPath(); ctx.moveTo(mx - 4, my); ctx.lineTo(mx + 4, my + 0.5);
      ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
      break;
    default:
      ctx.beginPath(); ctx.arc(mx, my - 3, 6.2, Math.PI * 0.18, Math.PI * 0.82);
      ctx.strokeStyle = INK; ctx.lineWidth = 2.2; ctx.stroke();
      if (st.pose === 'yawn') ellipse(ctx, mx, my + 1, 6, 8, '#7A1F1F', { lw: 2 });
  }
}

function drawMask(ctx: Ctx, R: number, look: BabyLook): void {
  poly(ctx, [
    [-R * 0.55, -R * 0.3], [R * 0.2, -R * 0.38], [R * 0.95, -R * 0.3],
    [R * 0.98, R * 0.1], [R * 0.7, R * 0.18], [R * 0.34, R * 0.04], [R * 0.0, R * 0.2], [-R * 0.55, R * 0.14],
  ], look.accent, { lw: 1.8 });
}

function drawHairBack(ctx: Ctx, R: number, look: BabyLook): void {
  if (look.hair === 'bald') return;
  const c = look.hairColor;
  switch (look.hair) {
    case 'puffs':
      circle(ctx, -R * 0.55, -R * 0.78, R * 0.46, c);
      break;
    case 'braids':
      for (let i = 0; i < 3; i++) {
        const bx = -R * 0.5 - i * 3, by = -R * 0.1 + i * 4;
        limb(ctx, [[bx, by], [bx - 5, by + 12], [bx - 3, by + 24]], 5.5, c);
        circle(ctx, bx - 3, by + 25, 2.2, i % 2 ? '#F5B942' : '#F2637B', { lw: 1 });
      }
      break;
    case 'locs':
      for (let i = 0; i < 4; i++) {
        const a = Math.PI * (0.95 + i * 0.12);
        limb(ctx, [[Math.cos(a) * R * 0.85, Math.sin(a) * R * 0.85], [Math.cos(a) * R * 1.12, Math.sin(a) * R * 1.0 + 8]], 5, c);
      }
      break;
    default:
  }
}

function drawHairFront(ctx: Ctx, R: number, look: BabyLook): void {
  const c = look.hairColor;
  const hi = shade(c, 0.22);
  const girl = look.gender === 'girl';
  if (look.hair === 'bald') {
    // one adorable curl
    ctx.beginPath(); ctx.arc(R * 0.1, -R * 1.0, 4, Math.PI * 0.2, Math.PI * 1.6);
    ctx.strokeStyle = shade(look.skin, -0.45); ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.stroke();
    return;
  }
  // hairline cap
  ctx.beginPath();
  ctx.ellipse(-R * 0.05, -R * 0.12, R * 1.0, R * 0.9, 0, Math.PI * 1.02, Math.PI * 1.98);
  ctx.quadraticCurveTo(R * 0.4, -R * 0.52, R * 0.0, -R * 0.4);
  ctx.quadraticCurveTo(-R * 0.5, -R * 0.38, -R * 0.96, -R * 0.12);
  ctx.closePath();
  ctx.fillStyle = c; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.stroke();

  switch (look.hair) {
    case 'puffs':
      circle(ctx, R * 0.12, -R * 1.02, R * 0.46, c);
      circle(ctx, R * 0.04, -R * 1.1, R * 0.12, hi, { stroke: null });
      if (girl) bow(ctx, R * 0.12, -R * 1.5, look.accent);
      break;
    case 'curls':
      for (let i = 0; i < 8; i++) {
        const a = Math.PI * (1.0 + i * 0.125);
        circle(ctx, Math.cos(a) * R * 0.92, Math.sin(a) * R * 0.92, R * 0.24, c, { lw: 1.5 });
      }
      circle(ctx, 0, -R * 1.0, R * 0.24, c, { lw: 1.5 });
      if (girl) bow(ctx, R * 0.05, -R * 1.22, look.accent);
      break;
    case 'locs':
      for (let i = 0; i < 5; i++) {
        const a = Math.PI * (1.05 + i * 0.1);
        limb(ctx, [[Math.cos(a) * R * 0.9, Math.sin(a) * R * 0.9], [Math.cos(a) * R * 1.12, Math.sin(a) * R * 1.12 - 2]], 4.4, c);
      }
      break;
    case 'braids':
      line(ctx, -R * 0.5, -R * 0.9, R * 0.5, -R * 0.55, shade(c, 0.3), 1.2);
      line(ctx, -R * 0.1, -R * 0.98, R * 0.7, -R * 0.4, shade(c, 0.3), 1.2);
      if (girl) bow(ctx, -R * 0.45, -R * 0.55, look.accent);
      break;
    default:
  }
  ellipse(ctx, -R * 0.2, -R * 0.78, R * 0.34, R * 0.1, hi, { stroke: null, rot: -0.3 });
}

function bow(ctx: Ctx, x: number, y: number, color: string): void {
  poly(ctx, [[x, y], [x - 9, y - 6], [x - 9, y + 6]], color, { lw: 1.4 });
  poly(ctx, [[x, y], [x + 9, y - 6], [x + 9, y + 6]], color, { lw: 1.4 });
  circle(ctx, x, y, 2.6, shade(color, -0.2), { lw: 1.2 });
}

/* ---------------- Outfit accessories ---------------- */

function drawHat(ctx: Ctx, R: number, look: BabyLook, st: BabyDrawState): void {
  const girl = look.gender !== 'boy';
  const a = look.accent, b = look.body;
  switch (look.outfitId) {
    case 'royal': case 'tinyking':
      poly(ctx, [[-R * 0.6, -R * 0.78], [-R * 0.6, -R * 1.42], [-R * 0.3, -R * 1.14], [0, -R * 1.55], [R * 0.3, -R * 1.14], [R * 0.6, -R * 1.42], [R * 0.6, -R * 0.78]], '#F5B942', { lw: 1.8 });
      circle(ctx, 0, -R * 1.0, 2.2, '#D9364A', { lw: 1 });
      circle(ctx, -R * 0.35, -R * 0.95, 1.6, '#4A8CE0', { lw: 1 });
      circle(ctx, R * 0.35, -R * 0.95, 1.6, '#3F9C6B', { lw: 1 });
      break;
    case 'tinyqueen': case 'princess':
      poly(ctx, [[-R * 0.5, -R * 0.8], [-R * 0.4, -R * 1.25], [-R * 0.18, -R * 1.0], [0, -R * 1.4], [R * 0.18, -R * 1.0], [R * 0.4, -R * 1.25], [R * 0.5, -R * 0.8]], look.outfitId === 'princess' ? '#F7B6D0' : '#F5B942', { lw: 1.6 });
      circle(ctx, 0, -R * 0.98, 2.4, '#E94B8A', { lw: 1 });
      break;
    case 'pirate':
      ctx.beginPath();
      ctx.ellipse(-R * 0.02, -R * 0.2, R * 1.04, R * 0.95, 0, Math.PI * 1.03, Math.PI * 1.97);
      ctx.lineTo(R * 0.98, -R * 0.42); ctx.quadraticCurveTo(R * 0.2, -R * 0.62, -R * 0.98, -R * 0.4); ctx.closePath();
      ctx.fillStyle = a; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.8; ctx.stroke();
      for (let i = 0; i < 4; i++) circle(ctx, -R * 0.6 + i * R * 0.38, -R * 0.78 - (i % 2) * 2, 1.5, '#fff', { stroke: null });
      poly(ctx, [[-R * 0.95, -R * 0.4], [-R * 1.35, -R * 0.2 + Math.sin(st.time * 5) * 2], [-R * 1.2, -R * 0.55], [-R * 1.45, -R * 0.62]], a, { lw: 1.4 });
      circle(ctx, -R * 0.45, R * 0.28, 2, '#F5B942', { lw: 1 });
      break;
    case 'astronaut':
      circle(ctx, 0, 0, R * 1.28, 'rgba(210,235,255,0.28)', { stroke: 'rgba(255,255,255,0.9)', lw: 2.4 });
      ctx.beginPath(); ctx.arc(0, 0, R * 1.12, Math.PI * 1.15, Math.PI * 1.45);
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.stroke();
      ellipse(ctx, -R * 0.1, R * 1.02, R * 0.85, 4.5, '#D8D8D8', { lw: 1.6 });
      break;
    case 'robot':
      line(ctx, 0, -R * 0.95, 0, -R * 1.45, INK, 2);
      circle(ctx, 0, -R * 1.52, 3.4, '#D9364A', { lw: 1.4 });
      circle(ctx, -R * 0.7, R * 0.16, 5.2, '#B0B8C0', { lw: 1.6 });
      break;
    case 'winter':
      ctx.beginPath();
      ctx.ellipse(0, -R * 0.45, R * 1.0, R * 0.78, 0, Math.PI, 0);
      ctx.closePath(); ctx.fillStyle = b; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.8; ctx.stroke();
      rrect(ctx, -R * 1.0, -R * 0.55, R * 2.0, 8, 4, a, { lw: 1.6 });
      circle(ctx, 0, -R * 1.25, 4.6, '#FFFFFF', { lw: 1.5 });
      break;
    case 'safari':
      ellipse(ctx, 0, -R * 0.62, R * 1.5, R * 0.3, shade(b, 0.05), { lw: 1.8 });
      ctx.beginPath(); ctx.ellipse(0, -R * 0.72, R * 0.78, R * 0.7, 0, Math.PI, 0); ctx.closePath();
      ctx.fillStyle = shade(b, 0.1); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.8; ctx.stroke();
      rrect(ctx, -R * 0.78, -R * 0.82, R * 1.56, 5, 1, a, { stroke: null });
      break;
    case 'explorer':
      ctx.beginPath(); ctx.ellipse(-R * 0.02, -R * 0.55, R * 0.95, R * 0.62, 0, Math.PI, 0); ctx.closePath();
      ctx.fillStyle = b; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.8; ctx.stroke();
      ellipse(ctx, R * 0.85, -R * 0.5, R * 0.5, 4, shade(b, -0.15), { lw: 1.6 });
      circle(ctx, 0, -R * 0.95, 3, a, { lw: 1 });
      break;
    case 'festival': {
      rrect(ctx, -R * 0.98, -R * 0.62, R * 1.96, 6, 3, a, { lw: 1.6 });
      const cols = ['#F2637B', '#F5B942', '#3F9C6B', '#4A8CE0'];
      cols.forEach((c, i) => {
        const x = -R * 0.5 + i * R * 0.36;
        ellipse(ctx, x, -R * 1.0 - Math.sin(st.time * 4 + i) * 1.5, 3.4, 10, c, { rot: (i - 1.5) * 0.18, lw: 1.2 });
      });
      break;
    }
    case 'traditional':
      if (girl) {
        ellipse(ctx, -R * 0.1, -R * 0.78, R * 0.95, R * 0.5, b, { lw: 1.8 });
        ellipse(ctx, R * 0.05, -R * 1.1, R * 0.5, R * 0.36, a, { lw: 1.6, rot: -0.3 });
        poly(ctx, [[R * 0.45, -R * 1.05], [R * 0.95, -R * 1.4], [R * 0.85, -R * 0.9]], a, { lw: 1.4 });
      } else {
        ctx.beginPath(); ctx.ellipse(0, -R * 0.62, R * 0.9, R * 0.58, 0.15, Math.PI, 0); ctx.closePath();
        ctx.fillStyle = a; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.8; ctx.stroke();
        rrect(ctx, -R * 0.9, -R * 0.7, R * 1.8, 6, 2, b, { lw: 1.4 });
      }
      break;
    case 'ankara':
      rrect(ctx, -R * 0.96, -R * 0.62, R * 1.92, 6, 3, a, { lw: 1.4 });
      circle(ctx, R * 0.5, -R * 0.62, 3.4, '#FFF3C4', { lw: 1.2 });
      break;
    default:
  }
}

/** Chooses a sensible expression for a pose when none is forced. */
export function expressionForPose(pose: BabyDrawState['pose']): Expression {
  switch (pose) {
    case 'cry': return 'cry';
    case 'sneeze': return 'sneeze';
    case 'yawn': return 'sleepy';
    case 'sniff': return 'curious';
    case 'reach': return 'surprised';
    case 'clap': case 'wave': case 'pet': return 'laugh';
    default: return 'happy';
  }
}

export function clampLook(v: number): number { return clamp(v, 0, 1); }
