/**
 * The Norvale region: Brightleaf Town, Route 1, Fernbrook Town, Route 2,
 * Stonecrest City and the snowy Route 3, plus their interiors. See mapdef.ts
 * for what each character means.
 */
import { doorOf, type Building, type MapDef, type NpcDef } from './mapdef';

/** Interior exit mat -> the tile in front of the building's door outside. */
function exitTo(map: string, b: Building): { to: string; tx: number; ty: number; facing: 'down' } {
  const d = doorOf(b);
  return { to: map, tx: d.x, ty: d.y + 1, facing: 'down' };
}

// ---------------------------------------------------------------------------
// Outdoor building footprints (shared by the outdoor map and its interiors).

const B = {
  home: { kind: 'house', x: 4, y: 4, w: 4, h: 4, roof: '#d0584c', to: { map: 'home', x: 4, y: 7 } },
  rivalHouse: { kind: 'house', x: 18, y: 4, w: 4, h: 4, roof: '#4c9a5c', to: { map: 'rivalhouse', x: 4, y: 7 } },
  lab: { kind: 'lab', x: 4, y: 3, w: 6, h: 4, to: { map: 'lab', x: 5, y: 9 } },
  fernCenter: { kind: 'center', x: 16, y: 3, w: 5, h: 4, to: { map: 'center_fern', x: 6, y: 8 } },
  fernMart: { kind: 'mart', x: 16, y: 12, w: 4, h: 4, to: { map: 'mart_fern', x: 4, y: 7 } },
  fernHouse: { kind: 'house', x: 4, y: 13, w: 4, h: 4, roof: '#c88a3c', to: { map: 'house_fern', x: 4, y: 7 } },
  gym: { kind: 'gym', x: 4, y: 3, w: 7, h: 5, to: { map: 'gym', x: 6, y: 15 } },
  stoneCenter: { kind: 'center', x: 19, y: 4, w: 5, h: 4, to: { map: 'center_stone', x: 6, y: 8 } },
  stoneMart: { kind: 'mart', x: 15, y: 12, w: 4, h: 4, to: { map: 'mart_stone', x: 4, y: 7 } },
  stoneHouse: { kind: 'house', x: 5, y: 12, w: 4, h: 4, roof: '#7a6aa8', to: { map: 'house_stone', x: 4, y: 7 } },
  stoneHouse2: { kind: 'bighouse', x: 22, y: 15, w: 5, h: 4, roof: '#4c78c8', to: { map: 'house_stone2', x: 4, y: 7 } },
} satisfies Record<string, Building>;

// ---------------------------------------------------------------------------
// Shared interiors

function center(id: string, outside: string, b: Building, extra: NpcDef[] = []): MapDef {
  return {
    id,
    name: 'Rest Stop',
    music: 'center',
    outdoor: false,
    border: ' ',
    wallpaper: ['#fbe8e8', '#f6d8d8'],
    tiles: [
      'WWWWWWWWWWWWW',
      'WiqqqqHqqqqiW',
      'WqqqqqqqqqqqW',
      'WkkkkkkkkkkPW',
      'WqqqqqqqqqqqW',
      'WqqqqqqqqqqqW',
      'WiqqqRRRqqqiW',
      'WqqqqRRRqqqqW',
      '      E      ',
    ],
    warps: [{ x: 6, y: 8, ...exitTo(outside, b) }],
    respawn: { x: 6, y: 4 },
    npcs: [{ id: 'nurse', x: 6, y: 2, look: 'nurse', script: 'nurse' }, ...extra],
  };
}

function mart(id: string, outside: string, b: Building, clerkScript: string, extra: NpcDef[] = []): MapDef {
  return {
    id,
    name: 'Supply Shop',
    music: 'mart',
    outdoor: false,
    border: ' ',
    wallpaper: ['#e4ecf8', '#d4e0f4'],
    tiles: [
      'WWWWWWWWWW',
      'WzzzqqzzzW',
      'WqqqqqqqqW',
      'WqqqzzqqqW',
      'WqqqqqqqqW',
      'WqkqqqqqqW',
      'WqkqqqqqqW',
      '    E     ',
    ],
    warps: [{ x: 4, y: 7, ...exitTo(outside, b) }],
    npcs: [{ id: 'clerk', x: 1, y: 5, look: 'clerk', facing: 'right', script: clerkScript }, ...extra],
  };
}

