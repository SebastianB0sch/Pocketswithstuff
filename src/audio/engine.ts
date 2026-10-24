/**
 * The synthesizer and step sequencer behind all music.
 *
 * Songs are written as text (see songs.ts) and compiled to a flat list of note events
 * on a 16th-note grid. A `Player` schedules those events onto any BaseAudioContext a
 * little ahead of time, so the same code drives live playback and offline rendering.
 */

export type Instrument = 'lead' | 'harm' | 'arp' | 'bass';
export type Drum = 'k' | 's' | 'h' | 'o';

export interface NoteEvent {
  step: number;
  dur: number;
  inst: Instrument | 'drum';
  midi: number;
  drum?: Drum;
  vel: number;
}

export type BassStyle = 'root8' | 'octave' | 'walk' | 'half' | 'pulse16' | 'none';
export type DrumStyle = 'none' | 'soft' | 'pop' | 'battle' | 'march' | 'tense';
export type ArpStyle = 'up' | 'updown' | 'pad' | 'stab' | 'none';

export interface Song {
  bpm: number;
  /** Chord symbols with optional `:steps` (default a whole 16-step bar), e.g. "C Am:8 G7:8". */
  chords: string;
  /** Melody tokens `C5:4`, `r:2`; a missing duration repeats the previous one. `|` is ignored. */
  lead: string;
  /** Optional second melodic line on the harmony voice. */
  counter?: string;
  bass: BassStyle;
  drums: DrumStyle;
  arp: ArpStyle;
  /** Pulse duty of the lead: 0.125, 0.25 or 0.5. */
  duty?: number;
  loop?: boolean;
  /** Lead echo amount 0..1. */
  echo?: number;
  /** Semitone offset applied to the arp/pad voicing octave (default 0 = around C4). */
  arpOctave?: number;
}

export interface Compiled {
  stepSec: number;
  length: number;
  events: NoteEvent[];
  loop: boolean;
  duty: number;
  echo: number;
}

const PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export function parsePitch(s: string): number {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(s);
  if (!m) throw new Error(`Bad pitch ${s}`);
  return 12 * (Number(m[3]) + 1) + PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}

export const midiToFreq = (m: number) => 440 * 2 ** ((m - 69) / 12);

const QUALITIES: [string, number[]][] = [
  ['maj7', [0, 4, 7, 11]],
  ['m7', [0, 3, 7, 10]],
  ['dim', [0, 3, 6]],
  ['sus4', [0, 5, 7]],
  ['add9', [0, 4, 7, 14]],
  ['7', [0, 4, 7, 10]],
  ['m', [0, 3, 7]],
  ['', [0, 4, 7]],
];

interface ChordSpan {
  step: number;
  dur: number;
  root: number; // pitch class 0..11
  tones: number[]; // intervals
}

