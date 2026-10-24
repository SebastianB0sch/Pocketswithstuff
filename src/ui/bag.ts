/** The bag: four pockets, a list, and a description panel. */
import { audio } from '../audio/audio';
import { ITEMS, item as itemData, type ItemPocket } from '../data/items';
import { displayName } from '../game/creature';
import type { Game } from '../game/game';
import { addItem } from '../game/state';
import { applyItem, itemUsable } from '../game/useitem';
import { say, yesNo } from './dialog';
import { C, outlined, panel, roundRect, text, wrap } from './draw';
import { itemIcon } from './icons';
import { askQuantity, backdrop, drawClose, header, ListView, MenuScene, rowHighlight, tappedRect, wantsClose, type Rect } from './list';
import { openParty } from './party';

const POCKETS: { id: ItemPocket; name: string; icon: string; color: [string, string] }[] = [
  { id: 'items', name: 'Items', icon: 'repel', color: ['#d89048', '#e8a058'] },
  { id: 'medicine', name: 'Medicine', icon: 'tonic', color: ['#5aa868', '#6ab878'] },
  { id: 'pouches', name: 'Pouches', icon: 'pouch', color: ['#c85858', '#d86868'] },
  { id: 'key', name: 'Key Items', icon: 'wristpad', color: ['#6a78c8', '#7a88d8'] },
];

export interface BagOptions {
  /** Battle: whether catching is allowed (wild battles). */
  canCatch?: boolean;
  /** Field: use the chosen item on this party member (opened from the party screen). */
  target?: number;
}

export type BagResult = { item: string; target: number } | null;

/**
 * 'battle' resolves with the item and party target to use (target -1 for pouches);
 * it does not consume anything — the battle engine does. 'menu' uses items on the
 * spot (consuming them from g.save.bag) and resolves null.
 */
export function openBag(g: Game, mode: 'menu' | 'battle', opts: BagOptions = {}): Promise<BagResult> {
  return new Bag(g, mode, opts).open();
}

/** Remembered between openings, as on the DS. */
let lastPocket = 1;

class Bag extends MenuScene<BagResult> {
  opaque = true;
  private pocket: number;
  private list = new ListView(() => this.entries().length);

  constructor(
    g: Game,
    private mode: 'menu' | 'battle',
    private opts: BagOptions,
  ) {
    super(g);
    this.pocket = opts.target !== undefined ? 1 : lastPocket;
  }

  private entries(): string[] {
    const bag = this.g.save.bag;
    const p = POCKETS[this.pocket].id;
    return Object.values(ITEMS)
      .filter((i) => i.pocket === p && (bag[i.id] ?? 0) > 0)
      .map((i) => i.id);
  }

  private layout() {
    const W = this.g.view.width;
    const H = this.g.view.height;
    const top = 74;
    const leftW = Math.min(420, W * 0.4);
    const left: Rect = { x: 16, y: top, w: leftW, h: H - top - 16 };
    const tabW = (leftW - 30) / 4;
    const tabs: Rect[] = POCKETS.map((_, i) => ({ x: left.x + 15 + i * tabW, y: left.y + 14, w: tabW - 8, h: 70 }));
    const right: Rect = { x: left.x + leftW + 16, y: top, w: W - leftW - 48, h: H - top - 16 };
    const listR: Rect = { x: right.x + 14, y: right.y + 34, w: right.w - 28, h: right.h - 60 };
    return { left, tabs, right, listR };
  }

  step(): void {
    const g = this.g;
    const input = g.input;
    const L = this.layout();
    if (wantsClose(g)) return this.done(null);
    const prev = this.pocket;
    if (input.repeat.left) this.pocket = (this.pocket + 3) % 4;
    if (input.repeat.right) this.pocket = (this.pocket + 1) % 4;
    L.tabs.forEach((r, i) => {
      if (tappedRect(g, r)) this.pocket = i;
    });
    if (this.pocket !== prev) {
      audio.sfx('cursor');
      this.list.sel = 0;
      this.list.top = 0;
      lastPocket = this.pocket;
    }
    if (this.list.update(g, L.listR, 58) === 'activate') {
      const id = this.entries()[this.list.sel];
      if (id) void this.pick(id);
    }
  }

  private async pick(id: string): Promise<void> {
    audio.sfx('select');
    const g = this.g;
    const it = itemData(id);
    if (this.mode === 'battle') {
      if (it.pocket === 'medicine') {
        const target = await this.sub(() => openParty(g, 'select', { itemId: id }));
        if (target >= 0) this.done({ item: id, target });
        return;
      }
      if (it.use.t === 'catch' && this.opts.canCatch) {
        this.done({ item: id, target: -1 });
        return;
      }
      await this.sub(() => say(g, "You can't use that here!"));
      return;
    }

    if (it.pocket === 'key') {
      await this.sub(() => say(g, it.desc));
      return;
    }
    const usable = it.pocket === 'medicine' || it.use.t === 'repel';
    const choices = usable ? ['Use', 'Toss', 'Cancel'] : ['Toss', 'Cancel'];
    const k = await this.sub(() => say(g, `${it.name} is selected.`, { choices }));
    const action = choices[k];
    if (action === 'Use') await this.sub(() => this.use(id));
    else if (action === 'Toss') await this.sub(() => this.toss(id));
  }

