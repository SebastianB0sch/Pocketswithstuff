/** The seventeen elemental types and how they match up. */
export const TYPES = [
  'normal', 'fire', 'water', 'grass', 'electric', 'ice', 'fighting', 'poison', 'ground',
  'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel',
] as const;

export type Type = (typeof TYPES)[number];

/** Badge colours for type labels (light, dark). */
export const TYPE_COLORS: Record<Type, [string, string]> = {
  normal: ['#b9b59b', '#77745e'],
  fire: ['#f2884a', '#b9431d'],
  water: ['#6f9cf2', '#3559b5'],
  grass: ['#7fcb5a', '#3f8a2a'],
  electric: ['#f6d43c', '#b5900f'],
  ice: ['#9edcdc', '#4f9e9e'],
  fighting: ['#d0563e', '#8a2617'],
  poison: ['#b06bb6', '#6f3477'],
  ground: ['#e0c06c', '#9a7a2c'],
  flying: ['#a99af2', '#6555b9'],
  psychic: ['#f56f95', '#b5304f'],
  bug: ['#b4c838', '#6f7d12'],
  rock: ['#bfa64a', '#7a6720'],
  ghost: ['#7b68a6', '#45386b'],
  dragon: ['#7b5af2', '#4425b5'],
  dark: ['#7d6555', '#45362c'],
  steel: ['#b9b9d0', '#727290'],
};

const SUPER: Record<Type, Type[]> = {
  normal: [],
  fire: ['grass', 'ice', 'bug', 'steel'],
  water: ['fire', 'ground', 'rock'],
  grass: ['water', 'ground', 'rock'],
  electric: ['water', 'flying'],
  ice: ['grass', 'ground', 'flying', 'dragon'],
  fighting: ['normal', 'ice', 'rock', 'dark', 'steel'],
  poison: ['grass'],
  ground: ['fire', 'electric', 'poison', 'rock', 'steel'],
  flying: ['grass', 'fighting', 'bug'],
  psychic: ['fighting', 'poison'],
  bug: ['grass', 'psychic', 'dark'],
  rock: ['fire', 'ice', 'flying', 'bug'],
  ghost: ['psychic', 'ghost'],
  dragon: ['dragon'],
  dark: ['psychic', 'ghost'],
  steel: ['ice', 'rock'],
};

const RESISTED: Record<Type, Type[]> = {
  normal: ['rock', 'steel'],
  fire: ['fire', 'water', 'rock', 'dragon'],
  water: ['water', 'grass', 'dragon'],
  grass: ['fire', 'grass', 'poison', 'flying', 'bug', 'dragon', 'steel'],
  electric: ['electric', 'grass', 'dragon'],
  ice: ['fire', 'water', 'ice', 'steel'],
  fighting: ['poison', 'flying', 'psychic', 'bug'],
  poison: ['poison', 'ground', 'rock', 'ghost'],
  ground: ['grass', 'bug'],
  flying: ['electric', 'rock', 'steel'],
  psychic: ['psychic', 'steel'],
  bug: ['fire', 'fighting', 'poison', 'flying', 'ghost', 'steel'],
  rock: ['fighting', 'ground', 'steel'],
  ghost: ['dark', 'steel'],
  dragon: ['steel'],
  dark: ['fighting', 'dark', 'steel'],
  steel: ['fire', 'water', 'electric', 'steel'],
};

const IMMUNE: Record<Type, Type[]> = {
  normal: ['ghost'],
  fire: [],
  water: [],
  grass: [],
  electric: ['ground'],
  ice: [],
  fighting: ['ghost'],
  poison: ['steel'],
  ground: ['flying'],
  flying: [],
  psychic: ['dark'],
  bug: [],
  rock: [],
  ghost: ['normal'],
  dragon: [],
  dark: [],
  steel: [],
};

/** Damage multiplier of an attack of type `atk` against one defending type. */
export function matchup(atk: Type, def: Type): number {
  if (IMMUNE[atk].includes(def)) return 0;
  if (SUPER[atk].includes(def)) return 2;
  if (RESISTED[atk].includes(def)) return 0.5;
  return 1;
}

/** Combined multiplier against a mono- or dual-typed defender. */
export function effectiveness(atk: Type, defTypes: readonly Type[]): number {
  return defTypes.reduce((m, t) => m * matchup(atk, t), 1);
}
