/* ============================================================
   APUTU: Baby's Day Out — src/core/game.ts
   The engine. A side-on "protect the toddler" runner:

   - Aputu crawls on his own. The player never steers him — but
     his *curiosity* does: he drifts toward the next hazard (so
     it genuinely matters), then toward flowers/butterflies/cats,
     then toward shiny coins.
   - Hazards drift toward him (vehicles, animals) or sit in his
     way (gutters, puddles). Tap / drag / hold to fix them in time.
   - Guardians chase him, shout encouragement and make the rescue
     if it goes wrong.
   - Challenge events, weather, day/night and game modes layer
     variety on top of the same simple loop.

   Game <-> UI import each other (HUD callbacks one way, run
   control the other). That is safe under ESM because neither is
   touched at module-evaluation time.
   ============================================================ */

import type {
  ChallengeEventDef, Customization, GameMode, InterestKind, Nanny, WeatherMode, WorldDef,
} from '../types';
import { Baby, type BabyAction } from './baby';
import { Hazard, hazardsForWorld, HAZARD_TYPES } from './hazards';
import { PowerupSystem, type Pickup } from './powerup-system';
import { ParticleSystem, FloatLabels } from './particles';
import { EventManager } from './events';
import { AudioSys } from './audio';
import { Storage } from './storage';
import { WORLDS, currentWorldForDistance } from '../data/worlds';
import { getNanny } from '../data/nannies';
import { getMode } from '../data/modes';
import { getScrapbookEntry } from '../data/scrapbook';
import { clamp, depthScale, pick, randRange, smoothstep } from '../utils';
import { babyLook, drawBaby } from '../render/baby';
import { drawGuardian, type GuardianMood } from '../render/guardian';
import { drawHazard, type HazardDrawState } from '../render/hazards';
import { drawBackdrop, drawForeground, drawRoad, type SceneOpts } from '../render/scenery';
import { Weather } from '../render/weather';
import {
  drawCoin, drawDangerRing, drawHalo, drawHintTag, drawInterest, drawOrbitStars,
  drawPowerupPickup, drawSpeechBubble,
} from '../render/overlay';
import { UI } from '../ui/ui';

const LANE_TOL = 0.21;
const BLOCK_DIST = 90;
const DANGER_DIST = 340;
const NANNY_GAP = 105;
const RESCUE_DUR = 2.7;

const WORLD_WEATHER: Record<string, WeatherMode> = {
  'bridge': 'wind', 'farm-road': 'wind', 'river-crossing': 'wind',
  'village-road': 'dust', 'industrial-zone': 'dust', 'night-market': 'fireflies',
};

const GESTURE: Record<string, string> = { tap: '👆', drag: '👉', hold: '✋' };

interface Interest {
  kind: InterestKind;
  worldX: number;
  laneY: number;
  baseLane: number;
  triggered: boolean;
  done: boolean;
  t: number;
  phase: number;
}

interface RoadCoin { worldX: number; laneY: number; phase: number; taken: boolean }

interface Drawable { y: number; draw: () => void }

const INTEREST_INFO: Record<InterestKind, { action: BabyAction; dur: number; reward: number; line: string; sound: () => void }> = {
  flower:    { action: 'sniff', dur: 1.7, reward: 4, line: "Don't eat that, Aputu!", sound: () => AudioSys.playCoo() },
  butterfly: { action: 'chase', dur: 2.8, reward: 8, line: 'Wait for me, Aputu!', sound: () => AudioSys.playGiggle() },
  balloon:   { action: 'reach', dur: 1.5, reward: 6, line: 'Ooh, a balloon!', sound: () => AudioSys.playGasp() },
  cat:       { action: 'pet', dur: 2.0, reward: 8, line: 'Aww, gentle pats!', sound: () => AudioSys.playMeow() },
};

class GameEngine {
  canvas!: HTMLCanvasElement;
  ctx!: CanvasRenderingContext2D;
  running = false;
  paused = false;
  private lastTime = 0;

  mode: GameMode = getMode('endless');
  baby!: Baby;
  nanny: Nanny | null = null;
  hazards: Hazard[] = [];
  interests: Interest[] = [];
  roadCoins: RoadCoin[] = [];
  particleSys!: ParticleSystem;
  powerups!: PowerupSystem;
  weather = new Weather();
  events = new EventManager();
  currentWorld: WorldDef | null = null;
  customization!: Customization;

  // stats
  distanceMeters = 0;
  coins = 0;
  saves = 0;
  comboCount = 0;
  maxCombo = 0;
  comboTimer = 0;
  freeLives = 0;
  autoSolveLeft = 0;
  perfectRun = true;
  usedPowerup = false;
  hazardTypeCounts: Record<string, number> = {};
  /** Curiosity moments completed this run (flowers sniffed, cats petted...). */
  moments = 0;
  timeLeft: number | null = null;

  // timing
  time = 0;       // gameplay clock
  anim = 0;       // always-running clock for animation
  nextSpawnAt = 2;
  private interestTimer = 8;
  /** No hazards spawn before this world-x: it protects a curiosity moment. */
  private calmUntilX = -Infinity;
  private coinTimer = 4;
  private baseTotalDistance = 0;
  private hintsOn = true;
  private perksOn = true;

  // camera / layout
  camX = 0;
  viewW = 0;
  viewH = 0;
  roadTop = 0;
  roadHeight = 0;
  pxPerMeter = 14;

  // interaction
  activeDrag: Hazard | null = null;
  activeHold: { hazard: Hazard } | null = null;

  // characters & effects
  private nannyX = 0;
  private nannyPhase = 0;
  private nannyVel = 0;
  private speech: { text: string; t: number; dur: number } | null = null;
  private speechCooldown = 0;
  private activeInterest: Interest | null = null;
  private warned = new Set<string>();
  private eventDark = false;
  private lightCanvas: HTMLCanvasElement | null = null;
  private hudCache = new Map<string, string>();

