/**
 * Map data format. Maps are drawn as ASCII grids, one character per tile; the
 * legend below says how each character looks and behaves. Buildings, people,
 * signs and warps are listed beside the grid.
 */
import type { TrackId } from '../audio/audio';
import type { Facing } from '../game/state';
import type { Ground } from './textures';

export type Obj =
  | 'tall' | 'tree' | 'roundtree' | 'mountain' | 'cliff' | 'rock' | 'fence' | 'hedge' | 'flowers' | 'sign' | 'lamp'
  | 'ledge' | 'bridge' | 'water' | 'wall' | 'counter' | 'pc' | 'shelf' | 'bed' | 'table' | 'plant' | 'tv' | 'stove'
  | 'shopshelf' | 'healer' | 'boulder' | 'statue' | 'mat' | 'chair' | 'bookcase' | 'machine' | 'crate' | 'snowtree' | 'snowtall';

export interface TileInfo {
  ground: Ground;
  solid: boolean;
  obj?: Obj;
  /** Wild encounters happen here. */
  encounter?: boolean;
  /** Can be talked across (shop and Rest Stop counters). */
  counter?: boolean;
}

export const LEGEND: Record<string, TileInfo> = {
  // Outdoors
  '.': { ground: 'grass', solid: false },
  ',': { ground: 'path', solid: false },
  ':': { ground: 'pave', solid: false },
  '"': { ground: 'tallbase', solid: false, obj: 'tall', encounter: true },
  T: { ground: 'grass', solid: true, obj: 'tree' },
  O: { ground: 'grass', solid: true, obj: 'roundtree' },
  M: { ground: 'dirt', solid: true, obj: 'mountain' },
  C: { ground: 'dirt', solid: true, obj: 'cliff' },
  r: { ground: 'grass', solid: true, obj: 'rock' },
  w: { ground: 'sand', solid: true, obj: 'water' },
  s: { ground: 'sand', solid: false },
  '*': { ground: 'grass', solid: false, obj: 'flowers' },
  F: { ground: 'grass', solid: true, obj: 'fence' },
  b: { ground: 'grass', solid: true, obj: 'hedge' },
  v: { ground: 'grass', solid: true, obj: 'ledge' },
  '=': { ground: 'path', solid: false, obj: 'bridge' },
  S: { ground: 'grass', solid: true, obj: 'sign' },
  L: { ground: 'pave', solid: true, obj: 'lamp' },
  X: { ground: 'pave', solid: true },
  D: { ground: 'pave', solid: true },
  A: { ground: 'snow', solid: true, obj: 'snowtree' },
  N: { ground: 'snow', solid: false, obj: 'snowtall', encounter: true },
  I: { ground: 'snow', solid: true, obj: 'rock' },
  n: { ground: 'snow', solid: false },
  // Indoors
  W: { ground: 'wood', solid: true, obj: 'wall' },
  _: { ground: 'wood', solid: false },
  q: { ground: 'tile', solid: false },
  R: { ground: 'carpetRed', solid: false },
  U: { ground: 'carpetBlue', solid: false },
  g: { ground: 'gym', solid: false },
  G: { ground: 'gym', solid: true, obj: 'boulder' },
  Y: { ground: 'gym', solid: true, obj: 'statue' },
  k: { ground: 'tile', solid: true, obj: 'counter', counter: true },
  K: { ground: 'wood', solid: true, obj: 'counter', counter: true },
  P: { ground: 'tile', solid: true, obj: 'pc' },
  p: { ground: 'wood', solid: true, obj: 'pc' },
  h: { ground: 'wood', solid: true, obj: 'shelf' },
  H: { ground: 'tile', solid: true, obj: 'healer' },
  d: { ground: 'wood', solid: true, obj: 'bed' },
  t: { ground: 'wood', solid: true, obj: 'table' },
  l: { ground: 'wood', solid: true, obj: 'plant' },
  i: { ground: 'tile', solid: true, obj: 'plant' },
  x: { ground: 'wood', solid: true, obj: 'tv' },
  o: { ground: 'wood', solid: true, obj: 'stove' },
  z: { ground: 'tile', solid: true, obj: 'shopshelf' },
  c: { ground: 'wood', solid: true, obj: 'chair' },
  B: { ground: 'wood', solid: true, obj: 'bookcase' },
  m: { ground: 'tile', solid: true, obj: 'machine' },
  j: { ground: 'wood', solid: true, obj: 'crate' },
  e: { ground: 'wood', solid: false, obj: 'mat' },
  E: { ground: 'tile', solid: false, obj: 'mat' },
  ' ': { ground: 'dirt', solid: true },
};

