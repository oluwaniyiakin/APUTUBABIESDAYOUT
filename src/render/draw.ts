/* ============================================================
   APUTU: Baby's Day Out — src/render/draw.ts
   Tiny vector-drawing toolkit shared by every sprite renderer.
   All art in the game is built from these primitives so it keeps
   one consistent look: warm colours, soft shapes, dark-brown ink
   outlines (the "cartoon storybook" style).
   ============================================================ */

import { roundRect } from '../utils';

export type Ctx = CanvasRenderingContext2D;
export type Pt = [number, number];

/** Outline colour used across the whole game. */
export const INK = '#3A2A1E';

interface PaintOpts { stroke?: string | null; lw?: number }

function paint(ctx: Ctx, fill: string | null, o: PaintOpts = {}): void {
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  const stroke = o.stroke === undefined ? INK : o.stroke;
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = o.lw ?? 2; ctx.lineJoin = 'round'; ctx.stroke(); }
}

export function circle(ctx: Ctx, x: number, y: number, r: number, fill: string | null, o: PaintOpts = {}): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  paint(ctx, fill, o);
}

export function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, fill: string | null, o: PaintOpts & { rot?: number } = {}): void {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), o.rot ?? 0, 0, Math.PI * 2);
  paint(ctx, fill, o);
}

export function rrect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string | null, o: PaintOpts = {}): void {
  roundRect(ctx, x, y, w, h, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
  paint(ctx, fill, o);
}

export function poly(ctx: Ctx, pts: Pt[], fill: string | null, o: PaintOpts = {}): void {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  paint(ctx, fill, o);
}

/** Thick rounded line (arms, legs, ropes) with an ink outline. */
export function limb(ctx: Ctx, pts: Pt[], w: number, color: string, outline: string | null = INK): void {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const trace = () => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  };
  if (outline) { trace(); ctx.strokeStyle = outline; ctx.lineWidth = w + 3; ctx.stroke(); }
  trace(); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.stroke();
}

export function line(ctx: Ctx, x1: number, y1: number, x2: number, y2: number, color: string, w = 2): void {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.stroke();
}

/** Soft ground shadow under a character / prop. */
export function groundShadow(ctx: Ctx, x: number, y: number, rx: number, ry = rx * 0.28, alpha = 0.22): void {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(40,25,10,${alpha})`;
  ctx.fill();
}

export function star(ctx: Ctx, x: number, y: number, r: number, fill: string, rot = 0): void {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = rot - Math.PI / 2 + (i * Math.PI) / 5;
    const px = x + Math.cos(a) * rad, py = y + Math.sin(a) * rad;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

export function heart(ctx: Ctx, x: number, y: number, s: number, fill: string): void {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.35);
  ctx.bezierCurveTo(x - s, y - s * 0.4, x - s * 0.45, y - s * 1.1, x, y - s * 0.45);
  ctx.bezierCurveTo(x + s * 0.45, y - s * 1.1, x + s, y - s * 0.4, x, y + s * 0.35);
  ctx.fillStyle = fill;
  ctx.fill();
}
