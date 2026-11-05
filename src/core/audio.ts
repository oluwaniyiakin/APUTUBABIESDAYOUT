/* ============================================================
   APUTU: Baby's Day Out — src/core/audio.ts
   Everything you hear is synthesized live with the Web Audio API,
   so the game ships with zero audio files. Besides UI blips this
   includes the "human" sounds that give the game its personality:
   baby giggles and coos, a wobbly cry, a honk, a bark, a goat's
   baa, a chicken's cluck, thunder and rain.

   Drop recorded files into assets/sfx/ later and swap the bodies
   of these methods for buffer playback — callers won't change.
   ============================================================ */

import { Storage } from './storage';

class AudioSystem {
  ctx: AudioContext | null = null;
  enabled = true;
  musicEnabled = true;
  masterGain: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private musicInterval: ReturnType<typeof setInterval> | null = null;
  private musicOn = false;
  private rain: { src: AudioBufferSourceNode; gain: GainNode } | null = null;
  private lastCoin = 0;

  init(): void {
    const settings = Storage.loadSettings();
    this.enabled = settings.sfxOn;
    this.musicEnabled = settings.musicOn;

    const resume = () => {
      try {
        if (!this.ctx) {
          const Ctor = window.AudioContext || (window as any).webkitAudioContext;
          if (!Ctor) return;               // no Web Audio support: the game stays silent but works
          this.ctx = new Ctor();
          this.masterGain = this.ctx.createGain();
          this.masterGain.gain.value = 0.55;
          this.masterGain.connect(this.ctx.destination);
        } else if (this.ctx.state === 'suspended') {
          this.ctx.resume();
        }
      } catch {
        this.ctx = null;                   // audio is a nice-to-have, never a crash
      }
    };
    // browsers need a user gesture before audio can start
    document.addEventListener('touchstart', resume, { once: true });
    document.addEventListener('mousedown', resume, { once: true });
    document.addEventListener('keydown', resume, { once: true });
  }

  setSfxEnabled(v: boolean): void {
    this.enabled = v;
    const s = Storage.loadSettings(); s.sfxOn = v; Storage.saveSettings(s);
    if (!v) this.setRain(false);
  }
  setMusicEnabled(v: boolean): void {
    this.musicEnabled = v;
    const s = Storage.loadSettings(); s.musicOn = v; Storage.saveSettings(s);
    if (!v) this.stopMusic(); else this.startAmbientMusic();
  }

  /* ---------------- Building blocks ---------------- */

