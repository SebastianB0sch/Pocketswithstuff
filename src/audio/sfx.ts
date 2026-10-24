/** Synthesized sound effects: short blips, sweeps and noise bursts. */
import { noiseBuffer, pulseWave } from './engine';

export type SfxId =
  | 'cursor' | 'select' | 'back' | 'bump' | 'door' | 'stairs' | 'hit' | 'hitSuper' | 'hitWeak' | 'faint'
  | 'throw' | 'shake' | 'click' | 'encounter' | 'statUp' | 'statDown' | 'lowHp' | 'run' | 'save' | 'exclaim'
  | 'grass' | 'ledge' | 'buy' | 'heal' | 'text' | 'menu' | 'error' | 'ember' | 'splash' | 'leaf' | 'zap'
  | 'slash' | 'thud' | 'whoosh' | 'sparkle';

type Wave = OscillatorType | 'pulse25' | 'pulse12';

interface ToneOpts {
  wave?: Wave;
  f0: number;
  f1?: number;
  at?: number;
  dur: number;
  vol?: number;
  /** Exponential (default) or linear frequency sweep. */
  linear?: boolean;
  attack?: number;
}

interface NoiseOpts {
  at?: number;
  dur: number;
  vol?: number;
  type?: BiquadFilterType;
  f0: number;
  f1?: number;
  q?: number;
}

class Fx {
  constructor(
    readonly ctx: BaseAudioContext,
    readonly out: AudioNode,
    readonly t0: number,
  ) {}

  tone({ wave = 'square', f0, f1, at = 0, dur, vol = 0.2, linear, attack = 0.004 }: ToneOpts): void {
    const { ctx } = this;
    const t = this.t0 + at;
    const osc = ctx.createOscillator();
    if (wave === 'pulse25') osc.setPeriodicWave(pulseWave(ctx, 0.25));
    else if (wave === 'pulse12') osc.setPeriodicWave(pulseWave(ctx, 0.125));
    else osc.type = wave;
    osc.frequency.setValueAtTime(f0, t);
    if (f1 !== undefined) {
      if (linear) osc.frequency.linearRampToValueAtTime(f1, t + dur);
      else osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    }
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    osc.connect(g);
    g.connect(this.out);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  noise({ at = 0, dur, vol = 0.2, type = 'bandpass', f0, f1, q = 1 }: NoiseOpts): void {
    const { ctx } = this;
    const t = this.t0 + at;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx);
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    if (f1 !== undefined) f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.out);
    src.start(t, Math.random() * 0.4);
    src.stop(t + dur + 0.02);
  }

  /** Square-wave modulated tone, for zaps and warbles. */
  warble(f0: number, f1: number, rate: number, depth: number, dur: number, vol: number, at = 0, wave: OscillatorType = 'sawtooth'): void {
    const { ctx } = this;
    const t = this.t0 + at;
    const osc = ctx.createOscillator();
    osc.type = wave;
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const lfo = ctx.createOscillator();
    lfo.type = 'square';
    lfo.frequency.value = rate;
    const lg = ctx.createGain();
    lg.gain.value = depth;
    lfo.connect(lg);
    lg.connect(osc.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    osc.connect(g);
    g.connect(this.out);
    osc.start(t);
    lfo.start(t);
    osc.stop(t + dur + 0.02);
    lfo.stop(t + dur + 0.02);
  }
}

