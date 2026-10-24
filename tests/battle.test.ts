import { describe, expect, it } from 'vitest';
import { Battle, accuracyMult, calcDamage, stageMult, type BattleEvent, type BattleOptions } from '../src/battle/engine';
import { Rng } from '../src/core/rng';
import { move } from '../src/data/moves';
import { expForLevel, species } from '../src/data/species';
import { calcStats, maxHp, type Creature } from '../src/game/creature';
import { applyItem, itemUsable } from '../src/game/useitem';

const ZERO = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };

function mk(id: string, level: number, moves: string[], ivs = ZERO): Creature {
  const c: Creature = {
    species: id,
    level,
    exp: expForLevel(species(id).growth, level),
    ivs: { ...ivs },
    hp: 1,
    moves: moves.map((m) => ({ id: m, pp: move(m).pp })),
    status: null,
  };
  c.hp = maxHp(c);
  return c;
}

function battle(player: Creature[], foe: Creature[], seed = 1, opts: Partial<BattleOptions> = {}): Battle {
  return new Battle(player, foe, { kind: 'wild', rng: new Rng(seed), ...opts });
}

const texts = (ev: BattleEvent[]) => ev.filter((e) => e.t === 'text').map((e) => (e as { text: string }).text);

describe('damage formula', () => {
  const fawn = mk('sprigfawn', 5, ['bump', 'vinesnap']);
  const pip = mk('chirpip', 5, ['peck']);

  it('matches hand-computed Gen-4 values', () => {
    // Atk 11 vs Def 8: floor(floor(4*40*11/8)/50)+2 = 6
    expect(calcDamage(fawn, pip, move('bump'), { roll: 100 }).damage).toBe(6);
    expect(calcDamage(fawn, pip, move('bump'), { roll: 85 }).damage).toBe(5);
  });

  it('applies STAB and resistances', () => {
    // 6 * 1.5 (grass STAB) = 9, then x0.5 against Flying = 4
    const r = calcDamage(fawn, pip, move('vinesnap'), { roll: 100 });
    expect(r.effectiveness).toBe(0.5);
    expect(r.damage).toBe(4);
  });

  it('uses Sp. Atk / Sp. Def for special moves and doubles super-effective hits', () => {
    const kit = mk('kindlekit', 5, ['sparkpuff']);
    // SpA 11 vs SpD 10: floor(176/50)+2 = 5, STAB 7, x2 = 14
    const r = calcDamage(kit, fawn, move('sparkpuff'), { roll: 100 });
    expect(r.effectiveness).toBe(2);
    expect(r.damage).toBe(14);
  });

  it('keeps physical and special stats apart', () => {
    const strong = mk('kindlekit', 30, ['clawswipe', 'sparkpuff'], { ...ZERO, atk: 31 });
    const weak = mk('kindlekit', 30, ['clawswipe', 'sparkpuff']);
    const target = mk('nibbun', 30, ['bump']);
    expect(calcDamage(strong, target, move('clawswipe'), { roll: 100 }).damage).toBeGreaterThan(calcDamage(weak, target, move('clawswipe'), { roll: 100 }).damage);
    expect(calcDamage(strong, target, move('sparkpuff'), { roll: 100 }).damage).toBe(calcDamage(weak, target, move('sparkpuff'), { roll: 100 }).damage);
  });

  it('doubles on a critical hit and ignores bad stages', () => {
    expect(calcDamage(fawn, pip, move('bump'), { roll: 100, crit: true }).damage).toBe(12);
    expect(calcDamage(fawn, pip, move('bump'), { roll: 100, crit: true, atkStage: -2, defStage: 2 }).damage).toBe(12);
    expect(calcDamage(fawn, pip, move('bump'), { roll: 100, atkStage: -2 }).damage).toBeLessThan(6);
  });

  it('halves physical damage when burned', () => {
    const big = mk('brawlet', 40, ['powerpunch']);
    const t = mk('nibbun', 40, ['bump']);
    const normal = calcDamage(big, t, move('powerpunch'), { roll: 100 }).damage;
    const burned = calcDamage(big, t, move('powerpunch'), { roll: 100, burned: true }).damage;
    expect(burned).toBeLessThan(normal * 0.6);
  });

  it('respects type immunities', () => {
    const ghost = mk('wispurr', 10, ['spooklick']);
    expect(calcDamage(fawn, ghost, move('bump')).effectiveness).toBe(0);
    expect(calcDamage(fawn, ghost, move('bump')).damage).toBe(0);
    const mole = mk('molekin', 10, ['quake']);
    expect(calcDamage(mole, pip, move('quake')).effectiveness).toBe(0);
  });

  it('has the standard stage tables', () => {
    expect(stageMult(6)).toBe(4);
    expect(stageMult(-6)).toBe(0.25);
    expect(stageMult(1)).toBe(1.5);
    expect(accuracyMult(-6)).toBeCloseTo(1 / 3);
    expect(accuracyMult(6)).toBe(3);
  });
});

