/**
 * Single battles, Gen-4 rules (physical/special split per move).
 *
 * The engine is pure and UI-free: each call returns the events that happened, in
 * order, for the battle screen to play back. It mutates the Creature objects it is
 * given (HP, PP, status, experience, level, moves) so results persist after the
 * battle. All randomness comes from the injected Rng, so a seed replays a battle.
 */
import type { Rng } from '../core/rng';
import { item } from '../data/items';
import { move as moveData, type BattleStat, type Effect, type Move, type Status } from '../data/moves';
import { expForLevel, species } from '../data/species';
import { effectiveness, type Type } from '../data/types';
import { calcStats, displayName, maxHp, movesLearnedAt, type Creature } from '../game/creature';
import { applyItem, itemUsable } from '../game/useitem';
import { chooseMove } from './ai';

export type Outcome = 'win' | 'lose' | 'run' | 'caught';
export type Side = 0 | 1;

export interface BattleOptions {
  kind: 'wild' | 'trainer';
  rng: Rng;
  trainerName?: string;
  /** 'random' for wild creatures, 'smart' for trainers. Defaults by kind. */
  ai?: 'random' | 'smart';
}

export type Action =
  | { t: 'move'; slot: number }
  | { t: 'switch'; index: number }
  | { t: 'item'; item: string; target: number }
  | { t: 'run' };

export type BattleEvent =
  | { t: 'text'; text: string }
  | { t: 'move'; side: Side; move: string }
  | { t: 'hp'; side: Side; from: number; to: number; max: number }
  | { t: 'effect'; side: Side; kind: 'super' | 'weak' | 'immune' | 'crit' | 'miss' }
  | { t: 'faint'; side: Side }
  | { t: 'send'; side: Side; index: number }
  | { t: 'recall'; side: Side }
  | { t: 'status'; side: Side; status: Status | null }
  | { t: 'stat'; side: Side; stat: BattleStat; n: number }
  | { t: 'exp'; index: number; gained: number; from: number; to: number }
  | { t: 'level'; index: number; level: number }
  | { t: 'learn'; index: number; move: string }
  | { t: 'learnPrompt'; index: number; move: string }
  | { t: 'throw'; item: string; shakes: number; caught: boolean }
  | { t: 'end'; outcome: Outcome };

export const STAT_NAMES: Record<BattleStat, string> = {
  atk: 'Attack',
  def: 'Defense',
  spa: 'Sp. Atk',
  spd: 'Sp. Def',
  spe: 'Speed',
  acc: 'accuracy',
  eva: 'evasiveness',
};

const BATTLE_STATS: BattleStat[] = ['atk', 'def', 'spa', 'spd', 'spe', 'acc', 'eva'];

const blankStages = (): Record<BattleStat, number> => ({ atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0 });

/** Multiplier for an Attack/Defense/Sp./Speed stage (-6..+6). */
export function stageMult(n: number): number {
  return n >= 0 ? (2 + n) / 2 : 2 / (2 - n);
}

/** Multiplier for the combined accuracy-minus-evasion stage (-6..+6). */
export function accuracyMult(n: number): number {
  const s = Math.max(-6, Math.min(6, n));
  return s >= 0 ? (3 + s) / 3 : 3 / (3 - s);
}

export interface DamageOptions {
  crit?: boolean;
  /** Random factor 85..100. */
  roll?: number;
  atkStage?: number;
  defStage?: number;
  burned?: boolean;
  /** Overrides the move's type matchup (1 for typeless hits). */
  typeless?: boolean;
}

export interface DamageResult {
  damage: number;
  effectiveness: number;
}

