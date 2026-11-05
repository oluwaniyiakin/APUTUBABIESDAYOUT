/* ============================================================
   APUTU: Baby's Day Out — src/ui/ui.ts
   Screen navigation and all DOM rendering outside the canvas:
   home, intro story, mode select, customize, guardians, world
   map, shop, missions, awards, scrapbook, settings, HUD pieces
   (power-up chips, event banner, chapter card, timer, toasts)
   and the pause / game-over overlays.

   Note: see core/game.ts about the Game <-> UI circular import —
   it is safe under ESM because nothing runs at load time.
   ============================================================ */

import type { ChallengeEventDef, Customization, GameOverInfo, WorldDef } from '../types';
import { Storage } from '../core/storage';
import { AudioSys } from '../core/audio';
import { Game } from '../core/game';
import type { PowerupSystem } from '../core/powerup-system';
import { HAZARD_TYPES } from '../core/hazards';
import { WORLDS, currentWorldForDistance } from '../data/worlds';
import { NANNIES } from '../data/nannies';
import { SHOP_OUTFITS } from '../data/outfits';
import { ACHIEVEMENTS } from '../data/missions';
import { getPowerup } from '../data/powerups';
import { MODES, getMode } from '../data/modes';
import { SCRAPBOOK } from '../data/scrapbook';
import { levelInfo } from '../data/levels';
import { babyLook, drawBaby } from '../render/baby';
import { drawGuardian } from '../render/guardian';
import { drawHazard } from '../render/hazards';
import { drawBackdrop, drawRoad } from '../render/scenery';
import { drawHalo, drawInterest, drawOrbitStars } from '../render/overlay';
import { INTRO_SLIDES, MiniStage, homeScene, introScene, previewScene, type PreviewController } from './stage';

type Ctx = CanvasRenderingContext2D;
const $ = <T extends HTMLElement = HTMLElement>(id: string): T => document.getElementById(id) as T;

interface ToastItem { emoji: string; label: string; name: string }

class UIController {
  customization!: Customization;
  activeShopTab: 'outfits' | 'nannies' = 'outfits';
  currentModeId = 'endless';

  private homeStage!: MiniStage;
  private previewStage!: MiniStage;
  private introStage!: MiniStage;
  private goStage!: MiniStage;
  private preview!: PreviewController;
  private introSlide = 0;
  private toasts: ToastItem[] = [];
  private toastBusy = false;
  private chapterTimer = 0;
  private puSig = '';
  private timerText = '';
  private goInfo: GameOverInfo | null = null;

  init(): void {
    this.customization = Storage.loadCustomization();
    this.currentModeId = Storage.loadSettings().lastMode || 'endless';
    AudioSys.init();
    Game.init();

    this.homeStage = new MiniStage($<HTMLCanvasElement>('home-canvas'), homeScene(
      () => this.customization,
      () => currentWorldForDistance(Storage.loadProgress().totalDistance),
    ));
    this.preview = previewScene(() => this.customization, () => AudioSys.playGiggle());
    this.previewStage = new MiniStage($<HTMLCanvasElement>('preview-canvas'), this.preview.scene);
    this.introStage = new MiniStage($<HTMLCanvasElement>('intro-canvas'), introScene(() => this.introSlide, () => this.customization));
    this.goStage = new MiniStage($<HTMLCanvasElement>('gameover-canvas'), (ctx, w, h, t) => this.drawRescueTableau(ctx, w, h, t));

    this.bindHome();
    this.bindIntro();
    this.bindModes();
    this.bindCustomize();
    this.bindNanny();
    this.bindWorldMap();
    this.bindShop();
    this.bindMissions();
    this.bindAchievements();
    this.bindScrapbook();
    this.bindSettings();
    this.bindHowTo();
    this.bindPause();
    this.bindGameOver();
    this.applySettingsToggles();
    this.refreshHomeStats();

    if (!Storage.loadSettings().seenIntro) this.openIntro();
    else this.showScreen('screen-home', false);
  }

  /* ================= Navigation ================= */