  private async use(id: string): Promise<void> {
    const g = this.g;
    const s = g.save;
    const it = itemData(id);
    if (it.use.t === 'repel') {
      if (s.repel > 0) {
        await say(g, 'The effects of a previous Repel Spray are still lingering.');
        return;
      }
      s.repel = it.use.steps;
      addItem(s, id, -1);
      audio.sfx('select');
      await say(g, `${s.name} used the ${it.name}. Weak wild Pocklets will stay away.`);
      return;
    }
    const target = this.opts.target ?? (await openParty(g, 'select', { itemId: id }));
    if (target < 0) return;
    const c = s.party[target];
    if (!c || !itemUsable(id, c)) {
      audio.sfx('error');
      await say(g, "It won't have any effect.");
      return;
    }
    const msg = applyItem(id, c);
    addItem(s, id, -1);
    audio.sfx('heal');
    await say(g, msg || `${displayName(c)} was helped by the ${it.name}.`);
    if (this.opts.target !== undefined) this.done(null);
  }

  private async toss(id: string): Promise<void> {
    const g = this.g;
    const it = itemData(id);
    const have = g.save.bag[id] ?? 0;
    const n = have > 1 ? await askQuantity(g, have) : 1;
    if (n <= 0) return;
    if (!(await yesNo(g, `Throw away ${n > 1 ? `${n} ` : 'the '}${it.name}${n > 1 ? 's' : ''}?`))) return;
    addItem(g.save, id, -n);
    await say(g, `Threw away ${n > 1 ? `${n} ` : 'the '}${it.name}${n > 1 ? 's' : ''}.`);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const g = this.g;
    const P = POCKETS[this.pocket];
    backdrop(ctx, g, this.t, P.color[0], P.color[1]);
    header(ctx, g, this.mode === 'battle' ? 'BAG' : `${g.save.name}'s BAG`, 'rgba(40,40,56,0.8)');
    drawClose(ctx, g);
    const L = this.layout();

    // Left: pockets, a big icon, description.
    const l = L.left;
    panel(ctx, l.x, l.y, l.w, l.h, { r: 16, fill: '#fbfbf6' });
    L.tabs.forEach((r, i) => {
      const on = i === this.pocket;
      ctx.fillStyle = on ? POCKETS[i].color[0] : '#e4e4ec';
      roundRect(ctx, r.x, r.y, r.w, r.h, 12);
      ctx.fill();
      if (on) {
        ctx.strokeStyle = C.select;
        ctx.lineWidth = 4;
        roundRect(ctx, r.x, r.y, r.w, r.h, 12);
        ctx.stroke();
      }
      itemIcon(ctx, POCKETS[i].icon, r.x + r.w / 2, r.y + r.h / 2, Math.min(r.w, r.h) * 0.32);
    });
    outlined(ctx, P.name, l.x + l.w / 2, l.y + 124, { size: 28, align: 'center', stroke: P.color[0] });

    const entries = this.entries();
    const id = entries[this.list.sel];
    const iconY = l.y + 124 + Math.min(110, (l.h - 330) / 2 + 40);
    if (id) {
      const r = Math.min(64, l.w * 0.16);
      ctx.fillStyle = 'rgba(0,0,0,0.06)';
      ctx.beginPath();
      ctx.arc(l.x + l.w / 2, iconY + 20, r * 1.35, 0, Math.PI * 2);
      ctx.fill();
      itemIcon(ctx, id, l.x + l.w / 2, iconY + 20, r);
      const it = itemData(id);
      const dy = iconY + 20 + r * 1.35 + 20;
      ctx.fillStyle = 'rgba(0,0,0,0.05)';
      roundRect(ctx, l.x + 16, dy, l.w - 32, l.y + l.h - dy - 16, 10);
      ctx.fill();
      wrap(ctx, it.desc, l.w - 64, 21).forEach((line, i) => {
        const y = dy + 34 + i * 29;
        if (y < l.y + l.h - 20) text(ctx, line, l.x + 32, y, { size: 21 });
      });
    }

    // Right: the list.
    const r = L.right;
    panel(ctx, r.x, r.y, r.w, r.h, { r: 16, fill: '#fbfbf6' });
    if (!entries.length) {
      text(ctx, 'There is nothing in this pocket.', r.x + r.w / 2, r.y + 80, { size: 22, align: 'center', color: '#8a8a98' });
      return;
    }
    this.list.draw(ctx, L.listR, 58, this.t, (i, x, y, w, h, sel) => {
      const iid = entries[i];
      if (sel) rowHighlight(ctx, x, y, w - 40, h);
      itemIcon(ctx, iid, x + 30, y + h / 2, 18);
      text(ctx, itemData(iid).name, x + 62, y + h / 2 + 9, { size: 25 });
      if (itemData(iid).pocket !== 'key') text(ctx, `×${g.save.bag[iid]}`, x + w - 56, y + h / 2 + 9, { size: 24, align: 'right' });
    });
  }
}