/** The Gen-4 damage formula, without accuracy or side effects. */
export function calcDamage(attacker: Creature, defender: Creature, m: Move, o: DamageOptions = {}): DamageResult {
  const typeless = o.typeless || m.id === 'struggle';
  const eff = typeless ? 1 : effectiveness(m.type, species(defender.species).types);
  if (eff === 0) return { damage: 0, effectiveness: 0 };
  if (m.effects?.some((e) => e.t === 'levelDamage')) return { damage: attacker.level, effectiveness: 1 };
  const physical = m.category === 'physical';
  const as = calcStats(attacker);
  const ds = calcStats(defender);
  let atkStage = o.atkStage ?? 0;
  let defStage = o.defStage ?? 0;
  if (o.crit) {
    atkStage = Math.max(0, atkStage);
    defStage = Math.min(0, defStage);
  }
  const A = Math.max(1, Math.floor((physical ? as.atk : as.spa) * stageMult(atkStage)));
  const D = Math.max(1, Math.floor((physical ? ds.def : ds.spd) * stageMult(defStage)));
  const L = attacker.level;
  let d = Math.floor(Math.floor((Math.floor((2 * L) / 5 + 2) * m.power * A) / D) / 50);
  if (o.burned && physical) d = Math.floor(d / 2);
  d += 2;
  if (o.crit) d *= 2;
  d = Math.floor((d * (o.roll ?? 100)) / 100);
  if (!typeless && species(attacker.species).types.includes(m.type)) d = Math.floor(d * 1.5);
  d = Math.floor(d * eff);
  return { damage: Math.max(1, d), effectiveness: eff };
}

interface Volatile {
  confusion: number;
  flinch: boolean;
}

const STATUS_TEXT: Record<Status, string> = {
  brn: 'was burned!',
  psn: 'was poisoned!',
  par: 'is paralyzed! It may be unable to move!',
  slp: 'fell asleep!',
  frz: 'was frozen solid!',
};

const ALREADY_TEXT: Record<Status, string> = {
  brn: 'already has a burn.',
  psn: 'is already poisoned.',
  par: 'is already paralyzed.',
  slp: 'is already asleep.',
  frz: 'is already frozen.',
};

const SHAKE_TEXT = [
  'Oh no! The Pocklet broke free!',
  'Aww! It appeared to be caught!',
  'Aargh! Almost had it!',
  'Shoot! It was so close, too!',
];

export class Battle {
  playerIndex = 0;
  foeIndex = 0;
  state: 'choose' | 'mustSwitch' | 'over' = 'choose';
  outcome: Outcome | null = null;
  caught: Creature | null = null;
  readonly leveled = new Set<number>();
  /** Whether the last item action used up the item. */
  itemConsumed = false;

  private readonly rng: Rng;
  private readonly ai: 'random' | 'smart';
  private readonly stageArr: [Record<BattleStat, number>, Record<BattleStat, number>] = [blankStages(), blankStages()];
  private readonly vol: [Volatile, Volatile] = [{ confusion: 0, flinch: false }, { confusion: 0, flinch: false }];
  /** Player party indices that have faced the current foe. */
  private participants = new Set<number>();
  private escapeAttempts = 0;
  private moved: [boolean, boolean] = [false, false];
  /** The active creature's faint has been announced (reset when a new one comes in). */
  private faintDone: [boolean, boolean] = [false, false];
  private ev: BattleEvent[] = [];

  constructor(
    readonly player: Creature[],
    readonly foe: Creature[],
    readonly opts: BattleOptions,
  ) {
    this.rng = opts.rng;
    this.ai = opts.ai ?? (opts.kind === 'trainer' ? 'smart' : 'random');
    const p = player.findIndex((c) => c.hp > 0);
    const f = foe.findIndex((c) => c.hp > 0);
    if (p < 0) throw new Error('Player has no creature able to battle');
    if (f < 0) throw new Error('Foe has no creature able to battle');
    this.playerIndex = p;
    this.foeIndex = f;
  }

  get trainerName(): string {
    return this.opts.trainerName ?? 'The trainer';
  }

  active(side: Side): Creature {
    return side === 0 ? this.player[this.playerIndex] : this.foe[this.foeIndex];
  }

  stages(side: Side): Record<BattleStat, number> {
    return { ...this.stageArr[side] };
  }

  /** Turns of confusion left (0 when not confused). */
  confusion(side: Side): number {
    return this.vol[side].confusion;
  }

  canSwitchTo(index: number): boolean {
    const c = this.player[index];
    return !!c && c.hp > 0 && index !== this.playerIndex;
  }