function house(id: string, outside: string, b: Building, npcs: NpcDef[], wallpaper: [string, string] = ['#f4e8d0', '#ecdcbc']): MapDef {
  return {
    id,
    name: '',
    music: 'house',
    outdoor: false,
    border: ' ',
    wallpaper,
    tiles: [
      'WWWWWWWWWW',
      'WhBx__oo_W',
      'W________W',
      'W__tt__d_W',
      'W__cc____W',
      'Wl______lW',
      'W___UU___W',
      '    e     ',
    ],
    warps: [{ x: 4, y: 7, ...exitTo(outside, b) }],
    npcs,
  };
}

// ---------------------------------------------------------------------------

const MAP_LIST: MapDef[] = [
  {
    ...house('home', 'brightleaf', B.home, [{ id: 'mom', x: 6, y: 2, look: 'mom', facing: 'down', script: 'mom' }]),
    name: 'Your House',
    onEnter: 'homeEnter',
  },
  house('rivalhouse', 'brightleaf', B.rivalHouse, [
    { id: 'rivalmom', x: 3, y: 2, look: 'mom', move: 'look', text: ["Oh, {PLAYER}! {RIVAL} just dashed out the door again.", "That child never sits still. Honestly, I can't imagine where it comes from!"] },
    { id: 'sister', x: 7, y: 5, look: 'girl', move: 'wander', text: 'My big sibling says they\'re going to be the strongest trainer in Norvale. Are you their rival?' },
  ], ['#e4f0dc', '#d4e4c8']),
  {
    id: 'brightleaf',
    name: 'Brightleaf Town',
    music: 'town',
    outdoor: true,
    banner: true,
    border: 'T',
    regionPos: [0.2, 0.82],
    tiles: [
      'TTTTTTTTTTT,,,,TTTTTTTTTTT',
      'TTTTTTTTTTT,,,,TTTTTTTTTTT',
      'TT.......O.,,,,.O.......TT',
      'TT.*.*.....,,,,......*..TT',
      'TT..XXXX...,,,,...XXXX..TT',
      'TT..XXXX...,,,,...XXXX..TT',
      'TT..XXXX...,,,,...XXXX..TT',
      'TT..XXDX..S,,,,...XXDX..TT',
      'TT....,,,,,,,,,,,,,,,...TT',
      'TT*...,,,,,,,,,,,,,,,..*TT',
      'TT......,,,,,,,,,.......TT',
      'TT..FFFF.,,,,,,,.FFFF...TT',
      'TT..*..*.,,,,,,,.*..*...TT',
      'TT.......,,,,,,,........TT',
      'TT.*.....,,S,,,,.....*..TT',
      'TT.......sssssss........TT',
      'TTO.....sswwwwwss......OTT',
      'TT.....sswwwwwwwss......TT',
      'TT.....sswwwwwwwss......TT',
      'TTT.....sswwwwwss......TTT',
      'TTTTTTTTTTTTTTTTTTTTTTTTTT',
      'TTTTTTTTTTTTTTTTTTTTTTTTTT',
    ],
    buildings: [B.home, B.rivalHouse],
    warps: [],
    connections: [{ dir: 'up', to: 'route1', offset: -3 }],
    signs: [
      { x: 10, y: 7, text: 'BRIGHTLEAF TOWN\nA quiet town where new adventures begin.' },
      { x: 11, y: 14, text: 'BRIGHTLEAF POND\nPlease do not feed the Finfry. They will not stop.' },
    ],
    npcs: [
      { id: 'rival', x: 20, y: 8, look: 'rival', facing: 'down', script: 'rivalTown', hideIf: 'rival_left_town' },
      { id: 'girl', x: 6, y: 12, look: 'girl', move: 'wander', text: 'The tall grass past the town is full of wild Pocklets. My mom says never go in without one of your own!' },
      { id: 'oldman', x: 19, y: 13, look: 'oldman', move: 'look', text: ["When I was young, I caught a Finfry in this very pond.", "It never evolved. I think it just liked me too much."] },
    ],
    triggers: [{ x: 11, y: 3, w: 4, script: 'rivalTown', unless: 'rival_left_town' }],
  },
  {
    id: 'route1',
    name: 'Route 1',
    music: 'route',
    outdoor: true,
    banner: true,
    border: 'T',
    regionPos: [0.2, 0.62],
    tiles: [
      'TTTTTTTT,,,,TTTTTTTT',
      'TTTTTTTT,,,,TTTTTTTT',
      'TTO.....,,,,....OTTT',
      'TT""""..,,,,..""""TT',
      'TT""""..,,,,..""""TT',
      'TT""""...,,,..""""TT',
      'TT.......,,,......TT',
      'TTvvvvvv.,,,.vvvvvTT',
      'TT.......,,,......TT',
      'TT..r....,,,,.....TT',
      'TT..""""""",,,,...TT',
      'TT..""""""",,,,...TT',
      'TT..""""""",,,,.O.TT',
      'TT.........,,,,...TT',
      'TTbbbb.....,,,,...TT',
      'TT......,,,,,.....TT',
      'TT......,,,,..."""TT',
      'TT..O...,,,,..."""TT',
      'TT......,,,,..."""TT',
      'TTvvvvv.,,,,.vvvvvTT',
      'TT......,,,,......TT',
      'TT""""..,,,,..""".TT',
      'TT""""..,,,,..""".TT',
      'TT""""..,,,,......TT',
      'TT......,,,,..*.*.TT',
      'TT.*.*..,,,,......TT',
      'TT......,,,,......TT',
      'TTTTTTTT,,,,TTTTTTTT',
      'TTTTTTTT,,,,TTTTTTTT',
    ],
    warps: [],
    connections: [
      { dir: 'down', to: 'brightleaf', offset: 3 },
      { dir: 'up', to: 'fernbrook', offset: 1 },
    ],
    encounters: [
      { species: 'chirpip', min: 2, max: 4, weight: 40 },
      { species: 'nibbun', min: 2, max: 4, weight: 40 },
      { species: 'wrigglet', min: 2, max: 3, weight: 20 },
      { species: 'duskit', min: 3, max: 4, weight: 6, time: 'night' },
    ],
    encounterRate: 12,
    signs: [{ x: 12, y: 14, text: 'ROUTE 1\nNorth: Fernbrook Town  South: Brightleaf Town' }],
    items: [
      { x: 16, y: 24, item: 'tonic', flag: 'item:r1:tonic' },
      { x: 3, y: 20, item: 'pouch', count: 2, flag: 'item:r1:pouch' },
      { x: 17, y: 8, item: 'tonic', flag: 'item:r1:hidden', hidden: true },
    ],
    npcs: [
      { id: 'prof', x: 9, y: 22, look: 'professor', facing: 'down', hideIf: 'starter', script: 'route1Intro' },
      { id: 'aide', x: 10, y: 22, look: 'aide', facing: 'down', hideIf: 'starter', text: 'The professor knows what he\'s doing. Mostly.' },
      { id: 'rival', x: 10, y: 24, look: 'rival', facing: 'up', hideIf: 'starter', script: 'route1Intro' },
      {
        id: 'tim', x: 3, y: 15, look: 'youngster', facing: 'right',
        trainer: {
          name: 'Youngster Tim', party: [['nibbun', 4], ['chirpip', 3]], sight: 4, money: 64,
          intro: 'Hey! You looked at me! That means we battle!',
          defeat: 'Aww, I lost!',
          after: 'Wild Nibbun are slow but tough. Mine just needs more naps.',
        },
      },
      {
        id: 'mia', x: 16, y: 10, look: 'lass', facing: 'left',
        trainer: {
          name: 'Lass Mia', party: [['wrigglet', 4], ['chirpip', 5]], sight: 3, money: 80,
          intro: 'My Pocklets are the cutest. And cute is strong!',
          defeat: 'Cute... was not enough...',
          after: 'Maybe I should train instead of picking out ribbons.',
        },
      },
      { id: 'hiker', x: 6, y: 25, look: 'hiker', move: 'look', hideIf: 'never', showIf: 'starter', text: 'Hold B to run once you get your Run Shoes. Your mom has a pair, I bet!' },
    ],
    triggers: [{ x: 8, y: 26, w: 4, script: 'route1Intro', unless: 'starter' }],
  },
  {
    id: 'fernbrook',
    name: 'Fernbrook Town',
    music: 'town',
    outdoor: true,
    banner: true,
    border: 'T',
    regionPos: [0.24, 0.42],
    tiles: [
      'TTTTTTTTTTTTTTTTTTTTTTTTTTTT',
      'TTTTTTTTTTTTTTTTTTTTTTTTTTTT',
      'TT.....................O..TT',
      'TT..XXXXXX......XXXXX.....TT',
      'TT..XXXXXX......XXXXX.....TT',
      'TT..XXXXXX......XXXXX.....TT',
      'TT..XXXDXX..L...XXDXX..*..TT',
      'TT....,,,,,,,,,,,,,,,,....TT',
      'TT....,,,,,,,,,,,,,,,,,...TT',
      'TT.*......,,,,.........,,,,,',
      'TT........,,,,,,,,,,,,,,,,,,',
      'TT...F....,,,,,,,,,,,,,,,,,,',
      'TT...F....,,,,..XXXX..,,..TT',
      'TT..XXXX..,,,,..XXXX......TT',
      'TT..XXXX..,,,,..XXXX......TT',
      'TT..XXXX..,,,,..XXDX......TT',
      'TT..XXDX..,,,,.S,,,,...*..TT',
      'TT....,,,,,,,,,,,.........TT',
      'TT.*.....,,,,..*.....O....TT',
      'TT.......,,,,.............TT',
      'TTTTTTTTT,,,,TTTTTTTTTTTTTTT',
      'TTTTTTTTT,,,,TTTTTTTTTTTTTTT',
    ],
    buildings: [B.lab, B.fernCenter, B.fernMart, B.fernHouse],
    warps: [],
    connections: [
      { dir: 'down', to: 'route1', offset: -1 },
      { dir: 'right', to: 'route2', offset: -2 },
    ],
    signs: [
      { x: 15, y: 16, text: 'FERNBROOK TOWN\nWhere the ferns grow tall and the research runs deep.' },
    ],
    npcs: [
      { id: 'aide2', x: 8, y: 8, look: 'aide', facing: 'down', hideIf: 'got_dex', text: 'The professor is waiting for you inside the lab, {PLAYER}!' },
      { id: 'boy', x: 20, y: 9, look: 'boy', move: 'wander', text: 'The building with the red roof is a Rest Stop. They heal your Pocklets for free!' },
      { id: 'worker', x: 23, y: 16, look: 'worker', move: 'look', text: 'East of here is Route 2, then Stonecrest City. The Gym there is run by a miner who never takes off her hardhat.' },
      { id: 'lass', x: 6, y: 18, look: 'lass', move: 'wander', text: 'When a Pocklet is weakened, it\'s much easier to catch. Put it to sleep and it\'s even easier!' },
    ],
    triggers: [{ x: 26, y: 9, h: 3, script: 'fernExitBlock', unless: 'got_dex' }],
  },
  {
    id: 'lab',
    name: 'Hemlock Lab',
    music: 'lab',
    outdoor: false,
    border: ' ',
    wallpaper: ['#eef2f6', '#e0e6ee'],
    tiles: [
      'WWWWWWWWWWWW',
      'WBBhhmmhhBBW',
      'WqqqqqqqqqqW',
      'WqmqqqqqqmqW',
      'WqqqqqqqqqqW',
      'WqttqqqqttqW',
      'WqqqqqqqqqqW',
      'WiqqqqqqqqiW',
      'WqqqqqqqqqqW',
      '     E      ',
    ],
    warps: [{ x: 5, y: 9, ...exitTo('fernbrook', B.lab) }],
    npcs: [
      { id: 'prof', x: 5, y: 2, look: 'professor', facing: 'down', script: 'labProfessor' },
      { id: 'aide', x: 9, y: 4, look: 'aide', facing: 'left', script: 'labAide' },
      { id: 'aide3', x: 2, y: 7, look: 'aide', move: 'look', text: 'Pocklets that are the same species can still differ. Some are just a bit stronger from birth!' },
    ],
  },
  center('center_fern', 'fernbrook', B.fernCenter, [
    { id: 'traveller', x: 3, y: 5, look: 'hiker', move: 'look', text: 'There\'s a PC in the corner. Pocklets you catch when your party is full get sent to your storage box.' },
  ]),
  mart('mart_fern', 'fernbrook', B.fernMart, 'clerkFern', [
    { id: 'shopper', x: 6, y: 3, look: 'boy', move: 'look', text: 'Tonics heal 20 HP. Always carry a few!' },
  ]),
  house('house_fern', 'fernbrook', B.fernHouse, [
    { id: 'grandma', x: 2, y: 4, look: 'oldman', facing: 'right', script: 'fernGrandpa' },
  ]),
  {
    id: 'route2',
    name: 'Route 2',
    music: 'route2',
    outdoor: true,
    banner: true,
    border: 'T',
    regionPos: [0.45, 0.42],
    tiles: [
      'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
      'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
      'TT......""""""..TTTT...........""""""....TTT',
      'TT..r...""""""..TTTT....r......""""""....TTT',
      'TT......""""""...TT.....,,,,,..""""""....TTT',
      'TT....,,,,,,,,,,,,,,,,,,,,.,,,,,,,,,,,,..TTT',
      'TT....,,..............,,....,,......,,,..TTT',
      ',,,,,,,,..""""....O...,,....,,..wwww.,,,,,,,',
      ',,,,,,,,..""""........,,....,,.wwwwww,,,,,,,',
      ',,,,,,,,..""""....""""""....,,.wwwwww.,,,,,,',
      'TT........vvvvvv..""""""....,,..wwww...,,TTT',
      'TT....................""""..,,..........,TTT',
      'TT..""""""....b.b.......,,,,,,,,,,,,,,,,,TTT',
      'TT..""""""..............""""""""...*....TTTT',
      'TT..""""""....*.*...O...""""""""........TTTT',
      'TT......................""""""""....r...TTTT',
      'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
      'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    ],
    warps: [],
    connections: [
      { dir: 'left', to: 'fernbrook', offset: 2 },
      { dir: 'right', to: 'stonecrest', offset: 5 },
    ],
    encounters: [
      { species: 'chirpip', min: 4, max: 6, weight: 25 },
      { species: 'nibbun', min: 4, max: 6, weight: 20 },
      { species: 'wrigglet', min: 3, max: 5, weight: 15 },
      { species: 'sparkit', min: 4, max: 6, weight: 12 },
      { species: 'mosscap', min: 5, max: 6, weight: 10 },
      { species: 'brawlet', min: 5, max: 6, weight: 10 },
      { species: 'toxitoad', min: 5, max: 7, weight: 6 },
      { species: 'lumipix', min: 5, max: 6, weight: 2 },
      { species: 'wispurr', min: 6, max: 7, weight: 8, time: 'night' },
    ],
    encounterRate: 11,
    signs: [{ x: 18, y: 7, text: 'ROUTE 2\nWest: Fernbrook Town  East: Stonecrest City' }],
    items: [
      { x: 5, y: 3, item: 'repel', flag: 'item:r2:repel' },
      { x: 25, y: 3, item: 'pouch', count: 3, flag: 'item:r2:pouch' },
      { x: 37, y: 15, item: 'supertonic', flag: 'item:r2:super' },
      { x: 33, y: 11, item: 'shinystone', flag: 'item:r2:hidden', hidden: true },
    ],
    npcs: [
      { id: 'rival', x: 12, y: 8, look: 'rival', facing: 'left', showIf: 'got_dex', hideIf: 'rival2', script: 'rival2' },
      {
        id: 'leo', x: 8, y: 13, look: 'bugcatcher', facing: 'right',
        trainer: {
          name: 'Bug Catcher Leo', party: [['wrigglet', 6], ['cocoonix', 7], ['wrigglet', 6]], sight: 4, money: 84,
          intro: 'I caught these in the grass this morning! Wanna see?',
          defeat: 'My bugs got squished!',
          after: 'If you train a Wrigglet, it turns into a Cocoonix really fast. Then a Glimmoth!',
        },
      },
      {
        id: 'ivy', x: 22, y: 12, look: 'lass', facing: 'down',
        trainer: {
          name: 'Lass Ivy', party: [['sparkit', 8]], sight: 3, money: 128,
          intro: 'My Sparkit is ready to zap you!',
          defeat: 'Oh, no, my poor Sparkit!',
          after: 'Sparkit\'s fur crackles when it\'s happy. Mine is crackling even though we lost!',
        },
      },
      {
        id: 'brom', x: 30, y: 6, look: 'hiker', facing: 'left',
        trainer: {
          name: 'Hiker Brom', party: [['pebblet', 8], ['pebblet', 9]], sight: 4, money: 180,
          intro: 'Ho ho! Stonecrest is rock country! Let me show you why!',
          defeat: 'You rolled right over me!',
          after: 'Rock-types hate water and grass. Remember that when you face the Gym Leader.',
        },
      },
      {
        id: 'ned', x: 38, y: 10, look: 'fisher', facing: 'up',
        trainer: {
          name: 'Fisher Ned', party: [['finfry', 6], ['finfry', 6], ['toxitoad', 8]], sight: 3, money: 120,
          intro: 'The fish aren\'t biting, but you\'ll do!',
          defeat: 'The one that got away...',
          after: 'Everyone laughs at Finfry. One day it\'ll show them all. One day.',
        },
      },
      { id: 'kid', x: 28, y: 14, look: 'youngster', move: 'wander', text: 'Did you know some Pocklets only come out at night? Spooky!' },
    ],
    triggers: [{ x: 6, y: 7, h: 3, script: 'rival2', when: 'got_dex', unless: 'rival2' }],
  },
  {
    id: 'stonecrest',
    name: 'Stonecrest City',
    music: 'town',
    outdoor: true,
    banner: true,
    border: 'M',
    regionPos: [0.68, 0.38],
    tiles: [
      'MMMMMMMMMMMMM,,,,MMMMMMMMMMMMM',
      'MMMMMMMMMMMMM,,,,MMMMMMMMMMMMM',
      'MM...........,,,,...........MM',
      'MM..XXXXXXX..,,,,...........MM',
      'MM..XXXXXXX..,,,,..XXXXX....MM',
      'MM..XXXXXXX..,,,,..XXXXX..r.MM',
      'MM..XXXXXXX..,,,,..XXXXX....MM',
      'MM..XXXDXXX..,,,,..XXDXX....MM',
      'MM.....,,,,,,,,,,,,,,,,.....MM',
      'MM..L..,,,,,,,,,,,,,,,,..L..MM',
      'MMC....,,,..........,,......MM',
      'MMCC...,,...........,,......MM',
      ',,,,,XXXX,,,,,,XXXX.,,......MM',
      ',,,,,XXXX,,,,,,XXXX.,,..C...MM',
      ',,,,,XXXX,,,,,,XXXX.,,..CC..MM',
      'MM...XXDX......XXDX.,,XXXXX.MM',
      'MM.....,,,,,,,,,,,,,,,XXXXX.MM',
      'MM..r....*..........,,XXXXX.MM',
      'MM....C........*....,,XXDXX.MM',
      'MM...CC.............,,,,,,,.MM',
      'MM...........r..............MM',
      'MMMMMMMMMMMMMMMMMMMMMMMMMMMMMM',
      'MMMMMMMMMMMMMMMMMMMMMMMMMMMMMM',
    ],
    buildings: [B.gym, B.stoneCenter, B.stoneMart, B.stoneHouse, B.stoneHouse2],
    warps: [],
    connections: [
      { dir: 'left', to: 'route2', offset: -5 },
      { dir: 'up', to: 'route3', offset: -4 },
    ],
    onEnter: 'stoneEnter',
    triggers: [{ x: 13, y: 2, w: 4, script: 'stoneBlocker', unless: 'badge_quarry' }],
    signs: [
      { x: 12, y: 8, text: 'STONECREST CITY\nA city carved from the mountain, rich in ore and grit.' },
      { x: 3, y: 8, text: 'STONECREST GYM\nLeader: Garnet\n"The rock-solid miner!"' },
    ],
    npcs: [
      { id: 'miner', x: 9, y: 9, look: 'worker', move: 'look', text: 'The Gym Leader, Garnet, runs the quarry too. She\'s as tough as the rocks she digs!' },
      { id: 'girl', x: 17, y: 18, look: 'girl', move: 'wander', text: 'North of town the road climbs into the snow. Cute Frostbun live up there!' },
      { id: 'blocker', x: 12, y: 2, look: 'worker', facing: 'down', hideIf: 'badge_quarry', script: 'stoneBlocker' },
      { id: 'rival', x: 9, y: 8, look: 'rival', facing: 'up', showIf: 'badge_quarry', hideIf: 'rival3', script: 'rival3' },
    ],
  },
  center('center_stone', 'stonecrest', B.stoneCenter, [
    { id: 'gal', x: 9, y: 6, look: 'lass', move: 'look', text: 'Garnet\'s Pocklets are Rock-types. Water and Grass moves work great on them!' },
  ]),
  mart('mart_stone', 'stonecrest', B.stoneMart, 'clerkStone'),
  house('house_stone', 'stonecrest', B.stoneHouse, [
    { id: 'collector', x: 6, y: 4, look: 'hiker', facing: 'left', script: 'pebbleCollector' },
  ], ['#ece4d4', '#e0d4bc']),
  house('house_stone2', 'stonecrest', B.stoneHouse2, [
    { id: 'tradekid', x: 2, y: 3, look: 'boy', move: 'look', script: 'giftCraniodon' },
    { id: 'mum', x: 7, y: 5, look: 'mom', move: 'look', text: 'My son found an odd fossil in the quarry. The museum revived it, but it keeps headbutting the walls!' },
  ]),
  {
    id: 'gym',
    name: 'Stonecrest Gym',
    music: 'gym',
    outdoor: false,
    border: ' ',
    wallpaper: ['#a89070', '#987f60'],
    tiles: [
      'WWWWWWWWWWWWW',
      'WGgggggggggGW',
      'WgggggggggggW',
      'WgggGGgGGgggW',
      'WgggggggggggW',
      'WGGgggGgggGGW',
      'WgggggggggggW',
      'WgggGgggGgggW',
      'WgggggggggggW',
      'WggGGgggGGggW',
      'WgggggggggggW',
      'WGgggggggggGW',
      'WgggggggggggW',
      'WgggYgggYgggW',
      'WgggggggggggW',
      '      E      ',
    ],
    warps: [{ x: 6, y: 15, ...exitTo('stonecrest', B.gym) }],
    npcs: [
      { id: 'leader', x: 6, y: 1, look: 'leader', facing: 'down', script: 'leader' },
      { id: 'guide', x: 8, y: 14, look: 'youngster', facing: 'left', script: 'gymGuide' },
      {
        id: 'dan', x: 2, y: 8, look: 'worker', facing: 'right',
        trainer: {
          name: 'Worker Dan', party: [['pebblet', 10], ['molekin', 11]], sight: 4, money: 220,
          intro: 'You want to see the boss? Dig through me first!',
          defeat: 'I hit bedrock...',
          after: 'Garnet\'s Craniodon hits like a falling boulder. Be ready.',
        },
      },
      {
        id: 'rhea', x: 10, y: 4, look: 'hiker', facing: 'left',
        trainer: {
          name: 'Hiker Rhea', party: [['gearling', 11], ['pebblet', 11]], sight: 4, money: 240,
          intro: 'The mountain teaches patience. And headbutts.',
          defeat: 'A landslide of a loss!',
          after: 'Go on, Garnet is waiting at the top.',
        },
      },
    ],
  },
  {
    id: 'route3',
    name: 'Route 3',
    music: 'route',
    outdoor: true,
    banner: true,
    border: 'A',
    regionPos: [0.68, 0.16],
    tiles: [
      'AAAAAAAAAAAAAAAAAAAAAA',
      'AAAAAAAAAAAAAAAAAAAAAA',
      'AAnnnnnnnnnnnnnnnnnnAA',
      'AAnNNNNnnnnnnnnNNNNnAA',
      'AAnNNNNnnnInnnnNNNNnAA',
      'AAnNNNNnnnnnnnnNNNNnAA',
      'AAnnnnnnnnnnnnnnnnnnAA',
      'AAAAnnnnnnnnnnnnnnAAAA',
      'AAnnnnNNNNNnnnnnnnnnAA',
      'AAnnnnNNNNNnnnnnInnnAA',
      'AAnInnNNNNNnnnnnnnnnAA',
      'AAnnnnnnnnnnnnNNNNnnAA',
      'AAnnnnnnnnnnnnNNNNnnAA',
      'AAnnnNNNNnnnnnNNNNnnAA',
      'AAnnnNNNNnnnnnnnnnnnAA',
      'AAnnnNNNNnnnnnnnAnnnAA',
      'AAnnnnnnnnnnnnnnnnnnAA',
      'AAAAAAAAAnnnnAAAAAAAAA',
      'AAAAAAAAAnnnnAAAAAAAAA',
    ],
    warps: [],
    connections: [{ dir: 'down', to: 'stonecrest', offset: 4 }],
    encounters: [
      { species: 'frostbun', min: 9, max: 12, weight: 30 },
      { species: 'molekin', min: 9, max: 11, weight: 20 },
      { species: 'pebblet', min: 9, max: 12, weight: 15 },
      { species: 'gearling', min: 10, max: 12, weight: 12 },
      { species: 'brawlet', min: 9, max: 11, weight: 10 },
      { species: 'lumipix', min: 10, max: 12, weight: 5 },
      { species: 'wispurr', min: 10, max: 13, weight: 12, time: 'night' },
      { species: 'duskit', min: 10, max: 12, weight: 10, time: 'night' },
    ],
    encounterRate: 12,
    items: [
      { x: 3, y: 2, item: 'snugpouch', count: 3, flag: 'item:r3:snug' },
      { x: 18, y: 16, item: 'pepseed', flag: 'item:r3:pep' },
      { x: 10, y: 2, item: 'ether', flag: 'item:r3:ether' },
      { x: 3, y: 15, item: 'cureall', flag: 'item:r3:hidden', hidden: true },
    ],
    npcs: [
      { id: 'skier', x: 10, y: 3, look: 'boy', facing: 'down', text: ['Brrr! The pass ahead is buried in snow.', 'They say it won\'t open until the next update... whatever that means.'] },
      {
        id: 'kai', x: 12, y: 10, look: 'youngster', facing: 'left',
        trainer: {
          name: 'Youngster Kai', party: [['frostbun', 12], ['brawlet', 12]], sight: 4, money: 192,
          intro: 'I came up here to train in the cold! Fight me!',
          defeat: 'My teeth are chattering... from losing!',
          after: 'Frostbun hide in the snowy grass with just their ears sticking out.',
        },
      },
      {
        id: 'sky', x: 7, y: 6, look: 'lass', facing: 'right',
        trainer: {
          name: 'Lass Skye', party: [['lumipix', 12], ['frostbun', 13]], sight: 4, money: 208,
          intro: 'Isn\'t the snow beautiful? Let\'s make this battle beautiful too!',
          defeat: 'What a lovely loss...',
          after: 'On moonlit nights, Lumipix float over the snow. It\'s magical.',
        },
      },
    ],
  },
];

export const MAPS: Record<string, MapDef> = Object.fromEntries(MAP_LIST.map((m) => [m.id, m]));

// Stamp building footprints so the grid matches the buildings even where the ASCII is sloppy.
for (const m of MAP_LIST) {
  for (const b of m.buildings ?? []) {
    const d = doorOf(b);
    for (let y = b.y; y < b.y + b.h; y++) {
      const row = m.tiles[y].split('');
      for (let x = b.x; x < b.x + b.w; x++) row[x] = x === d.x && y === d.y ? 'D' : 'X';
      m.tiles[y] = row.join('');
    }
  }
}

/** Shop stock by clerk script. */
export const STOCK: Record<string, string[]> = {
  clerkFern: ['pouch', 'tonic', 'antidote', 'unstiff', 'wakebell', 'repel'],
  clerkStone: ['pouch', 'snugpouch', 'tonic', 'supertonic', 'antidote', 'unstiff', 'coolsalve', 'wakebell', 'thawdrop', 'cureall', 'repel'],
};
