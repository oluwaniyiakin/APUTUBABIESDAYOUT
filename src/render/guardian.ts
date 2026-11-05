/* ============================================================
   APUTU: Baby's Day Out — src/render/guardian.ts
   Draws the guardians (Nanny, Grandma, Doctor, ...). They share
   one parametric "human figure" so they all move like people —
   a proper run cycle, swinging arms, worried or smiling faces —
   and differ through a small data-driven Look table.

   Origin: ground under the feet, +x is the facing direction.
   ============================================================ */

import { shade } from '../utils';
import { circle, ellipse, groundShadow, INK, limb, line, poly, rrect, type Ctx, type Pt } from './draw';

type HairKind = 'wrap' | 'bun' | 'short' | 'pigtails' | 'cap' | 'police' | 'helmet' | 'scrub' | 'chief' | 'none';

interface Look {
  skin: string;
  top: string;
  trim: string;
  bottom: string;
  dress?: boolean;
  hair: HairKind;
  hairColor: string;
  hatColor?: string;
  extras?: string[];
}

const LOOKS: Record<string, Look> = {
  'nanny':          { skin: '#8D5524', top: '#2E9C8F', trim: '#FFFFFF', bottom: '#2E9C8F', dress: true, hair: 'wrap', hairColor: '#2A1B12', hatColor: '#F2637B', extras: ['apron'] },
  'grandma':        { skin: '#A0642F', top: '#7B5EA7', trim: '#F5E6A8', bottom: '#7B5EA7', dress: true, hair: 'bun', hairColor: '#E6E6E6', extras: ['glasses', 'cane', 'shawl'] },
  'grandpa':        { skin: '#A0642F', top: '#8C6A4F', trim: '#E8D9B0', bottom: '#4B5563', hair: 'cap', hairColor: '#E6E6E6', hatColor: '#6B4F38', extras: ['moustache', 'cane', 'vest'] },
  'dad':            { skin: '#7A4A21', top: '#3B6FB6', trim: '#D9364A', bottom: '#3A3F4B', hair: 'short', hairColor: '#1C120C', extras: ['beard', 'tie'] },
  'mom':            { skin: '#9C6830', top: '#F5B942', trim: '#FFFFFF', bottom: '#F5B942', dress: true, hair: 'wrap', hairColor: '#1C120C', hatColor: '#3B6FB6' },
  'big-sister':     { skin: '#C68642', top: '#FFFFFF', trim: '#3F9C6B', bottom: '#3F9C6B', dress: true, hair: 'pigtails', hairColor: '#1C120C', hatColor: '#F2637B', extras: ['backpack'] },
  'robot-nanny':    { skin: '#B0B8C0', top: '#7C8AA0', trim: '#4A8CE0', bottom: '#5B677A', hair: 'none', hairColor: '#B0B8C0', extras: ['robot'] },
  'super-nanny':    { skin: '#8D5524', top: '#3B6FB6', trim: '#F5B942', bottom: '#3B6FB6', hair: 'short', hairColor: '#1C120C', hatColor: '#D9364A', extras: ['cape', 'mask', 'emblem'] },
  'village-chief':  { skin: '#6B4F38', top: '#F5F0E0', trim: '#D4AF37', bottom: '#F5F0E0', dress: true, hair: 'chief', hairColor: '#E6E6E6', hatColor: '#D9364A', extras: ['beard', 'staff'] },
  'teacher':        { skin: '#C68642', top: '#B9577A', trim: '#FFFFFF', bottom: '#3A3F4B', hair: 'bun', hairColor: '#2A1B12', extras: ['glasses', 'book'] },
  'doctor':         { skin: '#8D5524', top: '#FFFFFF', trim: '#4AAFB0', bottom: '#4AAFB0', hair: 'scrub', hairColor: '#1C120C', hatColor: '#4AAFB0', extras: ['stethoscope', 'coat'] },
  'police-officer': { skin: '#7A4A21', top: '#2E4374', trim: '#F5B942', bottom: '#1E2E52', hair: 'police', hairColor: '#1C120C', hatColor: '#1E2E52', extras: ['badge', 'whistle'] },
  'firefighter':    { skin: '#8D5524', top: '#F2B01E', trim: '#D8D8D8', bottom: '#F2B01E', hair: 'helmet', hairColor: '#1C120C', hatColor: '#D9364A', extras: ['stripes'] },
};