  start(): BattleEvent[] {
    this.ev = [];
    const foe = this.active(1);
    if (this.opts.kind === 'wild') {
      this.emit({ t: 'send', side: 1, index: this.foeIndex });
      this.say(`A wild ${displayName(foe)} appeared!`);
    } else {
      this.say(`${this.trainerName} would like to battle!`);
      this.say(`${this.trainerName} sent out ${displayName(foe)}!`);
      this.emit({ t: 'send', side: 1, index: this.foeIndex });
    }
    this.say(`Go! ${displayName(this.active(0))}!`);
    this.emit({ t: 'send', side: 0, index: this.playerIndex });
    this.participants = new Set([this.playerIndex]);
    return this.flush();
  }

  turn(action: Action): BattleEvent[] {
    if (this.state !== 'choose') throw new Error(`Cannot take a turn while ${this.state}`);
    this.ev = [];
    this.moved = [false, false];
    this.itemConsumed = false;

    // Actions that are refused without using up the turn.
    if (action.t === 'run' && this.opts.kind === 'trainer') {
      this.say("No! There's no running from a trainer battle!");
      return this.flush();
    }
    if (action.t === 'switch' && !this.canSwitchTo(action.index)) {
      const c = this.player[action.index];
      this.say(!c ? 'There is no one there!' : c.hp <= 0 ? `${displayName(c)} has no energy left to battle!` : `${displayName(c)} is already in battle!`);
      return this.flush();
    }
    if (action.t === 'move') {
      const me = this.active(0);
      const hasPP = me.moves.some((m) => m.pp > 0);
      const slot = me.moves[action.slot];
      if (hasPP && (!slot || slot.pp <= 0)) {
        this.say("There's no PP left for this move!");
        return this.flush();
      }
    }
    if (action.t === 'item') {
      const it = item(action.item);
      if (it.use.t === 'catch') {
        if (this.opts.kind === 'trainer') {
          this.say(`The trainer blocked the ${it.name}!`);
          this.say("Don't be a thief!");
          return this.flush();
        }
      } else {
        const target = this.player[action.target];
        if (!target || !itemUsable(action.item, target)) {
          this.say("It won't have any effect.");
          return this.flush();
        }
      }
    }

    const foeSlot = chooseMove(this, this.ai, this.rng);

    if (action.t === 'run') {
      if (this.tryEscape()) return this.flush();
      this.takeMove(1, foeSlot);
    } else if (action.t === 'switch') {
      this.switchIn(action.index, true);
      this.takeMove(1, foeSlot);
    } else if (action.t === 'item') {
      if (this.useItem(action.item, action.target)) return this.flush();
      this.takeMove(1, foeSlot);
    } else {
      const order = this.order(action.slot, foeSlot);
      for (const side of order) {
        if (this.isOver()) break;
        this.takeMove(side, side === 0 ? action.slot : foeSlot);
        if (this.isOver()) break;
      }
    }

    if (!this.isOver()) this.endOfTurn();
    return this.flush();
  }

  forceSwitch(index: number): BattleEvent[] {
    if (this.state !== 'mustSwitch') throw new Error('No switch is required');
    this.ev = [];
    if (!this.canSwitchTo(index)) {
      const c = this.player[index];
      this.say(c ? `${displayName(c)} has no energy left to battle!` : 'There is no one there!');
      return this.flush();
    }
    this.switchIn(index, false);
    this.state = 'choose';
    return this.flush();
  }

  replaceMove(index: number, slot: number, moveId: string): void {
    const c = this.player[index];
    if (!c || slot < 0 || slot > 3) return;
    c.moves[slot] = { id: moveId, pp: moveData(moveId).pp };
  }

  // ---------------------------------------------------------------------------

  private isOver(): boolean {
    return this.state === 'over';
  }

  private emit(e: BattleEvent): void {
    this.ev.push(e);
  }

  private say(text: string): void {
    this.ev.push({ t: 'text', text });
  }

  private flush(): BattleEvent[] {
    const out = this.ev;
    this.ev = [];
    return out;
  }

  /** Sentence-start name: "Sprigfawn", "The wild Chirpip" or "The foe's Pebblet". */
  name(side: Side): string {
    const n = displayName(this.active(side));
    if (side === 0) return n;
    return this.opts.kind === 'wild' ? `The wild ${n}` : `The foe's ${n}`;
  }

  /** Speed after stages and paralysis. */
  speed(side: Side): number {
    const c = this.active(side);
    let s = calcStats(c).spe * stageMult(this.stageArr[side].spe);
    if (c.status === 'par') s *= 0.25;
    return s;
  }

