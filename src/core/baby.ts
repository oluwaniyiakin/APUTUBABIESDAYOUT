/* ============================================================
   APUTU: Baby's Day Out — src/core/baby.ts
   The baby as a *character*, not just a point moving right.
   Aputu is a small state machine: he crawls with a gait that
   matches his speed, tilts his head when something puzzles him,
   gets distracted (flowers, butterflies, balloons, cats), sneezes,
   yawns, and now and then turns round to grin at his guardian.

   The player never steers him — the engine only nudges where his
   curiosity points him (see Game.update).
   ============================================================ */

import type { BabyDrawState, BabyPose, Customization, Expression, HairStyle, SkinToneId } from '../types';
import { clamp, lerp, randRange } from '../utils';

export const SKIN_TONES: Record<SkinToneId, string> = {
  tone1: '#8D5524',
  tone2: '#C68642',
  tone3: '#E0AC69',
  tone4: '#F1C27D',
  tone5: '#FFDBAC',
};

export const HAIR_COLORS: Record<HairStyle, string> = {
  puffs: '#2A1B12',
  curls: '#1C120C',
  locs: '#241611',
  bald: 'transparent',
  braids: '#2A1B12',
};

export const DEFAULT_CUSTOMIZATION: Customization = {
  gender: 'boy',
  skin: 'tone2',
  outfit: 'ankara',
  hair: 'puffs',
  nanny: 'nanny',
};

export type BabyAction =
  | 'none' | 'sniff' | 'pet' | 'reach' | 'sneeze' | 'wave' | 'yawn' | 'cry' | 'clap' | 'chase';

/** Actions during which Aputu sits/stands still instead of crawling. */
const STILL_ACTIONS: BabyAction[] = ['sniff', 'pet', 'reach', 'sneeze', 'wave', 'yawn', 'cry', 'clap'];

const POSE_FOR: Record<BabyAction, BabyPose> = {
  none: 'crawl', chase: 'crawl', sniff: 'sniff', pet: 'pet', reach: 'reach',
  sneeze: 'sneeze', wave: 'wave', yawn: 'yawn', cry: 'cry', clap: 'clap',
};

export class Baby {
  customization: Customization;

  /** Vertical position across the road: 0 = far side, 1 = near side. */
  laneY = 0.5;
  /** Distance travelled along the road (px). */
  progress = 0;
  baseSpeed = 62;
  speed = 62;
  /** Lane the engine wants him to drift to (hazard / interest / coin), or null. */
  steer: number | null = null;

  action: BabyAction = 'none';
  actionT = 0;
  actionDur = 0;
  /** Called when an action finishes (used to chain sniff -> sneeze). */
  onActionEnd?: (a: BabyAction) => void;

  phase = 0;
  time = 0;
  lookBack = 0;
  blocked = false;
  excited = false;

  private wanderTimer = randRange(2, 4);
  private wanderTarget = 0.5;
  private lookBackTimer = randRange(7, 12);
  private lookBackHold = 0;
  private idleTimer = randRange(8, 14);

  constructor(customization: Customization) {
    this.customization = customization;
  }

  get busy(): boolean { return STILL_ACTIONS.includes(this.action); }

  startAction(a: BabyAction, dur: number): void {
    this.action = a;
    this.actionT = 0;
    this.actionDur = dur;
  }

  endAction(): void {
    const prev = this.action;
    this.action = 'none';
    this.actionT = 0;
    this.onActionEnd?.(prev);
  }

  get pose(): BabyPose { return POSE_FOR[this.action]; }

  get expression(): Expression {
    switch (this.action) {
      case 'cry': return 'cry';
      case 'sneeze': return 'sneeze';
      case 'yawn': return 'sleepy';
      case 'sniff': return 'curious';
      case 'reach': return 'surprised';
      case 'pet': case 'wave': case 'clap': case 'chase': return 'laugh';
      default:
    }
    if (this.blocked) return 'curious';
    if (this.excited) return 'laugh';
    return 'happy';
  }

  drawState(): BabyDrawState {
    return { pose: this.pose, expression: this.expression, phase: this.phase, time: this.time, lookBack: this.lookBack };
  }

  /** Returns true when it is time for a spontaneous idle moment (caller decides which). */
  idleReady(dt: number, safe: boolean): boolean {
    if (!safe || this.busy || this.action === 'chase') return false;
    this.idleTimer -= dt;
    if (this.idleTimer <= 0) { this.idleTimer = randRange(9, 16); return true; }
    return false;
  }

  update(dt: number, blocked: boolean): void {
    this.time += dt;
    this.blocked = blocked;

    // action clock
    if (this.action !== 'none' && this.action !== 'cry') {
      this.actionT += dt;
      if (this.actionT >= this.actionDur) this.endAction();
    } else if (this.action === 'cry') {
      this.actionT += dt;
    }

    // lane drift: curiosity (steer) wins over gentle wandering
    this.wanderTimer -= dt;
    if (this.wanderTimer <= 0) {
      this.wanderTarget = clamp(this.wanderTarget + randRange(-0.22, 0.22), 0.18, 0.85);
      this.wanderTimer = randRange(1.6, 3.4);
      this.excited = Math.random() < 0.22;
    }
    const target = this.steer ?? this.wanderTarget;
    const rate = this.steer !== null ? 3.2 : 1.4;
    if (!this.busy) this.laneY += (target - this.laneY) * Math.min(1, dt * rate);
    if (this.steer !== null) this.wanderTarget = this.laneY;

    // speed + gait
    if (this.busy) {
      this.speed = lerp(this.speed, 0, Math.min(1, dt * 9));
    } else if (blocked) {
      this.speed = lerp(this.speed, this.baseSpeed * 0.18, Math.min(1, dt * 5));
    } else {
      let mult = 1;
      if (this.excited) mult = 1.3;
      if (this.action === 'chase') mult = 1.45;
      this.speed = lerp(this.speed, this.baseSpeed * mult, Math.min(1, dt * 3));
    }
    if (!this.busy) {
      this.progress += this.speed * dt;
      this.phase += dt * (3.5 + (this.speed / 62) * 5.2);
    }

    // turning round to grin at Nanny
    if (!this.busy) {
      this.lookBackTimer -= dt;
      if (this.lookBackTimer <= 0 && this.lookBackHold <= 0 && !blocked) {
        this.lookBackHold = 1.1;
        this.lookBackTimer = randRange(10, 18);
      }
    }
    if (this.lookBackHold > 0) this.lookBackHold -= dt;
    this.lookBack = lerp(this.lookBack, this.lookBackHold > 0 ? 1 : 0, Math.min(1, dt * 8));
  }
}