export type BuildingKind = 'house' | 'bighouse' | 'center' | 'mart' | 'lab' | 'gym';

export interface Building {
  kind: BuildingKind;
  /** Top-left tile of the footprint. */
  x: number;
  y: number;
  w: number;
  h: number;
  roof?: string;
  wall?: string;
  /** Where the door leads. The door is the bottom-centre tile of the footprint. */
  to?: { map: string; x: number; y: number };
}

export function doorOf(b: Building): { x: number; y: number } {
  return { x: b.x + Math.floor(b.w / 2), y: b.y + b.h - 1 };
}

export interface Warp {
  x: number;
  y: number;
  to: string;
  tx: number;
  ty: number;
  facing?: Facing;
  /** Walking off this edge tile in this direction triggers the warp (map connections). */
  edge?: Facing;
}

export type Movement = 'still' | 'look' | 'wander' | 'spin';

export interface TrainerDef {
  /** Display name, e.g. "Youngster Tim". */
  name: string;
  /** Look key in LOOKS used for the battle portrait. */
  party: [string, number][];
  sight: number;
  money: number;
  intro: string;
  defeat: string;
  after: string;
  /** Leaders get special music and a badge. */
  leader?: boolean;
}

export interface NpcDef {
  id: string;
  x: number;
  y: number;
  look: string;
  facing?: Facing;
  move?: Movement;
  /** Plain dialogue lines, said one after another. */
  text?: string | string[];
  /** Named script in the map's script table (overrides text). */
  script?: string;
  trainer?: TrainerDef;
  /** Only present while this flag is unset / set. */
  hideIf?: string;
  showIf?: string;
}

export interface ItemBall {
  x: number;
  y: number;
  item: string;
  count?: number;
  flag: string;
  /** Hidden items are invisible and found with A. */
  hidden?: boolean;
}

export interface Encounter {
  species: string;
  min: number;
  max: number;
  weight: number;
  /** Only at this time of day. */
  time?: 'day' | 'night';
}

export interface Trigger {
  x: number;
  y: number;
  w?: number;
  h?: number;
  script: string;
  /** Runs only while this flag is unset; scripts usually set it. */
  unless?: string;
  /** Runs only once this flag is set. */
  when?: string;
}

export interface MapDef {
  id: string;
  name: string;
  music: TrackId;
  outdoor: boolean;
  /** Grid rows; all rows the same length. */
  tiles: string[];
  /** What fills the view beyond the map edge. */
  border: string;
  buildings?: Building[];
  warps: Warp[];
  npcs?: NpcDef[];
  signs?: { x: number; y: number; text: string }[];
  items?: ItemBall[];
  encounters?: Encounter[];
  /** Percent chance per step in tall grass. */
  encounterRate?: number;
  triggers?: Trigger[];
  /** Interior wallpaper colours. */
  wallpaper?: [string, string];
  /** Where this map sits on the region map (0..1). */
  regionPos?: [number, number];
  /** Shown on entry in the location banner. */
  banner?: boolean;
  /** Healing respawn point for blackouts (Rest Stop interiors). */
  respawn?: { x: number; y: number };
  /** Walking off an edge leads to the neighbouring map; `offset` is added to the shared coordinate. */
  connections?: { dir: Facing; to: string; offset: number }[];
  /** Script run every time the map is entered. */
  onEnter?: string;
}

export function tileAt(m: MapDef, x: number, y: number): TileInfo {
  return LEGEND[charAt(m, x, y)] ?? LEGEND[' '];
}

const OPEN = new Set([',', '.', ':', '"', 's', 'n', 'N', '=']);

/**
 * The character at a tile. Beyond the edge it is the border, except that open
 * ground at the edge (an exit path) carries on outward so exits don't end in a wall.
 */
export function charAt(m: MapDef, x: number, y: number): string {
  const h = m.tiles.length;
  const w = m.tiles[0].length;
  if (y >= 0 && y < h && x >= 0 && x < w) return m.tiles[y][x];
  if (!m.outdoor) return ' ';
  const cx = Math.max(0, Math.min(w - 1, x));
  const cy = Math.max(0, Math.min(h - 1, y));
  const edge = m.tiles[cy][cx];
  // Only straight out from an edge, not diagonally from a corner.
  const straight = (x >= 0 && x < w) || (y >= 0 && y < h);
  return straight && OPEN.has(edge) ? (edge === '"' || edge === 'N' ? (edge === 'N' ? 'n' : '.') : edge) : m.border;
}

export function mapSize(m: MapDef): { w: number; h: number } {
  return { w: m.tiles[0].length, h: m.tiles.length };
}
