/** Event scripts, referenced by name from map data. */
import { audio } from '../audio/audio';
import { makeCreature, restore } from '../game/creature';
import { addItem, hasItem, type Facing } from '../game/state';
import { openPC } from '../ui/pcbox';
import { openShop } from '../ui/shop';
import { chooseStarter } from '../ui/starter';
import { STOCK } from './maps';
import type { TrainerDef } from './mapdef';
import type { NpcState, Overworld, Script } from './overworld';

const BEATS: Record<string, string> = { sprigfawn: 'kindlekit', kindlekit: 'pupple', pupple: 'sprigfawn' };

function rivalDef(ow: Overworld, party: [string, number][], after: string): TrainerDef {
  return { name: ow.save.rival, party, sight: 0, money: 0, intro: '', defeat: '', after };
}

/** Battles the rival; the rival's lines are said by the caller. */
async function rivalBattle(ow: Overworld, party: [string, number][], defeat: string, after: string, canLose = false): Promise<boolean> {
  const def: TrainerDef = { ...rivalDef(ow, party, after), defeat, money: party.reduce((a, [, l]) => Math.max(a, l), 0) * 40 };
  const foe = party.map(([sp, lv]) => makeCreature(sp, lv, ow.rng));
  return ow.battle(foe, { trainer: def, look: 'rival', canLose });
}

async function nurse(ow: Overworld): Promise<void> {
  await ow.say('Welcome to the Rest Stop! We restore tired Pocklets to full health.');
  if (!(await ow.yesNo('Shall I take your Pocklets?'))) {
    await ow.say('We hope to see you again!');
    return;
  }
  await ow.say('Okay, I\'ll take your Pocklets for a few seconds.');
  await audio.jingle('heal');
  await ow.healParty();
  ow.save.respawn = { map: ow.map.id, x: ow.map.respawn?.x ?? 6, y: ow.map.respawn?.y ?? 4 };
  await ow.say('Thank you for waiting. Your Pocklets are fighting fit!');
  await ow.say('We hope to see you again!');
}

const shop = (key: string): Script => (ow) => openShop(ow.g, STOCK[key]);

