/**
 * The battle screen: plays back engine events as animations and text, and
 * offers the DS-style command panel (a big FIGHT button with BAG, POCKLETS
 * and RUN beneath it, then four type-coloured move buttons).
 */
import { audio } from '../audio/audio';
import { Rng } from '../core/rng';
import { item as itemData } from '../data/items';
import { move as moveData } from '../data/moves';
import { expForLevel, species } from '../data/species';
import { TYPE_COLORS, type Type } from '../data/types';
import { displayName, maxHp, type Creature } from '../game/creature';
import type { Game, Scene } from '../game/game';
import { addItem, markCaught } from '../game/state';
import { drawTrainerPortrait, LOOKS } from '../gfx/characters';
import { creatureFloats, creatureSprite } from '../gfx/creatures';
import { openBag } from '../ui/bag';
import { dialogBox, say } from '../ui/dialog';
import { bar, button, C, cursor, hpBar, outlined, panel, pouchIcon, roundRect, star, statusBadge, text } from '../ui/draw';
import { askForgetMove } from '../ui/learnmove';
import { openParty } from '../ui/party';
import type { TrainerDef } from '../world/mapdef';
import { timeOfDay } from '../world/world3d';
import { Battle, type BattleEvent, type Outcome } from './engine';

export interface BattleSetup {
  trainer?: TrainerDef;
  look?: string;
  mapName: string;
  outdoor: boolean;
}

export interface BattleResult {
  outcome: Outcome;
  leveled: number[];
}

interface SpriteState {
  index: number;
  visible: boolean;
  dx: number;
  dy: number;
  scale: number;
  alpha: number;
  white: number;
  blink: boolean;
  /** 0..1 slide-down clip when fainting. */
  sink: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  shape: 'circle' | 'star' | 'leaf' | 'drop' | 'bolt' | 'flame' | 'ring' | 'shard' | 'arrowUp' | 'arrowDown' | 'note';
  spin: number;
  grav: number;
}

const TYPE_FX: Record<Type, { shape: Particle['shape']; colors: string[]; sfx: Parameters<typeof audio.sfx>[0] }> = {
  normal: { shape: 'star', colors: ['#ffffff', '#f8e8a0'], sfx: 'thud' },
  fire: { shape: 'flame', colors: ['#ff7a30', '#ffc040', '#ff4020'], sfx: 'ember' },
  water: { shape: 'drop', colors: ['#58a8f8', '#a8d8ff', '#3878e0'], sfx: 'splash' },
  grass: { shape: 'leaf', colors: ['#58c048', '#a0e070', '#2f8a30'], sfx: 'leaf' },
  electric: { shape: 'bolt', colors: ['#ffe040', '#fff8a0'], sfx: 'zap' },
  ice: { shape: 'shard', colors: ['#c0f0ff', '#80d0f0', '#ffffff'], sfx: 'sparkle' },
  fighting: { shape: 'star', colors: ['#f08040', '#ffd080'], sfx: 'thud' },
  poison: { shape: 'circle', colors: ['#b060c0', '#d890e0', '#803890'], sfx: 'splash' },
  ground: { shape: 'circle', colors: ['#c8a060', '#a07840', '#e0c890'], sfx: 'thud' },
  flying: { shape: 'ring', colors: ['#e0e8ff', '#b0c0f0'], sfx: 'whoosh' },
  psychic: { shape: 'ring', colors: ['#f878b0', '#ffb0d8'], sfx: 'sparkle' },
  bug: { shape: 'circle', colors: ['#a8c838', '#d8e870'], sfx: 'slash' },
  rock: { shape: 'shard', colors: ['#a89060', '#c8b080', '#806840'], sfx: 'thud' },
  ghost: { shape: 'ring', colors: ['#7058a8', '#a890e0', '#403068'], sfx: 'whoosh' },
  dragon: { shape: 'flame', colors: ['#8060f0', '#b098ff', '#5038c0'], sfx: 'whoosh' },
  dark: { shape: 'ring', colors: ['#504048', '#887080'], sfx: 'slash' },
  steel: { shape: 'star', colors: ['#d0d8e8', '#ffffff', '#9098b0'], sfx: 'slash' },
};

type Menu = 'none' | 'command' | 'fight';

export function runBattle(g: Game, foe: Creature[], setup: BattleSetup): Promise<BattleResult> {
  return (async () => {
    audio.playMusic(setup.trainer?.leader ? 'battleLeader' : setup.trainer ? 'battleTrainer' : 'battleWild');
    await transition(g);
    const scene = new BattleScene(g, foe, setup);
    const result = g.run<BattleResult>(scene);
    await g.fadeIn(0.2);
    // Resolves with the screen faded to black; the caller fades back in.
    return result;
  })();
}

/** Flash twice, then close shutters over the world. */
async function transition(g: Game): Promise<void> {
  audio.sfx('encounter');
  let t = 0;
  const scene: Scene = {
    showWorld: true,
    update: (dt) => {
      t += dt;
      if (t >= 1.0) g.close(scene);
    },
    draw: (ctx) => {
      const W = g.view.width;
      const H = g.view.height;
      if (t < 0.4) {
        const f = Math.sin((t / 0.2) * Math.PI);
        ctx.fillStyle = `rgba(255,255,255,${Math.max(0, f) * 0.85})`;
        ctx.fillRect(0, 0, W, H);
        return;
      }
      const p = Math.min(1, (t - 0.4) / 0.55);
      ctx.fillStyle = '#101018';
      const bands = 8;
      for (let i = 0; i < bands; i++) {
        const y = (i * H) / bands;
        const w = W * Math.min(1, p * 1.4 - (i % 2) * 0.15);
        if (i % 2) ctx.fillRect(W - w, y, w, H / bands + 1);
        else ctx.fillRect(0, y, w, H / bands + 1);
      }
    },
  };
  await g.run(scene);
  await g.fadeOut(0.01);
}