  // rescue sequence
  phase: 'playing' | 'rescue' | 'over' = 'playing';
  private rescueT = 0;
  private rescueHazard: Hazard | null = null;
  private rescueTimeUp = false;

  /* ---------------- Setup ---------------- */

  init(): void {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.particleSys = new ParticleSystem();
    FloatLabels.init();
    this.weather.onLightning = () => AudioSys.playThunder();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.bindInput();
  }

  resize(): void {
    const wrap = document.getElementById('game-canvas-wrap')!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = wrap.clientWidth, h = wrap.clientHeight;
    if (!w || !h) return;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.viewW = w;
    this.viewH = h;
    this.roadTop = h * 0.34;
    this.roadHeight = h * 0.4;
    if (this.lightCanvas) { this.lightCanvas.width = w; this.lightCanvas.height = h; }
  }

  reset(customization: Customization, modeId: string): void {
    this.customization = customization;
    this.mode = getMode(modeId);
    this.baby = new Baby(customization);
    this.baby.onActionEnd = (prev) => this.onBabyActionEnd(prev);
    this.nanny = getNanny(customization.nanny || 'nanny');
    this.hazards = [];
    this.interests = [];
    this.roadCoins = [];
    this.particleSys.clear();
    this.powerups = new PowerupSystem();
    this.perksOn = this.mode.allowFreeSaves;
    if (this.perksOn) this.powerups.grantStartBonus(this.nanny);

    this.distanceMeters = 0;
    this.coins = 0;
    this.saves = 0;
    this.comboCount = 0;
    this.maxCombo = 0;
    this.comboTimer = 0;
    this.freeLives = this.perkValue('extra_life') ?? 0;
    this.autoSolveLeft = this.perkValue('auto_solve') ?? 0;
    this.perfectRun = true;
    this.usedPowerup = false;
    this.hazardTypeCounts = {};
    this.moments = 0;
    this.timeLeft = this.mode.timeLimit ?? null;

    this.time = 0;
    this.anim = 0;
    this.nextSpawnAt = 2.6;
    this.interestTimer = randRange(6, 9);
    this.calmUntilX = -Infinity;
    this.coinTimer = 3;
    this.camX = 0;
    this.activeDrag = null;
    this.activeHold = null;
    this.activeInterest = null;
    this.warned.clear();
    this.speech = null;
    this.speechCooldown = 0;
    this.eventDark = false;
    this.phase = 'playing';
    this.rescueT = 0;
    this.rescueHazard = null;
    this.hudCache.clear();

    this.baby.laneY = 0.5;
    this.baby.progress = 0;
    this.nannyX = -NANNY_GAP;

    const progress = Storage.loadProgress();
    this.baseTotalDistance = progress.totalDistance;
    this.hintsOn = Storage.loadSettings().hints;
    this.currentWorld = currentWorldForDistance(progress.totalDistance);
    this.events.reset(this.mode.eventsEnabled ? 30 : 1e9);
    this.weather.setMode('clear');
    this.applyWeather();
    this.discover(`world:${this.currentWorld.id}`);

    AudioSys.startAmbientMusic();
    UI.showEventBanner(null);
    UI.updateTimer(this.timeLeft);
    UI.updateWorldLabel(this.currentWorld);
    UI.showChapter(this.currentWorld, WORLDS.indexOf(this.currentWorld) + 1);
    this.say(pick(['Aputu! Wait for me!', 'Slow down, little explorer!', 'Where is he going now?!']), 2.8, true);
  }