  private tone(freq: number, dur: number, type: OscillatorType = 'sine', peak = 0.25, delay = 0, slideTo?: number, vibrato = 0): void {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    if (vibrato > 0) {
      const lfo = this.ctx.createOscillator();
      const lg = this.ctx.createGain();
      lfo.frequency.value = 9; lg.gain.value = vibrato;
      lfo.connect(lg); lg.connect(osc.frequency);
      lfo.start(t0); lfo.stop(t0 + dur + 0.05);
    }
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(peak, t0 + Math.min(0.03, dur / 3));
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain); gain.connect(this.masterGain);
    osc.start(t0); osc.stop(t0 + dur + 0.03);
  }

  private noise(dur: number, freq: number, q: number, peak: number, delay = 0, type: BiquadFilterType = 'bandpass'): void {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    if (!this.noiseBuf) {
      const len = this.ctx.sampleRate * 2;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    const t0 = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(this.masterGain);
    src.start(t0, Math.random()); src.stop(t0 + dur + 0.05);
  }

  /* ---------------- Human & animal sounds ---------------- */

  /** A bubbly baby giggle: a run of short, wobbling high notes. */
  playGiggle(): void {
    const n = 4 + Math.floor(Math.random() * 2);
    for (let i = 0; i < n; i++) {
      const base = 640 + Math.random() * 120 - i * 14;
      this.tone(base, 0.11, 'triangle', 0.22 - i * 0.02, i * 0.115, base * 0.82, 14);
    }
  }
  playCoo(): void { this.tone(520, 0.35, 'sine', 0.16, 0, 760, 8); this.tone(780, 0.3, 'sine', 0.1, 0.18, 640, 6); }
  playCry(): void {
    for (let i = 0; i < 3; i++) this.tone(700 - i * 60, 0.34, 'sawtooth', 0.09, i * 0.4, 480 - i * 40, 22);
  }
  playGasp(): void { this.noise(0.18, 1400, 1.2, 0.12); this.tone(300, 0.14, 'triangle', 0.08, 0, 520); }
  playSneeze(): void { this.noise(0.12, 900, 0.8, 0.1); this.noise(0.22, 2400, 0.9, 0.18, 0.14); this.tone(500, 0.2, 'triangle', 0.1, 0.14, 250); }
  playHonk(): void { this.tone(330, 0.26, 'square', 0.12); this.tone(415, 0.26, 'square', 0.1); }
  playBark(): void { this.noise(0.1, 700, 1.4, 0.2); this.tone(260, 0.12, 'sawtooth', 0.14, 0, 140); this.tone(240, 0.12, 'sawtooth', 0.12, 0.17, 130); }
  playBaa(): void { this.tone(300, 0.55, 'sawtooth', 0.11, 0, 260, 26); }
  playCluck(): void { for (let i = 0; i < 3; i++) this.tone(620 + i * 40, 0.06, 'square', 0.08, i * 0.09, 420); }
  playMeow(): void { this.tone(540, 0.4, 'triangle', 0.11, 0, 880, 7); this.tone(880, 0.3, 'triangle', 0.09, 0.4, 520); }
  playThunder(): void { this.noise(1.4, 140, 0.5, 0.35, 0.25, 'lowpass'); this.noise(0.9, 90, 0.4, 0.28, 0.5, 'lowpass'); }
  playPop(): void { this.tone(900, 0.08, 'sine', 0.2, 0, 300); }
  playWhoosh(): void { this.noise(0.28, 1200, 0.6, 0.12); }
  playZap(): void { this.noise(0.14, 3200, 2, 0.14); this.tone(180, 0.1, 'sawtooth', 0.08, 0, 60); }

  /** Picks the right sound for the hazard that was just solved. */
  playHazardSolve(id: string): void {
    this.playSolve();
    switch (id) {
      case 'car': case 'bus': case 'motorcycle': this.playHonk(); break;
      case 'dog': this.playBark(); break;
      case 'goat': this.playBaa(); break;
      case 'chicken': this.playCluck(); break;
      case 'wire': this.playZap(); break;
      case 'puddle': this.playPop(); break;
      default: this.playWhoosh();
    }
  }

  /* ---------------- UI & feedback blips ---------------- */

  playSolve(): void { this.tone(660, 0.12, 'triangle', 0.22); this.tone(880, 0.15, 'triangle', 0.18, 0.06); }
  playCombo(n: number): void { const b = 520 + Math.min(n, 8) * 40; this.tone(b, 0.14, 'square', 0.14); this.tone(b * 1.5, 0.16, 'square', 0.11, 0.05); }
  playCoin(): void {
    const now = performance.now();
    if (now - this.lastCoin < 60) return;
    this.lastCoin = now;
    this.tone(988, 0.08, 'square', 0.1); this.tone(1318, 0.1, 'square', 0.08, 0.05);
  }
  playWarning(): void { this.tone(220, 0.15, 'sawtooth', 0.1); }
  playPowerup(): void { this.tone(440, 0.1, 'triangle', 0.2); this.tone(660, 0.1, 'triangle', 0.2, 0.08); this.tone(880, 0.18, 'triangle', 0.22, 0.16); }
  playGameOver(): void { this.tone(392, 0.2, 'sine', 0.2); this.tone(330, 0.2, 'sine', 0.18, 0.15); this.tone(262, 0.35, 'sine', 0.2, 0.3); }
  playTimeUp(): void { [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.2, 'triangle', 0.2, i * 0.1)); }
  playButtonTap(): void { this.tone(500, 0.06, 'square', 0.08); }
  playAchievement(): void { [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.18, i * 0.08)); }
  playEvent(): void { this.tone(440, 0.14, 'square', 0.12); this.tone(330, 0.14, 'square', 0.12, 0.16); this.tone(440, 0.2, 'square', 0.12, 0.32); }
  playRescue(): void { [392, 494, 587, 784].forEach((f, i) => this.tone(f, 0.22, 'sine', 0.16, i * 0.12)); }

  /* ---------------- Ambience ---------------- */

  setRain(on: boolean): void {
    if (!this.ctx || !this.masterGain) return;
    if (on && this.enabled && !this.rain) {
      if (!this.noiseBuf) this.noise(0.01, 1000, 1, 0.0001); // builds the buffer
      if (!this.noiseBuf) return;
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuf; src.loop = true;
      const f = this.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1500;
      const g = this.ctx.createGain(); g.gain.value = 0.06;
      src.connect(f); f.connect(g); g.connect(this.masterGain);
      src.start();
      this.rain = { src, gain: g };
    } else if (!on && this.rain) {
      this.rain.src.stop(); this.rain = null;
    }
  }

  startAmbientMusic(): void {
    if (!this.musicEnabled || !this.ctx || this.musicOn) return;
    // a gentle, slightly bouncy pentatonic tune
    const melody = [392, 440, 523, 440, 392, 330, 392, 440, 523, 587, 523, 440];
    const bass = [196, 196, 220, 196];
    let i = 0;
    this.musicInterval = setInterval(() => {
      if (!this.musicEnabled) return;
      this.tone(melody[i % melody.length], 0.42, 'sine', 0.05);
      if (i % 3 === 0) this.tone(bass[(i / 3) % bass.length | 0], 0.6, 'triangle', 0.04);
      i++;
    }, 420);
    this.musicOn = true;
  }
  stopMusic(): void {
    if (this.musicInterval) clearInterval(this.musicInterval);
    this.musicInterval = null;
    this.musicOn = false;
  }
}

export const AudioSys = new AudioSystem();