  private priorityOf(side: Side, slot: number): number {
    const c = this.active(side);
    const m = c.moves[slot];
    if (!m || !c.moves.some((x) => x.pp > 0)) return 0;
    return moveData(m.id).priority ?? 0;
  }

  private order(playerSlot: number, foeSlot: number): Side[] {
    const pp = this.priorityOf(0, playerSlot);
    const fp = this.priorityOf(1, foeSlot);
    if (pp !== fp) return pp > fp ? [0, 1] : [1, 0];
    const ps = this.speed(0);
    const fs = this.speed(1);
    if (ps !== fs) return ps > fs ? [0, 1] : [1, 0];
    return this.rng.next() < 0.5 ? [0, 1] : [1, 0];
  }

  private tryEscape(): boolean {
    this.escapeAttempts++;
    const a = calcStats(this.active(0)).spe;
    const b = Math.max(1, calcStats(this.active(1)).spe);
    const f = Math.floor((a * 128) / b) + 30 * this.escapeAttempts;
    if (a > b || f > 255 || this.rng.int(0, 255) < f) {
      this.say('Got away safely!');
      this.finish('run');
      return true;
    }
    this.say("Can't escape!");
    return false;
  }

  private switchIn(index: number, recall: boolean): void {
    if (recall) {
      this.say(`${displayName(this.active(0))}, come back!`);
      this.emit({ t: 'recall', side: 0 });
    }
    this.playerIndex = index;
    this.faintDone[0] = false;
    this.stageArr[0] = blankStages();
    this.vol[0] = { confusion: 0, flinch: false };
    this.say(`Go! ${displayName(this.active(0))}!`);
    this.emit({ t: 'send', side: 0, index });
    this.participants.add(index);
  }

  /** Returns true if the battle ended (a catch). */
  private useItem(itemId: string, target: number): boolean {
    const it = item(itemId);
    this.itemConsumed = true;
    if (it.use.t === 'catch') return this.throwPouch(itemId, it.use.bonus);
    const c = this.player[target];
    const before = c.hp;
    const hadStatus = c.status;
    this.say(`You used ${/^[aeiou]/i.test(it.name) ? 'an' : 'a'} ${it.name}!`);
    const msg = applyItem(itemId, c);
    if (target === this.playerIndex) {
      if (c.hp !== before) this.emit({ t: 'hp', side: 0, from: before, to: c.hp, max: maxHp(c) });
      if (c.status !== hadStatus) this.emit({ t: 'status', side: 0, status: c.status });
    }
    this.say(msg);
    return false;
  }

  private throwPouch(itemId: string, bonus: number): boolean {
    const foe = this.active(1);
    const name = item(itemId).name;
    this.say(`You threw ${/^[aeiou]/i.test(name) ? 'an' : 'a'} ${name}!`);
    const M = maxHp(foe);
    const H = foe.hp;
    const rate = species(foe.species).catchRate;
    const statusBonus = foe.status === 'slp' || foe.status === 'frz' ? 2 : foe.status ? 1.5 : 1;
    const a = Math.floor((((3 * M - 2 * H) * rate * bonus) / (3 * M)) * statusBonus);
    let shakes = 0;
    let caught: boolean;
    if (a >= 255) {
      shakes = 3;
      caught = true;
    } else {
      const b = Math.floor(1048560 / Math.sqrt(Math.sqrt(16711680 / Math.max(1, a))));
      let passed = 0;
      while (passed < 4 && this.rng.int(0, 65535) < b) passed++;
      caught = passed === 4;
      shakes = Math.min(3, passed);
    }
    this.emit({ t: 'throw', item: itemId, shakes, caught });
    if (caught) {
      this.say(`Gotcha! ${displayName(foe)} was caught!`);
      this.caught = foe;
      this.finish('caught');
      return true;
    }
    this.say(SHAKE_TEXT[shakes]);
    return false;
  }