  showScreen(id: string, sound = true): void {
    this.homeStage.stop();
    this.previewStage.stop();
    this.introStage.stop();
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    $(id).classList.add('active');
    if (sound) AudioSys.playButtonTap();
    if (id === 'screen-home') { this.refreshHomeStats(); this.homeStage.start(); }
    if (id === 'screen-customize') this.previewStage.start();
    if (id === 'screen-intro') this.introStage.start();
  }

  refreshHomeStats(): void {
    const p = Storage.loadProgress();
    $('home-coins').textContent = String(p.coins || 0);
    $('home-stars').textContent = String(p.totalStars || 0);
    const li = levelInfo(p.xp || 0);
    $('home-level').textContent = String(li.level);
    $('home-title').textContent = li.title;
    $('home-world').textContent = currentWorldForDistance(p.totalDistance || 0).name;
  }

  /* ================= Home ================= */

  private bindHome(): void {
    const on = (id: string, fn: () => void) => $(id).addEventListener('click', fn);
    on('btn-play', () => { this.renderModes(); this.showScreen('screen-modes'); });
    on('btn-customize', () => { this.renderOutfitChips(); this.syncCustomizeChips(); this.showScreen('screen-customize'); });
    on('btn-nanny', () => { this.renderNannyList(); this.showScreen('screen-nanny'); });
    on('btn-worldmap', () => { this.renderWorldList(); this.showScreen('screen-worldmap'); });
    on('btn-shop', () => { this.renderShop(); this.showScreen('screen-shop'); });
    on('btn-missions', () => { this.renderMissions(); this.showScreen('screen-missions'); });
    on('btn-achievements', () => { this.renderAchievements(); this.showScreen('screen-achievements'); });
    on('btn-scrapbook', () => { this.renderScrapbook(); this.showScreen('screen-scrapbook'); });
    on('btn-howto', () => this.showScreen('screen-howto'));
    on('btn-settings', () => this.showScreen('screen-settings'));
  }

  startGame(modeId = this.currentModeId): void {
    this.currentModeId = modeId;
    const s = Storage.loadSettings(); s.lastMode = modeId; Storage.saveSettings(s);
    this.goStage.stop();
    this.showScreen('screen-game');
    Game.resize();
    Game.start(this.customization, modeId);
  }

  /* ================= Intro story ================= */

  private openIntro(): void {
    this.introSlide = 0;
    this.renderIntroSlide();
    this.showScreen('screen-intro', false);
  }

  private renderIntroSlide(): void {
    const s = INTRO_SLIDES[this.introSlide];
    $('intro-title').textContent = s.title;
    $('intro-text').textContent = s.text;
    $('intro-dots').innerHTML = INTRO_SLIDES.map((_, i) => `<span class="${i === this.introSlide ? 'on' : ''}"></span>`).join('');
    $('btn-intro-next').textContent = this.introSlide === INTRO_SLIDES.length - 1 ? "Let's go! ▶" : 'Next ▶';
  }

  private finishIntro(): void {
    const s = Storage.loadSettings(); s.seenIntro = true; Storage.saveSettings(s);
    this.showScreen('screen-home');
  }

  private bindIntro(): void {
    $('btn-intro-next').addEventListener('click', () => {
      if (this.introSlide >= INTRO_SLIDES.length - 1) { this.finishIntro(); return; }
      this.introSlide++;
      this.renderIntroSlide();
      this.introStage.setScene(introScene(() => this.introSlide, () => this.customization));
      AudioSys.playButtonTap();
    });
    $('btn-intro-skip').addEventListener('click', () => this.finishIntro());
  }

  /* ================= Mode select ================= */

  private bindModes(): void {
    $('btn-modes-back').addEventListener('click', () => this.showScreen('screen-home'));
  }