describe('turn order', () => {
  it('lets a priority move go before a faster foe', () => {
    for (let seed = 1; seed < 20; seed++) {
      const b = battle([mk('pebblet', 20, ['quickdash'])], [mk('chirpip', 20, ['peck'])], seed);
      b.start();
      const ev = b.turn({ t: 'move', slot: 0 });
      const first = ev.find((e) => e.t === 'move') as { side: number };
      expect(first.side).toBe(0);
    }
  });

  it('otherwise goes by speed', () => {
    const slow = mk('pebblet', 20, ['bump']);
    const fast = mk('chirpip', 20, ['peck']);
    const b = battle([slow], [fast], 3);
    b.start();
    const ev = b.turn({ t: 'move', slot: 0 });
    expect((ev.find((e) => e.t === 'move') as { side: number }).side).toBe(1);
  });
});

describe('status', () => {
  it('full-paralyzes about a quarter of the time and slows', () => {
    let stopped = 0;
    const N = 400;
    for (let seed = 1; seed <= N; seed++) {
      const me = mk('pebblet', 50, ['stiffen']);
      me.status = 'par';
      const b = battle([me], [mk('nibbun', 50, ['flop'])], seed);
      b.start();
      if (texts(b.turn({ t: 'move', slot: 0 })).some((t) => t.includes("can't move"))) stopped++;
    }
    expect(stopped / N).toBeGreaterThan(0.17);
    expect(stopped / N).toBeLessThan(0.33);
    const me = mk('chirpip', 50, ['peck']);
    const b = battle([me], [mk('pebblet', 50, ['flop'])]);
    const before = b.speed(0);
    me.status = 'par';
    expect(b.speed(0)).toBeCloseTo(before / 4);
  });

  it('sleeps for the counter, then wakes and acts', () => {
    const me = mk('nibbun', 30, ['stiffen']);
    me.status = 'slp';
    me.sleep = 2;
    const b = battle([me], [mk('nibbun', 30, ['flop'])]);
    b.start();
    expect(texts(b.turn({ t: 'move', slot: 0 }))).toContain('Nibbun is fast asleep.');
    expect(texts(b.turn({ t: 'move', slot: 0 }))).toContain('Nibbun is fast asleep.');
    const t3 = texts(b.turn({ t: 'move', slot: 0 }));
    expect(t3).toContain('Nibbun woke up!');
    expect(t3).toContain('Nibbun used Stiffen!');
    expect(me.status).toBeNull();
  });

  it('burns and poisons for an eighth each turn', () => {
    for (const s of ['brn', 'psn'] as const) {
      const me = mk('nibbun', 30, ['stiffen']);
      me.status = s;
      const max = maxHp(me);
      const b = battle([me], [mk('nibbun', 30, ['flop'])]);
      b.start();
      b.turn({ t: 'move', slot: 0 });
      expect(me.hp).toBe(max - Math.floor(max / 8));
    }
  });

  it('cannot burn a fire type or paralyze a ground type with an electric move', () => {
    const b = battle([mk('kindlekit', 30, ['clawswipe'])], [mk('kindlekit', 30, ['heathaze'])], 2);
    b.start();
    for (let i = 0; i < 6 && b.state === 'choose'; i++) b.turn({ t: 'move', slot: 0 });
    expect(b.player[0].status).toBeNull();

    const b2 = battle([mk('molekin', 30, ['clawswipe'])], [mk('sparkit', 30, ['staticwave'])], 2);
    b2.start();
    const t = texts(b2.turn({ t: 'move', slot: 0 }));
    expect(t.some((x) => x.startsWith("It doesn't affect"))).toBe(true);
    expect(b2.player[0].status).toBeNull();
  });

  it('fails on an already-statused target', () => {
    const me = mk('sparkit', 40, ['staticwave']);
    const foe = mk('nibbun', 40, ['flop']);
    foe.status = 'psn';
    const b = battle([me], [foe]);
    b.start();
    expect(texts(b.turn({ t: 'move', slot: 0 }))).toContain('But it failed!');
  });

  it('confuses, then snaps out', () => {
    const b = battle([mk('wispurr', 40, ['eerieglow'])], [mk('pebblet', 40, ['stiffen'])], 5);
    b.start();
    expect(texts(b.turn({ t: 'move', slot: 0 }))).toContain('The wild Pebblet became confused!');
    let snapped = false;
    let confused = false;
    for (let i = 0; i < 8 && b.state === 'choose'; i++) {
      const t = texts(b.turn({ t: 'move', slot: 0 }));
      if (t.includes('The wild Pebblet is confused!')) confused = true;
      if (t.includes('The wild Pebblet snapped out of confusion!')) {
        snapped = true;
        break;
      }
    }
    expect(confused).toBe(true);
    expect(snapped).toBe(true);
  });
});