  /** Runs one side's chosen move, including everything that can stop it. */
  private takeMove(side: Side, slot: number): void {
    const user = this.active(side);
    const foeSide: Side = side === 0 ? 1 : 0;
    if (user.hp <= 0) return;
    this.moved[side] = true;

    // Things that stop a creature from acting.
    if (user.status === 'slp') {
      if ((user.sleep ?? 0) > 0) {
        user.sleep = (user.sleep ?? 1) - 1;
        this.say(`${this.name(side)} is fast asleep.`);
        return;
      }
      user.status = null;
      this.say(`${this.name(side)} woke up!`);
      this.emit({ t: 'status', side, status: null });
    }
    if (user.status === 'frz') {
      if (this.rng.chance(20)) {
        user.status = null;
        this.say(`${this.name(side)} thawed out!`);
        this.emit({ t: 'status', side, status: null });
      } else {
        this.say(`${this.name(side)} is frozen solid!`);
        return;
      }
    }
    if (this.vol[side].flinch) {
      this.say(`${this.name(side)} flinched!`);
      return;
    }
    const v = this.vol[side];
    if (v.confusion > 0) {
      v.confusion--;
      if (v.confusion === 0) {
        this.say(`${this.name(side)} snapped out of confusion!`);
      } else {
        this.say(`${this.name(side)} is confused!`);
        if (this.rng.chance(50)) {
          this.say('It hurt itself in its confusion!');
          const hit: Move = { id: 'confusion', name: 'confusion', type: 'normal', category: 'physical', power: 40, accuracy: 0, pp: 1, desc: '' };
          const st = this.stageArr[side];
          const { damage } = calcDamage(user, user, hit, { roll: this.rng.int(85, 100), atkStage: st.atk, defStage: st.def, typeless: true });
          this.hurt(side, damage);
          this.checkFaints();
          return;
        }
      }
    }
    if (user.status === 'par' && this.rng.chance(25)) {
      this.say(`${this.name(side)} is paralyzed! It can't move!`);
      return;
    }

    // Pick the move (Struggle when out of PP).
    const outOfPP = !user.moves.some((m) => m.pp > 0);
    const m = outOfPP ? moveData('struggle') : moveData(user.moves[slot]?.id ?? user.moves.find((x) => x.pp > 0)!.id);
    if (outOfPP) this.say(`${this.name(side)} has no moves left!`);
    else {
      const s = user.moves[slot] && user.moves[slot].pp > 0 ? user.moves[slot] : user.moves.find((x) => x.pp > 0)!;
      s.pp--;
    }
    this.say(`${this.name(side)} used ${m.name}!`);
    this.emit({ t: 'move', side, move: m.id });

    const effects = m.effects ?? [];
    const selfOnly = m.category === 'status' && effects.length > 0 && effects.every((e) => (e.t === 'stat' && e.who === 'self') || e.t === 'heal' || e.t === 'nothing');
    const target = this.active(foeSide);

    if (selfOnly) {
      this.applySelfMove(side, m);
      return;
    }

    if (target.hp <= 0) {
      this.say('But there was no target...');
      return;
    }

    // Accuracy.
    if (m.accuracy > 0) {
      const stage = this.stageArr[side].acc - this.stageArr[foeSide].eva;
      const chance = m.accuracy * accuracyMult(stage);
      if (this.rng.next() * 100 >= chance) {
        this.say(`${this.name(side)}'s attack missed!`);
        this.emit({ t: 'effect', side: foeSide, kind: 'miss' });
        return;
      }
    }

    if (m.category === 'status') {
      this.applyStatusMove(side, m);
      return;
    }

    this.applyDamagingMove(side, m);
  }

  private applySelfMove(side: Side, m: Move): void {
    for (const e of m.effects ?? []) {
      if (e.t === 'stat') this.changeStat(side, e.stat, e.n, true);
      else if (e.t === 'heal') {
        const c = this.active(side);
        const max = maxHp(c);
        if (c.hp >= max) {
          this.say(`${this.name(side)}'s HP is full!`);
          return;
        }
        this.heal(side, Math.max(1, Math.floor(max * e.frac)));
        this.say(`${this.name(side)} regained health!`);
      } else if (e.t === 'nothing') {
        this.say('But nothing happened!');
        return;
      }
    }
  }