export type GuardianMood = 'run' | 'idle' | 'worried' | 'happy' | 'carry';

export interface GuardianOpts {
  facing?: 1 | -1;
  mood?: GuardianMood;
  alpha?: number;
  shadow?: boolean;
}

export function drawGuardian(ctx: Ctx, id: string, x: number, y: number, scale: number, phase: number, opts: GuardianOpts = {}): void {
  const look = LOOKS[id] ?? LOOKS.nanny;
  const mood = opts.mood ?? 'run';
  const facing = opts.facing ?? 1;
  const ex = look.extras ?? [];
  const isRobot = ex.includes('robot');

  const running = mood === 'run';
  const sw = running ? Math.sin(phase) : 0;
  const lift = running ? Math.max(0, Math.cos(phase)) : 0;
  const bob = running ? Math.abs(Math.sin(phase)) * 3 : Math.sin(phase * 0.5) * 0.8;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale * facing, scale);
  if (opts.alpha !== undefined) ctx.globalAlpha = opts.alpha;
  if (opts.shadow !== false) groundShadow(ctx, 0, 1, 26);

  if (ex.includes('cape')) {
    const w = Math.sin(phase * 1.2) * 6 + (running ? 8 : 0);
    poly(ctx, [[-4, -88 - bob], [4, -88 - bob], [-26 - w, -48], [-36 - w * 1.2, -32 + w * 0.4], [-14, -40]], '#D9364A', { lw: 2 });
  }
  if (ex.includes('backpack')) rrect(ctx, -22, -90 - bob, 14, 24, 4, '#F2637B');

  const hip: Pt = [0, -50 - bob];
  const legCol = look.dress ? look.skin : look.bottom;
  if (isRobot) {
    // piston legs
    limb(ctx, [hip, [sw * 12 - 2, -24 - lift * 6], [sw * 14, -2 - lift * 7]], 8, '#5B677A');
    limb(ctx, [[2, hip[1]], [-sw * 12 + 2, -24], [-sw * 14, -2]], 8, '#4A566A');
  } else {
    // far leg then near leg (dress shows skin legs + shoes)
    limb(ctx, [hip, [-sw * 9 - 2, -26], [-sw * 15, -3 - lift * 0]], 9, legCol);
    ellipse(ctx, -sw * 15 + 3, -2, 7, 3.6, '#3A2A1E');
    limb(ctx, [hip, [sw * 9 + 2, -26 - lift * 6], [sw * 15 + 2, -3 - lift * 8]], 9, shade(legCol, 0.05));
    ellipse(ctx, sw * 15 + 5, -2 - lift * 8, 7, 3.6, '#3A2A1E');
  }

  // torso
  const topY = -92 - bob;
  if (look.dress && !isRobot) {
    poly(ctx, [[-13, topY], [13, topY], [20, hip[1] + 6], [-20, hip[1] + 6]], look.top, { lw: 2.2 });
    rrect(ctx, -20, hip[1] + 1, 40, 5, 0, look.trim, { stroke: null });
  } else {
    rrect(ctx, -14, topY, 28, 46, isRobot ? 5 : 9, look.top, { lw: 2.2 });
  }
  if (ex.includes('coat')) {
    poly(ctx, [[-14, topY], [-3, topY], [-3, hip[1] + 18], [-16, hip[1] + 18]], '#FFFFFF', { lw: 1.6 });
    poly(ctx, [[14, topY], [3, topY], [3, hip[1] + 18], [16, hip[1] + 18]], '#FFFFFF', { lw: 1.6 });
  }
  if (ex.includes('vest')) rrect(ctx, -12, topY + 4, 24, 28, 6, '#6B4F38', { lw: 1.6 });
  if (ex.includes('apron')) { rrect(ctx, -8, topY + 12, 18, 34, 5, '#FFFFFF', { lw: 1.6 }); }
  if (ex.includes('stripes')) { rrect(ctx, -14, topY + 18, 28, 5, 0, look.trim, { stroke: null }); rrect(ctx, -14, topY + 28, 28, 5, 0, look.trim, { stroke: null }); }
  if (ex.includes('tie')) poly(ctx, [[0, topY + 2], [4, topY + 10], [0, topY + 28], [-4, topY + 10]], look.trim, { lw: 1.2 });
  if (ex.includes('badge')) poly(ctx, [[6, topY + 12], [11, topY + 12], [11, topY + 19], [8.5, topY + 22], [6, topY + 19]], look.trim, { lw: 1 });
  if (ex.includes('emblem')) circle(ctx, 3, topY + 16, 6, look.trim, { lw: 1.4 });
  if (ex.includes('shawl')) poly(ctx, [[-16, topY + 2], [16, topY + 2], [12, topY + 18], [0, topY + 24], [-12, topY + 18]], '#F5E6A8', { lw: 1.6 });
  if (ex.includes('stethoscope')) { ctx.beginPath(); ctx.arc(0, topY + 6, 8, 0, Math.PI); ctx.strokeStyle = '#3A3F4B'; ctx.lineWidth = 2; ctx.stroke(); circle(ctx, 0, topY + 20, 3, '#B0B8C0', { lw: 1.2 }); }
  if (isRobot) { rrect(ctx, -7, topY + 10, 14, 14, 3, look.trim, { lw: 1.4 }); circle(ctx, 0, topY + 17, 3, '#E8F3FF', { stroke: null }); }

  // arms
  const carrying = mood === 'carry';
  const sh: Pt = [2, topY + 6];
  const armCol = look.dress && !isRobot ? look.skin : look.skin;
  const sleeve = look.top;
  const hands: Pt[] = carrying
    ? [[24, topY + 22], [20, topY + 28]]
    : mood === 'worried' ? [[16, topY - 8 + Math.sin(phase * 8) * 3], [10, topY - 4 + Math.cos(phase * 8) * 3]]
    : mood === 'happy' ? [[18, topY - 4], [-10, topY + 22]]
    : [[sw * -16 + 8, topY + 26 - lift * 6], [sw * 16 + 8, topY + 26]];
  hands.forEach((h, i) => {
    const elbow: Pt = [(sh[0] + h[0]) / 2 + (carrying ? 4 : 0), (sh[1] + h[1]) / 2 + (carrying ? 8 : 2)];
    limb(ctx, [sh, elbow, h], 7.5, armCol);
    limb(ctx, [sh, [(sh[0] + elbow[0]) / 2, (sh[1] + elbow[1]) / 2]], 8.5, sleeve);
    circle(ctx, h[0], h[1], 4.2, armCol, { lw: 1.6 });
    if (i === 0 && ex.includes('cane') && !running) line(ctx, h[0], h[1], h[0] + 2, 0, '#6B4F38', 3);
    if (i === 0 && ex.includes('staff')) line(ctx, h[0], h[1] - 20, h[0] + 2, -2, '#8C6A4F', 3);
    if (i === 0 && ex.includes('book')) rrect(ctx, h[0] - 2, h[1] - 4, 14, 10, 2, '#4A8CE0', { lw: 1.4 });
  });

  // head
  const hx = 4, hy = -106 - bob;
  drawGuardianHead(ctx, look, hx, hy, mood, phase, ex);

  ctx.restore();
}

