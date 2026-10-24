import type { Rng } from '../core/rng';
import { move } from '../data/moves';
import type { Status } from '../data/moves';
import { expForLevel, species, type BaseStats } from '../data/species';

export interface MoveSlot {
  id: string;
  pp: number;
}

/** A creature the player (or a trainer) owns. Plain data, so it saves as JSON. */
export interface Creature {
  species: string;
  nickname?: string;
  level: number;
  /** Total experience. */
  exp: number;
  ivs: BaseStats;
  hp: number;
  moves: MoveSlot[];
  status: Status | null;
  /** Turns left asleep. */
  sleep?: number;
  /** Where and at what level it was met. */
  met?: string;
  metLevel?: number;
  shiny?: boolean;
}

export const STAT_KEYS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'] as const;

export function displayName(c: Creature): string {
  return c.nickname || species(c.species).name;
}

export function calcStats(c: Creature): BaseStats {
  const b = species(c.species).base;
  const L = c.level;
  const s = (k: keyof BaseStats) => Math.floor(((2 * b[k] + c.ivs[k]) * L) / 100);
  return {
    hp: s('hp') + L + 10,
    atk: s('atk') + 5,
    def: s('def') + 5,
    spa: s('spa') + 5,
    spd: s('spd') + 5,
    spe: s('spe') + 5,
  };
}

export function maxHp(c: Creature): number {
  return calcStats(c).hp;
}

/** The (up to) four most recent moves it would know at its level. */
export function defaultMoves(speciesId: string, level: number): MoveSlot[] {
  const known: string[] = [];
  for (const [lv, id] of species(speciesId).learnset) {
    if (lv > level) break;
    if (known.includes(id)) continue;
    known.push(id);
    if (known.length > 4) known.shift();
  }
  return known.map((id) => ({ id, pp: move(id).pp }));
}

export function makeCreature(speciesId: string, level: number, rng: Rng, met?: string): Creature {
  const ivs = { hp: rng.int(0, 31), atk: rng.int(0, 31), def: rng.int(0, 31), spa: rng.int(0, 31), spd: rng.int(0, 31), spe: rng.int(0, 31) };
  const c: Creature = {
    species: speciesId,
    level,
    exp: expForLevel(species(speciesId).growth, level),
    ivs,
    hp: 1,
    moves: defaultMoves(speciesId, level),
    status: null,
    met,
    metLevel: level,
    shiny: rng.int(0, 1023) === 0,
  };
  c.hp = maxHp(c);
  return c;
}

/** Full heal: HP, PP and status, as at a Rest Stop. */
export function restore(c: Creature): void {
  c.hp = maxHp(c);
  c.status = null;
  c.sleep = 0;
  for (const m of c.moves) m.pp = move(m.id).pp;
}

/** Moves learned exactly at `level` that it does not already know. */
export function movesLearnedAt(c: Creature, level: number): string[] {
  return species(c.species)
    .learnset.filter(([lv, id]) => lv === level && !c.moves.some((m) => m.id === id))
    .map(([, id]) => id);
}

/** Species it would evolve into right now, if any. */
export function pendingEvolution(c: Creature): string | null {
  const e = species(c.species).evolves;
  return e && c.level >= e.level ? e.to : null;
}

/** Changes species in place, keeping HP damage proportional. */
export function evolve(c: Creature, to: string): void {
  const before = maxHp(c);
  const lost = before - c.hp;
  c.species = to;
  c.hp = Math.max(0, maxHp(c) - lost);
}
