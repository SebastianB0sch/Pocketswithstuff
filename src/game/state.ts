/** Everything that persists in a save file. */
import type { Creature } from './creature';

export type Facing = 'down' | 'up' | 'left' | 'right';

export interface Options {
  textSpeed: 0 | 1 | 2;
  music: number;
  sfx: number;
  /** Index into RESOLUTIONS. */
  resolution: number;
  animations: boolean;
}

export interface SaveData {
  version: 1;
  name: string;
  rival: string;
  /** Rival's starter species, picked when the player picks theirs. */
  rivalStarter: string;
  starter: string;
  party: Creature[];
  box: Creature[];
  bag: Record<string, number>;
  money: number;
  badges: string[];
  flags: Record<string, number | boolean>;
  map: string;
  x: number;
  y: number;
  facing: Facing;
  /** Where to wake up after blacking out. */
  respawn: { map: string; x: number; y: number };
  seen: string[];
  caught: string[];
  steps: number;
  repel: number;
  playTime: number;
  options: Options;
  trainerId: number;
}

const KEY = 'pockets-with-stuff/save';
const OPTIONS_KEY = 'pockets-with-stuff/options';

export function defaultOptions(): Options {
  return { textSpeed: 1, music: 0.7, sfx: 0.8, resolution: 0, animations: true };
}

export function newSave(name: string, rival: string, options: Options): SaveData {
  return {
    version: 1,
    name,
    rival,
    rivalStarter: '',
    starter: '',
    party: [],
    box: [],
    bag: {},
    money: 3000,
    badges: [],
    flags: {},
    map: 'home',
    x: 6,
    y: 3,
    facing: 'down',
    respawn: { map: 'home', x: 4, y: 5 },
    seen: [],
    caught: [],
    steps: 0,
    repel: 0,
    playTime: 0,
    options,
    trainerId: Math.floor(Math.random() * 65536),
  };
}

export function loadSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as SaveData;
    if (s.version !== 1) return null;
    s.options = { ...defaultOptions(), ...s.options };
    return s;
  } catch {
    return null;
  }
}

export function writeSave(s: SaveData): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
    return true;
  } catch {
    return false;
  }
}

export function hasSave(): boolean {
  try {
    return !!localStorage.getItem(KEY);
  } catch {
    return false;
  }
}

/** Options survive without a save file, so the title screen can use them. */
export function loadOptions(): Options {
  try {
    const raw = localStorage.getItem(OPTIONS_KEY);
    if (raw) return { ...defaultOptions(), ...JSON.parse(raw) };
  } catch {
    /* private mode */
  }
  return defaultOptions();
}

export function writeOptions(o: Options): void {
  try {
    localStorage.setItem(OPTIONS_KEY, JSON.stringify(o));
  } catch {
    /* private mode */
  }
}

export function addItem(s: SaveData, id: string, n = 1): void {
  s.bag[id] = (s.bag[id] ?? 0) + n;
  if (s.bag[id] <= 0) delete s.bag[id];
}

export function hasItem(s: SaveData, id: string): boolean {
  return (s.bag[id] ?? 0) > 0;
}

export function markSeen(s: SaveData, id: string): void {
  if (!s.seen.includes(id)) s.seen.push(id);
}

export function markCaught(s: SaveData, id: string): void {
  markSeen(s, id);
  if (!s.caught.includes(id)) s.caught.push(id);
}