const SFX: Record<SfxId, (f: Fx) => void> = {
  cursor: (f) => f.tone({ wave: 'pulse25', f0: 1320, dur: 0.04, vol: 0.12 }),
  select: (f) => {
    f.tone({ wave: 'pulse25', f0: 988, dur: 0.05, vol: 0.14 });
    f.tone({ wave: 'pulse25', f0: 1480, at: 0.05, dur: 0.08, vol: 0.14 });
  },
  back: (f) => {
    f.tone({ wave: 'pulse25', f0: 880, dur: 0.05, vol: 0.12 });
    f.tone({ wave: 'pulse25', f0: 587, at: 0.05, dur: 0.07, vol: 0.12 });
  },
  bump: (f) => {
    f.tone({ wave: 'triangle', f0: 140, f1: 70, dur: 0.1, vol: 0.4 });
    f.noise({ dur: 0.06, type: 'lowpass', f0: 600, vol: 0.12 });
  },
  door: (f) => {
    f.noise({ dur: 0.28, type: 'bandpass', f0: 900, f1: 260, q: 2, vol: 0.22 });
    f.tone({ wave: 'triangle', f0: 110, f1: 60, at: 0.18, dur: 0.14, vol: 0.35 });
  },
  stairs: (f) => {
    for (let i = 0; i < 4; i++) f.noise({ at: i * 0.09, dur: 0.07, type: 'bandpass', f0: 700 - i * 100, q: 2, vol: 0.55 });
  },
  hit: (f) => {
    f.noise({ dur: 0.14, type: 'lowpass', f0: 3000, f1: 400, vol: 0.4 });
    f.tone({ wave: 'square', f0: 220, f1: 70, dur: 0.12, vol: 0.18 });
  },
  hitSuper: (f) => {
    f.noise({ dur: 0.22, type: 'lowpass', f0: 5000, f1: 300, vol: 0.5 });
    f.tone({ wave: 'square', f0: 300, f1: 60, dur: 0.2, vol: 0.22 });
    f.noise({ at: 0.09, dur: 0.16, type: 'lowpass', f0: 3000, f1: 200, vol: 0.4 });
  },
  hitWeak: (f) => {
    f.noise({ dur: 0.08, type: 'lowpass', f0: 1500, f1: 400, vol: 0.25 });
    f.tone({ wave: 'triangle', f0: 180, f1: 90, dur: 0.08, vol: 0.2 });
  },
  faint: (f) => {
    f.tone({ wave: 'pulse25', f0: 700, f1: 70, dur: 0.7, vol: 0.18, attack: 0.01 });
    f.noise({ at: 0.45, dur: 0.3, type: 'lowpass', f0: 500, vol: 0.2 });
  },
  throw: (f) => f.noise({ dur: 0.3, type: 'bandpass', f0: 400, f1: 3000, q: 1.2, vol: 0.6 }),
  shake: (f) => {
    f.tone({ wave: 'square', f0: 520, dur: 0.04, vol: 0.12 });
    f.noise({ at: 0.03, dur: 0.12, type: 'bandpass', f0: 1800, q: 4, vol: 0.2 });
    f.tone({ wave: 'square', f0: 420, at: 0.12, dur: 0.04, vol: 0.12 });
  },
  click: (f) => f.noise({ dur: 0.03, type: 'highpass', f0: 3000, vol: 0.25 }),
  encounter: (f) => {
    const notes = [1568, 1319, 1047, 880, 784, 659, 523, 440];
    notes.forEach((n, i) => f.tone({ wave: 'pulse25', f0: n, at: i * 0.045, dur: 0.06, vol: 0.13 }));
    f.noise({ dur: 0.45, type: 'highpass', f0: 2000, f1: 6000, vol: 0.08 });
  },
  statUp: (f) => {
    for (let i = 0; i < 3; i++) f.tone({ wave: 'pulse25', f0: 400 + i * 120, f1: 1200 + i * 200, at: i * 0.12, dur: 0.12, vol: 0.1 });
  },
  statDown: (f) => {
    for (let i = 0; i < 3; i++) f.tone({ wave: 'pulse25', f0: 1200 - i * 150, f1: 300, at: i * 0.12, dur: 0.12, vol: 0.1 });
  },
  lowHp: (f) => {
    f.tone({ wave: 'square', f0: 988, dur: 0.1, vol: 0.08 });
    f.tone({ wave: 'square', f0: 784, at: 0.15, dur: 0.1, vol: 0.08 });
  },
  run: (f) => {
    for (let i = 0; i < 3; i++) f.noise({ at: i * 0.1, dur: 0.09, type: 'bandpass', f0: 1200, f1: 400, q: 2, vol: 0.2 });
  },
  save: (f) => {
    [523, 659, 784, 1047].forEach((n, i) => f.tone({ wave: 'pulse25', f0: n, at: i * 0.08, dur: 0.12, vol: 0.12 }));
  },
  exclaim: (f) => {
    f.tone({ wave: 'pulse25', f0: 1568, dur: 0.06, vol: 0.13 });
    f.tone({ wave: 'pulse25', f0: 2093, at: 0.07, dur: 0.1, vol: 0.13 });
  },
  grass: (f) => f.noise({ dur: 0.1, type: 'highpass', f0: 3500, f1: 6000, vol: 0.12 }),
  ledge: (f) => {
    f.tone({ wave: 'triangle', f0: 300, f1: 700, dur: 0.1, vol: 0.22, linear: true });
    f.tone({ wave: 'triangle', f0: 700, f1: 180, at: 0.1, dur: 0.14, vol: 0.22 });
  },
  buy: (f) => {
    f.tone({ wave: 'pulse25', f0: 988, dur: 0.07, vol: 0.13 });
    f.tone({ wave: 'pulse25', f0: 1319, at: 0.07, dur: 0.22, vol: 0.13 });
  },
  heal: (f) => {
    [784, 988, 1175, 1568, 1976].forEach((n, i) => f.tone({ wave: 'sine', f0: n, at: i * 0.06, dur: 0.25, vol: 0.12 }));
  },
  text: (f) => f.tone({ wave: 'pulse25', f0: 1760, dur: 0.025, vol: 0.07 }),
  menu: (f) => {
    f.tone({ wave: 'pulse25', f0: 784, dur: 0.05, vol: 0.12 });
    f.tone({ wave: 'pulse25', f0: 1175, at: 0.05, dur: 0.07, vol: 0.12 });
  },
  error: (f) => {
    f.tone({ wave: 'square', f0: 160, dur: 0.1, vol: 0.14 });
    f.tone({ wave: 'square', f0: 140, at: 0.13, dur: 0.14, vol: 0.14 });
  },
  ember: (f) => {
    f.noise({ dur: 0.4, type: 'bandpass', f0: 1200, f1: 300, q: 0.8, vol: 0.35 });
    for (let i = 0; i < 5; i++) f.noise({ at: 0.05 + i * 0.06, dur: 0.03, type: 'highpass', f0: 4000, vol: 0.15 });
  },
  splash: (f) => {
    f.noise({ dur: 0.35, type: 'lowpass', f0: 2500, f1: 300, vol: 0.35 });
    for (let i = 0; i < 4; i++) f.tone({ wave: 'sine', f0: 500 + i * 180, f1: 1400 + i * 200, at: i * 0.06, dur: 0.07, vol: 0.12 });
  },
  leaf: (f) => {
    for (let i = 0; i < 4; i++) f.noise({ at: i * 0.07, dur: 0.08, type: 'highpass', f0: 2500 + i * 500, vol: 0.06 });
    f.tone({ wave: 'sine', f0: 1200, f1: 2400, dur: 0.25, vol: 0.06 });
  },
  zap: (f) => {
    f.warble(900, 300, 60, 400, 0.35, 0.12);
    f.noise({ dur: 0.3, type: 'highpass', f0: 3000, vol: 0.14 });
  },
  slash: (f) => f.noise({ dur: 0.16, type: 'highpass', f0: 6000, f1: 1500, vol: 0.35 }),
  thud: (f) => {
    f.tone({ wave: 'sine', f0: 120, f1: 40, dur: 0.25, vol: 0.5 });
    f.noise({ dur: 0.12, type: 'lowpass', f0: 800, vol: 0.2 });
  },
  whoosh: (f) => f.noise({ dur: 0.35, type: 'bandpass', f0: 300, f1: 2200, q: 1, vol: 0.6 }),
  sparkle: (f) => {
    [2093, 2637, 3136, 2349, 2794].forEach((n, i) => f.tone({ wave: 'sine', f0: n, at: i * 0.05, dur: 0.18, vol: 0.07 }));
  },
};

export function playSfx(ctx: BaseAudioContext, out: AudioNode, id: SfxId, at = ctx.currentTime): void {
  SFX[id](new Fx(ctx, out, at));
}

export const SFX_IDS = Object.keys(SFX) as SfxId[];
