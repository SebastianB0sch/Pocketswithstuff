export type ItemPocket = 'items' | 'medicine' | 'pouches' | 'key';

export type ItemUse =
  | { t: 'heal'; hp: number }
  | { t: 'cure'; status: 'brn' | 'psn' | 'par' | 'slp' | 'frz' | 'all' }
  | { t: 'revive'; frac: number }
  | { t: 'restorePP'; pp: number }
  | { t: 'catch'; bonus: number }
  | { t: 'repel'; steps: number }
  | { t: 'none' };

export interface Item {
  id: string;
  name: string;
  pocket: ItemPocket;
  price: number;
  use: ItemUse;
  desc: string;
}

const LIST: Item[] = [
  { id: 'pouch', name: 'Pouch', pocket: 'pouches', price: 200, use: { t: 'catch', bonus: 1 }, desc: 'A roomy cloth pouch for catching wild Pocklets.' },
  { id: 'snugpouch', name: 'Snug Pouch', pocket: 'pouches', price: 600, use: { t: 'catch', bonus: 1.5 }, desc: 'A well-stitched pouch. Better at catching than a plain Pouch.' },
  { id: 'deeppouch', name: 'Deep Pouch', pocket: 'pouches', price: 1200, use: { t: 'catch', bonus: 2 }, desc: 'A bottomless-looking pouch with a very high catch rate.' },
  { id: 'tonic', name: 'Tonic', pocket: 'medicine', price: 300, use: { t: 'heal', hp: 20 }, desc: 'A fizzy drink that restores 20 HP.' },
  { id: 'supertonic', name: 'Super Tonic', pocket: 'medicine', price: 700, use: { t: 'heal', hp: 50 }, desc: 'A strong tonic that restores 50 HP.' },
  { id: 'megatonic', name: 'Mega Tonic', pocket: 'medicine', price: 1200, use: { t: 'heal', hp: 200 }, desc: 'A potent tonic that restores 200 HP.' },
  { id: 'antidote', name: 'Antidote', pocket: 'medicine', price: 100, use: { t: 'cure', status: 'psn' }, desc: 'Cures a poisoned Pocklet.' },
  { id: 'unstiff', name: 'Unstiff Gel', pocket: 'medicine', price: 200, use: { t: 'cure', status: 'par' }, desc: 'A tingly gel that cures paralysis.' },
  { id: 'coolsalve', name: 'Cool Salve', pocket: 'medicine', price: 250, use: { t: 'cure', status: 'brn' }, desc: 'A cooling salve that heals a burn.' },
  { id: 'wakebell', name: 'Wake Bell', pocket: 'medicine', price: 250, use: { t: 'cure', status: 'slp' }, desc: 'A tiny bell whose chime wakes a sleeping Pocklet.' },
  { id: 'thawdrop', name: 'Thaw Drop', pocket: 'medicine', price: 250, use: { t: 'cure', status: 'frz' }, desc: 'A warm drop that thaws a frozen Pocklet.' },
  { id: 'cureall', name: 'Cure-All', pocket: 'medicine', price: 600, use: { t: 'cure', status: 'all' }, desc: 'Cures any status problem.' },
  { id: 'pepseed', name: 'Pep Seed', pocket: 'medicine', price: 1500, use: { t: 'revive', frac: 0.5 }, desc: 'Revives a fainted Pocklet with half its HP.' },
  { id: 'ether', name: 'Ether', pocket: 'medicine', price: 1000, use: { t: 'restorePP', pp: 10 }, desc: 'Restores 10 PP to each move of one Pocklet.' },
  { id: 'repel', name: 'Repel Spray', pocket: 'items', price: 350, use: { t: 'repel', steps: 100 }, desc: 'Keeps weak wild Pocklets away for 100 steps.' },
  { id: 'shinystone', name: 'Shiny Pebble', pocket: 'items', price: 2000, use: { t: 'none' }, desc: 'A pretty pebble. Shops will buy it for a good price.' },
  { id: 'wristpad', name: 'Wristpad', pocket: 'key', price: 0, use: { t: 'none' }, desc: 'A handy wrist gadget with a clock, step counter and more.' },
  { id: 'pocklopedia', name: 'Pocklopedia', pocket: 'key', price: 0, use: { t: 'none' }, desc: 'A high-tech encyclopedia that records every Pocklet you meet.' },
  { id: 'runshoes', name: 'Run Shoes', pocket: 'key', price: 0, use: { t: 'none' }, desc: 'Hold B (or Shift) to run.' },
];

export const ITEMS: Record<string, Item> = Object.fromEntries(LIST.map((i) => [i.id, i]));

export function item(id: string): Item {
  const i = ITEMS[id];
  if (!i) throw new Error(`Unknown item ${id}`);
  return i;
}
