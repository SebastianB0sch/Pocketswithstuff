import type { Type } from './types';

export type Category = 'physical' | 'special' | 'status';
export type BattleStat = 'atk' | 'def' | 'spa' | 'spd' | 'spe' | 'acc' | 'eva';
export type Status = 'brn' | 'psn' | 'par' | 'slp' | 'frz';

export type Effect =
  | { t: 'stat'; who: 'self' | 'foe'; stat: BattleStat; n: number; chance?: number }
  | { t: 'status'; s: Status; chance?: number }
  | { t: 'confuse'; chance?: number }
  | { t: 'flinch'; chance: number }
  | { t: 'recoil'; frac: number }
  | { t: 'drain'; frac: number }
  | { t: 'heal'; frac: number }
  | { t: 'hits'; min: number; max: number }
  | { t: 'crit' }
  | { t: 'levelDamage' }
  | { t: 'nothing' };

export interface Move {
  id: string;
  name: string;
  type: Type;
  category: Category;
  power: number;
  /** Percent; 0 means it never misses. */
  accuracy: number;
  pp: number;
  priority?: number;
  effects?: Effect[];
  desc: string;
}

const M = (m: Move) => m;

const LIST: Move[] = [
  // Normal
  M({ id: 'bump', name: 'Bump', type: 'normal', category: 'physical', power: 40, accuracy: 100, pp: 35, desc: 'A full-body shove.' }),
  M({ id: 'clawswipe', name: 'Claw Swipe', type: 'normal', category: 'physical', power: 40, accuracy: 100, pp: 35, desc: 'Rakes the foe with sharp claws.' }),
  M({ id: 'weegrowl', name: 'Wee Growl', type: 'normal', category: 'status', power: 0, accuracy: 100, pp: 40, effects: [{ t: 'stat', who: 'foe', stat: 'atk', n: -1 }], desc: 'An adorable growl that lowers the foe\'s Attack.' }),
  M({ id: 'wiggle', name: 'Wiggle', type: 'normal', category: 'status', power: 0, accuracy: 100, pp: 30, effects: [{ t: 'stat', who: 'foe', stat: 'def', n: -1 }], desc: 'A cute wiggle that lowers the foe\'s Defense.' }),
  M({ id: 'quickdash', name: 'Quick Dash', type: 'normal', category: 'physical', power: 40, accuracy: 100, pp: 30, priority: 1, desc: 'A blinding dash that always strikes first.' }),
  M({ id: 'rambunct', name: 'Rambunct', type: 'normal', category: 'physical', power: 70, accuracy: 100, pp: 15, effects: [{ t: 'flinch', chance: 30 }], desc: 'A wild headlong charge. May make the foe flinch.' }),
  M({ id: 'bellyflop', name: 'Belly Flop', type: 'normal', category: 'physical', power: 85, accuracy: 100, pp: 15, effects: [{ t: 'status', s: 'par', chance: 30 }], desc: 'Lands on the foe with its whole weight. May paralyze.' }),
  M({ id: 'recklesscharge', name: 'Reckless Charge', type: 'normal', category: 'physical', power: 120, accuracy: 100, pp: 15, effects: [{ t: 'recoil', frac: 1 / 3 }], desc: 'A furious tackle that also hurts the user.' }),
  M({ id: 'bigchomp', name: 'Big Chomp', type: 'normal', category: 'physical', power: 80, accuracy: 90, pp: 15, effects: [{ t: 'flinch', chance: 10 }], desc: 'Bites hard with huge front teeth.' }),
  M({ id: 'starflick', name: 'Starflick', type: 'normal', category: 'special', power: 60, accuracy: 0, pp: 20, desc: 'Flicks star-shaped sparks that never miss.' }),
  M({ id: 'stiffen', name: 'Stiffen', type: 'normal', category: 'status', power: 0, accuracy: 0, pp: 30, effects: [{ t: 'stat', who: 'self', stat: 'def', n: 1 }], desc: 'Tenses every muscle to raise Defense.' }),
  M({ id: 'lullaby', name: 'Lullaby', type: 'normal', category: 'status', power: 0, accuracy: 55, pp: 15, effects: [{ t: 'status', s: 'slp' }], desc: 'A soothing tune that puts the foe to sleep.' }),
  M({ id: 'pumpup', name: 'Pump Up', type: 'normal', category: 'status', power: 0, accuracy: 0, pp: 20, effects: [{ t: 'stat', who: 'self', stat: 'atk', n: 2 }], desc: 'Gets fired up to sharply raise Attack.' }),
  M({ id: 'patchup', name: 'Patch Up', type: 'normal', category: 'status', power: 0, accuracy: 0, pp: 10, effects: [{ t: 'heal', frac: 0.5 }], desc: 'Tends its wounds to restore half its max HP.' }),
  M({ id: 'flop', name: 'Flop', type: 'normal', category: 'status', power: 0, accuracy: 0, pp: 40, effects: [{ t: 'nothing' }], desc: 'Flops around helplessly. Nothing happens.' }),
  M({ id: 'struggle', name: 'Struggle', type: 'normal', category: 'physical', power: 50, accuracy: 0, pp: 1, effects: [{ t: 'recoil', frac: 1 / 4 }], desc: 'Used only when out of PP. Hurts the user too.' }),
  // Fire
  M({ id: 'sparkpuff', name: 'Spark Puff', type: 'fire', category: 'special', power: 40, accuracy: 100, pp: 25, effects: [{ t: 'status', s: 'brn', chance: 10 }], desc: 'A puff of embers. May burn.' }),
  M({ id: 'flamelash', name: 'Flame Lash', type: 'fire', category: 'physical', power: 65, accuracy: 100, pp: 15, effects: [{ t: 'status', s: 'brn', chance: 10 }], desc: 'Whips the foe with a burning tail. May burn.' }),
  M({ id: 'flareburst', name: 'Flare Burst', type: 'fire', category: 'special', power: 90, accuracy: 100, pp: 15, effects: [{ t: 'status', s: 'brn', chance: 10 }], desc: 'A roaring jet of flame. May burn.' }),
  M({ id: 'blazerush', name: 'Blaze Rush', type: 'fire', category: 'physical', power: 120, accuracy: 100, pp: 15, effects: [{ t: 'recoil', frac: 1 / 3 }, { t: 'status', s: 'brn', chance: 10 }], desc: 'Cloaked in fire, it rams the foe. Hurts the user.' }),
  M({ id: 'heathaze', name: 'Heat Haze', type: 'fire', category: 'status', power: 0, accuracy: 75, pp: 15, effects: [{ t: 'status', s: 'brn' }], desc: 'Shimmering heat that burns the foe.' }),
  // Water
  M({ id: 'splashjet', name: 'Splash Jet', type: 'water', category: 'special', power: 40, accuracy: 100, pp: 25, desc: 'Squirts a jet of water.' }),
  M({ id: 'aquadash', name: 'Aqua Dash', type: 'water', category: 'physical', power: 40, accuracy: 100, pp: 20, priority: 1, desc: 'A watery lunge that always strikes first.' }),
  M({ id: 'bubblespray', name: 'Bubble Spray', type: 'water', category: 'special', power: 65, accuracy: 100, pp: 20, effects: [{ t: 'stat', who: 'foe', stat: 'spe', n: -1, chance: 10 }], desc: 'A spray of bubbles. May lower Speed.' }),
  M({ id: 'tidecrash', name: 'Tide Crash', type: 'water', category: 'physical', power: 80, accuracy: 100, pp: 15, effects: [{ t: 'flinch', chance: 20 }], desc: 'Crashes down like a breaking wave. May flinch.' }),
  M({ id: 'hydrosurge', name: 'Hydro Surge', type: 'water', category: 'special', power: 95, accuracy: 100, pp: 15, desc: 'Swamps the foe with a great surge of water.' }),
  // Grass
  M({ id: 'vinesnap', name: 'Vine Snap', type: 'grass', category: 'physical', power: 45, accuracy: 100, pp: 25, desc: 'Snaps the foe with a springy vine.' }),
  M({ id: 'sapsip', name: 'Sap Sip', type: 'grass', category: 'special', power: 40, accuracy: 100, pp: 15, effects: [{ t: 'drain', frac: 0.5 }], desc: 'Sips the foe\'s energy to restore HP.' }),
  M({ id: 'razorleaves', name: 'Razor Leaves', type: 'grass', category: 'physical', power: 55, accuracy: 95, pp: 25, effects: [{ t: 'crit' }], desc: 'Sharp leaves fly. High critical-hit ratio.' }),
  M({ id: 'seedburst', name: 'Seed Burst', type: 'grass', category: 'physical', power: 80, accuracy: 100, pp: 15, desc: 'Pelts the foe with exploding seeds.' }),
  M({ id: 'petalstorm', name: 'Petal Storm', type: 'grass', category: 'special', power: 90, accuracy: 100, pp: 10, desc: 'A whirling storm of razor petals.' }),
  M({ id: 'sporedust', name: 'Spore Dust', type: 'grass', category: 'status', power: 0, accuracy: 75, pp: 15, effects: [{ t: 'status', s: 'slp' }], desc: 'Scatters sleepy spores over the foe.' }),
  M({ id: 'stunspores', name: 'Stun Spores', type: 'grass', category: 'status', power: 0, accuracy: 75, pp: 30, effects: [{ t: 'status', s: 'par' }], desc: 'Tingly spores that paralyze the foe.' }),
  // Electric
  M({ id: 'zap', name: 'Zap', type: 'electric', category: 'special', power: 40, accuracy: 100, pp: 30, effects: [{ t: 'status', s: 'par', chance: 10 }], desc: 'A small jolt. May paralyze.' }),
  M({ id: 'sparktackle', name: 'Spark Tackle', type: 'electric', category: 'physical', power: 65, accuracy: 100, pp: 20, effects: [{ t: 'status', s: 'par', chance: 30 }], desc: 'A charged tackle. May paralyze.' }),
  M({ id: 'voltbeam', name: 'Volt Beam', type: 'electric', category: 'special', power: 90, accuracy: 100, pp: 15, effects: [{ t: 'status', s: 'par', chance: 10 }], desc: 'A crackling beam of electricity. May paralyze.' }),
  M({ id: 'staticwave', name: 'Static Wave', type: 'electric', category: 'status', power: 0, accuracy: 100, pp: 20, effects: [{ t: 'status', s: 'par' }], desc: 'A weak pulse of static that paralyzes the foe.' }),
  // Ice
  M({ id: 'frostbreath', name: 'Frost Breath', type: 'ice', category: 'special', power: 40, accuracy: 100, pp: 25, effects: [{ t: 'status', s: 'frz', chance: 10 }], desc: 'A chilly breath. May freeze.' }),
  M({ id: 'frostbite', name: 'Frost Bite', type: 'ice', category: 'physical', power: 65, accuracy: 95, pp: 15, effects: [{ t: 'status', s: 'frz', chance: 10 }], desc: 'Bites with icy fangs. May freeze.' }),
  M({ id: 'blizzardbeam', name: 'Blizzard Beam', type: 'ice', category: 'special', power: 90, accuracy: 100, pp: 10, effects: [{ t: 'status', s: 'frz', chance: 10 }], desc: 'A freezing beam. May freeze.' }),
  // Fighting
  M({ id: 'chop', name: 'Chop', type: 'fighting', category: 'physical', power: 50, accuracy: 100, pp: 25, effects: [{ t: 'crit' }], desc: 'A sharp chop. High critical-hit ratio.' }),
  M({ id: 'lowsweep', name: 'Low Sweep', type: 'fighting', category: 'physical', power: 65, accuracy: 100, pp: 20, effects: [{ t: 'stat', who: 'foe', stat: 'spe', n: -1 }], desc: 'Sweeps the foe\'s legs, lowering Speed.' }),
  M({ id: 'powerpunch', name: 'Power Punch', type: 'fighting', category: 'physical', power: 80, accuracy: 100, pp: 15, desc: 'A heavy, well-trained punch.' }),
  M({ id: 'trainhard', name: 'Train Hard', type: 'fighting', category: 'status', power: 0, accuracy: 0, pp: 20, effects: [{ t: 'stat', who: 'self', stat: 'atk', n: 1 }, { t: 'stat', who: 'self', stat: 'def', n: 1 }], desc: 'Raises Attack and Defense.' }),
  // Poison
  M({ id: 'toxicprick', name: 'Toxic Prick', type: 'poison', category: 'physical', power: 15, accuracy: 100, pp: 35, effects: [{ t: 'status', s: 'psn', chance: 30 }], desc: 'A poisoned barb. May poison.' }),
  M({ id: 'poisonfang', name: 'Poison Fang', type: 'poison', category: 'physical', power: 50, accuracy: 100, pp: 15, effects: [{ t: 'status', s: 'psn', chance: 30 }], desc: 'Bites with venomous fangs. May poison.' }),
  M({ id: 'sludge', name: 'Sludge', type: 'poison', category: 'special', power: 65, accuracy: 100, pp: 20, effects: [{ t: 'status', s: 'psn', chance: 30 }], desc: 'Hurls toxic sludge. May poison.' }),
  M({ id: 'toxingas', name: 'Toxin Gas', type: 'poison', category: 'status', power: 0, accuracy: 90, pp: 35, effects: [{ t: 'status', s: 'psn' }], desc: 'A cloud of noxious gas that poisons the foe.' }),
  // Ground
  M({ id: 'mudflick', name: 'Mud Flick', type: 'ground', category: 'special', power: 20, accuracy: 100, pp: 10, effects: [{ t: 'stat', who: 'foe', stat: 'acc', n: -1 }], desc: 'Flicks mud in the foe\'s face, lowering accuracy.' }),
  M({ id: 'dustkick', name: 'Dust Kick', type: 'ground', category: 'status', power: 0, accuracy: 100, pp: 15, effects: [{ t: 'stat', who: 'foe', stat: 'acc', n: -1 }], desc: 'Kicks up dust to lower the foe\'s accuracy.' }),
  M({ id: 'mudbomb', name: 'Mud Bomb', type: 'ground', category: 'special', power: 65, accuracy: 85, pp: 10, effects: [{ t: 'stat', who: 'foe', stat: 'acc', n: -1, chance: 30 }], desc: 'A ball of hard mud. May lower accuracy.' }),
  M({ id: 'digstrike', name: 'Dig Strike', type: 'ground', category: 'physical', power: 80, accuracy: 100, pp: 10, desc: 'Burrows and strikes from below.' }),
  M({ id: 'quake', name: 'Quake', type: 'ground', category: 'physical', power: 100, accuracy: 100, pp: 10, desc: 'Shakes the ground violently.' }),
  // Flying
  M({ id: 'gust', name: 'Gust', type: 'flying', category: 'special', power: 40, accuracy: 100, pp: 35, desc: 'Whips up a gust of wind.' }),
  M({ id: 'peck', name: 'Peck', type: 'flying', category: 'physical', power: 35, accuracy: 100, pp: 35, desc: 'A jab with a pointed beak.' }),
  M({ id: 'wingslap', name: 'Wing Slap', type: 'flying', category: 'physical', power: 60, accuracy: 100, pp: 35, desc: 'Strikes with outstretched wings.' }),
  M({ id: 'airslicer', name: 'Air Slicer', type: 'flying', category: 'special', power: 75, accuracy: 95, pp: 15, effects: [{ t: 'flinch', chance: 30 }], desc: 'A blade of air. May make the foe flinch.' }),
  M({ id: 'skydive', name: 'Sky Dive', type: 'flying', category: 'physical', power: 90, accuracy: 100, pp: 15, desc: 'Dives from high above.' }),
  // Psychic
  M({ id: 'mindpoke', name: 'Mind Poke', type: 'psychic', category: 'special', power: 50, accuracy: 100, pp: 25, effects: [{ t: 'confuse', chance: 10 }], desc: 'A telekinetic jab. May confuse.' }),
  M({ id: 'psybeam', name: 'Psy Beam', type: 'psychic', category: 'special', power: 65, accuracy: 100, pp: 20, effects: [{ t: 'confuse', chance: 10 }], desc: 'A peculiar beam. May confuse.' }),
  M({ id: 'mindblast', name: 'Mind Blast', type: 'psychic', category: 'special', power: 90, accuracy: 100, pp: 10, effects: [{ t: 'stat', who: 'foe', stat: 'spd', n: -1, chance: 10 }], desc: 'A strong psychic blast. May lower Sp. Def.' }),
  M({ id: 'drowsegaze', name: 'Drowse Gaze', type: 'psychic', category: 'status', power: 0, accuracy: 60, pp: 20, effects: [{ t: 'status', s: 'slp' }], desc: 'A sleepy stare that puts the foe to sleep.' }),
  M({ id: 'meditate', name: 'Meditate', type: 'psychic', category: 'status', power: 0, accuracy: 0, pp: 20, effects: [{ t: 'stat', who: 'self', stat: 'spa', n: 1 }, { t: 'stat', who: 'self', stat: 'spd', n: 1 }], desc: 'Calms the mind to raise Sp. Atk and Sp. Def.' }),
  // Bug
  M({ id: 'nibble', name: 'Nibble', type: 'bug', category: 'physical', power: 60, accuracy: 100, pp: 20, desc: 'Chews on the foe.' }),
  M({ id: 'silkshot', name: 'Silk Shot', type: 'bug', category: 'status', power: 0, accuracy: 95, pp: 40, effects: [{ t: 'stat', who: 'foe', stat: 'spe', n: -1 }], desc: 'Sticky silk that lowers the foe\'s Speed.' }),
  M({ id: 'needleflurry', name: 'Needle Flurry', type: 'bug', category: 'physical', power: 14, accuracy: 85, pp: 20, effects: [{ t: 'hits', min: 2, max: 5 }], desc: 'Fires needles two to five times.' }),
  M({ id: 'glowbeam', name: 'Glow Beam', type: 'bug', category: 'special', power: 75, accuracy: 100, pp: 15, effects: [{ t: 'confuse', chance: 10 }], desc: 'A strange glowing beam. May confuse.' }),
  M({ id: 'crosssnip', name: 'Cross Snip', type: 'bug', category: 'physical', power: 80, accuracy: 100, pp: 15, desc: 'Slashes in an X with scythes or claws.' }),
  // Rock
  M({ id: 'pebbletoss', name: 'Pebble Toss', type: 'rock', category: 'physical', power: 50, accuracy: 90, pp: 15, desc: 'Throws a fistful of pebbles.' }),
  M({ id: 'rockwall', name: 'Rock Wall', type: 'rock', category: 'physical', power: 50, accuracy: 80, pp: 10, effects: [{ t: 'stat', who: 'foe', stat: 'spe', n: -1 }], desc: 'Boxes the foe in with boulders, lowering Speed.' }),
  M({ id: 'rockslide', name: 'Rockslide', type: 'rock', category: 'physical', power: 75, accuracy: 90, pp: 10, effects: [{ t: 'flinch', chance: 30 }], desc: 'A tumble of rocks. May make the foe flinch.' }),
  M({ id: 'shardspear', name: 'Shard Spear', type: 'rock', category: 'physical', power: 100, accuracy: 80, pp: 5, effects: [{ t: 'crit' }], desc: 'Stabs with a sharp stone. High critical-hit ratio.' }),
  M({ id: 'gemglint', name: 'Gem Glint', type: 'rock', category: 'special', power: 70, accuracy: 100, pp: 20, desc: 'Fires rays of light from glittering gems.' }),
  M({ id: 'polish', name: 'Polish', type: 'rock', category: 'status', power: 0, accuracy: 0, pp: 20, effects: [{ t: 'stat', who: 'self', stat: 'spe', n: 2 }], desc: 'Buffs its body smooth to sharply raise Speed.' }),
  M({ id: 'headcrack', name: 'Head Crack', type: 'rock', category: 'physical', power: 110, accuracy: 85, pp: 10, effects: [{ t: 'recoil', frac: 1 / 4 }], desc: 'A rock-hard headbutt that also hurts the user.' }),
  // Ghost
  M({ id: 'spooklick', name: 'Spook Lick', type: 'ghost', category: 'physical', power: 20, accuracy: 100, pp: 30, effects: [{ t: 'status', s: 'par', chance: 30 }], desc: 'A ghostly lick. May paralyze.' }),
  M({ id: 'nightfright', name: 'Night Fright', type: 'ghost', category: 'special', power: 1, accuracy: 100, pp: 15, effects: [{ t: 'levelDamage' }], desc: 'Deals damage equal to the user\'s level.' }),
  M({ id: 'gloomorb', name: 'Gloom Orb', type: 'ghost', category: 'special', power: 80, accuracy: 100, pp: 15, effects: [{ t: 'stat', who: 'foe', stat: 'spd', n: -1, chance: 20 }], desc: 'Hurls a shadowy orb. May lower Sp. Def.' }),
  M({ id: 'shadeclaw', name: 'Shade Claw', type: 'ghost', category: 'physical', power: 70, accuracy: 100, pp: 15, effects: [{ t: 'crit' }], desc: 'A claw of shadow. High critical-hit ratio.' }),
  M({ id: 'eerieglow', name: 'Eerie Glow', type: 'ghost', category: 'status', power: 0, accuracy: 100, pp: 10, effects: [{ t: 'confuse' }], desc: 'A sinister light that confuses the foe.' }),
  // Dragon
  M({ id: 'drakebreath', name: 'Drake Breath', type: 'dragon', category: 'special', power: 60, accuracy: 100, pp: 20, effects: [{ t: 'status', s: 'par', chance: 30 }], desc: 'A gust of draconic breath. May paralyze.' }),
  M({ id: 'drakeclaw', name: 'Drake Claw', type: 'dragon', category: 'physical', power: 80, accuracy: 100, pp: 15, desc: 'Slashes with great dragon claws.' }),
  M({ id: 'wyrmdance', name: 'Wyrm Dance', type: 'dragon', category: 'status', power: 0, accuracy: 0, pp: 20, effects: [{ t: 'stat', who: 'self', stat: 'atk', n: 1 }, { t: 'stat', who: 'self', stat: 'spe', n: 1 }], desc: 'A mystic dance that raises Attack and Speed.' }),
  // Dark
  M({ id: 'bite', name: 'Bite', type: 'dark', category: 'physical', power: 60, accuracy: 100, pp: 25, effects: [{ t: 'flinch', chance: 30 }], desc: 'Bites with sharp teeth. May make the foe flinch.' }),
  M({ id: 'sneakjab', name: 'Sneak Jab', type: 'dark', category: 'physical', power: 60, accuracy: 0, pp: 20, desc: 'A sly jab that never misses.' }),
  M({ id: 'gnash', name: 'Gnash', type: 'dark', category: 'physical', power: 80, accuracy: 100, pp: 15, effects: [{ t: 'stat', who: 'foe', stat: 'def', n: -1, chance: 20 }], desc: 'Crunches with strong jaws. May lower Defense.' }),
  M({ id: 'duskpulse', name: 'Dusk Pulse', type: 'dark', category: 'special', power: 80, accuracy: 100, pp: 15, effects: [{ t: 'flinch', chance: 20 }], desc: 'A wave of dark aura. May make the foe flinch.' }),
  M({ id: 'scheme', name: 'Scheme', type: 'dark', category: 'status', power: 0, accuracy: 0, pp: 20, effects: [{ t: 'stat', who: 'self', stat: 'spa', n: 2 }], desc: 'Plots something wicked to sharply raise Sp. Atk.' }),
  // Steel
  M({ id: 'steelclaw', name: 'Steel Claw', type: 'steel', category: 'physical', power: 50, accuracy: 95, pp: 35, effects: [{ t: 'stat', who: 'self', stat: 'atk', n: 1, chance: 10 }], desc: 'Hard steel claws. May raise the user\'s Attack.' }),
  M({ id: 'ironram', name: 'Iron Ram', type: 'steel', category: 'physical', power: 80, accuracy: 100, pp: 15, effects: [{ t: 'flinch', chance: 30 }], desc: 'Rams with an iron-hard head. May flinch.' }),
  M({ id: 'chromebeam', name: 'Chrome Beam', type: 'steel', category: 'special', power: 80, accuracy: 100, pp: 10, effects: [{ t: 'stat', who: 'foe', stat: 'spd', n: -1, chance: 10 }], desc: 'A blast of light off polished metal.' }),
  M({ id: 'plateup', name: 'Plate Up', type: 'steel', category: 'status', power: 0, accuracy: 0, pp: 15, effects: [{ t: 'stat', who: 'self', stat: 'def', n: 2 }], desc: 'Hardens its body like iron to sharply raise Defense.' }),
];

export const MOVES: Record<string, Move> = Object.fromEntries(LIST.map((m) => [m.id, m]));

export function move(id: string): Move {
  const m = MOVES[id];
  if (!m) throw new Error(`Unknown move ${id}`);
  return m;
}
