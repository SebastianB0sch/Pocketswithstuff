/** Mounts each menu screen with a fake save for screenshots: /dev/menus.html?screen=party */
import '@fontsource/pixelify-sans/500.css';
import '@fontsource/pixelify-sans/700.css';
import { Input } from '../src/core/input';
import { Rng } from '../src/core/rng';
import { View } from '../src/core/view';
import { makeCreature } from '../src/game/creature';
import { Game, type Scene } from '../src/game/game';
import { newSave, defaultOptions } from '../src/game/state';
import { openBag } from '../src/ui/bag';
import { openCard } from '../src/ui/card';
import { openDex } from '../src/ui/dex';
import { askForgetMove } from '../src/ui/learnmove';
import { askQuantity } from '../src/ui/list';
import { openOptions } from '../src/ui/options';
import { openParty } from '../src/ui/party';
import { openPC } from '../src/ui/pcbox';
import { openShop } from '../src/ui/shop';
import { openStartMenu } from '../src/ui/startmenu';
import { openSummary } from '../src/ui/summary';
import { Wristpad } from '../src/ui/wristpad';
import type { World3D } from '../src/world/world3d';
import type { Overworld } from '../src/world/overworld';

const ui = document.getElementById('ui') as HTMLCanvasElement;
const view = new View(ui);
const input = new Input(ui, (x, y) => view.toLogical(x, y));
const world = { setVisible() {}, render() {} } as unknown as World3D;
const g = new Game(view, input, world);
const rng = new Rng(3);
const s = newSave('Robin', 'Kai', defaultOptions());
s.party = [makeCreature('kindlekit', 14, rng, 'Route 1'), makeCreature('chirpip', 9, rng), makeCreature('sparkit', 11, rng), makeCreature('pebblet', 12, rng), makeCreature('lumipix', 7, rng)];
s.party[1].hp = 3;
s.party[2].status = 'par';
s.party[3].hp = 0;
s.box = [makeCreature('nibbun', 5, rng), makeCreature('wrigglet', 4, rng), makeCreature('mosscap', 8, rng)];
s.bag = { pouch: 7, snugpouch: 2, tonic: 4, supertonic: 1, antidote: 2, pepseed: 1, repel: 3, shinystone: 1, wristpad: 1, pocklopedia: 1, runshoes: 1 };
s.seen = ['sprigfawn', 'kindlekit', 'pupple', 'chirpip', 'nibbun', 'wrigglet', 'sparkit', 'pebblet', 'lumipix', 'mosscap'];
s.caught = ['kindlekit', 'chirpip', 'sparkit', 'pebblet', 'lumipix'];
s.badges = ['quarry'];
s.playTime = 3 * 3600 + 25 * 60;
s.steps = 1234;
g.save = s;

const field: Scene = {
  showWorld: true,
  update() {},
  draw(ctx) {
    const grd = ctx.createLinearGradient(0, 0, 0, view.height);
    grd.addColorStop(0, '#7cc85a');
    grd.addColorStop(1, '#4f9a3e');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, view.width, view.height);
  },
};
const pad = new Wristpad(g);
const padScene: Scene = {
  update: (dt) => pad.update(dt, true),
  draw: (ctx) => {
    field.draw(ctx);
    pad.draw(ctx);
  },
};

const screen = new URLSearchParams(location.search).get('screen') ?? 'party';
g.reset(screen === 'wristpad' ? padScene : field);
const ow = { map: { id: 'route1' } } as unknown as Overworld;
const page = Number(new URLSearchParams(location.search).get('page') ?? 0);
const open: Record<string, () => Promise<unknown>> = {
  start: () => openStartMenu(g, ow),
  party: () => openParty(g, 'menu'),
  partybattle: () => openParty(g, 'battle', { active: 0 }),
  partyselect: () => openParty(g, 'select', { itemId: 'tonic' }),
  summary: () => openSummary(g, s.party, 0),
  bag: () => openBag(g, 'menu'),
  dex: () => openDex(g),
  options: () => openOptions(g),
  card: () => openCard(g),
  pc: () => openPC(g),
  shop: () => openShop(g, ['pouch', 'tonic', 'antidote', 'unstiff', 'wakebell', 'repel']),
  learn: () => askForgetMove(g, s.party[0], 'flareburst'),
  qty: () => askQuantity(g, 20, (n) => `$${n * 200}`),
  wristpad: async () => {},
};
document.fonts.ready.then(() => {
  void open[screen]?.();
  // Simulated key presses for deeper pages: ?keys=right,right
  const keys = (new URLSearchParams(location.search).get('keys') ?? '').split(',').filter(Boolean);
  let f = 0;
  let last = performance.now();
  const loop = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    f++;
    if (f > 10 && f % Number(new URLSearchParams(location.search).get("every") ?? 6) === 0 && keys.length) {
      const k = keys.shift()!;
      window.dispatchEvent(new KeyboardEvent('keydown', { code: k }));
      setTimeout(() => window.dispatchEvent(new KeyboardEvent('keyup', { code: k })), 40);
    }
    g.frame(dt);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  void page;
});