class BattleScene implements Scene {
  opaque = true;
  private battle: Battle;
  private rng = new Rng();
  private t = 0;
  private menu: Menu = 'none';
  private cmdSel = 0;
  private moveSel = 0;
  private sprites: [SpriteState, SpriteState];
  private shown = [
    { hp: 0, max: 1, status: null as string | null, level: 1, exp: 0, box: 0 },
    { hp: 0, max: 1, status: null as string | null, level: 1, exp: 0, box: 0 },
  ];
  private particles: Particle[] = [];
  private tweens: { t: number; dur: number; fn: (p: number) => void; done: () => void }[] = [];
  private shake = 0;
  private flash = 0;
  private platformIn = 0;
  private trainerX = 0;
  private playerTrainerX = 0;
  private pouch: { x: number; y: number; r: number; visible: boolean; rot: number; open: number } = { x: 0, y: 0, r: 18, visible: false, rot: 0, open: 0 };
  private queue: BattleEvent[] = [];
  private choice: ((a: number) => void) | null = null;
  private lowHpTimer = 0;
  private moneyWon = 0;

  constructor(
    private g: Game,
    private foe: Creature[],
    private setup: BattleSetup,
  ) {
    this.battle = new Battle(g.save.party, foe, {
      kind: setup.trainer ? 'trainer' : 'wild',
      rng: this.rng,
      trainerName: setup.trainer?.name,
    });
    const blank = (): SpriteState => ({ index: 0, visible: false, dx: 0, dy: 0, scale: 1, alpha: 1, white: 0, blink: false, sink: 0 });
    this.sprites = [blank(), blank()];
    void this.main();
  }

  // ---------------------------------------------------------------------
  // Layout

  private get band(): number {
    return dialogBox(this.g).y - 8;
  }

  /** Platform centres; they slide in from opposite sides during the intro. */
  private foeBase(): { x: number; y: number } {
    const W = this.g.view.width;
    return { x: W * 0.71 - (1 - this.platformIn) * W, y: this.band * 0.5 };
  }

  private playerBase(): { x: number; y: number } {
    const W = this.g.view.width;
    return { x: W * 0.27 + (1 - this.platformIn) * W, y: this.band * 0.94 };
  }

  private creatureOf(side: 0 | 1): Creature {
    return side === 0 ? this.g.save.party[this.sprites[0].index] : this.foe[this.sprites[1].index];
  }

  // ---------------------------------------------------------------------
  // Async helpers

  private anim(dur: number, fn: (p: number) => void): Promise<void> {
    return new Promise((done) => this.tweens.push({ t: 0, dur, fn, done }));
  }

  private wait(s: number): Promise<void> {
    return this.anim(s, () => {});
  }

  private async text(msg: string, auto = 1.0): Promise<void> {
    await say(this.g, msg, { auto });
  }

  // ---------------------------------------------------------------------
  // Flow

  private async main(): Promise<void> {
    const trainer = this.setup.trainer;
    this.trainerX = trainer ? 0 : 1;
    if (!trainer) {
      this.sprites[1].visible = true;
      this.sprites[1].index = this.battle.foeIndex;
      this.syncInfo(1, []);
    }
    // Intro: the platforms slide in from the sides, carrying whoever stands on them.
    await this.anim(0.9, (p) => (this.platformIn = 1 - (1 - p) ** 3));
    await this.play(this.battle.start());
    for (;;) {
      if (this.battle.state === 'over') break;
      if (this.battle.state === 'mustSwitch') {
        const idx = await openParty(this.g, 'forced', { title: 'Choose a Pocklet.', active: this.battle.playerIndex });
        await this.play(this.battle.forceSwitch(idx));
        continue;
      }
      const action = await this.chooseAction();
      if (!action) continue;
      const events = this.battle.turn(action);
      if (action.t === 'item' && this.battle.itemConsumed) addItem(this.g.save, action.item, -1);
      await this.play(events);
    }
    await this.finish();
  }

  private async chooseAction(): Promise<Parameters<Battle['turn']>[0] | null> {
    for (;;) {
      this.menu = 'command';
      const cmd = await new Promise<number>((r) => (this.choice = r));
      this.choice = null;
      if (cmd === 0) {
        const me = this.battle.active(0);
        if (me.moves.every((m) => m.pp <= 0)) {
          this.menu = 'none';
          return { t: 'move', slot: 0 };
        }
        this.menu = 'fight';
        const slot = await new Promise<number>((r) => (this.choice = r));
        this.choice = null;
        if (slot < 0) continue;
        if (me.moves[slot].pp <= 0) {
          this.menu = 'none';
          await this.text("There's no PP left for this move!", 0.9);
          continue;
        }
        this.menu = 'none';
        return { t: 'move', slot };
      }
      this.menu = 'none';
      if (cmd === 1) {
        const r = await openBag(this.g, 'battle', { canCatch: !this.setup.trainer });
        if (!r) continue;
        return { t: 'item', item: r.item, target: r.target };
      }
      if (cmd === 2) {
        const idx = await openParty(this.g, 'battle', { active: this.battle.playerIndex });
        if (idx < 0) continue;
        return { t: 'switch', index: idx };
      }
      return { t: 'run' };
    }
  }

  private async play(events: BattleEvent[]): Promise<void> {
    this.queue = [...events];
    while (this.queue.length) {
      const e = this.queue.shift()!;
      await this.event(e);
    }
  }

  /** The upcoming events in this batch (for picking hit sounds and initial bar values). */
  private ahead(): BattleEvent[] {
    return this.queue;
  }

  private syncInfo(side: 0 | 1, rest: BattleEvent[]): void {
    const c = this.creatureOf(side);
    const s = this.shown[side];
    s.max = maxHp(c);
    const nextHp = rest.find((e) => e.t === 'hp' && e.side === side) as Extract<BattleEvent, { t: 'hp' }> | undefined;
    s.hp = nextHp ? nextHp.from : c.hp;
    const nextStatus = rest.find((e) => e.t === 'status' && e.side === side);
    s.status = nextStatus ? null : c.status;
    if (side === 0) {
      const idx = this.sprites[0].index;
      const levels = rest.filter((e) => e.t === 'level' && e.index === idx).length;
      const gained = rest.filter((e): e is Extract<BattleEvent, { t: 'exp' }> => e.t === 'exp' && e.index === idx).reduce((a, e) => a + e.gained, 0);
      s.level = c.level - levels;
      s.exp = c.exp - gained;
    } else {
      s.level = c.level;
    }
  }