describe('stat stages', () => {
  it('caps at +6', () => {
    const b = battle([mk('nibbun', 30, ['pumpup'])], [mk('nibbun', 30, ['flop'])]);
    b.start();
    b.turn({ t: 'move', slot: 0 });
    b.turn({ t: 'move', slot: 0 });
    b.turn({ t: 'move', slot: 0 });
    expect(b.stages(0).atk).toBe(6);
    expect(texts(b.turn({ t: 'move', slot: 0 }))).toContain("Nibbun's Attack won't go any higher!");
  });

  it('reports sharp rises and falls', () => {
    const b = battle([mk('nibbun', 30, ['pumpup'])], [mk('nibbun', 30, ['weegrowl'])], 9);
    b.start();
    const t = texts(b.turn({ t: 'move', slot: 0 }));
    expect(t).toContain("Nibbun's Attack sharply rose!");
    expect(t).toContain("Nibbun's Attack fell!");
    expect(b.stages(0).atk).toBe(1);
  });
});

describe('move effects', () => {
  it('hits 2-5 times', () => {
    const counts = new Map<number, number>();
    for (let seed = 1; seed <= 300; seed++) {
      const b = battle([mk('wrigglet', 5, ['needleflurry'])], [mk('pebblet', 60, ['flop'])], seed);
      b.start();
      const t = texts(b.turn({ t: 'move', slot: 0 })).find((x) => x.startsWith('Hit '));
      if (!t) continue; // missed
      const n = Number(t.split(' ')[1]);
      counts.set(n, (counts.get(n) ?? 0) + 1);
    }
    expect([...counts.keys()].every((n) => n >= 2 && n <= 5)).toBe(true);
    expect((counts.get(2) ?? 0) + (counts.get(3) ?? 0)).toBeGreaterThan((counts.get(4) ?? 0) + (counts.get(5) ?? 0));
  });

  it('takes recoil and drains', () => {
    const me = mk('nibbun', 30, ['recklesscharge']);
    const foe = mk('pebblet', 60, ['flop']);
    const b = battle([me], [foe], 4);
    b.start();
    const ev = b.turn({ t: 'move', slot: 0 });
    const dealt = ev.find((e) => e.t === 'hp' && e.side === 1) as { from: number; to: number };
    const recoil = ev.find((e) => e.t === 'hp' && e.side === 0) as { from: number; to: number };
    expect(recoil.from - recoil.to).toBe(Math.max(1, Math.floor((dealt.from - dealt.to) / 3)));

    const sipper = mk('sprigfawn', 30, ['sapsip']);
    sipper.hp = 10;
    const b2 = battle([sipper], [mk('pupple', 30, ['flop'])], 4);
    b2.start();
    const t = texts(b2.turn({ t: 'move', slot: 0 }));
    expect(t).toContain('The wild Pupple had its energy drained!');
    expect(sipper.hp).toBeGreaterThan(10);
  });

  it('says nothing happened for Flop and deals level damage for Night Fright', () => {
    const b = battle([mk('finfry', 10, ['flop'])], [mk('nibbun', 10, ['flop'])]);
    b.start();
    expect(texts(b.turn({ t: 'move', slot: 0 }))).toContain('But nothing happened!');
    const foe = mk('pebblet', 30, ['flop']);
    const b2 = battle([mk('wispurr', 17, ['nightfright'])], [foe]);
    b2.start();
    b2.turn({ t: 'move', slot: 0 });
    expect(maxHp(foe) - foe.hp).toBe(17);
    // Ghost-type, so it cannot touch a Normal type.
    const normal = mk('nibbun', 30, ['flop']);
    const b3 = battle([mk('wispurr', 17, ['nightfright'])], [normal]);
    b3.start();
    expect(texts(b3.turn({ t: 'move', slot: 0 }))).toContain("It doesn't affect the wild Nibbun...");
  });

  it('struggles without PP', () => {
    const me = mk('nibbun', 30, ['bump']);
    me.moves[0].pp = 0;
    const b = battle([me], [mk('nibbun', 30, ['flop'])]);
    b.start();
    const t = texts(b.turn({ t: 'move', slot: 0 }));
    expect(t).toContain('Nibbun used Struggle!');
    expect(t).toContain('Nibbun is hit with recoil!');
  });

  it('refuses a move with no PP while others have some', () => {
    const me = mk('nibbun', 30, ['bump', 'stiffen']);
    me.moves[0].pp = 0;
    const b = battle([me], [mk('nibbun', 30, ['flop'])]);
    b.start();
    expect(texts(b.turn({ t: 'move', slot: 0 }))).toEqual(["There's no PP left for this move!"]);
    expect(b.state).toBe('choose');
  });
});

