// Optional: PREVIEW=1 npx vitest run tests/screenshots.test.ts
// Captures real in-game frames to docs/previews/ for visual review.
import { afterEach, describe, it, vi } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { click, mouse, setupDom, step } from './helpers/dom';
import { depthScale } from '../src/utils';

const enabled = !!process.env.PREVIEW;
const OUT = 'docs/previews';

function save(canvasEl: HTMLCanvasElement, name: string) {
  const real = (canvasEl.getContext('2d') as any).canvas;
  mkdirSync(OUT, { recursive: true });
  writeFileSync(`${OUT}/${name}.png`, real.toBuffer('image/png'));
}

describe.skipIf(!enabled)('screenshots', () => {
  let UI: any, Game: any, Storage: any, CHALLENGE_EVENTS: any;
  const boot = async (preset?: (S: any) => void) => {
    vi.resetModules(); setupDom();
    ({ UI } = await import('../src/ui/ui')); ({ Game } = await import('../src/core/game')); ({ Storage } = await import('../src/core/storage'));
    ({ CHALLENGE_EVENTS } = await import('../src/data/events'));
    const s = Storage.loadSettings(); s.seenIntro = true; Storage.saveSettings(s);
    preset?.(Storage);
    UI.init();
  };
  const auto = () => {
    const canvas = document.getElementById('game-canvas')!;
    for (const h of Game.hazards) {
      if (h.solved || h.passed) continue;
      const d = h.worldX - Game.baby.progress; if (d < 0 || d > 220) continue;
      const s = Game.worldToScreen(h.worldX, h.laneY); const y = s.y - h.type.height * 0.4 * depthScale(h.laneY);
      if (h.type.fixType === 'tap') mouse(canvas, 'mousedown', s.x, y);
      else if (h.type.fixType === 'drag') { if (!Game.activeDrag) { mouse(canvas, 'mousedown', s.x, y); mouse(canvas, 'mousemove', s.x + 90, y - 50); } }
      else if (!Game.activeHold) mouse(canvas, 'mousedown', s.x, y);
    }
  };
  const playFor = (sec: number) => { Game.freeLives = 99; step(Math.round(sec * 60), () => { if (Game.phase === 'playing') auto(); }); };
  afterEach(() => { Game.stop?.(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('street', async () => {
    await boot();
    const cust = Storage.loadCustomization(); cust.outfit = 'superhero'; cust.hair = 'puffs'; cust.nanny = 'nanny'; UI.customization = cust;
    UI.startGame('endless'); (Game as any).hintsOn = true;
    playFor(13.5); Game.render(); save(Game.canvas, 'game-street');
  });
  it('storm', async () => {
    await boot();
    const cust = Storage.loadCustomization(); cust.outfit = 'explorer'; cust.gender = 'girl'; cust.hair = 'braids'; cust.skin = 'tone1'; cust.nanny = 'doctor'; UI.customization = cust;
    UI.startGame('endless'); playFor(6);
    const ev = CHALLENGE_EVENTS.find((e: any) => e.id === 'heavy_rain'); Game.events.current = ev; Game.events.remaining = ev.duration; Game.onEventStart(ev); playFor(4); Game.render(); save(Game.canvas, 'game-storm');
  });
  it('night', async () => {
    await boot(S => { const p = S.loadProgress(); p.totalDistance = 2950; S.saveProgress(p); });
    const cust = Storage.loadCustomization(); cust.outfit = 'festival'; cust.nanny = 'firefighter'; UI.customization = cust;
    UI.startGame('endless'); playFor(9); Game.render(); save(Game.canvas, 'game-night');
  });
  it('rescue', async () => {
    await boot();
    const cust = Storage.loadCustomization(); cust.outfit = 'pirate'; cust.nanny = 'grandma'; UI.customization = cust;
    UI.startGame('endless');
    for (let i = 0; i < 60 * 40 && !(Game.phase === 'rescue' && Game.rescueT > 1.9); i++) step(1);
    Game.render(); save(Game.canvas, 'game-rescue');
  });
  it('ui canvases', async () => {
    await boot();
    const cust = Storage.loadCustomization(); cust.outfit = 'ankara'; cust.gender = 'girl'; cust.hair = 'curls'; UI.customization = cust;
    UI.showScreen('screen-home'); step(150); save(document.getElementById('home-canvas') as HTMLCanvasElement, 'ui-home-hero');
    click(document.getElementById('btn-customize')!); step(200); save(document.getElementById('preview-canvas') as HTMLCanvasElement, 'ui-customize');
    UI.openIntro();
    for (let i = 0; i < 4; i++) { step(i === 3 ? 100 : 130); save(document.getElementById('intro-canvas') as HTMLCanvasElement, `ui-intro-${i + 1}`); click(document.getElementById('btn-intro-next')!); }
  });
});