  private applyStatusMove(side: Side, m: Move): void {
    const foeSide: Side = side === 0 ? 1 : 0;
    const target = this.active(foeSide);
    // Electric status moves cannot reach Ground types (Gen 4 Thunder Wave).
    if (m.type === 'electric' && effectiveness('electric', species(target.species).types) === 0) {
      this.say(`It doesn't affect ${this.objName(foeSide)}...`);
      this.emit({ t: 'effect', side: foeSide, kind: 'immune' });
      return;
    }
    for (const e of m.effects ?? []) {
      if ('chance' in e && e.chance !== undefined && e.t !== 'flinch' && !this.rng.chance(e.chance)) continue;
      switch (e.t) {
        case 'stat':
          this.changeStat(e.who === 'self' ? side : foeSide, e.stat, e.n, true);
          break;
        case 'status':
          this.inflict(foeSide, e.s, true);
          break;
        case 'confuse':
          this.confuse(foeSide, true);
          break;
        case 'heal':
          this.heal(side, Math.max(1, Math.floor(maxHp(this.active(side)) * e.frac)));
          break;
        case 'nothing':
          this.say('But nothing happened!');
          break;
        default:
          break;
      }
    }
  }

  private applyDamagingMove(side: Side, m: Move): void {
    const foeSide: Side = side === 0 ? 1 : 0;
    const user = this.active(side);
    const target = this.active(foeSide);
    const effects = m.effects ?? [];
    const hitsEffect = effects.find((e): e is Extract<Effect, { t: 'hits' }> => e.t === 'hits');
    const highCrit = effects.some((e) => e.t === 'crit');

    let hits = 1;
    if (hitsEffect) {
      const r = this.rng.int(0, 7);
      hits = r < 3 ? 2 : r < 6 ? 3 : r < 7 ? 4 : 5;
      hits = Math.max(hitsEffect.min, Math.min(hitsEffect.max, hits));
    }

    let dealt = 0;
    let eff = 1;
    let landed = 0;
    for (let i = 0; i < hits; i++) {
      if (target.hp <= 0 || user.hp <= 0) break;
      const levelDamage = effects.some((e) => e.t === 'levelDamage');
      const crit = !levelDamage && this.rng.chance(highCrit ? 12.5 : 6.25);
      const r = calcDamage(user, target, m, {
        crit,
        roll: this.rng.int(85, 100),
        atkStage: this.stageArr[side][m.category === 'physical' ? 'atk' : 'spa'],
        defStage: this.stageArr[foeSide][m.category === 'physical' ? 'def' : 'spd'],
        burned: user.status === 'brn',
      });
      eff = r.effectiveness;
      if (eff === 0) {
        this.say(`It doesn't affect ${this.objName(foeSide)}...`);
        this.emit({ t: 'effect', side: foeSide, kind: 'immune' });
        return;
      }
      dealt += this.hurt(foeSide, r.damage);
      landed++;
      if (crit) {
        this.emit({ t: 'effect', side: foeSide, kind: 'crit' });
        this.say('A critical hit!');
      }
    }
    if (eff > 1) {
      this.emit({ t: 'effect', side: foeSide, kind: 'super' });
      this.say("It's super effective!");
    } else if (eff < 1) {
      this.emit({ t: 'effect', side: foeSide, kind: 'weak' });
      this.say("It's not very effective...");
    }
    if (hitsEffect) this.say(`Hit ${landed} time${landed === 1 ? '' : 's'}!`);

    // A fire move thaws a frozen target.
    if (m.type === 'fire' && target.hp > 0 && target.status === 'frz') {
      target.status = null;
      this.say(`${this.name(foeSide)} thawed out!`);
      this.emit({ t: 'status', side: foeSide, status: null });
    }

    for (const e of effects) {
      if (e.t === 'drain' && dealt > 0 && user.hp > 0) {
        const n = Math.max(1, Math.floor(dealt * e.frac));
        if (this.heal(side, n) > 0) this.say(`${this.name(foeSide)} had its energy drained!`);
      } else if (e.t === 'recoil' && dealt > 0 && user.hp > 0) {
        const n = m.id === 'struggle' ? Math.max(1, Math.floor(maxHp(user) / 4)) : Math.max(1, Math.floor(dealt * e.frac));
        this.hurt(side, n);
        this.say(`${this.name(side)} is hit with recoil!`);
      }
    }

    // Secondary effects only land on a target that is still standing.
    if (target.hp > 0) {
      for (const e of effects) {
        switch (e.t) {
          case 'stat':
            if (e.chance === undefined || this.rng.chance(e.chance)) {
              if (e.who === 'self') {
                if (user.hp > 0) this.changeStat(side, e.stat, e.n, false);
              } else this.changeStat(foeSide, e.stat, e.n, false);
            }
            break;
          case 'status':
            if (e.chance === undefined || this.rng.chance(e.chance)) this.inflict(foeSide, e.s, false);
            break;
          case 'confuse':
            if (e.chance === undefined || this.rng.chance(e.chance)) this.confuse(foeSide, false);
            break;
          case 'flinch':
            if (!this.moved[foeSide] && this.rng.chance(e.chance)) this.vol[foeSide].flinch = true;
            break;
          default:
            break;
        }
      }
    } else {
      for (const e of effects) {
        if (e.t === 'stat' && e.who === 'self' && user.hp > 0 && (e.chance === undefined || this.rng.chance(e.chance))) {
          this.changeStat(side, e.stat, e.n, false);
        }
      }
    }

    this.checkFaints();
  }