describe('catching and running', () => {
  function catchRate(id: string, ball: string, hp: 'full' | 'one', status: Creature['status'], N = 400): number {
    let caught = 0;
    for (let seed = 1; seed <= N; seed++) {
      const foe = mk(id, 10, ['flop']);
      if (hp === 'one') foe.hp = 1;
      foe.status = status;
      if (status === 'slp') foe.sleep = 4;
      const b = battle([mk('nibbun', 10, ['stiffen'])], [foe], seed);
      b.start();
      const ev = b.turn({ t: 'item', item: ball, target: 0 });
      expect(ev.some((e) => e.t === 'throw')).toBe(true);
      if (b.outcome === 'caught') caught++;
    }
    return caught / N;
  }

  it('rarely catches a hard creature at full HP with a plain Pouch', () => {
    expect(catchRate('craniodon', 'pouch', 'full', null)).toBeLessThan(0.15);
  });

  it('almost always catches a weakened, sleeping creature with a Deep Pouch', () => {
    expect(catchRate('chirpip', 'deeppouch', 'one', 'slp', 50)).toBe(1);
    expect(catchRate('craniodon', 'deeppouch', 'one', 'slp')).toBeGreaterThan(0.55);
  });

  it('sets the caught creature', () => {
    const foe = mk('chirpip', 3, ['peck']);
    foe.hp = 1;
    const b = battle([mk('nibbun', 10, ['stiffen'])], [foe]);
    b.start();
    b.turn({ t: 'item', item: 'deeppouch', target: 0 });
    expect(b.caught).toBe(foe);
    expect(b.itemConsumed).toBe(true);
  });

  it('blocks pouches in trainer battles without using them', () => {
    const b = battle([mk('nibbun', 10, ['stiffen'])], [mk('chirpip', 3, ['peck'])], 1, { kind: 'trainer', trainerName: 'Youngster Tim' });
    b.start();
    const ev = b.turn({ t: 'item', item: 'pouch', target: 0 });
    expect(ev.some((e) => e.t === 'throw')).toBe(false);
    expect(texts(ev)[0]).toBe('The trainer blocked the Pouch!');
    expect(b.itemConsumed).toBe(false);
    expect(b.state).toBe('choose');
  });

  it('always escapes when faster, sometimes not when slower; never from trainers', () => {
    const b = battle([mk('chirpip', 20, ['peck'])], [mk('pebblet', 20, ['flop'])]);
    b.start();
    b.turn({ t: 'run' });
    expect(b.outcome).toBe('run');

    let failed = 0;
    for (let seed = 1; seed < 50; seed++) {
      const b2 = battle([mk('pebblet', 5, ['stiffen'])], [mk('chirpip', 30, ['flop'])], seed);
      b2.start();
      if (texts(b2.turn({ t: 'run' })).includes("Can't escape!")) failed++;
    }
    expect(failed).toBeGreaterThan(0);

    const t = battle([mk('chirpip', 20, ['peck'])], [mk('pebblet', 20, ['flop'])], 1, { kind: 'trainer' });
    t.start();
    expect(texts(t.turn({ t: 'run' }))).toEqual(["No! There's no running from a trainer battle!"]);
    expect(t.state).toBe('choose');
  });
});