  start(customization: Customization, modeId: string): void {
    this.reset(customization, modeId);
    this.running = true;
    this.paused = false;
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  stop(): void {
    this.running = false;
    AudioSys.stopMusic();
    AudioSys.setRain(false);
  }

  private loop(t: number): void {
    if (!this.running) return;
    const dt = Math.min((t - this.lastTime) / 1000, 0.05);
    this.lastTime = t;
    if (!this.paused) {
      this.update(dt);
      this.render();
    }
    requestAnimationFrame((t2) => this.loop(t2));
  }

  /* ---------------- Perks ---------------- */

  private perkValue(type: string): number | null {
    if (!this.perksOn || !this.nanny) return null;
    return this.nanny.perk.type === type ? (this.nanny.perk.value ?? 1) : null;
  }

  /* ---------------- Update ---------------- */

  private update(dt: number): void {
    this.anim += dt;
    this.weather.update(dt, this.viewW, this.viewH);
    this.particleSys.update(dt);
    if (this.speech) { this.speech.t += dt; if (this.speech.t > this.speech.dur) this.speech = null; }
    this.speechCooldown = Math.max(0, this.speechCooldown - dt);
    for (const h of this.hazards) if (h.solved) h.solveT += dt;

    if (this.phase === 'rescue') { this.updateRescue(dt); return; }
    if (this.phase === 'over') return;

    this.time += dt;

    /* --- time attack clock --- */
    if (this.timeLeft !== null) {
      this.timeLeft -= dt;
      UI.updateTimer(Math.max(0, this.timeLeft));
      if (this.timeLeft <= 0) { this.finishRun(true); return; }
    }

    /* --- speed model --- */
    const ramp = this.mode.rampSpeed ? 1 + Math.min(this.time / 90, 1.4) : 1;
    let gentle = 1;
    const slowStart = this.perkValue('slow_start');
    if (slowStart !== null && this.time < 20) gentle = slowStart;
    const slow = this.powerups.speedMultiplier;
    const worldSpeed = ramp * this.mode.speedMul * gentle;
    this.baby.baseSpeed = 62 * worldSpeed * slow;
    const hazardScale = worldSpeed * slow;

    /* --- challenge events --- */
    const tick = this.events.update(dt, this.mode.eventsEnabled && this.phase === 'playing');
    if (tick.started) this.onEventStart(tick.started);
    if (tick.ended) this.onEventEnd();

    /* --- power-ups --- */
    this.powerups.update(dt, this.baby.progress, this.viewW, this.perksOn);
    const picked = this.powerups.tryCollect(this.baby.progress, this.baby.laneY);
    if (picked) this.onPowerup(picked);

    /* --- hazards move / auto-solve --- */
    const trafficPerk = this.perkValue('traffic_control') !== null ? 0.9 : 1;
    for (const h of this.hazards) {
      if (h.solved || h.speed === 0) continue;
      if (h.type.vehicle && this.powerups.vehiclesFrozen) continue;
      h.worldX -= h.speed * hazardScale * (h.type.vehicle ? trafficPerk : 1) * dt;
    }
    this.autoSolve();

    /* --- steering: what is Aputu curious about? --- */
    this.baby.steer = this.chooseSteer();

    const blocker = this.getBlockingHazard();
    this.baby.update(dt, !!blocker);
    this.distanceMeters = Math.floor(this.baby.progress / this.pxPerMeter);

    /* --- nanny follows --- */
    this.updateNanny(dt);

    /* --- world transition (computed from cached lifetime distance) --- */
    const world = currentWorldForDistance(this.baseTotalDistance + this.distanceMeters);
    if (world.id !== this.currentWorld?.id) this.onWorldChange(world);

    this.camX = Math.max(this.camX, this.baby.progress - this.viewW * 0.4);

    /* --- spawning --- */
    if (!this.baby.busy) {
      this.nextSpawnAt -= dt;
      if (this.nextSpawnAt <= 0) this.spawnHazard();
    }
    this.updateInterests(dt);
    this.updateCoins(dt);
    this.maybeIdleMoment(dt);

    /* --- hold interaction --- */
    if (this.activeHold) {
      const h = this.activeHold.hazard;
      h.solveProgress += dt / (0.9 / this.windowMul(h));
      if (h.solveProgress >= 1) { this.solveHazard(h); this.activeHold = null; }
    }

    /* --- misses / passing --- */
    for (const h of this.hazards) {
      if (h.solved || h.passed) continue;
      const frozen = h.type.vehicle && this.powerups.vehiclesFrozen;
      const d = h.worldX - this.baby.progress;
      if (!this.warned.has(h.id) && d < 85 && d > 0 && !frozen && Math.abs(h.laneY - this.baby.laneY) < LANE_TOL) {
        this.warned.add(h.id);
        this.say(pick(['Oh no, oh no!', 'Aputu, look out!', 'Quick, quick!']), 1.4);
      }
      if (d <= -6 && !frozen) {
        if (Math.abs(h.laneY - this.baby.laneY) < LANE_TOL) { this.handleMiss(h); if (this.phase !== 'playing') return; }
        else h.passed = true;
      }
    }

    /* --- combo decay --- */
    if (this.comboTimer > 0) {
      const grace = this.perkValue('combo_grace') ?? 1;
      this.comboTimer -= dt / grace;
      if (this.comboTimer <= 0) this.comboCount = 0;
    }

    this.hazards = this.hazards.filter(h => h.worldX > this.baby.progress - 260 && !(h.solved && h.solveT > 3.5));
    this.updateHud();
  }

  /** How far ahead warning rings / hints appear (Village Chief perk widens it). */
  private dangerDist(): number {
    return DANGER_DIST * (this.perkValue('community_watch') !== null ? 1.4 : 1);
  }

  private windowMul(h?: Hazard): number {
    let m = this.powerups.fixWindowMultiplier;
    m *= this.perkValue('wider_window') ?? 1;
    if (h?.type.vehicle && this.perkValue('traffic_control') !== null) m *= 1.1;
    return m;
  }

  /** Is it safe for Aputu to stand still for `dur` seconds? Static hazards only matter once
   *  he moves on; approaching ones keep coming, so allow for how far they travel meanwhile. */
  private isSafe(dur = 2): boolean {
    for (const h of this.hazards) {
      if (h.solved || h.passed) continue;
      const d = h.worldX - this.baby.progress;
      if (d <= -25) continue;
      const frozen = h.type.vehicle && this.powerups.vehiclesFrozen;
      const travel = frozen ? 0 : h.speed * (dur + 1.2);
      if (d - travel < 130) return false;
    }
    return true;
  }

  private chooseSteer(): number | null {
    const bp = this.baby.progress;
    let hazard: Hazard | null = null;
    for (const h of this.hazards) {
      if (h.solved || h.passed) continue;
      const d = h.worldX - bp;
      if (d > 0 && d < 430 && (!hazard || h.worldX < hazard.worldX)) hazard = h;
    }
    let fun: Interest | null = null;
    for (const i of this.interests) {
      const d = i.worldX - bp;
      if (!i.triggered && !i.done && d > 0 && d < 400 && (!fun || i.worldX < fun.worldX)) fun = i;
    }
    // whatever is nearer wins: his curiosity is what makes hazards matter, but he also loves a butterfly
    if (hazard && (!fun || hazard.worldX < fun.worldX)) return hazard.laneY;
    if (fun) return fun.laneY;
    let coin: RoadCoin | null = null;
    for (const c of this.roadCoins) {
      if (c.taken) continue;
      const d = c.worldX - bp;
      if (d > 0 && d < 300 && (!coin || c.worldX < coin.worldX)) coin = c;
    }
    return coin ? coin.laneY : null;
  }

  private getBlockingHazard(): Hazard | null {
    let best: Hazard | null = null;
    const dist = BLOCK_DIST * (this.perkValue('wider_window') ?? 1);
    for (const h of this.hazards) {
      if (h.solved || h.passed) continue;
      if (h.type.vehicle && this.powerups.vehiclesFrozen) continue;
      if (Math.abs(h.laneY - this.baby.laneY) >= LANE_TOL) continue;
      const d = h.worldX - this.baby.progress;
      if (d > -20 && d < dist && (!best || h.worldX < best.worldX)) best = h;
    }
    return best;
  }

  private autoSolve(): void {
    const bp = this.baby.progress;
    const near = (h: Hazard, range: number) => !h.solved && !h.passed && h.worldX - bp < range && h.worldX - bp > -10;
    if (this.powerups.autoSolveActive) {
      for (const h of this.hazards) if (near(h, 340)) this.solveHazard(h, { auto: true });
    }
    if (this.powerups.hasCharge('instant_bridge')) {
      const h = this.hazards.find(x => ['gutter', 'construction'].includes(x.type.id) && near(x, 320));
      if (h && this.powerups.consumeCharge('instant_bridge')) { this.solveHazard(h, { auto: true }); this.say('Instant bridge!', 1.6, true); }
    }
    if (this.autoSolveLeft > 0) {
      const h = this.hazards.find(x => near(x, 150));
      if (h) {
        this.autoSolveLeft--;
        this.solveHazard(h, { auto: true });
        this.say(this.nanny?.id === 'robot-nanny' ? 'HAZARD NEUTRALISED.' : 'I got this one!', 2, true);
      }
    }
  }

  /* ---------------- Events & powerups ---------------- */

  private onEventStart(ev: ChallengeEventDef): void {
    this.eventDark = !!ev.dark;
    this.applyWeather();
    UI.showEventBanner(ev);
    AudioSys.playEvent();
    this.say(ev.message, 2.6, true);
    if (ev.coinRain) this.coinTimer = 0;
    if (ev.id === 'traffic_jam' || ev.id === 'broken_light') {
      // an immediate wave so the start of the event is felt
      for (let i = 0; i < 2; i++) this.spawnHazard(i * 150, ev);
    }
  }

  private onEventEnd(): void {
    this.eventDark = false;
    this.applyWeather();
    UI.showEventBanner(null);
    this.say('Phew, that was busy!', 2, true);
    this.coins += 10;
    FloatLabels.show(this.viewW / 2, this.viewH * 0.3, 'Event bonus +10🪙', '#C97324', { size: 20, duration: 1400 });
  }

  private applyWeather(): void {
    const ev = this.events.current;
    const mode = ev?.weather ?? (this.currentWorld ? WORLD_WEATHER[this.currentWorld.id] : undefined) ?? 'clear';
    this.weather.setMode(mode);
    AudioSys.setRain(mode === 'rain' || mode === 'storm');
  }

  private onWorldChange(world: WorldDef): void {
    this.currentWorld = world;
    this.applyWeather();
    UI.updateWorldLabel(world);
    UI.showChapter(world, WORLDS.indexOf(world) + 1);
    this.discover(`world:${world.id}`);
    this.say(`Look, ${world.name}!`, 2.2, true);
  }

  private onPowerup(p: Pickup): void {
    this.usedPowerup = true;
    AudioSys.playPowerup();
    const s = this.worldToScreen(p.worldX, p.laneY);
    this.particleSys.burst(s.x, s.y - 26, p.type.color, 16, { speed: [80, 220] });
    FloatLabels.show(s.x, s.y - 60, p.type.name + '!', p.type.color, { size: 17 });
    if (p.type.id === 'extra_life') this.freeLives++;
  }

  /* ---------------- Spawning ---------------- */

  private spawnHazard(extraAhead = 0, forceEvent?: ChallengeEventDef): void {
    const ev = forceEvent ?? this.events.current;
    let pool = hazardsForWorld(this.currentWorld, this.distanceMeters);
    if (ev?.forcedHazards && Math.random() < 0.75) {
      pool = HAZARD_TYPES.filter(h => ev.forcedHazards!.includes(h.id));
    }
    if (!pool.length) pool = HAZARD_TYPES.slice(0, 3);
    const type = pick(pool);
    const laneY = randRange(0.22, 0.86);
    const h = new Hazard(type, 0, laneY);
    h.worldX = this.baby.progress + this.viewW * randRange(0.95, 1.2) + h.speed * 1.6 + extraAhead;
    if (this.calmUntilX > this.baby.progress) h.worldX = Math.max(h.worldX, this.calmUntilX + 120 + h.speed * 3.6);
    this.hazards.push(h);

    const base = this.mode.rampSpeed ? Math.max(0.95, 1.95 - this.time / 110) : 1.7;
    const evMul = ev ? ev.spawnMul : 1;
    const gap = base * this.mode.spawnMul * evMul * this.powerups.hazardSpawnRateMultiplier;
    this.nextSpawnAt = randRange(gap, gap + 0.9);
  }

  private updateInterests(dt: number): void {
    const bp = this.baby.progress;
    this.interestTimer -= dt;
    if (this.interestTimer <= 0 && !this.baby.busy) {
      if (this.interests.filter(i => !i.done).length < 2) {
        const kind = pick<InterestKind>(['flower', 'flower', 'butterfly', 'balloon', 'cat']);
        const lane = randRange(0.3, 0.82);
        let lastHaz = bp;
        for (const h of this.hazards) if (!h.solved && !h.passed) lastHaz = Math.max(lastHaz, h.worldX + h.speed * 3);
        const x = Math.max(bp + this.viewW * 1.1, lastHaz + 170);
        this.interests.push({ kind, worldX: x, laneY: lane, baseLane: lane, triggered: false, done: false, t: 0, phase: Math.random() * 6 });
        this.calmUntilX = x + 60;   // a little breather around the moment
      }
      this.interestTimer = randRange(9, 14);
    }
    for (const i of this.interests) {
      if (i.kind === 'butterfly') {
        if (i.done) { i.worldX += 110 * dt; i.t += dt; i.laneY -= dt * 0.1; }
        else i.laneY = clamp(i.baseLane + Math.sin(this.anim * 1.6 + i.phase) * 0.14, 0.2, 0.88);
      } else if (i.done) i.t += dt;
      if (!i.triggered && !i.done && !this.baby.busy) {
        const dx = i.worldX - bp;
        if (Math.abs(dx) < 36 && Math.abs(i.laneY - this.baby.laneY) < 0.22 && this.isSafe(INTEREST_INFO[i.kind].dur)) this.triggerInterest(i);
      }
    }
    this.interests = this.interests.filter(i => i.worldX > bp - 220 && !(i.done && i.t > 3.2));
  }

  private triggerInterest(i: Interest): void {
    const info = INTEREST_INFO[i.kind];
    i.triggered = true;
    this.activeInterest = i;
    this.baby.startAction(info.action, info.dur);
    info.sound();
    this.say(info.line, 2.2, true);
    if (this.discover(`moment:${i.kind}`)) { /* toast handled in discover */ }
  }

  private finishInterest(): void {
    const i = this.activeInterest;
    if (!i) return;
    const info = INTEREST_INFO[i.kind];
    i.done = true;
    i.t = 0;
    this.moments++;
    this.activeInterest = null;
    const gain = Math.round(info.reward * this.mode.coinMul);
    this.coins += gain;
    const s = this.worldToScreen(this.baby.progress, this.baby.laneY);
    this.particleSys.burst(s.x, s.y - 40, '#F2637B', 10, { speed: [30, 90], gravity: -60, life: [0.7, 1.1] });
    FloatLabels.show(s.x, s.y - 90, `+${gain}🪙`, '#C97324', { size: 16 });
    AudioSys.playGiggle();
  }

  private onBabyActionEnd(prev: BabyAction): void {
    if (prev === 'sniff' && Math.random() < 0.45 && this.isSafe(0.8)) {
      this.baby.startAction('sneeze', 0.8);
      AudioSys.playSneeze();
      this.say('Bless you!', 1.6, true);
    }
    if (this.activeInterest && ['sniff', 'pet', 'reach', 'chase'].includes(prev) && this.baby.action === 'none') this.finishInterest();
    else if (this.activeInterest && prev === 'sniff') this.finishInterest();
  }

  private maybeIdleMoment(dt: number): void {
    const safe = this.isSafe(1.5) && !this.activeInterest;
    if (!this.baby.idleReady(dt, safe)) return;
    const choice = pick<BabyAction>(['sneeze', 'yawn', 'wave', 'clap']);
    switch (choice) {
      case 'sneeze': this.baby.startAction('sneeze', 0.8); AudioSys.playSneeze(); this.say('Bless you!', 1.6); break;
      case 'yawn': this.baby.startAction('yawn', 1.3); AudioSys.playCoo(); this.say('Sleepy already?', 1.8); break;
      case 'wave': this.baby.startAction('wave', 1.5); AudioSys.playGiggle(); this.say('Who is he waving at?', 1.8); break;
      default: this.baby.startAction('clap', 1.4); AudioSys.playGiggle();
    }
  }

  private updateCoins(dt: number): void {
    const bp = this.baby.progress;
    this.coinTimer -= dt;
    if (this.coinTimer <= 0 && !this.baby.busy) {
      const lane = randRange(0.25, 0.8);
      const rain = this.events.current?.coinRain;
      const n = rain ? 8 : 5;
      for (let k = 0; k < n; k++) this.roadCoins.push({ worldX: bp + this.viewW * 1.05 + k * 40, laneY: clamp(lane + (rain ? Math.sin(k) * 0.12 : 0), 0.2, 0.88), phase: k * 0.6, taken: false });
      this.coinTimer = rain ? randRange(1.6, 2.4) : randRange(5, 9);
    }
    const magnet = this.powerups.isActive('magnet_coins');
    for (const c of this.roadCoins) {
      if (c.taken) continue;
      const dx = c.worldX - bp;
      if (magnet && dx > -40 && dx < 240) {
        c.worldX += (bp - c.worldX) * Math.min(1, dt * 5);
        c.laneY += (this.baby.laneY - c.laneY) * Math.min(1, dt * 5);
      }
      if (Math.abs(dx) < 26 && Math.abs(c.laneY - this.baby.laneY) < 0.24) {
        c.taken = true;
        const gain = Math.max(1, Math.round(this.mode.coinMul * this.powerups.coinMultiplier));
        this.coins += gain;
        AudioSys.playCoin();
        const s = this.worldToScreen(c.worldX, c.laneY);
        this.particleSys.burst(s.x, s.y - 14, '#F5B942', 5, { speed: [30, 80], life: [0.3, 0.5], size: [2, 4] });
      }
    }
    this.roadCoins = this.roadCoins.filter(c => !c.taken && c.worldX > bp - 160);
  }

  /* ---------------- Nanny ---------------- */

  private updateNanny(dt: number): void {
    const target = this.baby.progress - NANNY_GAP;
    const prev = this.nannyX;
    this.nannyX += (target - this.nannyX) * Math.min(1, dt * 3.2);
    this.nannyVel = (this.nannyX - prev) / Math.max(dt, 0.0001);
    this.nannyPhase += dt * (4 + Math.min(Math.abs(this.nannyVel), 140) / 18);
  }

  say(text: string, dur = 2.2, force = false): void {
    if (!force && (this.speechCooldown > 0 || this.speech)) return;
    this.speech = { text, t: 0, dur };
    this.speechCooldown = 3.5;
  }

  /* ---------------- Solving & misses ---------------- */

  private solveHazard(hazard: Hazard, opts: { free?: boolean; auto?: boolean } = {}): void {
    if (hazard.solved) return;
    hazard.solved = true;
    hazard.solveT = 0;
    hazard.speed = 0;
    this.activeDrag = this.activeDrag === hazard ? null : this.activeDrag;
    if (this.activeHold?.hazard === hazard) this.activeHold = null;
    const sp = this.worldToScreen(hazard.worldX, hazard.laneY);

    if (!opts.free) {
      this.saves++;
      this.comboCount++;
      this.maxCombo = Math.max(this.maxCombo, this.comboCount);
      this.comboTimer = 2.2;

      let gain = (5 + Math.min(this.comboCount, 10) * 2) * this.powerups.coinMultiplier * this.mode.coinMul;
      const boost = this.perkValue('coin_boost');
      if (boost !== null) gain *= boost;
      gain = Math.round(gain);
      this.coins += gain;
      this.hazardTypeCounts[hazard.type.id] = (this.hazardTypeCounts[hazard.type.id] ?? 0) + 1;

      this.particleSys.burst(sp.x, sp.y - 20, hazard.type.color);
      FloatLabels.show(sp.x, sp.y - 70, hazard.type.fixLabel, '#2C7A50');
      FloatLabels.show(sp.x, sp.y - 92, `+${gain}🪙`, '#C97324');
      AudioSys.playHazardSolve(hazard.type.id);
      if (this.comboCount >= 3) { AudioSys.playCombo(this.comboCount); UI.showCombo(`${this.comboCount}x COMBO!`); }
      if (this.comboCount === 5) this.say("You're a natural!", 2, true);
      this.discover(`hazard:${hazard.type.id}`);
    } else {
      this.particleSys.confetti(sp.x, sp.y - 30, ['#F5B942', '#3F9C6B', '#F2637B']);
      FloatLabels.show(sp.x, sp.y - 70, 'Saved!', '#4A6FA5', { size: 17 });
      AudioSys.playRescue();
      this.say('Phew! That was close!', 2, true);
    }
  }

  private handleMiss(hazard: Hazard): void {
    const immune = ['wire', 'construction'].includes(hazard.type.id);
    if (this.perkValue('hazard_immunity') !== null && immune && !this.powerups.instantFlags.firefighter_used) {
      this.powerups.instantFlags.firefighter_used = 1;
      this.solveHazard(hazard, { free: true });
      return;
    }
    if (this.powerups.consumeCharge('shield') || this.powerups.consumeCharge('guardian_angel')) {
      this.perfectRun = false;
      this.solveHazard(hazard, { free: true });
      return;
    }
    if (this.freeLives > 0) {
      this.freeLives--;
      this.perfectRun = false;
      this.solveHazard(hazard, { free: true });
      return;
    }
    this.beginRescue(hazard);
  }

  /* ---------------- Rescue sequence ---------------- */

  private beginRescue(hazard: Hazard): void {
    this.phase = 'rescue';
    this.rescueT = 0;
    this.rescueHazard = hazard;
    this.rescueTimeUp = false;
    this.perfectRun = false;
    this.comboCount = 0;
    this.activeDrag = null;
    this.activeHold = null;
    // someone steps in to stop the hazard (guard / plank / mat) while Nanny runs to Aputu
    hazard.solved = true; hazard.solveT = 0; hazard.speed = 0;
    this.baby.startAction('cry', 99);
    this.baby.steer = null;
    AudioSys.setRain(false);
    AudioSys.playCry();
    this.say(pick(['Aputu! I am coming!', "I've got you!"]), 2.4, true);
    UI.showEventBanner(null);
  }

  private updateRescue(dt: number): void {
    this.rescueT += dt;
    this.baby.update(dt, false);
    const t = this.rescueT;
    const bx = this.baby.progress;
    // Nanny sprints to him, then scoops him up
    const arrive = smoothstep(0.1, 1.0, t);
    this.nannyX = (bx - NANNY_GAP) + (bx - 44 - (bx - NANNY_GAP)) * arrive;
    this.nannyPhase += dt * (arrive < 1 ? 12 : 3);
    if (t > 1.15 && t - dt <= 1.15) { AudioSys.playRescue(); }
    if (t > 1.6 && t - dt <= 1.6) { AudioSys.playGiggle(); }
    if (t >= RESCUE_DUR) this.afterRescue();
  }

  private afterRescue(): void {
    if (this.mode.failEnds) { this.finishRun(false); return; }
    // Zen: a cuddle and off we go again
    if (this.rescueHazard) { this.rescueHazard.solved = true; this.rescueHazard.solveT = 0; this.rescueHazard.speed = 0; }
    this.baby.action = 'none';
    this.baby.actionT = 0;
    this.phase = 'playing';
    this.say('Ready? Off we go again!', 2.2, true);
    this.applyWeather();
  }

  private finishRun(timeUp: boolean): void {
    if (this.phase === 'over') return;
    this.phase = 'over';
    this.running = false;
    AudioSys.stopMusic();
    AudioSys.setRain(false);
    if (timeUp) AudioSys.playTimeUp(); else AudioSys.playGameOver();

    const runStats = {
      distance: this.distanceMeters,
      coins: this.coins,
      saves: this.saves,
      maxCombo: this.maxCombo,
      perfect: this.perfectRun,
      usedPowerup: this.usedPowerup,
      hazardTypeCounts: this.hazardTypeCounts,
      mode: this.mode.id,
      missionBoost: this.perkValue('xp_boost') ?? 1,
    };
    const res = Storage.applyRunResult(runStats);
    Storage.updateMissionProgress(runStats);

    const lines = this.nanny?.rescueLines ?? ['Rescued!'];
    UI.showGameOver({
      mode: this.mode,
      guardianId: this.nanny?.id ?? 'nanny',
      distance: this.distanceMeters,
      coins: this.coins,
      saves: this.saves,
      score: res.score,
      stars: res.stars,
      bestScore: res.progress.bestScores[this.mode.id] ?? res.score,
      newBest: res.newBest,
      rescueLine: timeUp ? "Time's up — what a run!" : pick(lines),
      newAchievements: res.newAchievements,
      levelUp: res.levelUp,
      xpGained: res.xpGained,
      timeUp,
    });
  }

  /* ---------------- Scrapbook ---------------- */

  private discover(id: string): boolean {
    if (!Storage.discover(id)) return false;
    const e = getScrapbookEntry(id);
    if (e) UI.toast('📖', 'Scrapbook updated', e.title);
    return true;
  }

  /* ---------------- HUD ---------------- */

  private setText(id: string, value: string): void {
    if (this.hudCache.get(id) === value) return;
    this.hudCache.set(id, value);
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  private updateHud(): void {
    this.setText('hud-coins', String(this.coins));
    this.setText('hud-distance', String(this.distanceMeters));
    UI.updatePowerupHud(this.powerups, this.freeLives);
  }

  /* ---------------- Input ---------------- */

  private worldToScreen(worldX: number, laneY: number): { x: number; y: number } {
    return { x: worldX - this.camX, y: this.roadTop + laneY * this.roadHeight };
  }

  private bindInput(): void {
    const canvas = this.canvas;
    const getPos = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const t = 'touches' in e ? (e.touches[0] ?? (e as TouchEvent).changedTouches[0]) : e;
      return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    };

    const findHazardAt = (pos: { x: number; y: number }): Hazard | null => {
      let closest: Hazard | null = null, closestD = Infinity;
      for (const h of this.hazards) {
        if (h.solved) continue;
        const s = this.worldToScreen(h.worldX, h.laneY);
        const sc = depthScale(h.laneY);
        const m = this.windowMul(h);
        const rx = Math.max(34, h.type.width * 0.6 * sc * m);
        const ry = Math.max(40, h.type.height * 0.85 * sc * m);
        const cy = s.y - h.type.height * 0.4 * sc;
        const nx = (pos.x - s.x) / rx, ny = (pos.y - cy) / ry;
        const d = nx * nx + ny * ny;
        if (d < 1 && d < closestD) { closest = h; closestD = d; }
      }
      return closest;
    };

    const onDown = (e: MouseEvent | TouchEvent) => {
      if (this.paused || !this.running || this.phase !== 'playing') return;
      const hazard = findHazardAt(getPos(e));
      if (!hazard) return;
      e.preventDefault();
      switch (hazard.type.fixType) {
        case 'tap': this.solveHazard(hazard); break;
        case 'drag': this.activeDrag = hazard; hazard.solveProgress = 0; break;
        case 'hold': this.activeHold = { hazard }; hazard.solveProgress = 0; break;
      }
    };

    const onMove = (e: MouseEvent | TouchEvent) => {
      const h = this.activeDrag;
      if (!h || h.solved) return;
      e.preventDefault();
      const pos = getPos(e);
      const s = this.worldToScreen(h.worldX, h.laneY);
      const dist = Math.hypot(pos.x - s.x, pos.y - (s.y - h.type.height * 0.4));
      h.solveProgress = clamp(dist / 55, 0, 1);
      if (h.solveProgress >= 1) { this.solveHazard(h); this.activeDrag = null; }
    };

    const onUp = () => {
      if (this.activeDrag && !this.activeDrag.solved) this.activeDrag.solveProgress = 0;
      if (this.activeHold && !this.activeHold.hazard.solved) this.activeHold.hazard.solveProgress = 0;
      this.activeDrag = null;
      this.activeHold = null;
    };

    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseup', onUp);
    canvas.addEventListener('mouseleave', onUp);
    canvas.addEventListener('touchstart', onDown, { passive: false });
    canvas.addEventListener('touchmove', onMove, { passive: false });
    canvas.addEventListener('touchend', onUp);
    canvas.addEventListener('touchcancel', onUp);
  }

  /* ---------------- Render ---------------- */

  private sceneOpts(): SceneOpts {
    return {
      w: this.viewW, h: this.viewH, camX: this.camX, time: this.anim,
      roadTop: this.roadTop, roadH: this.roadHeight,
      world: this.currentWorld ?? WORLDS[0], dark: this.eventDark,
    };
  }

  private render(): void {
    const ctx = this.ctx;
    const o = this.sceneOpts();
    drawBackdrop(ctx, o);
    drawRoad(ctx, o);

    const list: Drawable[] = [];
    const rowY = (lane: number) => this.roadTop + lane * this.roadHeight;
    const sx = (wx: number) => wx - this.camX;

    // coins
    for (const c of this.roadCoins) {
      const x = sx(c.worldX);
      if (x < -30 || x > this.viewW + 30) continue;
      list.push({ y: rowY(c.laneY), draw: () => drawCoin(ctx, x, rowY(c.laneY) - 6, 10 * depthScale(c.laneY), this.anim, c.phase) });
    }
    // power-up pickups
    for (const p of this.powerups.pickups) {
      if (p.collected) continue;
      const x = sx(p.worldX);
      if (x < -40 || x > this.viewW + 40) continue;
      list.push({ y: rowY(p.laneY), draw: () => drawPowerupPickup(ctx, x, rowY(p.laneY), p.type.emoji, p.type.color, this.anim, p.bob) });
    }
    // curiosity objects
    for (const i of this.interests) {
      const x = sx(i.worldX);
      if (x < -60 || x > this.viewW + 60) continue;
      list.push({ y: rowY(i.laneY), draw: () => drawInterest(ctx, i.kind, x, rowY(i.laneY), 1.15 * depthScale(i.laneY), this.anim, i.done, i.t) });
    }

    // hazards (+ their warning rings)
    let hintTarget: Hazard | null = null;
    for (const h of this.hazards) {
      const d = h.worldX - this.baby.progress;
      if (!h.solved && d > 0 && d < this.dangerDist() && (!hintTarget || h.worldX < hintTarget.worldX)) hintTarget = h;
    }
    for (const h of this.hazards) {
      const x = sx(h.worldX);
      if (x < -140 || x > this.viewW + 140) continue;
      const y = rowY(h.laneY);
      const sc = depthScale(h.laneY);
      list.push({
        y,
        draw: () => {
          const d = h.worldX - this.baby.progress;
          const frozen = !!h.type.vehicle && this.powerups.vehiclesFrozen;
          const dd = this.dangerDist();
          if (!h.solved && d < dd + 60 && d > -30 && !frozen) {
            const urgency = 1 - clamp(d / dd, 0, 1);
            drawDangerRing(ctx, x, y - 4, Math.max(h.type.width, 60) * 0.58 * sc, urgency, this.anim);
          }
          const st: HazardDrawState = { variant: h.variant, phase: h.phase, time: this.anim, solved: h.solved, solveT: h.solveT, frozen };
          drawHazard(ctx, h.type.id, x, y, sc, st, { w: h.type.width, h: h.type.height });
          if (!h.solved && h.solveProgress > 0) {
            ctx.strokeStyle = '#3F9C6B'; ctx.lineWidth = 6; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.arc(x, y - h.type.height * 0.45 * sc, 28, -Math.PI / 2, -Math.PI / 2 + h.solveProgress * Math.PI * 2); ctx.stroke();
          }
        },
      });
    }

    // the baby
    const look = babyLook(this.customization);
    const babyScreen = this.worldToScreen(this.baby.progress, this.baby.laneY);
    const bScale = depthScale(this.baby.laneY) * 1.05;
    const carried = this.phase === 'rescue' && this.rescueT > 1.1;
    if (!carried) {
      list.push({ y: this.phase === 'rescue' ? 99999 : babyScreen.y, draw: () => drawBaby(ctx, babyScreen.x, babyScreen.y, bScale, look, this.baby.drawState()) });
    }

    // the guardian
    const nannyLane = this.phase === 'rescue' ? this.baby.laneY : 0.92;
    const nScreen = this.worldToScreen(this.nannyX, nannyLane);
    const nScale = depthScale(nannyLane) * 0.82;
    const running = Math.abs(this.nannyVel) > 10 || (this.phase === 'rescue' && this.rescueT < 1.0);
    let mood: GuardianMood = running ? 'run' : 'idle';
    if (this.phase === 'rescue') mood = this.rescueT > 1.1 ? 'carry' : 'worried';
    else if (!this.isSafe()) mood = 'worried';
    else if (this.baby.busy && this.baby.action !== 'cry') mood = 'happy';
    list.push({
      y: this.phase === 'rescue' ? 100000 : nScreen.y + 1,
      draw: () => {
        drawGuardian(ctx, this.nanny?.id ?? 'nanny', nScreen.x, nScreen.y, nScale, this.nannyPhase, { mood });
        if (carried) {
          const st = this.baby.drawState();
          const babySit = { ...st, pose: this.rescueT > 1.7 ? 'wave' as const : 'cry' as const, expression: this.rescueT > 1.7 ? 'laugh' as const : 'pout' as const };
          drawBaby(ctx, nScreen.x + 26 * nScale, nScreen.y - 52 * nScale, 0.62 * nScale, look, babySit, { shadow: false });
        }
      },
    });

    list.sort((a, b) => a.y - b.y).forEach(d => d.draw());

    this.particleSys.render(ctx);

    // rescue effects above everything
    if (this.phase === 'rescue') {
      const cx = carried ? nScreen.x + 26 * nScale : babyScreen.x;
      const cy = carried ? nScreen.y - 110 * nScale : babyScreen.y - 80;
      if (this.rescueT > 0.5) drawOrbitStars(ctx, cx, cy + 10, this.rescueT);
      if (this.rescueT > 1.2) drawHalo(ctx, cx, cy - 6, this.rescueT - 1.2);
    }

    this.drawDarkness(ctx, babyScreen);
    this.weather.render(ctx, this.viewW, this.viewH);
    drawForeground(ctx, o);

    // hint tag
    const hintScreenX = hintTarget ? this.worldToScreen(hintTarget.worldX, hintTarget.laneY).x : -999;
    if (this.hintsOn && hintTarget && this.phase === 'playing' && hintScreenX > 30 && hintScreenX < this.viewW - 30) {
      const h = hintTarget;
      const s = this.worldToScreen(h.worldX, h.laneY);
      const sc = depthScale(h.laneY);
      drawHintTag(ctx, clamp(s.x, 70, this.viewW - 70), s.y - (h.type.height + 22) * sc * 1.15, GESTURE[h.type.fixType] ?? '👆', h.type.fixHint, this.anim);
    }

    // speech bubble above the speaker
    if (this.speech) {
      const k = this.speech.t;
      const a = clamp(Math.min(k / 0.2, (this.speech.dur - k) / 0.3), 0, 1);
      const rescue = this.phase === 'rescue';
      const x = clamp(nScreen.x + 10, 20, this.viewW - 160);
      drawSpeechBubble(ctx, x, nScreen.y - (rescue ? 118 : 108) * nScale - 4, this.speech.text, a);
    }
  }

  private drawDarkness(ctx: CanvasRenderingContext2D, babyScreen: { x: number; y: number }): void {
    const night = !!this.currentWorld?.nightMode;
    const level = this.eventDark ? 0.66 : night ? 0.34 : 0;
    if (level <= 0) return;
    if (!this.lightCanvas) { this.lightCanvas = document.createElement('canvas'); }
    const lc = this.lightCanvas;
    if (lc.width !== this.viewW || lc.height !== this.viewH) { lc.width = this.viewW; lc.height = this.viewH; }
    const l = lc.getContext('2d')!;
    l.globalCompositeOperation = 'source-over';
    l.clearRect(0, 0, lc.width, lc.height);
    l.fillStyle = `rgba(12,8,34,${level})`;
    l.fillRect(0, 0, lc.width, lc.height);
    l.globalCompositeOperation = 'destination-out';
    const hole = (x: number, y: number, r: number, a: number) => {
      const g = l.createRadialGradient(x, y, r * 0.15, x, y, r);
      g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      l.fillStyle = g; l.fillRect(x - r, y - r, r * 2, r * 2);
    };
    hole(babyScreen.x, babyScreen.y - 30, this.eventDark ? 190 : 150, 0.95);
    const g = this.worldToScreen(this.nannyX, 0.92);
    hole(g.x, g.y - 40, 90, 0.7);
    // hazards carry their own little glow so you can still see what's coming
    for (const h of this.hazards) {
      if (h.solved) continue;
      const s = this.worldToScreen(h.worldX, h.laneY);
      hole(s.x, s.y - 20, 78, 0.55);
    }
    ctx.drawImage(lc, 0, 0, this.viewW, this.viewH);
  }
}

export const Game = new GameEngine();
