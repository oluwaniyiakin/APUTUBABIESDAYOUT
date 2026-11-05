/* ============================================================
   APUTU: Baby's Day Out — src/core/particles.ts
   Small, dependency-free particle system used for hazard-solve
   bursts, coin sparkles, and combo celebration confetti.
   ============================================================ */

import { randRange } from '../utils';

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  color: string; size: number;
  gravity: number;
  rotates?: boolean; rot?: number; rotSpeed?: number;
}

export class ParticleSystem {
  particles: Particle[] = [];

  burst(x: number, y: number, color: string, count = 10, opts: {
    speed?: [number, number]; life?: [number, number]; size?: [number, number]; gravity?: number;
  } = {}): void {
    const speed = opts.speed ?? [60, 160];
    const life = opts.life ?? [0.4, 0.8];
    const size = opts.size ?? [3, 6];
    const gravity = opts.gravity ?? 200;

    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = randRange(speed[0], speed[1]);
      this.particles.push({
        x, y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 60,
        life: randRange(life[0], life[1]),
        maxLife: life[1],
        color,
        size: randRange(size[0], size[1]),
        gravity,
      });
    }
  }

  confetti(x: number, y: number, colors: string[], count = 24): void {
    for (let i = 0; i < count; i++) {
      const ang = -Math.PI / 2 + randRange(-1.1, 1.1);
      const spd = randRange(120, 260);
      this.particles.push({
        x, y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        life: randRange(0.8, 1.4),
        maxLife: 1.4,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: randRange(4, 8),
        gravity: 260,
        rotates: true,
        rot: Math.random() * Math.PI,
        rotSpeed: randRange(-8, 8),
      });
    }
  }

  update(dt: number): void {
    this.particles = this.particles.filter(p => {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      if (p.rotates) p.rot = (p.rot ?? 0) + (p.rotSpeed ?? 0) * dt;
      return p.life > 0;
    });
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      if (p.rotates) {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot ?? 0);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  clear(): void {
    this.particles = [];
  }
}

/** Floating DOM text labels (crisper than canvas text for small UI pops). */
class FloatLabelSystem {
  private layer: HTMLElement | null = null;

  init(): void {
    this.layer = document.getElementById('fx-layer');
  }

  show(x: number, y: number, text: string, color: string, opts: { size?: number; duration?: number } = {}): void {
    if (!this.layer) return;
    const div = document.createElement('div');
    div.className = 'float-label';
    div.style.left = x + 'px';
    div.style.top = y + 'px';
    div.style.color = color;
    div.style.fontSize = (opts.size ?? 18) + 'px';
    div.textContent = text;
    this.layer.appendChild(div);
    setTimeout(() => div.remove(), opts.duration ?? 850);
  }
}

export const FloatLabels = new FloatLabelSystem();
