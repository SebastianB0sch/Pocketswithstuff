import { describe, expect, it } from 'vitest';
import { MOVES } from '../src/data/moves';
import { DEX_ORDER, SPECIES, expForLevel } from '../src/data/species';
import { TYPES, effectiveness } from '../src/data/types';
import { defaultMoves } from '../src/game/creature';

/** Lines whose first stage intentionally has no damaging move early on. */
const NO_EARLY_DAMAGE = new Set(['cocoonix', 'finfry']);

describe('species data', () => {
  it('has unique, contiguous dex numbers', () => {
    expect(DEX_ORDER.map((s) => s.num)).toEqual(DEX_ORDER.map((_, i) => i + 1));
  });

  for (const s of DEX_ORDER) {
    it(`${s.id} is consistent`, () => {
      for (const [lv, id] of s.learnset) {
        expect(MOVES[id], `${s.id} learns ${id}`).toBeDefined();
        expect(lv).toBeGreaterThanOrEqual(1);
      }
      const levels = s.learnset.map(([lv]) => lv);
      expect(levels).toEqual([...levels].sort((a, b) => a - b));
      for (const t of s.types) expect(TYPES).toContain(t);
      if (s.evolves) {
        const to = SPECIES[s.evolves.to];
        expect(to, `${s.id} evolves into ${s.evolves.to}`).toBeDefined();
        expect(to.num).toBeGreaterThan(s.num);
      }
      if (!NO_EARLY_DAMAGE.has(s.id)) {
        const early = defaultMoves(s.id, 5);
        expect(early.some((m) => MOVES[m.id].category !== 'status'), `${s.id} has a damaging move by Lv. 5`).toBe(true);
      }
      expect(s.catchRate).toBeGreaterThanOrEqual(3);
      expect(s.catchRate).toBeLessThanOrEqual(255);
    });
  }

  it('has growth curves that increase', () => {
    for (const g of ['fast', 'medium', 'mslow', 'slow'] as const) {
      for (let l = 2; l <= 100; l++) expect(expForLevel(g, l)).toBeGreaterThan(expForLevel(g, l - 1));
    }
  });
});

describe('type chart', () => {
  it('matches the classic chart', () => {
    expect(effectiveness('ground', ['flying'])).toBe(0);
    expect(effectiveness('water', ['fire', 'rock'])).toBe(4);
    expect(effectiveness('grass', ['fire', 'flying'])).toBe(0.25);
    expect(effectiveness('normal', ['ghost'])).toBe(0);
    expect(effectiveness('electric', ['water', 'flying'])).toBe(4);
    expect(effectiveness('fighting', ['normal'])).toBe(2);
    expect(effectiveness('psychic', ['dark'])).toBe(0);
    expect(effectiveness('fire', ['water', 'steel'])).toBe(1);
  });
});