export const SCRIPTS: Record<string, Script> = {
  async homeEnter(ow) {
    if (ow.flag('woke_up')) return;
    ow.setFlag('woke_up');
    await ow.g.wait(0.4);
    await ow.say('{PLAYER}! Are you finally awake? Come here a moment, sweetie!');
  },

  async mom(ow) {
    if (!ow.flag('got_wristpad')) {
      await ow.say('Good morning, {PLAYER}! {RIVAL} came by looking for you. Something about Pocklets and "the biggest adventure ever".');
      await ow.say('Oh! Before you go, take these. Your father sent them for your birthday.');
      await ow.obtain('wristpad');
      await ow.say('It\'s a Wristpad! It has a clock, a step counter and all sorts of apps. Tap its side button to switch them.');
      await ow.obtain('runshoes');
      await ow.say('And Run Shoes! Hold B or Shift to run. Just don\'t trample my flowerbeds!');
      await ow.say('Now off you go. And {PLAYER}... be careful in the tall grass!');
      ow.setFlag('got_wristpad');
      return;
    }
    if (ow.save.party.length) {
      await ow.say('{PLAYER}! You look tired. Why don\'t you rest a bit?');
      await audio.jingle('heal');
      await ow.healParty();
      await ow.say('Your Pocklets look full of energy now! Mom is proud of you.');
    } else {
      await ow.say('{RIVAL} went off toward Route 1. You know how impatient that kid is!');
    }
  },

  async rivalTown(ow) {
    let rival: NpcState;
    try {
      rival = ow.npc('rival');
    } catch {
      return;
    }
    const p = ow.player;
    if (p.y <= 3) {
      // Caught trying to sneak off north: the rival runs over.
      await ow.emote(rival, '!');
      await ow.walkNpcTo(rival, p.x + 1, p.y);
      rival.mover.facing = 'left';
      ow.facePlayer('right');
    } else {
      rival.mover.facing = ow.dirTo(rival.mover.x, rival.mover.y, p.x, p.y);
    }
    await ow.say('{PLAYER}! There you are! Did you hear? Wild Pocklets have been spotted in the tall grass on Route 1!', { speaker: ow.save.rival });
    await ow.say('We\'re going to catch some. Today. Right now. I\'ll fine you a million dollars if you\'re late!', { speaker: ow.save.rival });
    await ow.say('Last one to Route 1 is a rotten Finfry!', { speaker: ow.save.rival });
    // Dash off to the north exit.
    const path: Facing[] = [];
    let x = rival.mover.x;
    let y = rival.mover.y;
    if (y > 3) {
      while (x > 13) { path.push('left'); x--; }
      while (x < 13) { path.push('right'); x++; }
    }
    while (y > 0) {
      path.push('up');
      y--;
      if (x === p.x && y === p.y) {
        path.pop();
        path.push(x < 14 ? 'right' : 'left', 'up');
        x += x < 14 ? 1 : -1;
      }
    }
    await ow.moveNpc(rival, path, 0.12);
    ow.setFlag('rival_left_town');
    ow.removeNpc(rival);
  },

  async route1Intro(ow) {
    if (ow.flag('starter')) return;
    const prof = ow.npc('prof');
    const aide = ow.npc('aide');
    const rival = ow.npc('rival');
    const R = ow.save.rival;
    const p = ow.player;
    rival.mover.facing = 'down';
    await ow.say('{PLAYER}, you\'re late! Okay, plan: we run into the tall grass and catch Pocklets with our bare hands!', { speaker: R });
    await ow.say('Hold it right there!', { speaker: '???' });
    await ow.emote(rival, '!');
    await ow.emote('player', '!');
    // The professor walks up to the pair.
    const path: Facing[] = [];
    for (let y = prof.mover.y; y < p.y - 2; y++) path.push('down');
    await ow.moveNpc(prof, path);
    prof.mover.facing = 'down';
    ow.facePlayer('up');
    await ow.say('Going into the tall grass without a Pocklet of your own? Wild Pocklets can be dangerous!', { speaker: 'Professor Hemlock' });
    await ow.say('Hm. I am Professor Hemlock. I study Pocklets at my lab in Fernbrook Town, just north of here.', { speaker: 'Professor Hemlock' });
    await ow.say('You two remind me of myself at your age. Reckless. Brave. A touch foolish.', { speaker: 'Professor Hemlock' });
    await ow.say('...Very well. I happen to have three Pocklets with me. If you promise to treat them well, one of them is yours.', { speaker: 'Professor Hemlock' });
    await ow.say('{PLAYER}, as you were the one who stopped, you may choose first.', { speaker: 'Professor Hemlock' });
    const pick = await chooseStarter(ow.g);
    const s = ow.save;
    s.starter = pick;
    s.rivalStarter = BEATS[pick];
    await ow.receive(makeCreature(pick, 5, ow.rng, 'Route 1'), `{PLAYER} received ${ow.speciesName(pick)} from Professor Hemlock!`);
    await ow.say(`Then I'll take this one! ${ow.speciesName(s.rivalStarter)}, you and me are gonna be legends!`, { speaker: R });
    await ow.say('{PLAYER}! Let\'s see whose Pocklet is stronger. Battle me!', { speaker: R });
    await rivalBattle(ow, [[s.rivalStarter, 5]], 'Whoa! Not bad at all!', 'Next time I\'ll win for sure! We\'re rivals now, okay?', true);
    await ow.say('Splendid. You both have the makings of real trainers.', { speaker: 'Professor Hemlock' });
    await ow.say('Come and see me at my lab in Fernbrook Town. I have something else for you. Rest your Pocklets at home first if you need to.', { speaker: 'Professor Hemlock' });
    await ow.moveNpc(prof, ['up', 'up', 'up', 'up']);
    ow.removeNpc(prof);
    await ow.moveNpc(aide, ['up', 'up', 'up']);
    ow.removeNpc(aide);
    await ow.say('I\'m heading to the lab first! Smell ya later, {PLAYER}!', { speaker: R });
    await ow.moveNpc(rival, ['right', 'up', 'up', 'up', 'up', 'up'], 0.12);
    ow.removeNpc(rival);
    ow.setFlag('starter');
    for (const c of s.party) restore(c);
    await ow.say('Your Pocklet looks a little tired. ...Huh? It perked right back up!');
  },

  async labProfessor(ow) {
    if (!ow.flag('starter')) {
      await ow.say('Hm? You don\'t have a Pocklet. Come back when you do.', { speaker: 'Professor Hemlock' });
      return;
    }
    if (!ow.flag('got_dex')) {
      await ow.say('Ah, {PLAYER}. Good, good. How is your Pocklet? It seems to like you already.', { speaker: 'Professor Hemlock' });
      await ow.say('I have a request. This is the Pocklopedia, a high-tech encyclopedia. It records data on every Pocklet you encounter.', { speaker: 'Professor Hemlock' });
      await ow.obtain('pocklopedia');
      await ow.say('Fill it for me, would you? I\'m getting too old to chase Chirpip through the grass.', { speaker: 'Professor Hemlock' });
      await ow.say('And to catch Pocklets you\'ll need these. Weaken a wild Pocklet first, then throw a Pouch!', { speaker: 'Professor Hemlock' });
      await ow.obtain('pouch', 5);
      await ow.say('{RIVAL} already ran off toward Route 2. To the east, past Route 2, is Stonecrest City. Its Gym Leader would be a good test for you.', { speaker: 'Professor Hemlock' });
      ow.setFlag('got_dex');
      ow.refreshNpcs();
      return;
    }
    const seen = ow.save.seen.length;
    const caught = ow.save.caught.length;
    await ow.say(`Let me see your Pocklopedia... You've seen ${seen} kinds and caught ${caught}.`, { speaker: 'Professor Hemlock' });
    await ow.say(caught >= 15 ? 'Remarkable! You\'re a natural.' : caught >= 6 ? 'A fine start. Keep at it!' : 'Every journey starts with a single Pouch. Go catch some more!', { speaker: 'Professor Hemlock' });
  },

  async labAide(ow) {
    if (ow.flag('got_dex') && !ow.flag('aide_tonics')) {
      await ow.say('The professor asked me to give you these. Tonics restore 20 HP. Use them from the Bag.');
      await ow.obtain('tonic', 3);
      ow.setFlag('aide_tonics');
      return;
    }
    await ow.say('Weaken a Pocklet and give it a status like sleep or paralysis. It\'s much easier to catch that way!');
  },

  async fernExitBlock(ow) {
    await ow.say('Hey! {PLAYER}! The professor wants to see you at the lab before you leave town!', { speaker: 'Aide' });
    await ow.movePlayer(['left']);
  },

  async rival2(ow) {
    if (ow.flag('rival2')) return;
    const rival = ow.npc('rival');
    const p = ow.player;
    await ow.emote(rival, '!');
    if (rival.mover.y !== p.y) {
      const path: Facing[] = [];
      let y = rival.mover.y;
      while (y < p.y) { path.push('down'); y++; }
      while (y > p.y) { path.push('up'); y--; }
      await ow.moveNpc(rival, ['left', ...path]);
    }
    await ow.walkNpcTo(rival, p.x + 1, p.y);
    rival.mover.facing = 'left';
    ow.facePlayer('right');
    const R = ow.save.rival;
    await ow.say('{PLAYER}! I\'ve been training nonstop. Watch this!', { speaker: R });
    const won = await rivalBattle(ow, [['chirpip', 7], [ow.save.rivalStarter, 9]], 'Aaargh! How do you keep doing that?!', 'I\'m heading to Stonecrest. I\'ll get that Gym Badge before you!');
    if (!won) return;
    await ow.moveNpc(rival, ['right', 'right', 'right', 'right', 'right', 'right'], 0.12);
    ow.removeNpc(rival);
    ow.setFlag('rival2');
  },

  nurse,
  clerkFern: shop('clerkFern'),
  clerkStone: shop('clerkStone'),

  async pc(ow) {
    audio.sfx('menu');
    await ow.say('{PLAYER} booted up the PC.');
    await openPC(ow.g);
  },

  async fernGrandpa(ow) {
    if (!ow.flag('grandpa_repel')) {
      await ow.say('Wild Pocklets pestering you? This spray keeps the weak ones away. I don\'t need it anymore. My legs don\'t carry me into the grass these days!');
      await ow.obtain('repel', 2);
      ow.setFlag('grandpa_repel');
      return;
    }
    await ow.say('Fire beats Grass, Grass beats Water, Water beats Fire. Simple! ...Then there are the other fourteen types.');
  },

  async pebbleCollector(ow) {
    if (hasItem(ow.save, 'shinystone')) {
      await ow.say('Is that... a Shiny Pebble?! Oh, it\'s gorgeous! Would you trade it for my Deep Pouches?');
      if (await ow.yesNo('Trade the Shiny Pebble?')) {
        addItem(ow.save, 'shinystone', -1);
        await ow.obtain('deeppouch', 2);
        await ow.say('Thank you! It\'ll be the jewel of my collection!');
        return;
      }
    }
    await ow.say('I collect pretty stones. Folks say there\'s a Shiny Pebble hidden somewhere on Route 2. Try pressing A on suspicious spots!');
  },

  async giftCraniodon(ow) {
    if (ow.flag('got_craniodon')) {
      await ow.say('Take good care of Craniodon! Don\'t let it headbutt your house.');
      return;
    }
    await ow.say('I revived this Craniodon from a fossil, but it keeps headbutting the walls. Mom says it needs a trainer. Will you take it?');
    if (!(await ow.yesNo('Take the Craniodon?'))) {
      await ow.say('Oh... okay. Come back if you change your mind!');
      return;
    }
    await ow.receive(makeCreature('craniodon', 10, ow.rng, 'Stonecrest City'), '{PLAYER} received Craniodon!');
    if (ow.save.party.length === 6 && ow.save.box.length) await ow.say('Your party was full, so Craniodon was sent to the storage box.');
    ow.setFlag('got_craniodon');
  },

  async gymGuide(ow) {
    await ow.say('Hey, champ in the making! Welcome to Stonecrest Gym!');
    await ow.say('Leader Garnet uses Rock-type Pocklets. They\'re tough, but Water and Grass moves will crack them wide open.');
    if (!ow.flag('badge_quarry')) await ow.say('Fighting- and Ground-type moves also work. Normal moves? Not so much!');
    else await ow.say('You beat Garnet! That was rock solid!');
  },

  async leader(ow, npc) {
    if (!npc) return;
    if (ow.flag('badge_quarry')) {
      await ow.say('The road north is open to you now. Go see the snow, and keep digging deeper, {PLAYER}!', { speaker: 'Garnet' });
      return;
    }
    const L = 'Leader Garnet';
    await ow.say('So you made it to the top of my quarry. I\'m Garnet, Stonecrest\'s Gym Leader.', { speaker: L });
    await ow.say('Down in the mines, you learn that anything worth having takes grit. Let\'s see if you have any!', { speaker: L });
    const def: TrainerDef = {
      name: L,
      party: [['pebblet', 12], ['molekin', 12], ['craniodon', 14]],
      sight: 0,
      money: 1400,
      leader: true,
      intro: '',
      defeat: 'Well, I\'ll be... You dug right through me!',
      after: 'You\'ve got grit, kid. Real grit.',
    };
    const foe = def.party.map(([sp, lv]) => makeCreature(sp, lv, ow.rng));
    audio.playMusic('gym');
    const won = await ow.battle(foe, { trainer: def, look: 'leader' });
    if (!won) return;
    await ow.say('Here. Take the Quarry Badge. It proves you beat me fair and square.', { speaker: L });
    ow.save.badges.push('quarry');
    ow.setFlag('badge_quarry');
    await audio.jingle('badge');
    await ow.say('{PLAYER} received the Quarry Badge from Garnet!');
    await ow.say('And take these too. A trainer can never have too many.', { speaker: L });
    await ow.obtain('supertonic', 3);
    await ow.say('The road north of town, Route 3, was closed for my sake. My workers will let you through now.', { speaker: L });
  },

  async stoneBlocker(ow) {
    await ow.say('Sorry, kid. Route 3 is closed past here. Leader Garnet\'s orders: only trainers with the Quarry Badge get through.', { speaker: 'Worker' });
    await ow.movePlayer(['down']);
  },

  async stoneEnter(ow) {
    if (ow.flag('badge_quarry') && !ow.flag('rival3') && ow.player.x === 7 && ow.player.y === 8) await SCRIPTS.rival3(ow);
  },

  async rival3(ow) {
    if (ow.flag('rival3')) return;
    let rival: NpcState;
    try {
      rival = ow.npc('rival');
    } catch {
      return;
    }
    const R = ow.save.rival;
    const p = ow.player;
    await ow.emote(rival, '!');
    await ow.walkNpcTo(rival, p.x + 1, p.y);
    rival.mover.facing = 'left';
    ow.facePlayer('right');
    await ow.say('{PLAYER}! You got the Quarry Badge too?! I got mine yesterday! ...Okay, this morning. Okay, I\'m going in right after this.', { speaker: R });
    await ow.say('Doesn\'t matter! This is the battle that decides who\'s REALLY the best!', { speaker: R });
    const won = await rivalBattle(ow, [['gustling', 14], ['sparkit', 13], [ow.save.rivalStarter, 15]], 'No way... I lost again?!', 'Fine! I\'m going to train in the snow until I\'m unstoppable! You\'ll see!');
    if (!won) return;
    await ow.moveNpc(rival, ['right', 'right', 'up', 'up', 'up', 'up', 'up'], 0.12);
    ow.removeNpc(rival);
    ow.setFlag('rival3');
    await ow.say('Thanks for playing Pockets with Stuff! You\'ve finished the main story of this chapter.');
    await ow.say('Keep exploring: fill the Pocklopedia, find hidden items, and brave the snow on Route 3. More of Norvale is coming soon!');
  },
};
