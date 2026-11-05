/* ============================================================
   APUTU: Baby's Day Out — src/core/events.ts
   Schedules Challenge Events: a calm stretch, then a themed
   curveball, then calm again. Weighted-random with no immediate
   repeats so it always feels fresh.
   ============================================================ */

import type { ChallengeEventDef } from '../types';
import { CHALLENGE_EVENTS } from '../data/events';
import { randRange } from '../utils';

export interface EventTick {
  started?: ChallengeEventDef;
  ended?: ChallengeEventDef;
}

export class EventManager {
  current: ChallengeEventDef | null = null;
  remaining = 0;
  private nextIn = 30;
  private last: string | null = null;

  reset(firstDelay = 30): void {
    this.current = null;
    this.remaining = 0;
    this.nextIn = firstDelay;
    this.last = null;
  }

  /** 0..1 progress through the active event (for HUD bars). */
  get progress(): number {
    return this.current ? 1 - this.remaining / this.current.duration : 0;
  }

  update(dt: number, enabled: boolean): EventTick {
    const tick: EventTick = {};
    if (!enabled) return tick;
    if (this.current) {
      this.remaining -= dt;
      if (this.remaining <= 0) {
        tick.ended = this.current;
        this.current = null;
        this.nextIn = randRange(28, 45);
      }
    } else {
      this.nextIn -= dt;
      if (this.nextIn <= 0) {
        const ev = this.pick();
        this.current = ev;
        this.remaining = ev.duration;
        this.last = ev.id;
        tick.started = ev;
      }
    }
    return tick;
  }

  pick(rand: () => number = Math.random): ChallengeEventDef {
    const pool = CHALLENGE_EVENTS.filter(e => e.id !== this.last);
    const total = pool.reduce((s, e) => s + e.weight, 0);
    let r = rand() * total;
    for (const e of pool) { r -= e.weight; if (r <= 0) return e; }
    return pool[0];
  }
}
