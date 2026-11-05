/* ============================================================
   APUTU: Baby's Day Out — src/render/weather.ts
   Weather and ambient particles: rain, thunderstorms with
   lightning, wind-blown leaves, fireflies, dust and confetti.
   One small pooled system; the renderer only needs a mode name.
   ============================================================ */

import type { WeatherMode } from '../types';
import { randRange } from '../utils';
import type { Ctx } from './draw';

interface Drop { x: number; y: number; v: number; len: number }
interface Mote { x: number; y: number; vx: number; vy: number; c: string; s: number; rot: number; vr: number; ph: number }

const CONFETTI = ['#F2637B', '#F5B942', '#3F9C6B', '#4A8CE0', '#B58CFF', '#FFFFFF'];

export class Weather {
  mode: WeatherMode = 'clear';
  /** Called when a lightning bolt strikes (so the engine can play thunder). */
  onLightning?: () => void;
  private drops: Drop[] = [];
  private motes: Mote[] = [];
  private flash = 0;
  private nextBolt = 4;

  setMode(m: WeatherMode): void {
    if (m === this.mode) return;
    this.mode = m;
    this.drops = [];
    this.motes = [];
    this.flash = 0;
    this.nextBolt = randRange(3, 6);
  }

  update(dt: number, w: number, h: number): void {
    const m = this.mode;
    if (m === 'rain' || m === 'storm') {
      const target = m === 'storm' ? 190 : 110;
      while (this.drops.length < target) {
        this.drops.push({ x: randRange(-60, w + 120), y: randRange(-h, 0), v: randRange(650, 950), len: randRange(10, 18) });
      }
      for (const d of this.drops) {
        d.y += d.v * dt;
        d.x -= 130 * dt;
        if (d.y > h) { d.y = randRange(-60, -10); d.x = randRange(-60, w + 120); }
      }
      if (m === 'storm') {
        this.nextBolt -= dt;
        if (this.nextBolt <= 0) { this.flash = 1; this.nextBolt = randRange(4, 9); this.onLightning?.(); }
      }
    } else if (m !== 'clear') {
      const want = m === 'fireflies' ? 22 : m === 'confetti' ? 60 : m === 'dust' ? 36 : 16;
      while (this.motes.length < want) this.motes.push(this.spawnMote(m, w, h, true));
      for (const p of this.motes) {
        p.ph += dt;
        if (m === 'fireflies') { p.x += Math.sin(p.ph * 1.3 + p.s) * 14 * dt; p.y += Math.cos(p.ph * 1.1 + p.s) * 10 * dt; }
        else { p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; if (m === 'wind') p.y += Math.sin(p.ph * 3) * 20 * dt; }
        if (p.x < -30 || p.y > h + 20 || p.y < -30 || p.x > w + 40) Object.assign(p, this.spawnMote(m, w, h, false));
      }
    }
    this.flash = Math.max(0, this.flash - dt * 2.4);
  }

  private spawnMote(m: WeatherMode, w: number, h: number, scatter: boolean): Mote {
    const x = scatter ? randRange(0, w) : m === 'confetti' ? randRange(0, w) : w + 20;
    const y = scatter ? randRange(0, h) : m === 'confetti' ? -10 : randRange(0, h * 0.8);
    switch (m) {
      case 'wind': return { x, y, vx: randRange(-260, -160), vy: randRange(0, 30), c: ['#7CC06B', '#C7A455', '#E8963E'][Math.floor(Math.random() * 3)], s: randRange(4, 7), rot: Math.random() * 6, vr: randRange(-6, 6), ph: Math.random() * 6 };
      case 'dust': return { x, y: randRange(h * 0.3, h), vx: randRange(-60, -20), vy: randRange(-4, 4), c: 'rgba(200,160,100,0.35)', s: randRange(2, 5), rot: 0, vr: 0, ph: Math.random() * 6 };
      case 'confetti': return { x, y, vx: randRange(-30, 30), vy: randRange(60, 140), c: CONFETTI[Math.floor(Math.random() * CONFETTI.length)], s: randRange(4, 8), rot: Math.random() * 6, vr: randRange(-8, 8), ph: Math.random() * 6 };
      default: return { x, y: randRange(h * 0.2, h * 0.85), vx: 0, vy: 0, c: '#FFF3A0', s: randRange(1.5, 3), rot: 0, vr: 0, ph: Math.random() * 6 };
    }
  }

  render(ctx: Ctx, w: number, h: number): void {
    const m = this.mode;
    if (m === 'rain' || m === 'storm') {
      ctx.fillStyle = m === 'storm' ? 'rgba(30,45,75,0.3)' : 'rgba(60,85,120,0.16)';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(210,230,255,0.6)';
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (const d of this.drops) { ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + 5, d.y - d.len); }
      ctx.stroke();
    } else if (m === 'fireflies') {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const p of this.motes) {
        const a = 0.35 + 0.65 * Math.abs(Math.sin(p.ph * 2 + p.s));
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 12);
        g.addColorStop(0, `rgba(255,243,160,${a})`); g.addColorStop(1, 'rgba(255,243,160,0)');
        ctx.fillStyle = g; ctx.fillRect(p.x - 12, p.y - 12, 24, 24);
      }
      ctx.restore();
    } else if (m === 'dust') {
      for (const p of this.motes) { ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2); ctx.fill(); }
    } else if (m === 'wind' || m === 'confetti') {
      for (const p of this.motes) {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.c;
        if (m === 'wind') { ctx.beginPath(); ctx.ellipse(0, 0, p.s, p.s * 0.5, 0, 0, Math.PI * 2); ctx.fill(); }
        else ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
        ctx.restore();
      }
    }
    if (this.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${this.flash * 0.65})`; ctx.fillRect(0, 0, w, h); }
  }
}
