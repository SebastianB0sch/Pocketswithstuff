import { MOVES } from './moves';
import type { Type } from './types';

export type Growth = 'fast' | 'medium' | 'mslow' | 'slow';

export interface BaseStats {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

export interface Species {
  /** Regional dex number (1-based). */
  num: number;
  id: string;
  name: string;
  types: Type[];
  base: BaseStats;
  growth: Growth;
  /** Base experience yield. */
  exp: number;
  /** 3 (hard) .. 255 (easy). */
  catchRate: number;
  /** Moves learned by level, in level order. */
  learnset: [number, string][];
  evolves?: { to: string; level: number };
  category: string;
  /** Metres and kilograms. */
  height: number;
  weight: number;
  dex: string;
  /** What the sprite artist works from. */
  look: string;
}

/** Parses "1 bump, 5 vinesnap" into a learnset. */
function ls(s: string): [number, string][] {
  return s.split(',').map((e) => {
    const [lv, id] = e.trim().split(/\s+/);
    return [Number(lv), id] as [number, string];
  });
}

const st = (hp: number, atk: number, def: number, spa: number, spd: number, spe: number): BaseStats => ({ hp, atk, def, spa, spd, spe });

const LIST: Species[] = [
  {
    num: 1, id: 'sprigfawn', name: 'Sprigfawn', types: ['grass'], base: st(50, 62, 58, 45, 55, 52), growth: 'mslow', exp: 64, catchRate: 45,
    learnset: ls('1 bump, 1 weegrowl, 5 vinesnap, 9 sapsip, 13 dustkick, 17 razorleaves, 22 rambunct, 27 seedburst, 33 stunspores, 38 bellyflop'),
    evolves: { to: 'fernbuck', level: 16 },
    category: 'Sapling', height: 0.5, weight: 9.4,
    dex: 'Two leafy sprouts grow from its head. On sunny days it naps in meadows to help them grow.',
    look: 'A small, round-faced fawn with cream-spotted mint green fur, big dark eyes, stubby legs and two bright leaf sprouts in place of antlers. Cute, chibi proportions.',
  },
  {
    num: 2, id: 'fernbuck', name: 'Fernbuck', types: ['grass'], base: st(68, 82, 72, 58, 68, 70), growth: 'mslow', exp: 142, catchRate: 45,
    learnset: ls('1 bump, 1 weegrowl, 1 vinesnap, 9 sapsip, 13 dustkick, 17 razorleaves, 24 rambunct, 30 seedburst, 36 stunspores, 42 bellyflop'),
    evolves: { to: 'grovestag', level: 32 },
    category: 'Fern', height: 1.1, weight: 48,
    dex: 'Its antlers are curled fern fronds. It leads younger herds through the forest at dawn.',
    look: 'A lean young deer, green coat with a cream belly, long legs, antlers of curled fern fronds, a leafy tuft of a tail.',
  },
  {
    num: 3, id: 'grovestag', name: 'Grovestag', types: ['grass', 'ground'], base: st(90, 110, 98, 70, 85, 72), growth: 'mslow', exp: 236, catchRate: 45,
    learnset: ls('1 bump, 1 vinesnap, 1 razorleaves, 1 mudflick, 24 rambunct, 30 seedburst, 32 digstrike, 40 stunspores, 46 quake, 52 recklesscharge'),
    category: 'Grove', height: 1.9, weight: 210,
    dex: 'A small grove of trees grows on its broad back. Birds nest in its branches all year.',
    look: 'A massive, stocky stag with a dark green and earthy brown body, mossy mane, and huge antlers that are actual little trees with round green canopies. Rocky hooves.',
  },
  {
    num: 4, id: 'kindlekit', name: 'Kindlekit', types: ['fire'], base: st(44, 56, 44, 60, 50, 64), growth: 'mslow', exp: 62, catchRate: 45,
    learnset: ls('1 clawswipe, 1 weegrowl, 7 sparkpuff, 11 quickdash, 15 heathaze, 18 flamelash, 23 bite, 28 starflick, 33 flareburst, 39 scheme'),
    evolves: { to: 'blazevix', level: 16 },
    category: 'Ember Fox', height: 0.4, weight: 5.2,
    dex: 'The tip of its fluffy tail smoulders like a candle wick. When it sneezes, sparks fly.',
    look: 'A tiny orange fox kit with oversized ears, cream muzzle and chest, and a fluffy tail whose tip is a small flame. Playful expression.',
  },
  {
    num: 5, id: 'blazevix', name: 'Blazevix', types: ['fire'], base: st(62, 76, 56, 86, 62, 88), growth: 'mslow', exp: 142, catchRate: 45,
    learnset: ls('1 clawswipe, 1 sparkpuff, 1 quickdash, 15 heathaze, 19 flamelash, 25 bite, 31 starflick, 36 flareburst, 42 scheme'),
    evolves: { to: 'pyrolupe', level: 36 },
    category: 'Flame Fox', height: 0.9, weight: 22,
    dex: 'Its three tails burn hotter as it grows excited. It is said to light lost travellers home.',
    look: 'A sleek, agile orange-red fox standing on all fours with three flaming tails, dark red socks, a sharp confident face and flame-tufted ears.',
  },
  {
    num: 6, id: 'pyrolupe', name: 'Pyrolupe', types: ['fire', 'dark'], base: st(78, 102, 70, 110, 72, 108), growth: 'mslow', exp: 240, catchRate: 45,
    learnset: ls('1 clawswipe, 1 sparkpuff, 1 bite, 1 flamelash, 31 starflick, 36 sneakjab, 40 flareburst, 46 duskpulse, 52 scheme, 58 blazerush'),
    category: 'Inferno Wolf', height: 1.6, weight: 81,
    dex: 'A wolf wreathed in black smoke and crimson fire. Its howl makes the night air shimmer.',
    look: 'A large charcoal-black wolf with a mane of crimson fire, glowing amber eyes, fiery markings on its legs, a flaming tail. Fierce but heroic.',
  },
  {
    num: 7, id: 'pupple', name: 'Pupple', types: ['water'], base: st(53, 51, 53, 61, 56, 40), growth: 'mslow', exp: 63, catchRate: 45,
    learnset: ls('1 bump, 1 wiggle, 7 splashjet, 11 weegrowl, 15 aquadash, 18 bubblespray, 22 stiffen, 27 tidecrash, 32 frostbreath, 37 hydrosurge'),
    evolves: { to: 'tidalrus', level: 16 },
    category: 'Pup', height: 0.4, weight: 6.8,
    dex: 'It blows bubbles from its nose when happy. It is clumsy on land but darts like an arrow underwater.',
    look: 'A chubby baby seal pup, sky-blue with a white belly and muzzle, round sparkly eyes, little flippers, a blue bubble on its nose.',
  },
  {
    num: 8, id: 'tidalrus', name: 'Tidalrus', types: ['water'], base: st(64, 66, 68, 81, 76, 50), growth: 'mslow', exp: 142, catchRate: 45,
    learnset: ls('1 bump, 1 wiggle, 1 splashjet, 15 aquadash, 19 bubblespray, 24 stiffen, 30 tidecrash, 35 frostbreath, 40 hydrosurge'),
    evolves: { to: 'admirseal', level: 36 },
    category: 'Tide', height: 1.0, weight: 52,
    dex: 'Its small tusks sense the pull of the tides. It sings to call its pod at sundown.',
    look: 'A sturdy young walrus-seal, deep blue with a white chest, short ivory tusks, a wave-shaped crest on its head, strong flippers.',
  },
  {
    num: 9, id: 'admirseal', name: 'Admirseal', types: ['water', 'steel'], base: st(84, 86, 88, 111, 101, 60), growth: 'mslow', exp: 239, catchRate: 45,
    learnset: ls('1 bump, 1 splashjet, 1 bubblespray, 1 steelclaw, 30 tidecrash, 36 ironram, 40 hydrosurge, 46 chromebeam, 52 plateup, 58 blizzardbeam'),
    category: 'Admiral', height: 1.7, weight: 148,
    dex: 'Its steel tusks can split icebergs. It commands great pods of sea creatures with dignity.',
    look: 'A proud, upright navy-blue sea lion with shining steel tusks, steel shoulder plates like epaulettes, a crest like an admiral hat, white chest.',
  },
  {
    num: 10, id: 'chirpip', name: 'Chirpip', types: ['normal', 'flying'], base: st(40, 55, 30, 30, 30, 60), growth: 'mslow', exp: 49, catchRate: 255,
    learnset: ls('1 peck, 1 weegrowl, 5 quickdash, 9 gust, 13 wingslap, 21 airslicer, 29 skydive, 37 recklesscharge'),
    evolves: { to: 'gustling', level: 14 },
    category: 'Sparrow', height: 0.3, weight: 2.0,
    dex: 'Flocks of Chirpip chatter loudly at dawn. They are brave enough to peck at much larger foes.',
    look: 'A tiny round sparrow, brown back, cream belly, a black cap stripe, orange beak and feet, little wings. Very round.',
  },
  {
    num: 11, id: 'gustling', name: 'Gustling', types: ['normal', 'flying'], base: st(55, 75, 50, 40, 40, 80), growth: 'mslow', exp: 119, catchRate: 120,
    learnset: ls('1 peck, 1 weegrowl, 1 quickdash, 9 gust, 13 wingslap, 23 airslicer, 33 skydive, 41 recklesscharge'),
    evolves: { to: 'galeharrow', level: 34 },
    category: 'Starling', height: 0.6, weight: 15.5,
    dex: 'It patrols fields in large flocks. Its sharp cries can be heard for kilometres.',
    look: 'A starling-like bird mid-flight, dark brown and grey plumage with white speckles, a swept-back crest, sharp yellow beak, spread wings.',
  },
  {
    num: 12, id: 'galeharrow', name: 'Galeharrow', types: ['normal', 'flying'], base: st(85, 110, 70, 50, 60, 100), growth: 'mslow', exp: 218, catchRate: 45,
    learnset: ls('1 peck, 1 quickdash, 1 gust, 1 wingslap, 23 airslicer, 34 skydive, 40 pumpup, 47 recklesscharge'),
    category: 'Gale', height: 1.2, weight: 24.9,
    dex: 'It flies straight through storms without slowing. Its crest stands up when it is ready to fight.',
    look: 'A fierce raptor with a tall swept red-tipped crest, grey and white plumage, broad powerful wings spread wide, hooked yellow beak, intense eyes.',
  },
  {
    num: 13, id: 'nibbun', name: 'Nibbun', types: ['normal'], base: st(59, 45, 40, 35, 40, 31), growth: 'medium', exp: 50, catchRate: 255,
    learnset: ls('1 bump, 5 weegrowl, 9 bigchomp, 13 stiffen, 17 rambunct, 25 bellyflop, 29 pumpup'),
    evolves: { to: 'dambuck', level: 15 },
    category: 'Plump Mouse', height: 0.5, weight: 20,
    dex: 'It gnaws on logs to keep its teeth trim. Nothing seems to bother it, ever.',
    look: 'A chubby, round, tan-brown beaver-mouse with a calm, sleepy expression, two big front teeth, a dark nose and a flat paddle tail.',
  },
  {
    num: 14, id: 'dambuck', name: 'Dambuck', types: ['normal', 'water'], base: st(79, 85, 60, 55, 60, 71), growth: 'medium', exp: 144, catchRate: 127,
    learnset: ls('1 bump, 1 weegrowl, 1 bigchomp, 13 stiffen, 15 splashjet, 18 rambunct, 27 tidecrash, 33 bellyflop, 38 pumpup'),
    category: 'Beaver', height: 1.0, weight: 31.5,
    dex: 'It builds dams across rivers with tireless dedication. Its tail makes a sturdy paddle.',
    look: 'A standing brown beaver with a cream face, huge buck teeth, a determined expression, and a big flat dark-brown tail. Sturdy and friendly.',
  },
  {
    num: 15, id: 'wrigglet', name: 'Wrigglet', types: ['bug'], base: st(45, 30, 35, 20, 20, 45), growth: 'medium', exp: 39, catchRate: 255,
    learnset: ls('1 bump, 1 silkshot, 9 nibble'),
    evolves: { to: 'cocoonix', level: 7 },
    category: 'Worm', height: 0.3, weight: 3.6,
    dex: 'It wriggles through tall grass munching leaves. Its antennae twitch at the slightest sound.',
    look: 'A plump segmented caterpillar, lime green with yellow spots along its side, a round head with big eyes, two short orange antennae.',
  },
  {
    num: 16, id: 'cocoonix', name: 'Cocoonix', types: ['bug'], base: st(50, 20, 55, 25, 25, 30), growth: 'medium', exp: 72, catchRate: 120,
    learnset: ls('1 stiffen'),
    evolves: { to: 'glimmoth', level: 10 },
    category: 'Cocoon', height: 0.6, weight: 10,
    dex: 'Wrapped in tough silk, it waits motionless. Its eyes follow anything that comes near.',
    look: 'An upright silky cocoon, pale grey-lilac wound with silk bands, two eyes peeking out of a slit near the top, a leaf stuck to it.',
  },
  {
    num: 17, id: 'glimmoth', name: 'Glimmoth', types: ['bug', 'flying'], base: st(60, 45, 50, 90, 80, 70), growth: 'medium', exp: 178, catchRate: 45,
    learnset: ls('1 gust, 12 mindpoke, 14 stunspores, 16 sporedust, 20 glowbeam, 26 psybeam, 32 airslicer, 38 meditate'),
    category: 'Lantern Moth', height: 1.1, weight: 32,
    dex: 'The scales on its wings glow softly at night. It is drawn to porch lanterns.',
    look: 'A fluffy moth with big pale-blue and lavender wings with glowing yellow eye-spots, a cream fuzzy collar, feathery antennae, small cute face.',
  },
  {
    num: 18, id: 'sparkit', name: 'Sparkit', types: ['electric'], base: st(45, 65, 34, 40, 34, 45), growth: 'mslow', exp: 60, catchRate: 235,
    learnset: ls('1 bump, 5 weegrowl, 9 zap, 13 bite, 18 sparktackle, 23 staticwave, 28 gnash, 33 voltbeam'),
    evolves: { to: 'voltabby', level: 15 },
    category: 'Flash', height: 0.5, weight: 9.5,
    dex: 'Its fur crackles with static when it is happy. A shake of its body makes a bright flash.',
    look: 'A blue kitten-cub with a yellow star-shaped tail tip, yellow lightning-bolt stripes on its legs, a black-and-blue mane tuft, big golden eyes.',
  },
  {
    num: 19, id: 'voltabby', name: 'Voltabby', types: ['electric'], base: st(60, 85, 49, 60, 49, 60), growth: 'mslow', exp: 117, catchRate: 120,
    learnset: ls('1 bump, 1 weegrowl, 1 zap, 13 bite, 18 sparktackle, 25 staticwave, 31 gnash, 37 voltbeam'),
    evolves: { to: 'thunderion', level: 30 },
    category: 'Spark', height: 0.9, weight: 30.5,
    dex: 'Its claws carry a strong charge. It can see through walls when its eyes glow gold.',
    look: 'A lanky young blue lynx with a dark blue mane, yellow lightning stripes, tufted ears, glowing golden eyes, a star-tipped tail.',
  },
  {
    num: 20, id: 'thunderion', name: 'Thunderion', types: ['electric'], base: st(80, 120, 79, 95, 79, 70), growth: 'mslow', exp: 194, catchRate: 45,
    learnset: ls('1 bump, 1 zap, 1 bite, 1 sparktackle, 25 staticwave, 30 gnash, 35 voltbeam, 42 pumpup, 49 recklesscharge'),
    category: 'Storm Lion', height: 1.4, weight: 42,
    dex: 'A thunderclap follows its roar. Its golden mane holds enough charge to power a town.',
    look: 'A majestic dark-blue lion with a huge spiky black mane edged in gold, yellow lightning markings, piercing gold eyes, a star-shaped tail tip.',
  },
  {
    num: 21, id: 'pebblet', name: 'Pebblet', types: ['rock'], base: st(40, 80, 100, 30, 30, 20), growth: 'medium', exp: 60, catchRate: 255,
    learnset: ls('1 bump, 1 stiffen, 6 mudflick, 11 pebbletoss, 16 rockwall, 21 polish, 26 rockslide, 31 digstrike, 36 shardspear'),
    evolves: { to: 'boulderon', level: 25 },
    category: 'Pebble', height: 0.4, weight: 20,
    dex: 'It rolls down mountain paths for fun. Hikers often trip over it and apologise.',
    look: 'A round grey boulder with a grumpy little face, two stubby rock arms, cracks and a tiny tuft of moss on top. No legs.',
  },
  {
    num: 22, id: 'boulderon', name: 'Boulderon', types: ['rock', 'ground'], base: st(70, 100, 125, 45, 55, 40), growth: 'medium', exp: 137, catchRate: 120,
    learnset: ls('1 bump, 1 stiffen, 1 mudflick, 11 pebbletoss, 16 rockwall, 21 polish, 27 rockslide, 33 digstrike, 39 quake, 45 shardspear'),
    category: 'Boulder', height: 1.3, weight: 230,
    dex: 'It walks the mountains on four stony legs. It eats rocks and grows a new layer each year.',
    look: 'A heavy four-legged rock creature, brown-grey stone body with layered strata stripes, crystal shards on its back, a stubborn face, thick stone legs.',
  },
  {
    num: 23, id: 'craniodon', name: 'Craniodon', types: ['rock'], base: st(67, 125, 40, 30, 30, 58), growth: 'slow', exp: 70, catchRate: 45,
    learnset: ls('1 bump, 1 weegrowl, 6 pebbletoss, 10 rambunct, 15 rockwall, 19 pumpup, 24 bite, 28 rockslide, 33 headcrack'),
    evolves: { to: 'ramparadon', level: 30 },
    category: 'Headbutt', height: 0.9, weight: 31.5,
    dex: 'Revived from an ancient fossil. Its skull is as hard as iron; it headbutts trees to topple them.',
    look: 'A small bipedal dinosaur with a huge domed grey-blue skull, a teal body, little spikes on the back of the dome, tiny arms, sturdy legs and tail.',
  },
  {
    num: 24, id: 'ramparadon', name: 'Ramparadon', types: ['rock'], base: st(97, 165, 60, 65, 50, 58), growth: 'slow', exp: 199, catchRate: 45,
    learnset: ls('1 bump, 1 pebbletoss, 1 rambunct, 1 rockwall, 19 pumpup, 24 bite, 30 rockslide, 36 headcrack, 43 quake, 50 shardspear'),
    category: 'Rampart', height: 1.6, weight: 102.5,
    dex: 'An ancient brute whose dome can shatter boulders. It charges anything that moves.',
    look: 'A powerful bipedal dinosaur with a massive armoured grey dome skull ringed with spikes, dark teal and blue body, muscular arms, thick tail, fierce eyes.',
  },
  {
    num: 25, id: 'mosscap', name: 'Mosscap', types: ['grass', 'poison'], base: st(60, 60, 60, 75, 70, 35), growth: 'medium', exp: 90, catchRate: 190,
    learnset: ls('1 sapsip, 1 toxicprick, 6 stunspores, 10 toxingas, 14 vinesnap, 18 sporedust, 22 sludge, 28 seedburst, 34 petalstorm'),
    category: 'Mushroom', height: 0.6, weight: 7,
    dex: 'Its cap releases a puff of spores when touched. It sleeps soundly in damp, mossy logs.',
    look: 'A plump mushroom creature: a big red-violet spotted cap with cream spots, a cream stalk body with stubby feet and arms, sleepy eyes, moss tufts.',
  },
  {
    num: 26, id: 'wispurr', name: 'Wispurr', types: ['ghost'], base: st(50, 50, 45, 85, 65, 85), growth: 'medium', exp: 120, catchRate: 120,
    learnset: ls('1 spooklick, 1 eerieglow, 7 nightfright, 12 mindpoke, 17 shadeclaw, 22 drowsegaze, 27 gloomorb, 33 scheme'),
    category: 'Phantom Cat', height: 0.7, weight: 0.4,
    dex: 'A cat-shaped wisp that haunts old houses. It purrs in empty rooms to startle visitors.',
    look: 'A translucent pale-violet ghost cat, the body fades into a wispy smoky tail instead of hind legs, glowing cyan eyes, a cheeky grin, pointed ears.',
  },
  {
    num: 27, id: 'frostbun', name: 'Frostbun', types: ['ice'], base: st(55, 45, 50, 70, 65, 75), growth: 'medium', exp: 100, catchRate: 150,
    learnset: ls('1 bump, 1 frostbreath, 8 quickdash, 13 lullaby, 18 frostbite, 24 starflick, 30 blizzardbeam, 36 patchup'),
    category: 'Snow Rabbit', height: 0.5, weight: 4.4,
    dex: 'Its fur is cold as fresh snow. It hides in drifts with only its long ears showing.',
    look: 'A fluffy white snow rabbit with ice-blue ear tips and paws, a snowflake mark on its forehead, a pom-pom tail, and frosty breath.',
  },
  {
    num: 28, id: 'brawlet', name: 'Brawlet', types: ['fighting'], base: st(60, 85, 55, 30, 45, 65), growth: 'mslow', exp: 88, catchRate: 180,
    learnset: ls('1 bump, 1 weegrowl, 6 chop, 11 quickdash, 16 lowsweep, 21 trainhard, 27 powerpunch, 33 recklesscharge'),
    category: 'Scrapper', height: 0.7, weight: 19,
    dex: 'It trains from sunrise to sunset. Its headband is a gift from the first foe it ever lost to.',
    look: 'A small bipedal red-orange monkey-like fighter with big wrapped white fists, a blue headband with trailing ends, a determined grin, a curled tail.',
  },
  {
    num: 29, id: 'gearling', name: 'Gearling', types: ['steel'], base: st(50, 60, 85, 40, 60, 30), growth: 'medium', exp: 86, catchRate: 180,
    learnset: ls('1 bump, 1 stiffen, 8 steelclaw, 14 starflick, 20 plateup, 26 ironram, 32 chromebeam'),
    category: 'Cog', height: 0.5, weight: 21,
    dex: 'It spins the gear on its back to stay warm. Several Gearling often mesh together to nap.',
    look: 'A small round silver-steel beetle-like critter with a large brass cog gear on its back, little stubby legs, a single cute visor-like eye band with two eyes.',
  },
  {
    num: 30, id: 'finfry', name: 'Finfry', types: ['water'], base: st(20, 10, 55, 15, 20, 80), growth: 'slow', exp: 20, catchRate: 255,
    learnset: ls('1 flop, 15 bump, 30 aquadash'),
    evolves: { to: 'leviafin', level: 20 },
    category: 'Fry', height: 0.6, weight: 4,
    dex: 'Weak and clumsy, it is swept along by currents. Scholars swear it hides great power.',
    look: 'A goofy silver-gold fish with a gaping mouth, big blank eyes, a frilly yellow dorsal fin and whisker barbels, flopping sideways.',
  },
  {
    num: 31, id: 'leviafin', name: 'Leviafin', types: ['water', 'dragon'], base: st(95, 125, 79, 60, 100, 81), growth: 'slow', exp: 214, catchRate: 45,
    learnset: ls('1 bite, 20 bite, 23 drakebreath, 27 tidecrash, 32 wyrmdance, 37 gnash, 42 drakeclaw, 47 hydrosurge'),
    category: 'Leviathan', height: 6.0, weight: 210,
    dex: 'It appears when rivers flood. Its rage is said to stir up storms that last for days.',
    look: 'A serpentine sea dragon coiled in an S, deep teal scales with a gold belly, a crest of fins along its back, long whiskers, fierce red eyes, open fanged mouth.',
  },
  {
    num: 32, id: 'lumipix', name: 'Lumipix', types: ['psychic'], base: st(55, 40, 55, 85, 90, 60), growth: 'fast', exp: 110, catchRate: 120,
    learnset: ls('1 mindpoke, 1 lullaby, 8 starflick, 14 drowsegaze, 19 psybeam, 25 meditate, 31 patchup, 37 mindblast'),
    category: 'Glimmer', height: 0.4, weight: 1.5,
    dex: 'It floats on moonlit nights trailing sparkles. Seeing one is said to bring a lucky dream.',
    look: 'A tiny floating pink-and-white pixie with a round head, a star-shaped crystal on its forehead, small translucent wings, a sparkly ribbon-like tail, gentle smile.',
  },
  {
    num: 33, id: 'duskit', name: 'Duskit', types: ['dark', 'flying'], base: st(60, 85, 42, 85, 42, 91), growth: 'mslow', exp: 107, catchRate: 30,
    learnset: ls('1 peck, 1 weegrowl, 6 sneakjab, 11 gust, 16 bite, 21 wingslap, 26 scheme, 31 duskpulse, 36 airslicer'),
    category: 'Rascal Crow', height: 0.5, weight: 2.1,
    dex: 'It steals shiny trinkets and hides them in a secret nest. It loves to play tricks on people.',
    look: 'A small black crow with a purple sheen, a big feathered hat-like crest, a smug half-lidded red-eyed expression, a yellow beak, a bushy tail.',
  },
  {
    num: 34, id: 'molekin', name: 'Molekin', types: ['ground'], base: st(55, 70, 50, 30, 40, 60), growth: 'medium', exp: 80, catchRate: 190,
    learnset: ls('1 clawswipe, 1 dustkick, 6 mudflick, 11 quickdash, 16 digstrike, 22 mudbomb, 28 bigchomp, 34 quake'),
    category: 'Mole', height: 0.4, weight: 8.8,
    dex: 'It digs tunnels so fast it can cross a field in minutes. Sunlight makes it squint.',
    look: 'A round brown mole with big pink digging claws, a pink star-shaped nose, tiny squinting eyes, and a little miner-style yellow tuft on its head.',
  },
  {
    num: 35, id: 'toxitoad', name: 'Toxitoad', types: ['poison', 'water'], base: st(65, 70, 55, 75, 55, 70), growth: 'medium', exp: 110, catchRate: 140,
    learnset: ls('1 splashjet, 1 toxicprick, 7 weegrowl, 12 poisonfang, 17 bubblespray, 22 toxingas, 27 sludge, 33 tidecrash'),
    category: 'Bog Toad', height: 0.7, weight: 22,
    dex: 'It croaks in swamps on rainy nights. The orange warts on its back ooze a stinging fluid.',
    look: 'A squat purple toad with an orange-spotted back, a pale yellow throat sac, wide grinning mouth, big round eyes on top of its head, webbed feet.',
  },
];

export const SPECIES: Record<string, Species> = Object.fromEntries(LIST.map((s) => [s.id, s]));
export const DEX_ORDER: Species[] = [...LIST].sort((a, b) => a.num - b.num);

export function species(id: string): Species {
  const s = SPECIES[id];
  if (!s) throw new Error(`Unknown species ${id}`);
  return s;
}

/** Total experience needed to reach `level` on a growth curve. */
export function expForLevel(growth: Growth, level: number): number {
  const n = level;
  if (n <= 1) return 0;
  switch (growth) {
    case 'fast': return Math.floor((4 * n ** 3) / 5);
    case 'medium': return n ** 3;
    case 'mslow': return Math.max(0, Math.floor((6 / 5) * n ** 3 - 15 * n ** 2 + 100 * n - 140));
    case 'slow': return Math.floor((5 * n ** 3) / 4);
  }
}

// Fail fast on a typo in a learnset.
for (const s of LIST) for (const [, m] of s.learnset) if (!MOVES[m]) throw new Error(`${s.id} learns unknown move ${m}`);
