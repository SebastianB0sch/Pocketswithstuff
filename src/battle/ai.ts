/** How the opponent picks its move each turn. */
import type { Rng } from '../core/rng';
import { move as moveData } from '../data/moves';
import { species } from '../data/species';
import { effectiveness } from '../data/types';
import { calcStats, maxHp } from '../game/creature';
import { calcDamage, type Battle } from './engine';

/** Slot index of the move the foe's active creature will use (any slot when out of PP: Struggle). */
export function chooseMove(battle: Battle, mode: 'random' | 'smart', rng: Rng): number {
  const me = battle.active(1);
  const usable = me.moves.map((m, i) => (m.pp > 0 ? i : -1)).filter((i) => i >= 0);
  if (usable.length === 0) return 0;
  if (mode === 'random') return rng.pick(usable);

  const target = battle.active(0);
  const myStages = battle.stages(1);
  const theirStages = battle.stages(0);
  const targetTypes = species(target.species).types;
  const scores = usable.map((i) => {
    const m = moveData(me.moves[i].id);
    const acc = m.accuracy === 0 ? 1 : m.accuracy / 100;
    const effects = m.effects ?? [];
    if (m.category !== 'status') {
      const { damage, effectiveness: eff } = calcDamage(me, target, m, {
        roll: 92,
        atkStage: myStages[m.category === 'physical' ? 'atk' : 'spa'],
        defStage: theirStages[m.category === 'physical' ? 'def' : 'spd'],
        burned: me.status === 'brn',
      });
      if (eff === 0) return 0;
      const hits = effects.some((e) => e.t === 'hits') ? 3 : 1;
      const expected = damage * hits * acc;
      // A likely knockout beats everything else.
      return expected >= target.hp ? 1000 + expected : (expected / Math.max(1, maxHp(target))) * 200;
    }
    let score = 0;
    for (const e of effects) {
      switch (e.t) {
        case 'status': {
          if (target.status) break;
          if (m.type === 'electric' && effectiveness('electric', targetTypes) === 0) break;
          const immune = (e.s === 'brn' && targetTypes.includes('fire')) || (e.s === 'psn' && (targetTypes.includes('poison') || targetTypes.includes('steel'))) || (e.s === 'frz' && targetTypes.includes('ice'));
          if (!immune) score += 45 * acc;
          break;
        }
        case 'confuse':
          if (battle.confusion(0) === 0) score += 25 * acc;
          break;
        case 'stat':
          if (e.who === 'self') {
            if (myStages[e.stat] < 2 && me.hp > maxHp(me) / 2) score += 22;
          } else if (theirStages[e.stat] > -2) score += 15 * acc;
          break;
        case 'heal':
          if (me.hp < maxHp(me) / 2) score += 90;
          break;
        default:
          break;
      }
    }
    // Faster foes are less worth slowing down; keep stat moves modest.
    if (calcStats(target).spe < calcStats(me).spe) score *= 0.9;
    return score;
  });

  const best = Math.max(...scores);
  if (best <= 0 || rng.chance(15)) {
    const ok = usable.filter((_, k) => scores[k] > 0);
    return rng.pick(ok.length ? ok : usable);
  }
  // Pick among the near-best for a little variety.
  const top = usable.filter((_, k) => scores[k] >= best * 0.9);
  return rng.pick(top);
}