  private async event(e: BattleEvent): Promise<void> {
    switch (e.t) {
      case 'text':
        await this.text(e.text);
        break;
      case 'send':
        await this.sendOut(e.side, e.index);
        break;
      case 'recall': {
        const sp = this.sprites[e.side];
        audio.sfx('whoosh');
        await this.anim(0.35, (p) => {
          sp.white = p;
          sp.scale = 1 - p;
        });
        sp.visible = false;
        sp.white = 0;
        sp.scale = 1;
        this.shown[e.side].box = 0;
        break;
      }
      case 'move':
        await this.moveAnim(e.side, e.move);
        break;
      case 'hp':
        await this.hpChange(e.side, e.from, e.to, e.max);
        break;
      case 'effect':
        if (e.kind === 'miss') audio.sfx('whoosh');
        break;
      case 'faint': {
        const sp = this.sprites[e.side];
        audio.sfx('faint');
        await this.anim(0.5, (p) => {
          sp.sink = p;
          sp.alpha = 1 - p * 0.6;
        });
        sp.visible = false;
        sp.sink = 0;
        sp.alpha = 1;
        await this.anim(0.25, (p) => (this.shown[e.side].box = 1 - p));
        break;
      }
      case 'status':
        this.shown[e.side].status = e.status;
        if (e.status) await this.burst(e.side, statusFx(e.status), 0.5, 16);
        break;
      case 'stat':
        audio.sfx(e.n > 0 ? 'statUp' : 'statDown');
        await this.burst(e.side, { shape: e.n > 0 ? 'arrowUp' : 'arrowDown', colors: e.n > 0 ? ['#68a8ff', '#a8d0ff'] : ['#ff6060', '#ffa0a0'] }, 0.7, 14);
        break;
      case 'exp':
        await this.expGain(e.from, e.to);
        break;
      case 'level': {
        const s = this.shown[0];
        s.level = e.level;
        const c = this.g.save.party[e.index];
        if (e.index === this.sprites[0].index) {
          s.max = maxHp(c);
          s.hp = Math.min(s.max, c.hp);
        }
        void audio.jingle('levelup');
        if (e.index === this.sprites[0].index) await this.burst(0, { shape: 'star', colors: ['#fff080', '#ffffff'] }, 0.6, 18);
        break;
      }
      case 'learn':
        break;
      case 'learnPrompt': {
        const c = this.g.save.party[e.index];
        const slot = await askForgetMove(this.g, c, e.move);
        if (slot >= 0) this.battle.replaceMove(e.index, slot, e.move);
        break;
      }
      case 'throw':
        await this.throwPouch(e.item, e.shakes, e.caught);
        break;
      case 'end':
        break;
    }
  }

  private async sendOut(side: 0 | 1, index: number): Promise<void> {
    const sp = this.sprites[side];
    const wildStart = side === 1 && !this.setup.trainer && sp.visible && sp.index === index;
    sp.index = index;
    if (wildStart) {
      this.syncInfo(1, this.ahead());
      await this.anim(0.3, (p) => (this.shown[1].box = p));
      return;
    }
    // Trainers step aside as their first Pocklet comes out.
    if (side === 1 && this.trainerX < 1) await this.anim(0.4, (p) => (this.trainerX = p));
    if (side === 0 && this.playerTrainerX < 1) {
      void this.anim(0.45, (p) => (this.playerTrainerX = p));
    }
    const base = side === 0 ? this.playerBase() : this.foeBase();
    const from = side === 0 ? { x: base.x - 160, y: base.y - 120 } : { x: base.x + 150, y: base.y - 140 };
    const to = { x: base.x, y: base.y - (side === 0 ? 90 : 70) };
    this.pouch = { x: from.x, y: from.y, r: 18, visible: true, rot: 0, open: 0 };
    audio.sfx('throw');
    await this.anim(0.4, (p) => {
      this.pouch.x = from.x + (to.x - from.x) * p;
      this.pouch.y = from.y + (to.y - from.y) * p - Math.sin(p * Math.PI) * 60;
      this.pouch.rot = p * 8;
    });
    this.pouch.visible = false;
    audio.sfx('sparkle');
    this.syncInfo(side, this.ahead());
    sp.visible = true;
    sp.white = 1;
    sp.scale = 0;
    this.burstAt(to.x, to.y, { shape: 'star', colors: ['#ffffff', '#fff0a0'] }, 12, 1);
    await this.anim(0.3, (p) => (sp.scale = p));
    await this.anim(0.25, (p) => (sp.white = 1 - p));
    await this.anim(0.25, (p) => (this.shown[side].box = p));
  }