  /** "the wild Chirpip" for mid-sentence use. */
  private objName(side: Side): string {
    const n = this.name(side);
    return side === 1 ? n.charAt(0).toLowerCase() + n.slice(1) : n;
  }

  /** Lowers HP; returns the damage actually dealt. */
  private hurt(side: Side, n: number): number {
    const c = this.active(side);
    const from = c.hp;
    c.hp = Math.max(0, c.hp - n);
    this.emit({ t: 'hp', side, from, to: c.hp, max: maxHp(c) });
    return from - c.hp;
  }

  /** Raises HP; returns the amount healed. */
  private heal(side: Side, n: number): number {
    const c = this.active(side);
    const max = maxHp(c);
    const from = c.hp;
    c.hp = Math.min(max, c.hp + n);
    if (c.hp !== from) this.emit({ t: 'hp', side, from, to: c.hp, max });
    return c.hp - from;
  }

  /** Returns true if the stage changed. `loud` reports failure (primary effects). */
  private changeStat(side: Side, stat: BattleStat, n: number, loud: boolean): boolean {
    const st = this.stageArr[side];
    const before = st[stat];
    const after = Math.max(-6, Math.min(6, before + n));
    const who = this.name(side);
    if (after === before) {
      if (loud) this.say(`${who}'s ${STAT_NAMES[stat]} won't go any ${n > 0 ? 'higher' : 'lower'}!`);
      return false;
    }
    st[stat] = after;
    const d = after - before;
    this.emit({ t: 'stat', side, stat, n: d });
    const word = d >= 2 ? 'sharply rose' : d === 1 ? 'rose' : d === -1 ? 'fell' : 'harshly fell';
    this.say(`${who}'s ${STAT_NAMES[stat]} ${word}!`);
    return true;
  }

  private statusImmune(c: Creature, s: Status): boolean {
    const types: Type[] = species(c.species).types;
    if (s === 'brn') return types.includes('fire');
    if (s === 'psn') return types.includes('poison') || types.includes('steel');
    if (s === 'frz') return types.includes('ice');
    return false;
  }

  /** `loud` is for a move whose main purpose is the status: failures are reported. */
  private inflict(side: Side, s: Status, loud: boolean): boolean {
    const c = this.active(side);
    if (c.hp <= 0) return false;
    if (c.status) {
      if (loud) this.say(c.status === s ? `${this.name(side)} ${ALREADY_TEXT[s]}` : 'But it failed!');
      return false;
    }
    if (this.statusImmune(c, s)) {
      if (loud) this.say(`It doesn't affect ${this.objName(side)}...`);
      return false;
    }
    c.status = s;
    if (s === 'slp') c.sleep = this.rng.int(1, 4);
    this.emit({ t: 'status', side, status: s });
    this.say(`${this.name(side)} ${STATUS_TEXT[s]}`);
    return true;
  }

  private confuse(side: Side, loud: boolean): void {
    const v = this.vol[side];
    if (this.active(side).hp <= 0) return;
    if (v.confusion > 0) {
      if (loud) this.say(`${this.name(side)} is already confused!`);
      return;
    }
    // One more than the turns it stays confused: the counter ticks before acting.
    v.confusion = this.rng.int(2, 5) + 1;
    this.say(`${this.name(side)} became confused!`);
  }

