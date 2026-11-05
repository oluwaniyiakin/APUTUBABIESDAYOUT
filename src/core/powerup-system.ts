/* ============================================================
   APUTU: Baby's Day Out — src/core/powerup-system.ts
   Runtime logic for power-up pickups: spawning them in-world,
   detecting collection, tracking active timed effects, and
   exposing simple query flags the engine checks each frame.
   ============================================================ */

import type { Nanny, PowerupType } from '../types';
import { pickRandomPowerup } from '../data/powerups';
import { randRange } from '../utils';

export interface Pickup {
  type: PowerupType;
  worldX: number;
  laneY: number;
  collected: boolean;
  bob: number;
}

export class PowerupSystem {
  pickups: Pickup[] = [];
  active: Record<string, number> = {};
  instantFlags: Record<string, number> = {};
  nextSpawnAt = randRange(8, 14);

  grantStartBonus(nanny: Nanny | null | undefined): void {
    if (nanny?.perk?.type === 'shield_start') {
      this.instantFlags.shield = (this.instantFlags.shield ?? 0) + 1;
    }
  }

  update(dt: number, babyProgress: number, viewW: number, allowFree = true): void {
    for (const id of Object.keys(this.active)) {
      this.active[id] -= dt;
      if (this.active[id] <= 0) delete this.active[id];
    }

    this.nextSpawnAt -= dt;
    if (this.nextSpawnAt <= 0) {
      let type = pickRandomPowerup();
      // no free saves in Hardcore: don't offer pickups that are only free saves
      for (let n = 0; n < 8 && !allowFree && ['shield', 'guardian_angel', 'extra_life'].includes(type.id); n++) type = pickRandomPowerup();
      const spawnX = babyProgress + viewW * randRange(1.0, 1.6);
      this.pickups.push({
        type, worldX: spawnX, laneY: randRange(0.3, 0.7), collected: false, bob: Math.random() * 10,
      });
      this.nextSpawnAt = randRange(10, 16);
    }

    this.pickups = this.pickups.filter(p => p.worldX > babyProgress - 100);
  }

  tryCollect(babyProgress: number, laneY: number): Pickup | null {
    for (const p of this.pickups) {
      if (p.collected) continue;
      const dx = Math.abs(p.worldX - babyProgress);
      const dy = Math.abs(p.laneY - laneY);
      if (dx < 28 && dy < 0.18) {
        p.collected = true;
        this.apply(p.type);
        return p;
      }
    }
    return null;
  }

  apply(type: PowerupType): void {
    if (type.duration > 0) {
      this.active[type.id] = (this.active[type.id] ?? 0) + type.duration;
    } else {
      this.instantFlags[type.id] = (this.instantFlags[type.id] ?? 0) + 1;
    }
  }

  isActive(id: string): boolean { return !!this.active[id]; }

  hasCharge(id: string): boolean { return (this.instantFlags[id] ?? 0) > 0; }

  consumeCharge(id: string): boolean {
    if ((this.instantFlags[id] ?? 0) > 0) {
      this.instantFlags[id]--;
      return true;
    }
    return false;
  }

  get speedMultiplier(): number {
    return this.isActive('slow_time') ? 0.5 : 1;
  }
  get vehiclesFrozen(): boolean {
    return this.isActive('freeze_traffic');
  }
  get coinMultiplier(): number {
    return this.isActive('double_coins') ? 2 : 1;
  }
  get fixWindowMultiplier(): number {
    return this.isActive('safety_bubble') ? 1.6 : 1;
  }
  get hazardSpawnRateMultiplier(): number {
    return this.isActive('lucky_clover') ? 1.4 : 1;
  }
  get autoSolveActive(): boolean {
    return this.isActive('super_nanny');
  }

  reset(): void {
    this.pickups = [];
    this.active = {};
    this.instantFlags = {};
    this.nextSpawnAt = randRange(8, 14);
  }
}