  private async moveAnim(side: 0 | 1, moveId: string): Promise<void> {
    if (!this.g.save.options.animations) return;
    const m = moveData(moveId);
    const fx = TYPE_FX[m.type];
    const me = this.spriteCenter(side);
    const them = this.spriteCenter(side === 0 ? 1 : 0);
    const sp = this.sprites[side];
    if (m.category === 'status') {
      const selfish = !(m.effects ?? []).some((e) => (e.t === 'stat' && e.who === 'foe') || e.t === 'status' || e.t === 'confuse');
      audio.sfx(selfish ? 'sparkle' : fx.sfx);
      const target = selfish ? me : them;
      this.burstAt(target.x, target.y, fx, 18, 1.1);
      await this.wait(0.55);
      return;
    }
    if (m.category === 'physical') {
      const dir = side === 0 ? 1 : -1;
      audio.sfx('whoosh');
      await this.anim(0.14, (p) => {
        sp.dx = dir * p * 46;
        sp.dy = -dir * p * 20;
      });
      audio.sfx(fx.sfx);
      this.burstAt(them.x, them.y, fx, 22, 1.2);
      await this.anim(0.18, (p) => {
        sp.dx = dir * (1 - p) * 46;
        sp.dy = -dir * (1 - p) * 20;
      });
      await this.wait(0.15);
      return;
    }
    // Special: a stream of particles from user to target.
    audio.sfx(fx.sfx);
    const n = 14;
    for (let i = 0; i < n; i++) {
      const s = 0.55;
      this.particles.push({
        x: me.x,
        y: me.y,
        vx: (them.x - me.x) / s + (this.rng.next() - 0.5) * 60,
        vy: (them.y - me.y) / s + (this.rng.next() - 0.5) * 60,
        life: s + i * 0.025,
        max: s + i * 0.025,
        size: 12 + this.rng.next() * 10,
        color: this.rng.pick(fx.colors),
        shape: fx.shape,
        spin: (this.rng.next() - 0.5) * 8,
        grav: 0,
      });
    }
    await this.wait(0.55);
    this.burstAt(them.x, them.y, fx, 18, 1);
    await this.wait(0.2);
  }

  private async hpChange(side: 0 | 1, from: number, to: number, max: number): Promise<void> {
    const s = this.shown[side];
    s.max = max;
    const sp = this.sprites[side];
    if (to < from) {
      const eff = this.ahead().find((e) => e.t === 'effect' || e.t === 'move');
      const kind = eff && eff.t === 'effect' ? eff.kind : null;
      audio.sfx(kind === 'super' ? 'hitSuper' : kind === 'weak' ? 'hitWeak' : 'hit');
      if (kind === 'super') this.shake = 0.35;
      this.flash = kind === 'crit' ? 0.25 : 0;
      await this.anim(0.5, (p) => (sp.blink = Math.floor(p * 8) % 2 === 1));
      sp.blink = false;
    } else if (to > from) {
      audio.sfx('heal');
    }
    const dur = Math.max(0.35, Math.min(1.3, (Math.abs(to - from) / Math.max(1, max)) * 1.8));
    await this.anim(dur, (p) => (s.hp = from + (to - from) * p));
    s.hp = to;
  }

  private async expGain(from: number, to: number): Promise<void> {
    const s = this.shown[0];
    const c = this.creatureOf(0);
    const growth = species(c.species).growth;
    audio.sfx('sparkle');
    // Fill bar segment by segment so it wraps on level-ups.
    let cur = from;
    while (cur < to) {
      const next = expForLevel(growth, s.level + 1);
      const end = Math.min(to, next);
      const start = cur;
      await this.anim(Math.max(0.3, Math.min(1.0, (end - start) / Math.max(1, next - expForLevel(growth, s.level)))), (p) => (s.exp = start + (end - start) * p));
      cur = end;
      if (cur >= next && cur < to) {
        s.level++;
        s.exp = cur;
      } else break;
    }
    s.exp = to;
  }

  private async throwPouch(itemId: string, shakes: number, caught: boolean): Promise<void> {
    const color = itemId === 'deeppouch' ? '#3a3a58' : itemId === 'snugpouch' ? '#4878d8' : '#d85848';
    const base = this.foeBase();
    const target = { x: base.x, y: base.y - 90 };
    const from = { x: this.playerBase().x, y: this.band };
    this.pouch = { x: from.x, y: from.y, r: 18, visible: true, rot: 0, open: 0 };
    audio.sfx('throw');
    await this.anim(0.6, (p) => {
      this.pouch.x = from.x + (target.x - from.x) * p;
      this.pouch.y = from.y + (target.y - from.y) * p - Math.sin(p * Math.PI) * 160;
      this.pouch.rot = p * 12;
    });
    this.pouch.rot = 0;
    void color;
    const sp = this.sprites[1];
    audio.sfx('sparkle');
    this.pouch.open = 1;
    await this.anim(0.4, (p) => {
      sp.white = p;
      sp.scale = 1 - p;
    });
    sp.visible = false;
    this.pouch.open = 0;
    // Drop to the ground.
    const ground = base.y - 20;
    await this.anim(0.35, (p) => (this.pouch.y = target.y + (ground - target.y) * (p * p)));
    audio.sfx('thud');
    for (let i = 0; i < shakes; i++) {
      await this.wait(0.35);
      audio.sfx('shake');
      await this.anim(0.4, (p) => (this.pouch.rot = Math.sin(p * Math.PI * 2) * 0.45));
    }
    await this.wait(0.4);
    if (caught) {
      audio.sfx('click');
      this.burstAt(this.pouch.x, this.pouch.y - 10, { shape: 'star', colors: ['#fff080', '#ffffff'] }, 10, 0.8);
      void audio.jingle('caught');
      await this.wait(0.8);
    } else {
      audio.sfx('sparkle');
      this.pouch.visible = false;
      sp.visible = true;
      await this.anim(0.3, (p) => {
        sp.scale = p;
        sp.white = 1 - p;
      });
      sp.white = 0;
      sp.scale = 1;
    }
  }

  private async finish(): Promise<void> {
    const outcome = this.battle.outcome!;
    const s = this.g.save;
    if (outcome === 'win' && this.setup.trainer) {
      audio.playMusic('victoryTrainer');
      await this.anim(0.5, (p) => (this.trainerX = 1 - p));
      await this.text(this.setup.trainer.defeat, 2);
      this.moneyWon = this.setup.trainer.money;
      s.money += this.moneyWon;
      await this.text(`You got $${this.moneyWon} for winning!`, 1.2);
    } else if (outcome === 'win') {
      audio.playMusic('victoryWild');
      await this.wait(0.6);
    } else if (outcome === 'caught' && this.battle.caught) {
      const c = this.battle.caught;
      c.met = this.setup.mapName;
      c.metLevel = c.level;
      const isNew = !s.caught.includes(c.species);
      markCaught(s, c.species);
      if (isNew && s.bag.pocklopedia) await this.text(`${displayName(c)}'s data was added to the Pocklopedia.`, 1.4);
      if (s.party.length < 6) s.party.push(c);
      else {
        s.box.push(c);
        await this.text(`${displayName(c)} was sent to the storage box.`, 1.4);
      }
    }
    await this.g.fadeOut(0.4);
    this.g.close(this, { outcome, leveled: [...this.battle.leveled] } satisfies BattleResult);
  }

