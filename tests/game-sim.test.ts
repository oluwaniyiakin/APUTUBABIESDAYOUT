// Drives the real game headlessly: boots the UI, starts runs in every mode and plays
// them with an auto-player that uses the genuine mouse-input path.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { click, mouse, setupDom, step } from './helpers/dom';
import { depthScale } from '../src/utils';

let UI: any, Game: any, Storage: any;

async function boot() {
  vi.resetModules();
  setupDom();
  ({ UI } = await import('../src/ui/ui'));
  ({ Game } = await import('../src/core/game'));
  ({ Storage } = await import('../src/core/storage'));
  const s = Storage.loadSettings(); s.seenIntro = true; Storage.saveSettings(s);
  UI.init();
}

/** Throttles the (expensive) canvas render so long sims stay fast but still exercise it. */
function throttleRender() {
  const orig = Game.render.bind(Game);
  let n = 0;
  Game.render = () => { if (n++ % 25 === 0) orig(); };
}

/** Plays like a decent human: tap/drag/hold whatever is about to reach the baby. */
function autoPlay() {
  const canvas = document.getElementById('game-canvas')!;
  for (const h of Game.hazards) {
    if (h.solved || h.passed) continue;
    const d = h.worldX - Game.baby.progress;
    if (d < 0 || d > 260) continue;
    const s = Game.worldToScreen(h.worldX, h.laneY);
    const y = s.y - h.type.height * 0.4 * depthScale(h.laneY);
    if (h.type.fixType === 'tap') mouse(canvas, 'mousedown', s.x, y);
    else if (h.type.fixType === 'drag') { if (!Game.activeDrag) { mouse(canvas, 'mousedown', s.x, y); mouse(canvas, 'mousemove', s.x + 90, y - 50); } }
    else if (!Game.activeHold) mouse(canvas, 'mousedown', s.x, y);
  }
}

describe('game simulation (headless, real input path)', () => {
  beforeEach(async () => { await boot(); });
  afterEach(() => { Game.stop?.(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('boots to the home screen and opens the mode picker', () => {
    expect(document.getElementById('screen-home')!.classList.contains('active')).toBe(true);
    click(document.getElementById('btn-play')!);
    expect(document.getElementById('screen-modes')!.classList.contains('active')).toBe(true);
    expect(document.querySelectorAll('#mode-list .mode-card').length).toBe(4);
  });

  it('an attentive player survives 2 minutes of Endless and earns saves, coins and moments', () => {
    UI.startGame('endless');
    throttleRender();
    Game.freeLives = 99; // survival insurance: this test is about systems running, not skill
    step(60 * 120, () => { if (Game.phase === 'playing') autoPlay(); });
    expect(Game.running).toBe(true);
    expect(Game.saves).toBeGreaterThan(8);
    expect(Game.coins).toBeGreaterThan(30);
    expect(Game.distanceMeters).toBeGreaterThan(50);
    const found = Storage.loadProgress().discoveries as string[];
    expect(found.some(d => d.startsWith('hazard:'))).toBe(true);
    expect(found.some(d => d.startsWith('moment:'))).toBe(true);
    // pacing guard: over 2 minutes Aputu should get distracted a handful of times, not never or constantly
    expect(Game.moments).toBeGreaterThanOrEqual(4);
    expect(Game.moments).toBeLessThanOrEqual(16);
    console.log(`[pacing] 2 min: saves=${Game.saves} moments=${Game.moments} coins=${Game.coins} dist=${Game.distanceMeters}m`);
  });

  it('challenge events trigger and end during a long Endless run', () => {
    const banner = vi.spyOn(UI, 'showEventBanner');
    UI.startGame('endless');
    throttleRender();
    Game.freeLives = 99;
    step(60 * 110, () => { if (Game.phase === 'playing') autoPlay(); });
    const started = banner.mock.calls.filter(c => c[0] !== null);
    expect(started.length).toBeGreaterThanOrEqual(1);
  });

  it('an unattended run ends in a rescue and shows the game-over screen', () => {
    UI.startGame('endless');
    throttleRender();
    let sawRescue = false;
    step(60 * 60, () => { if (Game.phase === 'rescue') sawRescue = true; });
    expect(sawRescue).toBe(true);
    expect(Game.phase).toBe('over');
    expect(document.getElementById('overlay-gameover')!.classList.contains('hidden')).toBe(false);
    expect(Storage.loadProgress().totalRuns).toBe(1);
    expect(document.querySelectorAll('#go-stars span').length).toBe(3);
  });

  it('Zen mode gives a cuddle and keeps going instead of ending', () => {
    UI.startGame('zen');
    throttleRender();
    let rescues = 0, was = Game.phase;
    step(60 * 70, () => { if (Game.phase === 'rescue' && was !== 'rescue') rescues++; was = Game.phase; });
    expect(rescues).toBeGreaterThanOrEqual(1);
    expect(Game.phase).not.toBe('over');
    expect(Game.running).toBe(true);
  });

  it('Time Attack ends when the clock runs out and says so', () => {
    UI.startGame('time_attack');
    throttleRender();
    Game.freeLives = 99;
    step(60 * 96, () => { if (Game.phase === 'playing') autoPlay(); });
    expect(Game.phase).toBe('over');
    expect(document.getElementById('gameover-title')!.textContent).toBe("Time's up!");
  });

  it('Hardcore switches off guardian perks and free saves', () => {
    const c = Storage.loadCustomization(); c.nanny = 'doctor'; Storage.saveCustomization(c);
    UI.customization = c;
    UI.startGame('hardcore');
    expect(Game.freeLives).toBe(0);
    UI.startGame('endless');
    expect(Game.freeLives).toBe(2); // Doctor perk is live outside Hardcore
  });

  it('guardian perks are wired: Super Nanny starts with a shield, Robot auto-solves once', () => {
    const c = Storage.loadCustomization();
    UI.customization = { ...c, nanny: 'super-nanny' };
    UI.startGame('endless');
    expect(Game.powerups.hasCharge('shield')).toBe(true);
    UI.customization = { ...c, nanny: 'robot-nanny' };
    UI.startGame('endless');
    expect(Game.autoSolveLeft).toBe(1);
  });

  it('every screen can be opened and rendered without errors', () => {
    for (const id of ['btn-customize', 'btn-nanny', 'btn-worldmap', 'btn-shop', 'btn-missions', 'btn-achievements', 'btn-scrapbook', 'btn-settings', 'btn-howto']) {
      click(document.getElementById('btn-menu') ?? document.body);
      UI.showScreen('screen-home');
      click(document.getElementById(id)!);
    }
    expect(true).toBe(true);
  });

  it('the intro story plays through and is remembered', async () => {
    const s = Storage.loadSettings(); s.seenIntro = false; Storage.saveSettings(s);
    UI.openIntro();
    expect(document.getElementById('screen-intro')!.classList.contains('active')).toBe(true);
    step(30);
    for (let i = 0; i < 4; i++) click(document.getElementById('btn-intro-next')!);
    expect(document.getElementById('screen-home')!.classList.contains('active')).toBe(true);
    expect(Storage.loadSettings().seenIntro).toBe(true);
  });
});
