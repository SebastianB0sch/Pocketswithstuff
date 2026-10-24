import { item } from '../data/items';
import { move } from '../data/moves';
import { displayName, maxHp, type Creature } from './creature';

/** Whether using a medicine item on this creature would do anything. */
export function itemUsable(itemId: string, c: Creature): boolean {
  const use = item(itemId).use;
  switch (use.t) {
    case 'heal': return c.hp > 0 && c.hp < maxHp(c);
    case 'cure': return c.hp > 0 && c.status !== null && (use.status === 'all' || use.status === c.status);
    case 'revive': return c.hp === 0;
    case 'restorePP': return c.moves.some((m) => m.pp < move(m.id).pp);
    default: return false;
  }
}

const CURED: Record<string, string> = {
  psn: 'was cured of its poisoning.',
  par: 'was cured of paralysis.',
  brn: "'s burn was healed.",
  slp: 'woke up.',
  frz: 'was thawed out.',
};

/** Applies a medicine item and returns the message to show. Leaves the creature alone if it would have no effect. */
export function applyItem(itemId: string, c: Creature): string {
  if (!itemUsable(itemId, c)) return "It won't have any effect.";
  const use = item(itemId).use;
  const name = displayName(c);
  const max = maxHp(c);
  switch (use.t) {
    case 'heal': {
      const n = Math.min(use.hp, max - c.hp);
      c.hp += n;
      return `${name}'s HP was restored by ${n} point${n === 1 ? '' : 's'}.`;
    }
    case 'cure': {
      const s = c.status!;
      c.status = null;
      c.sleep = 0;
      const tail = CURED[s];
      return tail.startsWith("'") ? `${name}${tail}` : `${name} ${tail}`;
    }
    case 'revive':
      c.hp = Math.max(1, Math.floor(max * use.frac));
      c.status = null;
      c.sleep = 0;
      return `${name} was revived!`;
    case 'restorePP':
      for (const m of c.moves) m.pp = Math.min(move(m.id).pp, m.pp + use.pp);
      return `${name}'s PP was restored.`;
    default:
      return "It won't have any effect.";
  }
}
