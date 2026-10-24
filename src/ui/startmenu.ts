/** The field menu that slides in from the right edge. */
import { audio } from '../audio/audio';
import type { Game } from '../game/game';
import { writeOptions, writeSave } from '../game/state';
import type { Overworld } from '../world/overworld';
import { openBag } from './bag';
import { openCard } from './card';
import { openDex } from './dex';
import { say, yesNo } from './dialog';
import { cursor, panel, text } from './draw';
import { menuIcon, type MenuIcon } from './icons';
import { MenuScene, rowHighlight, tappedRect, type Rect } from './list';
import { openOptions } from './options';
import { openParty } from './party';

interface Entry {
  label: string;
  icon: MenuIcon;
  run: () => Promise<boolean | void>;
}

/** Resolves when the menu is closed. */
export function openStartMenu(g: Game, ow: Overworld): Promise<void> {
  return new StartMenu(g, ow).open();
}

/** Remembered between openings. */
let lastSel = 0;

class StartMenu extends MenuScene {
  showWorld = true;
  private sel = lastSel;
  private slide = 0;

  constructor(
    g: Game,
    private ow: Overworld,
  ) {
    super(g);
  }

  private entries(): Entry[] {
    const g = this.g;
    const s = g.save;
    const list: Entry[] = [];
    if (s.bag.pocklopedia) list.push({ label: 'Pocklopedia', icon: 'dex', run: () => openDex(g) });
    if (s.party.length) list.push({ label: 'Pocklets', icon: 'party', run: async () => void (await openParty(g, 'menu')) });
    list.push({ label: 'Bag', icon: 'bag', run: async () => void (await openBag(g, 'menu')) });
    list.push({ label: s.name, icon: 'card', run: () => openCard(g) });
    list.push({ label: 'Save', icon: 'save', run: () => this.save() });
    list.push({ label: 'Options', icon: 'options', run: () => openOptions(g) });
    list.push({ label: 'Exit', icon: 'exit', run: async () => true });
    return list;
  }

  /** Returns true to close the menu afterwards. */
  private async save(): Promise<boolean> {
    const g = this.g;
    const s = g.save;
    if (!(await yesNo(g, 'Would you like to save the game?'))) return false;
    s.map = this.ow.map.id;
    const ok = writeSave(s);
    writeOptions(s.options);
    if (ok) {
      audio.sfx('save');
      await say(g, `${s.name} saved the game.`);
    } else {
      audio.sfx('error');
      await say(g, 'The game could not be saved. Storage may be full or disabled.');
    }
    return true;
  }

  private layout(): { panel: Rect; rows: Rect[] } {
    const n = this.entries().length;
    const rowH = Math.min(60, (this.g.view.height - 60) / n);
    const w = 290;
    const h = n * rowH + 36;
    const ease = 1 - (1 - this.slide) ** 3;
    const x = this.g.view.width - w - 16 + (1 - ease) * (w + 30);
    const y = 16;
    return { panel: { x, y, w, h }, rows: Array.from({ length: n }, (_, i) => ({ x: x + 12, y: y + 18 + i * rowH, w: w - 24, h: rowH })) };
  }

  step(dt: number): void {
    this.slide = Math.min(1, this.slide + dt * 7);
    const input = this.g.input;
    const list = this.entries();
    const n = list.length;
    this.sel = Math.min(this.sel, n - 1);
    if (input.pressed.b || input.pressed.start || input.pressed.x) {
      audio.sfx('back');
      return this.close();
    }
    if (input.repeat.up) {
      this.sel = (this.sel + n - 1) % n;
      audio.sfx('cursor');
    }
    if (input.repeat.down) {
      this.sel = (this.sel + 1) % n;
      audio.sfx('cursor');
    }
    const L = this.layout();
    let chosen = -1;
    L.rows.forEach((r, i) => {
      if (tappedRect(this.g, r)) chosen = i;
    });
    // Tapping outside the menu closes it.
    if (chosen < 0 && input.touch.released && !(input.touch.x >= L.panel.x && input.touch.y <= L.panel.y + L.panel.h)) {
      audio.sfx('back');
      return this.close();
    }
    if (input.pressed.a) chosen = this.sel;
    if (chosen >= 0) {
      this.sel = chosen;
      audio.sfx('select');
      const e = list[chosen];
      void this.sub(e.run).then((close) => {
        if (close) this.close();
      });
    }
  }

  private close(): void {
    lastSel = this.sel;
    this.done();
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const L = this.layout();
    const p = L.panel;
    panel(ctx, p.x, p.y, p.w, p.h, { r: 14 });
    this.entries().forEach((e, i) => {
      const r = L.rows[i];
      const pressed = this.g.input.touching(r.x, r.y, r.w, r.h);
      if (i === this.sel || pressed) rowHighlight(ctx, r.x, r.y, r.w, r.h);
      menuIcon(ctx, e.icon, r.x + 34, r.y + r.h / 2, Math.min(18, r.h * 0.32));
      text(ctx, e.label, r.x + 66, r.y + r.h / 2 + 9, { size: 25, maxWidth: r.w - 80 });
      if (i === this.sel) cursor(ctx, r.x - 4, r.y + r.h / 2, 12, this.t);
    });
  }
}
