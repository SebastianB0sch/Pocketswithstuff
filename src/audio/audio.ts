/**
 * The game's one audio entry point: music, jingles and sound effects, all synthesized.
 *
 * Nothing touches Web Audio until `unlock()` is called from a user gesture, and every
 * call quietly does nothing when Web Audio is unavailable (Node tests, old browsers).
 */
import { Player, compile, masterChain, type Compiled } from './engine';
import { playSfx, type SfxId } from './sfx';
import { JINGLES, TRACKS, type JingleId, type TrackId } from './songs';

export type { JingleId, SfxId, TrackId };

const LOOKAHEAD = 0.15;
const HIDDEN_LOOKAHEAD = 1.5;

class AudioSystem {
  private ctx: AudioContext | null = null;
  private music: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private duck: GainNode | null = null;
  private player: Player | null = null;
  private jinglePlayers: Player[] = [];
  private current: TrackId | null = null;
  /** Requested before unlock; started as soon as the context exists. */
  private wanted: TrackId | null = null;
  private compiled = new Map<string, Compiled>();
  private jingleDepth = 0;
  private _music = 0.7;
  private _sfx = 0.8;

  get musicVolume(): number {
    return this._music;
  }

  get sfxVolume(): number {
    return this._sfx;
  }

  unlock(): void {
    try {
      if (!this.ctx) {
        const Ctor: typeof AudioContext | undefined =
          typeof window !== 'undefined' ? window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext : undefined;
        if (!Ctor) return;
        this.ctx = new Ctor({ latencyHint: 'interactive' });
        const chain = masterChain(this.ctx);
        this.duck = this.ctx.createGain();
        this.duck.connect(chain.music);
        this.music = chain.music;
        this.sfxBus = chain.sfx;
        this.applyVolumes();
        setInterval(() => this.tick(), 25);
        if (this.wanted) {
          const w = this.wanted;
          this.wanted = null;
          this.playMusic(w);
        }
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
    } catch {
      this.ctx = null;
    }
  }

  playMusic(id: TrackId): void {
    if (!this.ctx || !this.duck) {
      this.wanted = id;
      return;
    }
    if (this.current === id && this.player) return;
    try {
      const now = this.ctx.currentTime;
      this.player?.stop(now, 0.3);
      this.current = id;
      const p = new Player(this.ctx, this.duck, this.song('t:' + id, () => TRACKS[id]), now + 0.08);
      p.out.gain.setValueAtTime(0, now);
      p.out.gain.linearRampToValueAtTime(1, now + 0.25);
      this.player = p;
      p.scheduleUntil(now + LOOKAHEAD);
    } catch {
      /* audio is optional */
    }
  }

  stopMusic(fadeSeconds = 0.5): void {
    this.wanted = null;
    if (!this.ctx) return;
    this.player?.stop(this.ctx.currentTime, fadeSeconds);
    this.player = null;
    this.current = null;
  }

  /** Plays a one-shot over silenced music, resolving when it has finished. */
  jingle(id: JingleId): Promise<void> {
    const ctx = this.ctx;
    if (!ctx || !this.duck || !this.music) return Promise.resolve();
    try {
      const now = ctx.currentTime;
      this.jingleDepth++;
      const d = this.duck.gain;
      d.cancelScheduledValues(now);
      d.setValueAtTime(d.value, now);
      d.linearRampToValueAtTime(0, now + 0.08);
      const p = new Player(ctx, this.music, this.song('j:' + id, () => JINGLES[id]), now + 0.1);
      this.jinglePlayers.push(p);
      p.scheduleUntil(p.endTime);
      const ms = (p.endTime - now) * 1000;
      return new Promise((resolve) => {
        setTimeout(() => {
          this.jinglePlayers = this.jinglePlayers.filter((j) => j !== p);
          if (--this.jingleDepth === 0 && this.ctx && this.duck) {
            const t = this.ctx.currentTime;
            this.duck.gain.cancelScheduledValues(t);
            this.duck.gain.setValueAtTime(0, t);
            this.duck.gain.linearRampToValueAtTime(1, t + 0.6);
          }
          resolve();
        }, ms);
      });
    } catch {
      return Promise.resolve();
    }
  }

  sfx(id: SfxId): void {
    if (!this.ctx || !this.sfxBus || this.ctx.state !== 'running') return;
    try {
      playSfx(this.ctx, this.sfxBus, id);
    } catch {
      /* audio is optional */
    }
  }

  setVolumes(music: number, sfx: number): void {
    this._music = Math.max(0, Math.min(1, music));
    this._sfx = Math.max(0, Math.min(1, sfx));
    this.applyVolumes();
  }

  private applyVolumes(): void {
    if (!this.ctx || !this.music || !this.sfxBus) return;
    const t = this.ctx.currentTime;
    // Squared for a more natural-feeling slider.
    this.music.gain.setTargetAtTime(this._music ** 2, t, 0.03);
    this.sfxBus.gain.setTargetAtTime(this._sfx ** 2, t, 0.03);
  }

  private song(key: string, get: () => Parameters<typeof compile>[0]): Compiled {
    let c = this.compiled.get(key);
    if (!c) this.compiled.set(key, (c = compile(get())));
    return c;
  }

  private tick(): void {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const ahead = typeof document !== 'undefined' && document.hidden ? HIDDEN_LOOKAHEAD : LOOKAHEAD;
    this.player?.scheduleUntil(this.ctx.currentTime + ahead);
  }
}

export const audio = new AudioSystem();