  private renderModes(): void {
    const best = Storage.loadProgress().bestScores;
    const list = $('mode-list');
    list.innerHTML = '';
    MODES.forEach(m => {
      const card = document.createElement('button');
      card.className = 'mode-card' + (m.id === this.currentModeId ? ' last' : '');
      const b = best[m.id];
      card.innerHTML = `
        <div class="mode-emoji">${m.emoji}</div>
        <div class="mode-info">
          <div class="mode-name">${m.name} <span class="mode-tag">${m.tagline}</span></div>
          <div class="mode-desc">${m.description}</div>
          <div class="mode-best">${b ? `Best score: ${b}` : 'Not played yet'}</div>
        </div>`;
      card.addEventListener('click', () => this.startGame(m.id));
      list.appendChild(card);
    });
  }

  /* ================= Customize ================= */

  private bindCustomize(): void {
    document.querySelectorAll<HTMLElement>('#screen-customize .chip-row[data-target]:not(#outfit-chip-row)').forEach(row => {
      const target = row.dataset.target as keyof Customization;
      row.addEventListener('click', (e) => {
        const chip = (e.target as HTMLElement).closest('.chip') as HTMLElement | null;
        if (!chip) return;
        row.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        (this.customization as any)[target] = chip.dataset.value;
        AudioSys.playButtonTap();
      });
    });
    $('preview-canvas').addEventListener('click', () => this.preview.poke());
    $('link-to-shop').addEventListener('click', (e) => { e.preventDefault(); this.renderShop(); this.showScreen('screen-shop'); });
    $('btn-customize-back').addEventListener('click', () => {
      this.customization = Storage.loadCustomization();   // discard unsaved edits
      this.showScreen('screen-home');
    });
    $('btn-customize-save').addEventListener('click', () => {
      Storage.saveCustomization(this.customization);
      this.showScreen('screen-home');
    });
  }

  /** Makes the chip highlights match the current customization. */
  private syncCustomizeChips(): void {
    document.querySelectorAll<HTMLElement>('#screen-customize .chip-row[data-target]:not(#outfit-chip-row)').forEach(row => {
      const target = row.dataset.target as keyof Customization;
      row.querySelectorAll<HTMLElement>('.chip').forEach(c => c.classList.toggle('active', c.dataset.value === (this.customization as any)[target]));
    });
  }

  private renderOutfitChips(): void {
    const owned = Storage.loadProgress().outfitsOwned || [];
    const row = $('outfit-chip-row');
    row.innerHTML = '';
    SHOP_OUTFITS.forEach(outfit => {
      const unlocked = outfit.starter || owned.includes(outfit.id);
      const btn = document.createElement('button');
      btn.className = 'chip' + (this.customization.outfit === outfit.id ? ' active' : '') + (!unlocked ? ' locked' : '');
      btn.textContent = unlocked ? outfit.name : `🔒 ${outfit.name}`;
      btn.disabled = !unlocked;
      if (unlocked) btn.addEventListener('click', () => {
        row.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        this.customization.outfit = outfit.id;
        AudioSys.playButtonTap();
      });
      row.appendChild(btn);
    });
  }

  /* ================= Guardians ================= */

  private bindNanny(): void { $('btn-nanny-back').addEventListener('click', () => this.showScreen('screen-home')); }