  // ---------------------------------------------------------------------
  // Particles

  private spriteCenter(side: 0 | 1): { x: number; y: number } {
    const b = side === 0 ? this.playerBase() : this.foeBase();
    return side === 0 ? { x: b.x, y: b.y - 110 } : { x: b.x, y: b.y - 85 };
  }

  private burst(side: 0 | 1, fx: { shape: Particle['shape']; colors: string[] }, dur: number, n: number): Promise<void> {
    const c = this.spriteCenter(side);
    this.burstAt(c.x, c.y, fx, n, 1);
    return this.wait(dur);
  }

  private burstAt(x: number, y: number, fx: { shape: Particle['shape']; colors: string[] }, n: number, power: number): void {
    for (let i = 0; i < n; i++) {
      const a = this.rng.next() * Math.PI * 2;
      const sp = (60 + this.rng.next() * 140) * power;
      const up = fx.shape === 'arrowUp';
      const down = fx.shape === 'arrowDown';
      this.particles.push({
        x: x + (up || down ? (this.rng.next() - 0.5) * 120 : 0),
        y: y + (up ? 50 : down ? -50 : 0),
        vx: up || down ? 0 : Math.cos(a) * sp,
        vy: up ? -120 - this.rng.next() * 60 : down ? 120 + this.rng.next() * 60 : Math.sin(a) * sp,
        life: 0.5 + this.rng.next() * 0.4,
        max: 0.9,
        size: 10 + this.rng.next() * 12,
        color: this.rng.pick(fx.colors),
        shape: fx.shape,
        spin: (this.rng.next() - 0.5) * 10,
        grav: fx.shape === 'drop' || fx.shape === 'shard' ? 300 : fx.shape === 'flame' ? -80 : 0,
      });
    }
  }

  // ---------------------------------------------------------------------
  // Frame