export function parseChords(s: string): ChordSpan[] {
  const out: ChordSpan[] = [];
  let step = 0;
  for (const tok of s.split(/\s+/).filter((t) => t && t !== '|')) {
    const [sym, d] = tok.split(':');
    const dur = d ? Number(d) : 16;
    const m = /^([A-G])(#|b)?(.*)$/.exec(sym);
    if (!m) throw new Error(`Bad chord ${tok}`);
    const root = (PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12) % 12;
    const q = QUALITIES.find(([k]) => k === m[3]);
    if (!q) throw new Error(`Bad chord quality ${tok}`);
    out.push({ step, dur, root, tones: q[1] });
    step += dur;
  }
  return out;
}

export function parseLine(s: string): { step: number; dur: number; midi: number }[] {
  const out: { step: number; dur: number; midi: number }[] = [];
  let step = 0;
  let last = 2;
  for (const tok of s.split(/\s+/).filter((t) => t && t !== '|')) {
    const [p, d] = tok.split(':');
    const dur = d ? Number(d) : last;
    last = dur;
    if (p !== 'r') out.push({ step, dur, midi: parsePitch(p) });
    step += dur;
  }
  return out;
}

export function lineLength(s: string): number {
  let step = 0;
  let last = 2;
  for (const tok of s.split(/\s+/).filter((t) => t && t !== '|')) {
    const d = tok.split(':')[1];
    last = d ? Number(d) : last;
    step += last;
  }
  return step;
}

const DRUMS: Record<Exclude<DrumStyle, 'none'>, { k: string; s: string; h: string; fill?: string }> = {
  soft: { k: 'x.......x.......', s: '................', h: '..x...x...x...x.' },
  pop: { k: 'x.......x.x.....', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.', fill: '....x...x.x.xxxx' },
  battle: { k: 'x.....x.x.....x.', s: '....x.......x..x', h: 'xxxxxxxxxxxxxxxx', fill: '....x..xx.x.xxxx' },
  march: { k: 'x.......x.......', s: '....x..x....x.xx', h: 'x.x.x.x.x.x.x.x.', fill: 'x.xxx.xxx.xxxxxx' },
  tense: { k: 'x..x..x.x..x..x.', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.', fill: '....x.x.x.xxxxxx' },
};

/** Lowest MIDI note >= lo with the given pitch class. */
const above = (pc: number, lo: number) => lo + ((pc - lo) % 12 + 12) % 12;

export function compile(song: Song): Compiled {
  const stepSec = 60 / song.bpm / 4;
  const chords = parseChords(song.chords);
  const length = chords.reduce((n, c) => n + c.dur, 0);
  const events: NoteEvent[] = [];

  for (const n of parseLine(song.lead)) events.push({ ...n, inst: 'lead', vel: 1 });
  if (song.counter) for (const n of parseLine(song.counter)) events.push({ ...n, inst: 'harm', vel: 0.8 });

  const arpBase = 55 + (song.arpOctave ?? 0); // around G3..F#4
  for (const c of chords) {
    const voicing = c.tones.map((t) => above(c.root, arpBase) + t);
    const bassRoot = above(c.root, 36); // C2..B2
    const fifth = bassRoot + 7;
    // Harmony.
    if (song.arp === 'pad') {
      for (const m of voicing.slice(0, 3)) events.push({ step: c.step, dur: c.dur, inst: 'harm', midi: m, vel: 0.5 });
    } else if (song.arp === 'stab') {
      for (let s = 2; s < c.dur; s += 4) for (const m of voicing.slice(0, 3)) events.push({ step: c.step + s, dur: 1, inst: 'harm', midi: m, vel: 0.6 });
    } else if (song.arp === 'up' || song.arp === 'updown') {
      const seq = song.arp === 'up' ? [...voicing.slice(0, 3), voicing[0] + 12] : [voicing[0], voicing[1], voicing[2], voicing[0] + 12, voicing[2], voicing[1]];
      for (let s = 0; s < c.dur; s++) events.push({ step: c.step + s, dur: 1, inst: 'arp', midi: seq[s % seq.length], vel: s % 4 === 0 ? 1 : 0.75 });
    }
    // Bass.
    const b = (s: number, dur: number, midi: number, vel = 1) => {
      if (s < c.dur) events.push({ step: c.step + s, dur: Math.min(dur, c.dur - s), inst: 'bass', midi, vel });
    };
    switch (song.bass) {
      case 'root8':
        for (let s = 0; s < c.dur; s += 2) b(s, 2, bassRoot, s % 4 === 0 ? 1 : 0.8);
        break;
      case 'octave':
        for (let s = 0; s < c.dur; s += 2) b(s, 2, s % 4 === 0 ? bassRoot : bassRoot + 12, s % 4 === 0 ? 1 : 0.85);
        break;
      case 'pulse16':
        for (let s = 0; s < c.dur; s++) b(s, 1, s % 8 === 6 ? fifth : s % 4 === 2 ? bassRoot + 12 : bassRoot, s % 4 === 0 ? 1 : 0.7);
        break;
      case 'walk': {
        const pat = [bassRoot, fifth, bassRoot + 12, fifth];
        for (let s = 0, i = 0; s < c.dur; s += 4, i++) b(s, 4, pat[i % 4]);
        break;
      }
      case 'half':
        for (let s = 0; s < c.dur; s += 8) b(s, 8, s % 16 === 0 ? bassRoot : fifth);
        break;
      case 'none':
        break;
    }
  }

  if (song.drums !== 'none') {
    const p = DRUMS[song.drums];
    for (let bar = 0; bar * 16 < length; bar++) {
      const fillBar = p.fill && bar % 8 === 7;
      for (let s = 0; s < 16; s++) {
        const step = bar * 16 + s;
        if (step >= length) break;
        if (p.k[s] === 'x') events.push({ step, dur: 1, inst: 'drum', drum: 'k', midi: 0, vel: 1 });
        if ((fillBar ? p.fill! : p.s)[s] === 'x') events.push({ step, dur: 1, inst: 'drum', drum: 's', midi: 0, vel: fillBar && s > 8 ? 0.8 : 1 });
        if (p.h[s] === 'x') events.push({ step, dur: 1, inst: 'drum', drum: 'h', midi: 0, vel: s % 2 === 0 ? 1 : 0.55 });
      }
      // Crash-ish open hat on the downbeat of each 8-bar phrase.
      if (bar % 8 === 0) events.push({ step: bar * 16, dur: 4, inst: 'drum', drum: 'o', midi: 0, vel: 0.8 });
    }
  }

  events.sort((a, b) => a.step - b.step);
  return { stepSec, length, events, loop: song.loop ?? true, duty: song.duty ?? 0.25, echo: song.echo ?? 0.25 };
}

// ---------------------------------------------------------------------------------------
// Synthesis

const waveCache = new WeakMap<BaseAudioContext, Map<string, PeriodicWave>>();
const noiseCache = new WeakMap<BaseAudioContext, AudioBuffer>();

export function pulseWave(ctx: BaseAudioContext, duty: number): PeriodicWave {
  let m = waveCache.get(ctx);
  if (!m) waveCache.set(ctx, (m = new Map()));
  const key = `p${duty}`;
  let w = m.get(key);
  if (!w) {
    const N = 48;
    const real = new Float32Array(N);
    const imag = new Float32Array(N);
    for (let n = 1; n < N; n++) {
      // Fourier series of a pulse with the given duty, softened towards the top so the
      // edges are bright but not harsh.
      const soft = 1 / (1 + (n / 28) ** 2);
      real[n] = ((2 / (n * Math.PI)) * Math.sin(n * Math.PI * duty)) * soft;
    }
    w = ctx.createPeriodicWave(real, imag, { disableNormalization: false });
    m.set(key, w);
  }
  return w;
}

export function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  let b = noiseCache.get(ctx);
  if (!b) {
    b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = b.getChannelData(0);
    let seed = 12345;
    for (let i = 0; i < d.length; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      d[i] = (seed / 0x3fffffff) - 1;
    }
    noiseCache.set(ctx, b);
  }
  return b;
}

const LEVEL: Record<Instrument, number> = { lead: 0.15, harm: 0.07, arp: 0.055, bass: 0.26 };

/** Plays one compiled song on a context, scheduling a window at a time. */
export class Player {
  readonly out: GainNode;
  private echoSend: GainNode;
  private next = 0;
  private cycleStart: number;
  private stopped = false;
  /** When a non-looping song's last sound ends. */
  readonly endTime: number;

  constructor(
    private ctx: BaseAudioContext,
    dest: AudioNode,
    private song: Compiled,
    startAt: number,
  ) {
    this.cycleStart = startAt;
    this.out = ctx.createGain();
    this.out.connect(dest);
    // Echo on the lead: a dotted-eighth-ish delay with gentle feedback and darkening.
    this.echoSend = ctx.createGain();
    this.echoSend.gain.value = song.echo;
    const delay = ctx.createDelay(2);
    delay.delayTime.value = song.stepSec * 3;
    const fb = ctx.createGain();
    fb.gain.value = 0.32;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2600;
    this.echoSend.connect(delay);
    delay.connect(lp);
    lp.connect(fb);
    fb.connect(delay);
    lp.connect(this.out);
    this.endTime = startAt + song.length * song.stepSec + 0.4;
  }

  /** Schedules every event that starts before `until` (context time). */
  scheduleUntil(until: number): void {
    const { song, ctx } = this;
    if (this.stopped || song.events.length === 0) return;
    for (;;) {
      if (this.next >= song.events.length) {
        if (!song.loop) return;
        this.next = 0;
        this.cycleStart += song.length * song.stepSec;
      }
      const e = song.events[this.next];
      const t = this.cycleStart + e.step * song.stepSec;
      if (t >= until) return;
      this.next++;
      // Skip anything that has already slipped into the past (e.g. after a stall).
      if (t < ctx.currentTime - 0.05) continue;
      this.play(e, t);
    }
  }

  stop(at: number, fade: number): void {
    this.stopped = true;
    const g = this.out.gain;
    g.cancelScheduledValues(at);
    g.setValueAtTime(g.value, at);
    g.linearRampToValueAtTime(0, at + Math.max(0.01, fade));
    setTimeout(() => this.out.disconnect(), (fade + 0.5) * 1000);
  }

  private play(e: NoteEvent, t: number): void {
    const dur = e.dur * this.song.stepSec;
    if (e.inst === 'drum') drum(this.ctx, this.out, e.drum!, t, e.vel);
    else tone(this.ctx, e.inst, e.midi, t, dur, e.vel, this.song.duty, this.out, e.inst === 'lead' ? this.echoSend : null);
  }
}

function tone(
  ctx: BaseAudioContext,
  inst: Instrument,
  midi: number,
  t: number,
  dur: number,
  vel: number,
  duty: number,
  out: AudioNode,
  send: AudioNode | null,
): void {
  const osc = ctx.createOscillator();
  const freq = midiToFreq(midi);
  osc.frequency.value = freq;
  if (inst === 'bass') osc.type = 'triangle';
  else osc.setPeriodicWave(pulseWave(ctx, inst === 'lead' ? duty : inst === 'harm' ? 0.5 : 0.25));

  const g = ctx.createGain();
  const peak = LEVEL[inst] * vel;
  const a = inst === 'arp' ? 0.003 : 0.006;
  const gate = inst === 'arp' ? dur * 0.7 : Math.max(0.03, dur - 0.02);
  const sustain = inst === 'lead' ? 0.7 : inst === 'bass' ? 0.8 : 0.55;
  const rel = inst === 'lead' ? 0.07 : 0.04;
  const p = g.gain;
  p.setValueAtTime(0, t);
  p.linearRampToValueAtTime(peak, t + a);
  p.setTargetAtTime(peak * sustain, t + a, 0.08);
  p.setValueAtTime(peak * sustain, t + gate);
  p.linearRampToValueAtTime(0, t + gate + rel);

  // Delayed vibrato on held lead notes, the classic handheld touch.
  if (inst === 'lead' && dur > 0.3) {
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 5.5;
    const depth = ctx.createGain();
    depth.gain.setValueAtTime(0, t);
    depth.gain.linearRampToValueAtTime(0, t + 0.18);
    depth.gain.linearRampToValueAtTime(freq * 0.012, t + 0.45);
    lfo.connect(depth);
    depth.connect(osc.frequency);
    lfo.start(t);
    lfo.stop(t + gate + rel + 0.02);
  }

  osc.connect(g);
  g.connect(out);
  if (send) g.connect(send);
  osc.start(t);
  osc.stop(t + gate + rel + 0.02);
}

function drum(ctx: BaseAudioContext, out: AudioNode, kind: Drum, t: number, vel: number): void {
  if (kind === 'k') {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.42 * vel, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(g);
    g.connect(out);
    osc.start(t);
    osc.stop(t + 0.22);
    return;
  }
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  const f = ctx.createBiquadFilter();
  const g = ctx.createGain();
  let len: number;
  let lvl: number;
  if (kind === 's') {
    f.type = 'bandpass';
    f.frequency.value = 1800;
    f.Q.value = 0.7;
    len = 0.14;
    lvl = 0.22;
    // A short tonal body under the noise.
    const body = ctx.createOscillator();
    body.type = 'triangle';
    body.frequency.setValueAtTime(240, t);
    body.frequency.exponentialRampToValueAtTime(140, t + 0.06);
    const bg = ctx.createGain();
    bg.gain.setValueAtTime(0.16 * vel, t);
    bg.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    body.connect(bg);
    bg.connect(out);
    body.start(t);
    body.stop(t + 0.1);
  } else {
    f.type = 'highpass';
    f.frequency.value = 7000;
    len = kind === 'o' ? 0.35 : 0.04;
    lvl = kind === 'o' ? 0.07 : 0.06;
  }
  g.gain.setValueAtTime(lvl * vel, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + len);
  src.connect(f);
  f.connect(g);
  g.connect(out);
  src.start(t, Math.random() * 0.5);
  src.stop(t + len + 0.02);
}

/** Master chain: music and sfx buses -> trims -> compressor -> master gain -> destination. */
export function masterChain(ctx: BaseAudioContext): { music: GainNode; sfx: GainNode; master: GainNode } {
  const master = ctx.createGain();
  master.gain.value = 0.85;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.knee.value = 8;
  comp.ratio.value = 6;
  comp.attack.value = 0.003;
  comp.release.value = 0.15;
  const music = ctx.createGain();
  const sfx = ctx.createGain();
  // Fixed trims that balance the two buses: sound effects are short and must cut
  // through a full arrangement.
  const musicTrim = ctx.createGain();
  musicTrim.gain.value = 0.8;
  const sfxTrim = ctx.createGain();
  sfxTrim.gain.value = 1.8;
  music.connect(musicTrim);
  sfx.connect(sfxTrim);
  musicTrim.connect(comp);
  sfxTrim.connect(comp);
  comp.connect(master);
  master.connect(ctx.destination);
  return { music, sfx, master };
}