function drawGuardianHead(ctx: Ctx, look: Look, hx: number, hy: number, mood: GuardianMood, phase: number, ex: string[]): void {
  const R = 15;
  const robot = ex.includes('robot');

  // back hair
  if (look.hair === 'bun') circle(ctx, hx - 12, hy - 10, 7, look.hairColor);
  if (look.hair === 'pigtails') {
    circle(ctx, hx - 13, hy - 2, 6.5, look.hairColor);
    circle(ctx, hx + 6, hy - 14, 6.5, look.hairColor);
    circle(ctx, hx - 14, hy - 3, 2.4, look.hatColor ?? '#F2637B', { stroke: null });
  }
  if (look.hair === 'wrap') ellipse(ctx, hx - 4, hy - 8, R + 1, R * 0.8, look.hairColor);

  if (robot) {
    rrect(ctx, hx - 15, hy - 14, 30, 28, 6, look.skin, { lw: 2.2 });
    line(ctx, hx, hy - 14, hx, hy - 26, INK, 2);
    circle(ctx, hx, hy - 28, 3.4, '#D9364A', { lw: 1.4 });
    rrect(ctx, hx - 3, hy - 7, 15, 9, 4, '#1E2E52', { lw: 1.4 });
    circle(ctx, hx + 3, hy - 2.5, 2.6, '#8FD3F4', { stroke: null });
    circle(ctx, hx + 9, hy - 2.5, 2.6, '#8FD3F4', { stroke: null });
    ctx.beginPath(); ctx.arc(hx + 6, hy + 7, 5, 0.2, Math.PI - 0.2); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
    return;
  }

  // face
  ellipse(ctx, hx, hy, R, R * 1.04, look.skin, { lw: 2.2 });
  circle(ctx, hx - R * 0.75, hy + 2, 3.6, shade(look.skin, -0.08), { lw: 1.4 });
  ellipse(ctx, hx + 7, hy + 6, 4, 2.6, 'rgba(255,110,120,0.35)', { stroke: null });
  ellipse(ctx, hx + 8, hy - 2, 2.4, 3.2, '#2A1B12', { stroke: null });
  circle(ctx, hx + 9, hy - 3, 0.9, '#FFF', { stroke: null });
  ellipse(ctx, hx - 3, hy - 2, 2.2, 3, '#2A1B12', { stroke: null });
  if (ex.includes('glasses')) {
    circle(ctx, hx + 8, hy - 2, 5.5, 'rgba(200,230,255,0.25)', { lw: 1.6 });
    circle(ctx, hx - 3, hy - 2, 5.5, 'rgba(200,230,255,0.25)', { lw: 1.6 });
    line(ctx, hx + 2.5, hy - 2, hx + 2.5, hy - 2, INK, 1.6);
  }
  if (ex.includes('mask')) poly(ctx, [[hx - 12, hy - 8], [hx + 14, hy - 8], [hx + 14, hy + 2], [hx + 4, hy + 4], [hx - 12, hy + 2]], '#D9364A', { lw: 1.4 });
  // brows + mouth by mood
  ctx.strokeStyle = shade(look.skin, -0.6); ctx.lineWidth = 1.8; ctx.lineCap = 'round';
  ctx.beginPath();
  if (mood === 'worried') { ctx.moveTo(hx + 4, hy - 8); ctx.lineTo(hx + 12, hy - 11); ctx.moveTo(hx - 7, hy - 11); ctx.lineTo(hx + 1, hy - 8); }
  else { ctx.moveTo(hx + 4, hy - 9); ctx.lineTo(hx + 12, hy - 9.5); ctx.moveTo(hx - 7, hy - 9.5); ctx.lineTo(hx + 1, hy - 9); }
  ctx.stroke();
  if (mood === 'worried') ellipse(ctx, hx + 5, hy + 8, 3.6, 4.6, '#7A1F1F', { lw: 1.6 });
  else if (mood === 'happy' || mood === 'carry') {
    ctx.beginPath(); ctx.arc(hx + 5, hy + 4, 6, 0.1, Math.PI - 0.1); ctx.fillStyle = '#7A1F1F'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.stroke();
  } else { ctx.beginPath(); ctx.arc(hx + 5, hy + 3, 5, 0.2, Math.PI - 0.2); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke(); }

  if (ex.includes('beard')) {
    ctx.beginPath(); ctx.ellipse(hx + 2, hy + 8, R * 0.85, R * 0.62, 0, 0, Math.PI); ctx.closePath();
    ctx.fillStyle = look.hairColor; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.stroke();
    if (mood === 'happy' || mood === 'carry') { ctx.beginPath(); ctx.arc(hx + 5, hy + 5, 4.5, 0.2, Math.PI - 0.2); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); }
  }
  if (ex.includes('moustache')) { ellipse(ctx, hx + 6, hy + 2, 6, 2.4, look.hairColor, { lw: 1.2 }); }

  // hair / hats on top
  const top = hy - R;
  switch (look.hair) {
    case 'wrap': {
      const c = look.hatColor ?? '#F2637B';
      ellipse(ctx, hx - 1, top + 4, R * 1.12, R * 0.62, c, { lw: 2 });
      ellipse(ctx, hx + 2, top - 5, R * 0.62, R * 0.46, shade(c, 0.12), { lw: 1.8, rot: -0.35 });
      poly(ctx, [[hx + 8, top - 3], [hx + 20, top - 12], [hx + 17, top + 1]], shade(c, -0.1), { lw: 1.6 });
      for (let i = 0; i < 4; i++) circle(ctx, hx - 10 + i * 6, top + 3, 1.4, '#F5B942', { stroke: null });
      break;
    }
    case 'bun':
      ctx.beginPath(); ctx.ellipse(hx - 1, hy - 3, R + 1, R * 0.95, 0, Math.PI * 1.02, Math.PI * 1.98); ctx.closePath();
      ctx.fillStyle = look.hairColor; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.8; ctx.stroke();
      break;
    case 'short': case 'scrub': case 'pigtails':
      ctx.beginPath(); ctx.ellipse(hx - 1, hy - 3, R + 1, R * 0.95, 0, Math.PI * 1.02, Math.PI * 1.98); ctx.closePath();
      ctx.fillStyle = look.hair === 'scrub' ? look.hatColor! : look.hairColor; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.8; ctx.stroke();
      if (look.hair === 'pigtails') { poly(ctx, [[hx + 3, top - 3], [hx + 11, top - 6], [hx + 11, top + 2]], look.hatColor!, { lw: 1.2 }); }
      break;
    case 'cap': case 'police': case 'chief': {
      const c = look.hatColor ?? '#6B4F38';
      ctx.beginPath(); ctx.ellipse(hx, top + 6, R + 1, R * 0.8, 0, Math.PI, 0); ctx.closePath();
      ctx.fillStyle = c; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
      ellipse(ctx, hx + 14, top + 7, 9, 3, shade(c, -0.15), { lw: 1.6 });
      if (look.hair === 'police') circle(ctx, hx + 2, top + 1, 2.6, '#F5B942', { lw: 1 });
      if (look.hair === 'chief') { rrect(ctx, hx - 14, top + 3, 28, 4, 1, '#D4AF37', { stroke: null }); }
      break;
    }
    case 'helmet':
      ctx.beginPath(); ctx.ellipse(hx, top + 7, R + 2, R * 0.92, 0, Math.PI, 0); ctx.closePath();
      ctx.fillStyle = look.hatColor!; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
      rrect(ctx, hx - R - 4, top + 6, R * 2 + 12, 5, 2, shade(look.hatColor!, -0.2), { lw: 1.6 });
      circle(ctx, hx + 2, top - 1, 3, '#F5B942', { lw: 1 });
      break;
    default:
  }
  if (mood === 'worried') {
    // sweat drop
    ellipse(ctx, hx + 14, hy - 10 + Math.sin(phase * 6) * 1.5, 2, 3.2, '#8FD3F4', { stroke: '#4A8CE0', lw: 1 });
  }
}

export const GUARDIAN_IDS = Object.keys(LOOKS);