describe('experience and levels', () => {
  it('splits experience between participants and levels up, learning moves', () => {
    const a = mk('sprigfawn', 4, ['bump', 'weegrowl']);
    a.exp = expForLevel('mslow', 5) - 1;
    const bMon = mk('nibbun', 50, ['rambunct']);
    const foe = mk('nibbun', 10, ['flop']);
    const b = battle([a, bMon], [foe], 7);
    b.start();
    b.turn({ t: 'switch', index: 1 });
    const ev = b.turn({ t: 'move', slot: 0 });
    expect(b.outcome).toBe('win');
    const exps = ev.filter((e) => e.t === 'exp') as { index: number; gained: number }[];
    expect(exps.map((e) => e.index).sort()).toEqual([0, 1]);
    const total = Math.floor((species('nibbun').exp * 10) / 7);
    expect(exps[0].gained).toBe(Math.floor(total / 2));
    expect(ev.some((e) => e.t === 'level' && e.index === 0)).toBe(true);
    expect(ev.some((e) => e.t === 'learn' && e.move === 'vinesnap')).toBe(true);
    expect(a.moves.map((m) => m.id)).toContain('vinesnap');
    expect(b.leveled.has(0)).toBe(true);
  });

  it('gives trainer battles 1.5x and prompts when four moves are known', () => {
    const a = mk('sprigfawn', 12, ['bump', 'weegrowl', 'vinesnap', 'sapsip']);
    a.exp = expForLevel('mslow', 13) - 1;
    const foe = mk('nibbun', 3, ['flop']);
    foe.hp = 1;
    const b = battle([a], [foe], 1, { kind: 'trainer', trainerName: 'Lass Ivy' });
    b.start();
    const ev = b.turn({ t: 'move', slot: 0 });
    const exp = ev.find((e) => e.t === 'exp') as { gained: number };
    expect(exp.gained).toBe(Math.floor((1.5 * species('nibbun').exp * 3) / 7));
    expect(ev.some((e) => e.t === 'learnPrompt' && e.move === 'dustkick')).toBe(true);
    expect(texts(ev)).toContain('You defeated Lass Ivy!');
    b.replaceMove(0, 1, 'dustkick');
    expect(a.moves[1].id).toBe('dustkick');
  });

  it('raises current HP by the max-HP gain', () => {
    const a = mk('nibbun', 9, ['bigchomp']);
    a.hp = 10;
    a.exp = expForLevel('medium', 10) - 1;
    const before = maxHp(a);
    const foe = mk('nibbun', 3, ['flop']);
    foe.hp = 1;
    const b = battle([a], [foe]);
    b.start();
    b.turn({ t: 'move', slot: 0 });
    expect(a.level).toBe(10);
    expect(a.hp).toBe(10 + maxHp(a) - before);
  });
});