  update(dt: number): void {
    this.t += dt;
    for (let i = this.tweens.length - 1; i >= 0; i--) {
      const tw = this.tweens[i];
      tw.t += dt;
      const p = Math.min(1, tw.t / tw.dur);
      tw.fn(p);
      if (p >= 1) {
        this.tweens.splice(i, 1);
        tw.done();
      }
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.grav * dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
    this.shake = Math.max(0, this.shake - dt);
    this.flash = Math.max(0, this.flash - dt);

    const s = this.shown[0];
    if (this.sprites[0].visible && s.hp > 0 && s.hp / s.max <= 0.2) {
      this.lowHpTimer -= dt;
      if (this.lowHpTimer <= 0) {
        audio.sfx('lowHp');
        this.lowHpTimer = 1.6;
      }
    }

    if (this.choice) this.updateMenu();
  }

  private commandRects(): { x: number; y: number; w: number; h: number }[] {
    const box = dialogBox(this.g);
    const x0 = box.x + box.w * 0.5;
    const w = box.w * 0.5;
    const top = box.y - 26;
    const fightH = 74;
    const rowY = top + fightH + 6;
    const rowH = box.y + box.h - rowY;
    const third = (w - 12) / 3;
    return [
      { x: x0 + w * 0.1, y: top, w: w * 0.8, h: fightH },
      { x: x0, y: rowY, w: third, h: rowH },
      { x: x0 + third + 6, y: rowY, w: third, h: rowH },
      { x: x0 + 2 * (third + 6), y: rowY, w: third, h: rowH },
    ];
  }

  private moveRects(): { x: number; y: number; w: number; h: number }[] {
    const box = dialogBox(this.g);
    const top = box.y - 30;
    const backW = 110;
    const w = (box.w - backW - 18) / 2;
    const h = (box.y + box.h - top - 8) / 2;
    return [
      { x: box.x, y: top, w, h },
      { x: box.x + w + 6, y: top, w, h },
      { x: box.x, y: top + h + 8, w, h },
      { x: box.x + w + 6, y: top + h + 8, w, h },
      { x: box.x + box.w - backW, y: top + h + 8, w: backW, h },
    ];
  }

  private updateMenu(): void {
    const input = this.g.input;
    const pick = (v: number) => {
      const r = this.choice;
      this.choice = null;
      r?.(v);
    };
    if (this.menu === 'command') {
      const rects = this.commandRects();
      for (let i = 0; i < 4; i++) {
        const r = rects[i];
        if (input.tapped(r.x, r.y, r.w, r.h)) {
          audio.sfx('select');
          return pick(i);
        }
      }
      const s = this.cmdSel;
      if (input.repeat.up && s > 0) this.cmdSel = 0;
      if (input.repeat.down && s === 0) this.cmdSel = 2;
      if (input.repeat.left && s > 1) this.cmdSel = s - 1;
      if (input.repeat.right && s > 0 && s < 3) this.cmdSel = s + 1;
      if (this.cmdSel !== s) audio.sfx('cursor');
      if (input.pressed.a) {
        audio.sfx('select');
        return pick(this.cmdSel);
      }
      if (input.pressed.b && this.cmdSel !== 3) {
        this.cmdSel = 3;
        audio.sfx('cursor');
      }
    } else if (this.menu === 'fight') {
      const rects = this.moveRects();
      const me = this.battle.active(0);
      const n = me.moves.length;
      for (let i = 0; i < n; i++) {
        const r = rects[i];
        if (input.tapped(r.x, r.y, r.w, r.h)) {
          audio.sfx('select');
          this.moveSel = i;
          return pick(i);
        }
      }
      const back = rects[4];
      if (input.tapped(back.x, back.y, back.w, back.h) || input.pressed.b) {
        audio.sfx('back');
        return pick(-1);
      }
      const s = this.moveSel;
      if (input.repeat.left && s % 2 === 1) this.moveSel--;
      if (input.repeat.right && s % 2 === 0 && s + 1 < n) this.moveSel++;
      if (input.repeat.up && s >= 2) this.moveSel -= 2;
      if (input.repeat.down && s + 2 < n) this.moveSel += 2;
      if (this.moveSel >= n) this.moveSel = n - 1;
      if (this.moveSel !== s) audio.sfx('cursor');
      if (input.pressed.a) {
        audio.sfx('select');
        return pick(this.moveSel);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const W = this.g.view.width;
    const H = this.g.view.height;
    ctx.save();
    if (this.shake > 0) ctx.translate(Math.sin(this.t * 90) * 8 * (this.shake / 0.35), 0);
    this.drawBackground(ctx, W, H);
    this.drawPlatforms(ctx);
    this.drawTrainers(ctx);
    this.drawSprite(ctx, 1);
    this.drawSprite(ctx, 0);
    if (this.pouch.visible) this.drawPouch(ctx);
    this.drawParticles(ctx);
    ctx.restore();
    this.drawFoeBox(ctx);
    this.drawPlayerBox(ctx);
    this.drawPanel(ctx);
    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${this.flash * 2})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  private drawBackground(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    const band = this.band;
    if (!this.setup.outdoor) {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#6a5440');
      g.addColorStop(0.45, '#8a7058');
      g.addColorStop(1, '#a88c6c');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(60,40,30,0.35)';
      for (let i = 0; i < 9; i++) {
        const x = ((i * 173) % W) - 40;
        ctx.beginPath();
        ctx.moveTo(x, band * 0.38);
        ctx.lineTo(x + 70, band * 0.12);
        ctx.lineTo(x + 150, band * 0.38);
        ctx.fill();
      }
      ctx.fillStyle = '#b89c78';
      ctx.fillRect(0, band * 0.38, W, H);
      return;
    }
    const tod = timeOfDay();
    const skies: Record<string, [string, string, string]> = {
      morning: ['#a8d8f8', '#f8e8d0', '#98d070'],
      day: ['#78c0f8', '#d8f0ff', '#88cc60'],
      evening: ['#f89868', '#f8d8a0', '#a0a050'],
      night: ['#1a2448', '#4a5888', '#3a6848'],
    };
    const [top, bottom, ground] = skies[tod];
    const g = ctx.createLinearGradient(0, 0, 0, band * 0.45);
    g.addColorStop(0, top);
    g.addColorStop(1, bottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, band * 0.45);
    if (tod === 'night') {
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 40; i++) {
        const x = (i * 97.3) % W;
        const y = (i * 37.1) % (band * 0.4);
        ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(this.t * 1.5 + i));
        ctx.fillRect(x, y, 2, 2);
      }
      ctx.globalAlpha = 1;
    } else {
      // Clouds.
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      for (let i = 0; i < 4; i++) {
        const x = ((i * 290 + this.t * 8) % (W + 300)) - 150;
        const y = 40 + (i % 2) * 40;
        ctx.beginPath();
        ctx.ellipse(x, y, 70, 18, 0, 0, Math.PI * 2);
        ctx.ellipse(x + 40, y - 12, 44, 20, 0, 0, Math.PI * 2);
        ctx.ellipse(x - 36, y - 6, 36, 14, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Distant tree line.
    ctx.fillStyle = tod === 'night' ? '#203a30' : '#4a9048';
    ctx.beginPath();
    ctx.moveTo(0, band * 0.45);
    for (let x = 0; x <= W + 40; x += 40) ctx.lineTo(x, band * 0.45 - 18 - Math.abs(Math.sin(x * 0.07)) * 26);
    ctx.lineTo(W, band * 0.45);
    ctx.fill();
    const gg = ctx.createLinearGradient(0, band * 0.45, 0, H);
    gg.addColorStop(0, ground);
    gg.addColorStop(1, shade(ground, 0.8));
    ctx.fillStyle = gg;
    ctx.fillRect(0, band * 0.45, W, H);
    // Ground stripes for depth.
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    for (let i = 0; i < 6; i++) ctx.fillRect(0, band * 0.45 + i * i * 9, W, 3 + i);
  }

  private drawPlatforms(ctx: CanvasRenderingContext2D): void {
    const fb = this.foeBase();
    const pb = this.playerBase();
    const col = this.setup.outdoor ? ['#68b050', '#88cc68', '#4a8a3a'] : ['#9a8060', '#b89c7a', '#7a6248'];
    const plat = (x: number, y: number, rx: number, ry: number) => {
      ctx.fillStyle = col[2];
      ctx.beginPath();
      ctx.ellipse(x, y + 6, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = col[0];
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = col[1];
      ctx.beginPath();
      ctx.ellipse(x, y - ry * 0.1, rx * 0.72, ry * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();
    };
    plat(fb.x, fb.y, 165, 38);
    plat(pb.x, pb.y, 210, 48);
  }

  private drawTrainers(ctx: CanvasRenderingContext2D): void {
    const W = this.g.view.width;
    const fb = this.foeBase();
    const pb = this.playerBase();
    if (this.setup.trainer && this.trainerX < 1) {
      const look = LOOKS[this.setup.look ?? 'youngster'] ?? LOOKS.youngster;
      const x = fb.x + this.trainerX * (W - fb.x + 120);
      drawTrainerPortrait(ctx, look, x, fb.y + 4, 210);
    }
    if (this.playerTrainerX < 1) {
      const x = pb.x - this.playerTrainerX * (pb.x + 220);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, W, this.band + 20);
      ctx.clip();
      drawTrainerPortrait(ctx, LOOKS.player, x, pb.y + 90, 300, true);
      ctx.restore();
    }
  }

  private drawSprite(ctx: CanvasRenderingContext2D, side: 0 | 1): void {
    const sp = this.sprites[side];
    if (!sp.visible || sp.blink) return;
    const c = this.creatureOf(side);
    if (!c) return;
    const base = side === 0 ? this.playerBase() : this.foeBase();
    const size = side === 0 ? 280 : 210;
    const floats = creatureFloats(c.species);
    const bob = floats ? Math.sin(this.t * 2.5) * 6 - 12 : 0;
    const scale = this.g.view.scale;
    const img = creatureSprite(c.species, size * scale, { back: side === 0, shiny: c.shiny });
    // Contact shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(base.x + sp.dx, base.y, size * 0.3 * sp.scale, size * 0.07 * sp.scale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    const footY = base.y + (side === 0 ? 40 : 12) + sp.dy + bob;
    if (sp.sink > 0) {
      ctx.beginPath();
      ctx.rect(base.x - size, 0, size * 2, base.y + (side === 0 ? 40 : 12));
      ctx.clip();
    }
    ctx.globalAlpha = sp.alpha;
    const s = size * sp.scale;
    const y = footY + sp.sink * size;
    const breathe = 1 + Math.sin(this.t * 3 + side) * 0.012;
    ctx.translate(base.x + sp.dx, y);
    ctx.scale(1, breathe);
    ctx.drawImage(sp.white > 0 ? whitened(img, sp.white) : img, -s / 2, -s, s, s);
    ctx.restore();
  }

  private drawPouch(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.pouch.x, this.pouch.y);
    ctx.rotate(this.pouch.rot);
    pouchIcon(ctx, 0, 0, this.pouch.r, '#d85848', this.pouch.open);
    ctx.restore();
  }

  private drawParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const a = Math.max(0, Math.min(1, p.life / Math.min(p.max, 0.4)));
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.spin * (p.max - p.life));
      ctx.fillStyle = p.color;
      ctx.strokeStyle = p.color;
      const s = p.size;
      switch (p.shape) {
        case 'star':
          star(ctx, 0, 0, s * 0.7);
          break;
        case 'circle':
          ctx.beginPath();
          ctx.arc(0, 0, s * 0.45, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'ring':
          ctx.lineWidth = s * 0.18;
          ctx.beginPath();
          ctx.arc(0, 0, s * (0.4 + (1 - a) * 0.8), 0, Math.PI * 2);
          ctx.stroke();
          break;
        case 'leaf':
          ctx.beginPath();
          ctx.ellipse(0, 0, s * 0.6, s * 0.25, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(0,60,0,0.5)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(-s * 0.5, 0);
          ctx.lineTo(s * 0.5, 0);
          ctx.stroke();
          break;
        case 'drop':
          ctx.beginPath();
          ctx.moveTo(0, -s * 0.6);
          ctx.quadraticCurveTo(s * 0.45, 0, 0, s * 0.4);
          ctx.quadraticCurveTo(-s * 0.45, 0, 0, -s * 0.6);
          ctx.fill();
          break;
        case 'flame':
          ctx.beginPath();
          ctx.moveTo(0, -s * 0.7);
          ctx.quadraticCurveTo(s * 0.5, -s * 0.1, s * 0.25, s * 0.4);
          ctx.quadraticCurveTo(0, s * 0.55, -s * 0.25, s * 0.4);
          ctx.quadraticCurveTo(-s * 0.5, -s * 0.1, 0, -s * 0.7);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,200,0.7)';
          ctx.beginPath();
          ctx.ellipse(0, s * 0.15, s * 0.12, s * 0.22, 0, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'bolt':
          ctx.beginPath();
          ctx.moveTo(-s * 0.1, -s * 0.7);
          ctx.lineTo(s * 0.3, -s * 0.1);
          ctx.lineTo(0, -s * 0.05);
          ctx.lineTo(s * 0.15, s * 0.7);
          ctx.lineTo(-s * 0.3, 0);
          ctx.lineTo(0, -s * 0.05);
          ctx.closePath();
          ctx.fill();
          break;
        case 'shard':
          ctx.beginPath();
          ctx.moveTo(0, -s * 0.6);
          ctx.lineTo(s * 0.25, 0);
          ctx.lineTo(0, s * 0.6);
          ctx.lineTo(-s * 0.25, 0);
          ctx.closePath();
          ctx.fill();
          break;
        case 'arrowUp':
        case 'arrowDown': {
          ctx.rotate(-p.spin * (p.max - p.life));
          const d = p.shape === 'arrowUp' ? -1 : 1;
          ctx.beginPath();
          ctx.moveTo(0, d * s * 0.6);
          ctx.lineTo(s * 0.45, 0);
          ctx.lineTo(s * 0.18, 0);
          ctx.lineTo(s * 0.18, -d * s * 0.6);
          ctx.lineTo(-s * 0.18, -d * s * 0.6);
          ctx.lineTo(-s * 0.18, 0);
          ctx.lineTo(-s * 0.45, 0);
          ctx.closePath();
          ctx.fill();
          break;
        }
        case 'note':
          ctx.beginPath();
          ctx.ellipse(0, s * 0.3, s * 0.25, s * 0.18, -0.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillRect(s * 0.15, -s * 0.5, s * 0.08, s * 0.8);
          break;
      }
      ctx.restore();
    }
  }

  private drawFoeBox(ctx: CanvasRenderingContext2D): void {
    const s = this.shown[1];
    if (s.box <= 0) return;
    const c = this.creatureOf(1);
    const w = 360;
    const x = 20 - (1 - s.box) * (w + 40);
    const y = 26;
    panel(ctx, x, y, w, 84, { r: 14, rim: '#5a5a68', rimLight: '#b8bcc8', fill: '#f8f8f0' });
    text(ctx, displayName(c), x + 24, y + 36, { size: 24, bold: true });
    text(ctx, `Lv${s.level}`, x + w - 24, y + 36, { size: 22, align: 'right', bold: true });
    if (s.status) statusBadge(ctx, s.status, x + 24, y + 50, 18);
    hpBar(ctx, x + (s.status ? 90 : 60), y + 54, w - (s.status ? 150 : 120), s.hp / s.max, 12);
    if (this.g.save.caught.includes(c.species) && !this.setup.trainer) pouchIcon(ctx, x + w - 22, y + 62, 9);
  }

  private drawPlayerBox(ctx: CanvasRenderingContext2D): void {
    const s = this.shown[0];
    if (s.box <= 0) return;
    const c = this.creatureOf(0);
    const W = this.g.view.width;
    const w = 380;
    const x = W - w - 20 + (1 - s.box) * (w + 40);
    const y = this.band - 136;
    panel(ctx, x, y, w, 112, { r: 14, rim: '#5a5a68', rimLight: '#b8bcc8', fill: '#f8f8f0' });
    text(ctx, displayName(c), x + 24, y + 36, { size: 24, bold: true });
    text(ctx, `Lv${s.level}`, x + w - 24, y + 36, { size: 22, align: 'right', bold: true });
    if (s.status) statusBadge(ctx, s.status, x + 24, y + 50, 18);
    hpBar(ctx, x + (s.status ? 90 : 60), y + 52, w - (s.status ? 150 : 120), s.hp / s.max, 12);
    text(ctx, `${Math.max(0, Math.ceil(s.hp))} / ${s.max}`, x + w - 26, y + 86, { size: 20, align: 'right', bold: true });
    const growth = species(c.species).growth;
    const lo = expForLevel(growth, s.level);
    const hi = expForLevel(growth, s.level + 1);
    text(ctx, 'EXP', x + 22, y + 99, { size: 13, color: C.exp, shadow: null, bold: true });
    bar(ctx, x + 56, y + 92, w - 82, 7, s.level >= 100 ? 0 : (s.exp - lo) / Math.max(1, hi - lo), C.exp);
  }

  private drawPanel(ctx: CanvasRenderingContext2D): void {
    if (this.menu === 'none' || !this.choice) return;
    const box = dialogBox(this.g);
    const me = this.battle.active(0);
    if (this.menu === 'command') {
      panel(ctx, box.x, box.y, box.w * 0.5 - 8, box.h, { r: 12 });
      text(ctx, `What will`, box.x + 30, box.y + 50, { size: 25 });
      text(ctx, `${displayName(me)} do?`, box.x + 30, box.y + 86, { size: 25 });
      const rects = this.commandRects();
      const labels: [string, string, string][] = [
        ['FIGHT', '#e84848', '#9a2020'],
        ['BAG', '#f0b030', '#a87010'],
        ['POCKLETS', '#48b058', '#207030'],
        ['RUN', '#4888e0', '#205098'],
      ];
      rects.forEach((r, i) => {
        const pressed = this.g.input.touching(r.x, r.y, r.w, r.h);
        button(ctx, r.x, r.y, r.w, r.h, labels[i][0], { color: labels[i][1], dark: labels[i][2], state: pressed ? 2 : this.cmdSel === i ? 1 : 0, size: i === 0 ? 34 : 20 });
      });
      if (this.cmdSel >= 0) {
        const r = rects[this.cmdSel];
        cursor(ctx, r.x - 18, r.y + r.h / 2, 14, this.t);
      }
      return;
    }
    const rects = this.moveRects();
    me.moves.forEach((slot, i) => {
      const m = moveData(slot.id);
      const [light, dark] = TYPE_COLORS[m.type];
      const r = rects[i];
      const pressed = this.g.input.touching(r.x, r.y, r.w, r.h);
      button(ctx, r.x, r.y, r.w, r.h, m.name, { color: light, dark, state: pressed ? 2 : this.moveSel === i ? 1 : 0, size: 22, sub: `${m.type.toUpperCase()}   PP ${slot.pp}/${m.pp}` });
      if (slot.pp === 0) {
        ctx.fillStyle = 'rgba(40,40,50,0.45)';
        roundRect(ctx, r.x, r.y + 4, r.w, r.h - 4, 14);
        ctx.fill();
      }
    });
    const back = rects[4];
    button(ctx, back.x, back.y, back.w, back.h, 'BACK', { color: '#8890a0', dark: '#50586a', state: this.g.input.touching(back.x, back.y, back.w, back.h) ? 2 : 0, size: 20 });
    // Details of the highlighted move above the buttons.
    const sel = me.moves[this.moveSel];
    if (sel) {
      const m = moveData(sel.id);
      const info = `${m.category === 'status' ? 'Status' : m.category === 'physical' ? 'Physical' : 'Special'}   Power ${m.power > 1 ? m.power : '—'}   Accuracy ${m.accuracy || '—'}`;
      outlined(ctx, info, rects[0].x + 8, rects[0].y - 10, { size: 17, bold: false });
    }
  }
}

const scratch = document.createElement('canvas');

/** The sprite blended towards a white silhouette (send-out and recall flashes). */
function whitened(img: HTMLCanvasElement, amount: number): HTMLCanvasElement {
  scratch.width = img.width;
  scratch.height = img.height;
  const c = scratch.getContext('2d')!;
  c.drawImage(img, 0, 0);
  c.globalCompositeOperation = 'source-atop';
  c.globalAlpha = amount;
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, img.width, img.height);
  c.globalCompositeOperation = 'source-over';
  c.globalAlpha = 1;
  return scratch;
}

function statusFx(s: string): { shape: Particle['shape']; colors: string[] } {
  switch (s) {
    case 'brn': return { shape: 'flame', colors: ['#ff7a30', '#ffc040'] };
    case 'psn': return { shape: 'circle', colors: ['#b060c0', '#d890e0'] };
    case 'par': return { shape: 'bolt', colors: ['#ffe040', '#fff8a0'] };
    case 'slp': return { shape: 'note', colors: ['#a0a8c0', '#d0d8f0'] };
    case 'frz': return { shape: 'shard', colors: ['#c0f0ff', '#80d0f0'] };
    default: return { shape: 'star', colors: ['#ffffff'] };
  }
}

function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * k);
  const g = Math.round(((n >> 8) & 255) * k);
  const b = Math.round((n & 255) * k);
  return `rgb(${r},${g},${b})`;
}

/** Item name helper for messages elsewhere. */
export function itemName(id: string): string {
  return itemData(id).name;
}
