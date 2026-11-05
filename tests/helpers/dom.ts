/* ============================================================
   Test harness: boots the real index.html in jsdom, backs every
   <canvas> with a node canvas (@napi-rs/canvas) and gives tests a
   manual frame stepper, so the actual Game/UI code can be driven
   headlessly — including real mouse events on the game canvas.
   ============================================================ */

import { createCanvas } from '@napi-rs/canvas';
import { readFileSync } from 'node:fs';
import { vi } from 'vitest';

const realCanvases = new WeakMap<object, any>();
let rafQueue: Array<(t: number) => void> = [];
export let now = 1000;

export function setupDom(): void {
  const html = readFileSync('index.html', 'utf8');
  const body = html.match(/<body>([\s\S]*)<\/body>/)![1].replace(/<script[\s\S]*?<\/script>/g, '');
  document.body.innerHTML = body;
  localStorage.clear();

  // canvases -> node canvas
  (HTMLCanvasElement.prototype as any).getContext = function (this: HTMLCanvasElement) {
    let c = realCanvases.get(this);
    if (!c) { c = createCanvas(400, 800); realCanvases.set(this, c); }
    const ctx = c.getContext('2d');
    if (!ctx.__patched) {
      const orig = ctx.drawImage.bind(ctx);
      ctx.drawImage = (img: any, ...a: any[]) => { const real = realCanvases.get(img); if (real) orig(real, ...a); };
      ctx.__patched = true;
    }
    return ctx;
  };

  // layout sizes jsdom doesn't compute
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 390 });
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => 760 });
  (Element.prototype as any).getBoundingClientRect = function () {
    const sizes: Record<string, number> = { 'game-canvas': 760, 'home-canvas': 190, 'preview-canvas': 210, 'intro-canvas': 380, 'gameover-canvas': 150 };
    const h = sizes[(this as HTMLElement).id] ?? 200;
    return { left: 0, top: 0, right: 390, bottom: h, width: 390, height: h, x: 0, y: 0, toJSON() {} };
  };

  // manual animation frames + controllable clock
  rafQueue = [];
  now = 1000;
  vi.stubGlobal('requestAnimationFrame', (cb: (t: number) => void) => { rafQueue.push(cb); return rafQueue.length; });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  vi.spyOn(performance, 'now').mockImplementation(() => now);
}

/** Advances n animation frames of ~16.7ms each. */
export function step(n: number, hook?: (frame: number) => void): void {
  for (let i = 0; i < n; i++) {
    now += 1000 / 60;
    const cbs = rafQueue;
    rafQueue = [];
    cbs.forEach(cb => cb(now));
    hook?.(i);
  }
}

export function click(el: Element): void {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
}

export function mouse(el: Element, type: string, x: number, y: number): void {
  el.dispatchEvent(new MouseEvent(type, { clientX: x, clientY: y, bubbles: true, cancelable: true }));
}