  private guardianThumb(id: string): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = 120; c.height = 160; c.className = 'nanny-thumb';
    const ctx = c.getContext('2d')!;
    drawGuardian(ctx, id, 60, 150, 1.05, 1.2, { mood: 'happy', shadow: false });
    return c;
  }

  private renderNannyList(): void {
    const owned = Storage.loadProgress().nanniesOwned || ['nanny'];
    const list = $('nanny-list');
    list.innerHTML = '';
    NANNIES.forEach(n => {
      const isOwned = n.cost === 0 || owned.includes(n.id);
      const isSel = this.customization.nanny === n.id;
      const card = document.createElement('div');
      card.className = 'nanny-card' + (isSel ? ' selected' : '') + (!isOwned ? ' locked' : '');
      const thumb = this.guardianThumb(n.id);
      card.appendChild(thumb);
      const info = document.createElement('div');
      info.className = 'nanny-info';
      info.innerHTML = `<div class="nanny-name">${n.name}</div><div class="nanny-perk">${n.perk.label}</div>`;
      card.appendChild(info);
      const tail = document.createElement('div');
      tail.innerHTML = isSel ? '<div class="nanny-check">✅</div>' : (isOwned ? '' : `<div class="nanny-cost">🪙 ${n.cost}</div>`);
      card.appendChild(tail);
      card.addEventListener('click', () => {
        if (isOwned) { this.customization.nanny = n.id; Storage.saveCustomization(this.customization); this.renderNannyList(); }
        else { this.activeShopTab = 'nannies'; this.renderShop(); this.showScreen('screen-shop'); }
      });
      list.appendChild(card);
    });
  }

  /* ================= World map ================= */

  private bindWorldMap(): void { $('btn-worldmap-back').addEventListener('click', () => this.showScreen('screen-home')); }

  private renderWorldList(): void {
    const total = Storage.loadProgress().totalDistance || 0;
    const current = currentWorldForDistance(total);
    const list = $('world-list');
    list.innerHTML = '';
    WORLDS.forEach(w => {
      const unlocked = total >= w.unlockAtDistance;
      const card = document.createElement('div');
      card.className = 'world-card' + (!unlocked ? ' locked' : '') + (w.id === current.id ? ' current' : '');
      const status = w.id === current.id ? 'CURRENT' : (unlocked ? 'UNLOCKED' : `🔒 ${w.unlockAtDistance}m`);
      card.innerHTML = `
        <div class="world-swatch" style="background:linear-gradient(180deg,${w.colors.skyTop},${w.colors.road})"></div>
        <div class="world-info"><div class="world-name">${w.name}</div><div class="world-sub">${unlocked ? w.flavor : w.subtitle}</div></div>
        <div class="world-status">${status}</div>`;
      list.appendChild(card);
    });
  }

  updateWorldLabel(world: WorldDef | null): void {
    if (!world) return;
    const el = $('hud-world');
    if (el.textContent !== world.name) el.textContent = world.name;
  }

  /* ================= Shop ================= */

  private bindShop(): void {
    document.querySelectorAll<HTMLElement>('.shop-tab').forEach(tab => tab.addEventListener('click', () => this.switchShopTab(tab.dataset.tab as 'outfits' | 'nannies')));
    $('btn-shop-back').addEventListener('click', () => this.showScreen('screen-home'));
  }

  private switchShopTab(tab: 'outfits' | 'nannies'): void {
    this.activeShopTab = tab;
    document.querySelectorAll<HTMLElement>('.shop-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    $('shop-outfits').classList.toggle('hidden', tab !== 'outfits');
    $('shop-nannies').classList.toggle('hidden', tab !== 'nannies');
  }

  private outfitThumb(outfitId: string): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = 150; c.height = 100; c.className = 'shop-thumb';
    const ctx = c.getContext('2d')!;
    const look = babyLook({ ...this.customization, outfit: outfitId });
    drawBaby(ctx, 76, 88, 1.05, look, { pose: 'crawl', expression: 'happy', phase: 0.9, time: 1, lookBack: 0 }, { shadow: false });
    return c;
  }

  private renderShop(): void {
    const p = Storage.loadProgress();
    $('shop-coins').textContent = String(p.coins || 0);
    this.switchShopTab(this.activeShopTab);

    const og = $('shop-outfits'); og.innerHTML = '';
    SHOP_OUTFITS.forEach(o => {
      const owned = o.starter || (p.outfitsOwned || []).includes(o.id);
      const item = document.createElement('div');
      item.className = 'shop-item' + (owned ? ' owned' : '');
      item.appendChild(this.outfitThumb(o.id));
      item.insertAdjacentHTML('beforeend', `<div class="shop-item-name">${o.name}</div>
        <button class="shop-item-btn ${owned ? 'owned-btn' : ''}" ${owned ? '' : (p.coins < o.cost ? 'disabled' : '')}>${owned ? 'Owned ✓' : `🪙 ${o.cost}`}</button>`);
      if (!owned) item.querySelector('button')!.addEventListener('click', () => {
        if (Storage.spendCoins(o.cost)) { Storage.unlockOutfit(o.id); AudioSys.playPowerup(); this.renderShop(); }
      });
      og.appendChild(item);
    });

    const ng = $('shop-nannies'); ng.innerHTML = '';
    NANNIES.forEach(n => {
      const owned = n.cost === 0 || (p.nanniesOwned || []).includes(n.id);
      const item = document.createElement('div');
      item.className = 'shop-item' + (owned ? ' owned' : '');
      item.appendChild(this.guardianThumb(n.id));
      item.insertAdjacentHTML('beforeend', `<div class="shop-item-name">${n.name}</div>
        <button class="shop-item-btn ${owned ? 'owned-btn' : ''}" ${owned ? '' : (p.coins < n.cost ? 'disabled' : '')}>${owned ? 'Owned ✓' : `🪙 ${n.cost}`}</button>`);
      if (!owned) item.querySelector('button')!.addEventListener('click', () => {
        if (Storage.spendCoins(n.cost)) { Storage.unlockNanny(n.id); AudioSys.playPowerup(); this.renderShop(); }
      });
      ng.appendChild(item);
    });
  }

  /* ================= Missions ================= */

  private bindMissions(): void { $('btn-missions-back').addEventListener('click', () => this.showScreen('screen-home')); }

  private renderMissions(): void {
    const state = Storage.loadMissionState();
    $('mission-streak').textContent = String(state.streak || 0);
    const list = $('mission-list'); list.innerHTML = '';
    state.missions.forEach(m => {
      const cur = state.progress[m.id] || 0;
      const pct = Math.min(100, Math.round((cur / m.target) * 100));
      const complete = cur >= m.target;
      const claimed = state.claimed.includes(m.id);
      const card = document.createElement('div');
      card.className = 'mission-card' + (complete ? ' complete' : '');
      card.innerHTML = `
        <div class="mission-label">${m.label}</div>
        <div class="mission-bar-track"><div class="mission-bar-fill" style="width:${pct}%"></div></div>
        <div class="mission-footer"><span>${Math.min(cur, m.target)} / ${m.target}</span>
          <button class="mission-claim-btn" ${(!complete || claimed) ? 'disabled' : ''}>${claimed ? 'Claimed ✓' : `Claim 🪙${m.reward}`}</button></div>`;
      if (complete && !claimed) card.querySelector('button')!.addEventListener('click', () => {
        Storage.claimMission(m.id, m.reward); AudioSys.playPowerup(); this.renderMissions();
      });
      list.appendChild(card);
    });
  }

  /* ================= Achievements ================= */

  private bindAchievements(): void { $('btn-achievements-back').addEventListener('click', () => this.showScreen('screen-home')); }

  private renderAchievements(): void {
    const unlocked = Storage.loadAchievements().unlocked || [];
    const list = $('achievement-list'); list.innerHTML = '';
    ACHIEVEMENTS.forEach(a => {
      const on = unlocked.includes(a.id);
      const card = document.createElement('div');
      card.className = 'achievement-card ' + (on ? 'unlocked' : 'locked');
      card.innerHTML = `<div class="achievement-emoji">${on ? a.emoji : '🔒'}</div><div class="achievement-name">${a.name}</div><div class="achievement-desc">${a.desc}</div>`;
      list.appendChild(card);
    });
  }

  /* ================= Scrapbook ================= */

  private bindScrapbook(): void { $('btn-scrapbook-back').addEventListener('click', () => this.showScreen('screen-home')); }

  private thumb(draw: (ctx: Ctx, w: number, h: number) => void): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = 240; c.height = 150; c.className = 'scrap-thumb';
    draw(c.getContext('2d')!, 240, 150);
    return c;
  }

  private renderScrapbook(): void {
    const found = new Set(Storage.loadProgress().discoveries);
    $('scrap-count').textContent = `${SCRAPBOOK.filter(e => found.has(e.id)).length} of ${SCRAPBOOK.length} memories collected`;
    const list = $('scrap-list'); list.innerHTML = '';
    SCRAPBOOK.forEach((e, idx) => {
      const card = document.createElement('div');
      const has = found.has(e.id);
      card.className = 'scrap-card' + (has ? '' : ' locked');
      const tilt = ((idx * 37) % 5 - 2) * 0.9;
      card.style.setProperty('--tilt', `${tilt}deg`);
      if (has) {
        const [kind, key] = e.id.split(':');
        let th: HTMLCanvasElement;
        if (kind === 'world') {
          const world = WORLDS.find(w => w.id === key)!;
          th = this.thumb((ctx, w, h) => { const o = { w, h, camX: 600, time: 1, roadTop: h * 0.55, roadH: h * 0.3, world }; drawBackdrop(ctx, o); drawRoad(ctx, o); });
        } else if (kind === 'hazard') {
          const world = WORLDS.find(w => w.hazardIds.includes(key)) ?? WORLDS[0];
          const ht = HAZARD_TYPES.find(h => h.id === key)!;
          th = this.thumb((ctx, w, h) => {
            const o = { w, h, camX: 600, time: 1, roadTop: h * 0.5, roadH: h * 0.32, world }; drawBackdrop(ctx, o); drawRoad(ctx, o);
            drawHazard(ctx, key, w * 0.55, h * 0.8, 1.05, { variant: 1, phase: 0, time: 1.3, solved: false, solveT: 0, frozen: false }, { w: ht.width, h: ht.height });
          });
        } else {
          const world = WORLDS.find(w => w.id === 'park')!;
          th = this.thumb((ctx, w, h) => {
            const o = { w, h, camX: 900, time: 1, roadTop: h * 0.55, roadH: h * 0.3, world }; drawBackdrop(ctx, o); drawRoad(ctx, o);
            drawInterest(ctx, key as any, w * 0.5, h * 0.82, 1.6, 1.4);
          });
        }
        card.appendChild(th);
        card.insertAdjacentHTML('beforeend', `<div class="scrap-title">${e.title}</div><div class="scrap-caption">${e.caption}</div>`);
      } else {
        card.insertAdjacentHTML('beforeend', `<div class="scrap-locked-art">?</div><div class="scrap-title">???</div><div class="scrap-caption">${e.kind === 'hazard' ? 'Solve this hazard to remember it.' : e.kind === 'world' ? 'Travel here to remember it.' : 'A special moment is waiting…'}</div>`);
      }
      list.appendChild(card);
    });
  }

  /* ================= Settings ================= */

  private bindSettings(): void {
    $('btn-settings-back').addEventListener('click', () => this.showScreen('screen-home'));
    const input = (id: string) => $<HTMLInputElement>(id);
    input('toggle-music').addEventListener('change', e => AudioSys.setMusicEnabled((e.target as HTMLInputElement).checked));
    input('toggle-sfx').addEventListener('change', e => AudioSys.setSfxEnabled((e.target as HTMLInputElement).checked));
    input('toggle-hints').addEventListener('change', e => { const s = Storage.loadSettings(); s.hints = (e.target as HTMLInputElement).checked; Storage.saveSettings(s); });
    input('toggle-colorblind').addEventListener('change', e => {
      const s = Storage.loadSettings(); s.colorblindMode = (e.target as HTMLInputElement).checked; Storage.saveSettings(s);
      document.body.classList.toggle('colorblind-mode', s.colorblindMode);
    });
    input('toggle-motion').addEventListener('change', e => {
      const s = Storage.loadSettings(); s.reduceMotion = (e.target as HTMLInputElement).checked; Storage.saveSettings(s);
      document.body.classList.toggle('reduce-motion', s.reduceMotion);
    });
    $('btn-replay-intro').addEventListener('click', () => this.openIntro());
  }

  private applySettingsToggles(): void {
    const s = Storage.loadSettings();
    $<HTMLInputElement>('toggle-music').checked = s.musicOn;
    $<HTMLInputElement>('toggle-sfx').checked = s.sfxOn;
    $<HTMLInputElement>('toggle-hints').checked = s.hints;
    $<HTMLInputElement>('toggle-colorblind').checked = s.colorblindMode;
    $<HTMLInputElement>('toggle-motion').checked = s.reduceMotion;
    document.body.classList.toggle('colorblind-mode', s.colorblindMode);
    document.body.classList.toggle('reduce-motion', s.reduceMotion);
  }

  private bindHowTo(): void { $('btn-howto-back').addEventListener('click', () => this.showScreen('screen-home')); }

  /* ================= Pause ================= */

  private bindPause(): void {
    $('btn-pause').addEventListener('click', () => { Game.paused = true; $('overlay-pause').classList.remove('hidden'); });
    $('btn-resume').addEventListener('click', () => { Game.paused = false; $('overlay-pause').classList.add('hidden'); });
    $('btn-restart-pause').addEventListener('click', () => { $('overlay-pause').classList.add('hidden'); this.startGame(); });
    $('btn-quit-pause').addEventListener('click', () => {
      $('overlay-pause').classList.add('hidden');
      Game.stop();
      this.showScreen('screen-home');
    });
  }

  /* ================= Game over ================= */

  private bindGameOver(): void {
    $('btn-retry').addEventListener('click', () => { $('overlay-gameover').classList.add('hidden'); this.startGame(); });
    $('btn-menu').addEventListener('click', () => {
      $('overlay-gameover').classList.add('hidden');
      this.goStage.stop();
      this.showScreen('screen-home');
    });
  }

  private drawRescueTableau(ctx: Ctx, w: number, h: number, t: number): void {
    ctx.clearRect(0, 0, w, h);
    const info = this.goInfo;
    const id = info?.guardianId ?? 'nanny';
    const look = babyLook(this.customization);
    drawGuardian(ctx, id, w * 0.45, h * 0.97, 0.95, t * 1.5, { mood: info?.timeUp ? 'happy' : 'carry' });
    drawBaby(ctx, w * 0.45 + 24, h * 0.97 - 50, 0.6, look, {
      pose: info?.timeUp ? 'clap' : 'wave', expression: info?.timeUp ? 'laugh' : 'happy', phase: 0, time: t, lookBack: 0,
    }, { shadow: false });
    drawOrbitStars(ctx, w * 0.45 + 24, h * 0.3, t);
    drawHalo(ctx, w * 0.45 + 24, h * 0.22, 1 + t);
  }

  showGameOver(info: GameOverInfo): void {
    this.goInfo = info;
    $('gameover-title').textContent = info.timeUp ? "Time's up!" : info.mode.id === 'endless' || info.mode.id === 'hardcore' ? 'Nanny to the rescue!' : 'Cuddle time!';
    $('gameover-sub').textContent = info.rescueLine;
    $('go-stars').innerHTML = [0, 1, 2].map(i => `<span class="${i < info.stars ? 'on' : ''}" style="animation-delay:${0.25 + i * 0.25}s">★</span>`).join('');
    $('go-mode').textContent = info.mode.name;
    $('go-score').textContent = String(info.score);
    $('go-best').textContent = info.newBest ? '🎉 New best!' : `Best ${info.bestScore}`;
    $('go-best').classList.toggle('new', info.newBest);
    $('result-distance').textContent = String(info.distance);
    $('result-coins').textContent = String(info.coins);
    $('result-saves').textContent = String(info.saves);

    const li = levelInfo(Storage.loadProgress().xp);
    $('go-level-name').textContent = info.levelUp ? `Level up! Lv ${li.level} · ${li.title}` : `Lv ${li.level} · ${li.title}`;
    $('go-xp').textContent = `+${info.xpGained} XP`;
    ($('go-level-fill') as HTMLElement).style.width = `${Math.round((li.into / li.need) * 100)}%`;

    const ach = $('new-achievements'); ach.innerHTML = '';
    info.newAchievements.forEach(id => {
      const a = ACHIEVEMENTS.find(x => x.id === id);
      if (!a) return;
      const chip = document.createElement('div');
      chip.className = 'new-achievement-chip';
      chip.textContent = `${a.emoji} ${a.name}`;
      ach.appendChild(chip);
    });

    $('overlay-gameover').classList.remove('hidden');
    this.goStage.start();
    if (info.levelUp) this.toast('⬆️', `Level ${info.levelUp.to}!`, info.levelUp.title);
    info.newAchievements.forEach(id => {
      const a = ACHIEVEMENTS.find(x => x.id === id);
      if (a) this.toast(a.emoji, 'Achievement unlocked', a.name);
    });
  }

  /* ================= Toasts ================= */

  toast(emoji: string, label: string, name: string): void {
    this.toasts.push({ emoji, label, name });
    if (!this.toastBusy) this.nextToast();
  }

  private nextToast(): void {
    const item = this.toasts.shift();
    if (!item) { this.toastBusy = false; return; }
    this.toastBusy = true;
    const el = $('achievement-toast');
    $('achievement-toast-emoji').textContent = item.emoji;
    $('achievement-toast-label').textContent = item.label;
    $('achievement-toast-name').textContent = item.name;
    el.classList.remove('hidden');
    requestAnimationFrame(() => el.classList.add('show'));
    AudioSys.playAchievement();
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => { el.classList.add('hidden'); this.nextToast(); }, 380);
    }, 2300);
  }

  /* ================= In-game HUD pieces ================= */

  updatePowerupHud(ps: PowerupSystem, freeLives: number): void {
    const parts: string[] = [];
    Object.keys(ps.active).forEach(id => {
      const def = getPowerup(id);
      if (def) parts.push(`<div class="powerup-hud-item"><span class="powerup-hud-icon">${def.emoji}</span> ${Math.ceil(ps.active[id])}s</div>`);
    });
    ['shield', 'guardian_angel', 'instant_bridge'].forEach(id => {
      if (ps.hasCharge(id)) { const def = getPowerup(id); if (def) parts.push(`<div class="powerup-hud-item"><span class="powerup-hud-icon">${def.emoji}</span> Ready</div>`); }
    });
    if (freeLives > 0) parts.push(`<div class="powerup-hud-item"><span class="powerup-hud-icon">❤️</span> ×${freeLives}</div>`);
    const sig = parts.join('');
    if (sig === this.puSig) return;
    this.puSig = sig;
    $('powerup-hud').innerHTML = sig;
  }

  updateTimer(sec: number | null): void {
    const el = $('hud-timer');
    if (sec === null) { if (!el.classList.contains('hidden')) el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    const s = Math.ceil(sec);
    const text = `⏱ ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    if (text !== this.timerText) { this.timerText = text; el.textContent = text; }
    el.classList.toggle('urgent', s <= 10);
  }

  showEventBanner(ev: ChallengeEventDef | null): void {
    const el = $('event-banner');
    if (!ev) { el.classList.add('hidden'); el.classList.remove('run'); return; }
    $('event-emoji').textContent = ev.emoji;
    $('event-name').textContent = ev.name;
    $('event-msg').textContent = ev.message;
    const fill = $('event-bar-fill');
    fill.style.animation = 'none';
    void fill.offsetWidth;
    fill.style.animation = `eventBar ${ev.duration}s linear forwards`;
    el.classList.remove('hidden');
  }

  showChapter(world: WorldDef, index: number): void {
    const el = $('chapter-card');
    $('chapter-kicker').textContent = `Chapter ${index}`;
    $('chapter-name').textContent = world.name;
    $('chapter-flavor').textContent = world.flavor;
    el.classList.remove('hidden', 'show');
    void el.offsetWidth;
    el.classList.add('show');
    clearTimeout(this.chapterTimer);
    this.chapterTimer = window.setTimeout(() => { el.classList.remove('show'); el.classList.add('hidden'); }, 3000);
  }

  showCombo(text: string): void {
    const el = $('combo-toast');
    el.textContent = text;
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 700);
  }

  /** kept for callers that only know a mode id */
  modeName(id: string): string { return getMode(id).name; }
}

export const UI = new UIController();