describe('battle flow', () => {
  it('trainers send out their next creature', () => {
    const b = battle([mk('nibbun', 50, ['bigchomp'])], [mk('chirpip', 3, ['peck']), mk('pebblet', 3, ['bump'])], 1, { kind: 'trainer', trainerName: 'Hiker Bo' });
    const start = texts(b.start());
    expect(start[0]).toBe('Hiker Bo would like to battle!');
    const ev = b.turn({ t: 'move', slot: 0 });
    expect(texts(ev)).toContain('The foe\'s Chirpip fainted!');
    expect(texts(ev)).toContain('Hiker Bo sent out Pebblet!');
    expect(ev.some((e) => e.t === 'send' && e.side === 1 && e.index === 1)).toBe(true);
    expect(b.foeIndex).toBe(1);
    expect(b.state).toBe('choose');
  });

  it('forces a switch when the active creature faints', () => {
    const weak = mk('nibbun', 3, ['bump']);
    weak.hp = 1;
    const b = battle([weak, mk('nibbun', 30, ['bump'])], [mk('pebblet', 30, ['rockslide'])], 2);
    b.start();
    b.turn({ t: 'move', slot: 0 });
    expect(b.state).toBe('mustSwitch');
    expect(b.canSwitchTo(0)).toBe(false);
    const ev = b.forceSwitch(1);
    expect(ev.some((e) => e.t === 'send' && e.side === 0 && e.index === 1)).toBe(true);
    expect(b.state).toBe('choose');
  });

  it('loses when every creature faints', () => {
    const weak = mk('nibbun', 3, ['bump']);
    weak.hp = 1;
    const b = battle([weak], [mk('pebblet', 30, ['rockslide'])], 2);
    b.start();
    const ev = b.turn({ t: 'move', slot: 0 });
    expect(b.outcome).toBe('lose');
    expect(texts(ev)).toContain('You blacked out!');
    expect(ev[ev.length - 1]).toEqual({ t: 'end', outcome: 'lose' });
  });

  it('switching resets stages and the incoming creature takes the hit', () => {
    const b = battle([mk('nibbun', 30, ['pumpup']), mk('pebblet', 30, ['stiffen'])], [mk('nibbun', 30, ['bump'])], 3);
    b.start();
    b.turn({ t: 'move', slot: 0 });
    expect(b.stages(0).atk).toBe(2);
    const ev = b.turn({ t: 'switch', index: 1 });
    expect(b.stages(0).atk).toBe(0);
    expect(ev.some((e) => e.t === 'hp' && e.side === 0)).toBe(true);
    expect(b.player[1].hp).toBeLessThan(maxHp(b.player[1]));
  });

  it('uses medicine on the party', () => {
    const me = mk('nibbun', 30, ['bump']);
    me.hp = 5;
    const b = battle([me], [mk('nibbun', 30, ['flop'])]);
    b.start();
    const t = texts(b.turn({ t: 'item', item: 'tonic', target: 0 }));
    expect(t[0]).toBe('You used a Tonic!');
    expect(t[1]).toBe("Nibbun's HP was restored by 20 points.");
    expect(b.itemConsumed).toBe(true);
    const full = mk('nibbun', 30, ['bump']);
    const b2 = battle([full], [mk('nibbun', 30, ['flop'])]);
    b2.start();
    expect(texts(b2.turn({ t: 'item', item: 'tonic', target: 0 }))).toEqual(["It won't have any effect."]);
    expect(b2.itemConsumed).toBe(false);
  });

  it('is deterministic for a seed', () => {
    const run = (seed: number) => {
      const b = battle([mk('kindlekit', 12, ['clawswipe', 'sparkpuff', 'quickdash'])], [mk('sprigfawn', 12, ['bump', 'vinesnap', 'sapsip'])], seed, { kind: 'trainer', ai: 'smart' });
      const out: BattleEvent[] = [...b.start()];
      for (let i = 0; i < 30 && b.state === 'choose'; i++) out.push(...b.turn({ t: 'move', slot: i % 3 }));
      return out;
    };
    expect(run(42)).toEqual(run(42));
    expect(run(42)).not.toEqual(run(43));
  });

  it('smart AI prefers super-effective damage', () => {
    let fire = 0;
    for (let seed = 1; seed <= 50; seed++) {
      const b = battle([mk('sprigfawn', 20, ['stiffen'])], [mk('kindlekit', 20, ['clawswipe', 'flamelash', 'weegrowl'])], seed, { kind: 'trainer', ai: 'smart' });
      b.start();
      const m = b.turn({ t: 'move', slot: 0 }).find((e) => e.t === 'move' && e.side === 1) as { move: string };
      if (m.move === 'flamelash') fire++;
    }
    expect(fire).toBeGreaterThan(35);
  });
});

describe('medicine items', () => {
  it('heals, cures, revives and restores PP', () => {
    const c = mk('nibbun', 20, ['bump']);
    expect(itemUsable('tonic', c)).toBe(false);
    c.hp = 1;
    expect(applyItem('supertonic', c)).toBe("Nibbun's HP was restored by 50 points.");
    c.status = 'par';
    expect(itemUsable('antidote', c)).toBe(false);
    expect(applyItem('cureall', c)).toBe('Nibbun was cured of paralysis.');
    c.hp = 0;
    expect(itemUsable('tonic', c)).toBe(false);
    expect(applyItem('pepseed', c)).toBe('Nibbun was revived!');
    expect(c.hp).toBe(Math.floor(calcStats(c).hp / 2));
    c.moves[0].pp = 0;
    applyItem('ether', c);
    expect(c.moves[0].pp).toBe(10);
  });
});
