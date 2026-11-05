/* ============================================================
   APUTU: Baby's Day Out — src/utils.ts
   Small, dependency-free math helpers shared by the engine.
   ============================================================ */

export function randRange(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

export function clamp(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Draws a rounded rectangle path on a 2D canvas context (no fill/stroke). */
export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* ---------------- Colour helpers ---------------- */

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Mixes a colour toward white (amt > 0) or black (amt < 0). amt in -1..1. */
export function shade(hex: string, amt: number): string {
  if (!hex.startsWith('#')) return hex;
  const [r, g, b] = hexToRgb(hex);
  const t = amt < 0 ? 0 : 255;
  const k = Math.abs(amt);
  return rgbToHex(r + (t - r) * k, g + (t - g) * k, b + (t - b) * k);
}

/** Linear blend between two hex colours. */
export function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

/* ---------------- Deterministic randomness ---------------- */

/** Stable pseudo-random number in [0,1) from an integer seed.
 *  Used so scenery is identical every time the camera passes it. */
export function hash01(n: number, salt = 0): number {
  const x = Math.sin(n * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function easeOutBack(t: number): number {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

export function smoothstep(a: number, b: number, v: number): number {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

/** Depth scale for an entity standing in a lane (0 = far side, 1 = near side). */
export function depthScale(laneY: number): number {
  return 0.8 + 0.4 * laneY;
}