  private endOfTurn(): void {
    for (const side of [0, 1] as Side[]) {
      if (this.state === 'over') return;
      const c = this.active(side);
      if (c.hp <= 0) continue;
      if (c.status === 'brn' || c.status === 'psn') {
        const n = Math.max(1, Math.floor(maxHp(c) / 8));
        this.hurt(side, n);
        this.say(`${this.name(side)} is hurt by ${c.status === 'brn' ? 'its burn' : 'poison'}!`);
        this.checkFaints();
      }
    }
    this.vol[0].flinch = false;
    this.vol[1].flinch = false;
    if (this.state === 'over') return;

    // The trainer replaces a fainted creature, then the player must if theirs fell.
    if (this.active(1).hp <= 0) {
      const next = this.foe.findIndex((c) => c.hp > 0);
      if (next >= 0) {
        this.foeIndex = next;
        this.faintDone[1] = false;
        this.stageArr[1] = blankStages();
        this.vol[1] = { confusion: 0, flinch: false };
        this.say(`${this.trainerName} sent out ${displayName(this.active(1))}!`);
        this.emit({ t: 'send', side: 1, index: next });
        this.participants = new Set(this.active(0).hp > 0 ? [this.playerIndex] : []);
      }
    }
    if (this.active(0).hp <= 0) this.state = 'mustSwitch';
  }

  /** Handles faints on either side; ends the battle when one side is out. */
  private checkFaints(): void {
    if (this.state === 'over') return;
    const foe = this.active(1);
    const me = this.active(0);
    if (foe.hp <= 0 && !this.faintDone[1]) {
      this.faintDone[1] = true;
      this.emit({ t: 'faint', side: 1 });
      this.say(`${this.name(1)} fainted!`);
      this.vol[1] = { confusion: 0, flinch: false };
      this.awardExp(foe);
    }
    if (me.hp <= 0 && !this.faintDone[0]) {
      this.faintDone[0] = true;
      this.emit({ t: 'faint', side: 0 });
      this.say(`${displayName(me)} fainted!`);
      this.vol[0] = { confusion: 0, flinch: false };
      this.participants.delete(this.playerIndex);
    }
    if (!this.player.some((c) => c.hp > 0)) {
      this.say('You are out of usable Pocklets!');
      this.say('You blacked out!');
      this.finish('lose');
      return;
    }
    if (!this.foe.some((c) => c.hp > 0)) {
      if (this.opts.kind === 'trainer') this.say(`You defeated ${this.trainerName}!`);
      this.finish('win');
    }
  }

  private awardExp(foe: Creature): void {
    const earners = [...this.participants].filter((i) => this.player[i] && this.player[i].hp > 0 && this.player[i].level < 100);
    if (earners.length === 0) return;
    const b = species(foe.species).exp;
    const total = Math.floor(((this.opts.kind === 'trainer' ? 1.5 : 1) * b * foe.level) / 7);
    const each = Math.max(1, Math.floor(total / earners.length));
    for (const i of earners) {
      const c = this.player[i];
      const from = c.exp;
      c.exp += each;
      this.say(`${displayName(c)} gained ${each} Exp. Points!`);
      this.emit({ t: 'exp', index: i, gained: each, from, to: c.exp });
      const growth = species(c.species).growth;
      while (c.level < 100 && c.exp >= expForLevel(growth, c.level + 1)) {
        const oldMax = maxHp(c);
        c.level++;
        if (c.hp > 0) c.hp += maxHp(c) - oldMax;
        this.leveled.add(i);
        this.emit({ t: 'level', index: i, level: c.level });
        this.say(`${displayName(c)} grew to Lv. ${c.level}!`);
        for (const id of movesLearnedAt(c, c.level)) {
          if (c.moves.length < 4) {
            c.moves.push({ id, pp: moveData(id).pp });
            this.emit({ t: 'learn', index: i, move: id });
            this.say(`${displayName(c)} learned ${moveData(id).name}!`);
          } else {
            this.emit({ t: 'learnPrompt', index: i, move: id });
          }
        }
      }
    }
  }

  private finish(outcome: Outcome): void {
    this.outcome = outcome;
    this.state = 'over';
    this.emit({ t: 'end', outcome });
  }
}

export { BATTLE_STATS };
