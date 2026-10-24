/** The Supply Shop counter: buy and sell. */
import { audio } from '../audio/audio';
import { ITEMS, item as itemData } from '../data/items';
import type { Game } from '../game/game';
import { addItem } from '../game/state';
import { say, yesNo } from './dialog';
import { panel, text, wrap } from './draw';
import { itemIcon } from './icons';
import { askQuantity, drawClose, ListView, MenuScene, money, rowHighlight, wantsClose, type Rect } from './list';

/** Runs a whole shop visit. Mutates g.save.money and g.save.bag. */
export async function openShop(g: Game, stock: string[]): Promise<void> {
  for (;;) {
    const k = await say(g, 'Welcome! How may I serve you?', { choices: ['Buy', 'Sell', 'See you!'] });
    if (k === 0) await new ShopList(g, 'buy', stock).open();
    else if (k === 1) await new ShopList(g, 'sell', []).open();
    else {
      await say(g, 'Please come again!');
      return;
    }
  }
}

class ShopList extends MenuScene {
  showWorld = true;
  private list = new ListView(() => this.entries().length);

  constructor(
    g: Game,
    private mode: 'buy' | 'sell',
    private stock: string[],
  ) {
    super(g);
  }

  private entries(): string[] {
    if (this.mode === 'buy') return this.stock;
    const bag = this.g.save.bag;
    return Object.values(ITEMS)
      .filter((i) => i.pocket !== 'key' && (bag[i.id] ?? 0) > 0 && i.price > 0)
      .map((i) => i.id);
  }

  private price(id: string): number {
    const p = itemData(id).price;
    return this.mode === 'buy' ? p : Math.floor(p / 2);
  }

  private layout() {
    const W = this.g.view.width;
    const H = this.g.view.height;
    const listW = Math.min(520, W * 0.5);
    const listR: Rect = { x: W - listW - 20, y: 74, w: listW, h: H - 74 - 180 };
    const inner: Rect = { x: listR.x + 14, y: listR.y + 28, w: listR.w - 28, h: listR.h - 52 };
    const moneyR: Rect = { x: 20, y: 74, w: 300, h: 76 };
    const desc: Rect = { x: 20, y: H - 160, w: W - 40, h: 144 };
    return { listR, inner, moneyR, desc };
  }

  step(): void {
    if (wantsClose(this.g)) return this.done();
    const L = this.layout();
    if (this.list.update(this.g, L.inner, 56) === 'activate') {
      const id = this.entries()[this.list.sel];
      if (id) void this.sub(() => (this.mode === 'buy' ? this.buy(id) : this.sell(id)));
    }
  }

  private async buy(id: string): Promise<void> {
    const g = this.g;
    const s = g.save;
    const it = itemData(id);
    const price = this.price(id);
    audio.sfx('select');
    const max = Math.min(99, Math.floor(s.money / price));
    if (max < 1) {
      audio.sfx('error');
      await say(g, "You don't have enough money.");
      return;
    }
    const n = await askQuantity(g, max, (k) => money(k * price));
    if (n <= 0) return;
    if (!(await yesNo(g, `${it.name}, and you want ${n}. That will be ${money(n * price)}. OK?`))) return;
    s.money -= n * price;
    addItem(s, id, n);
    audio.sfx('buy');
    await say(g, 'Here you are! Thank you!');
  }

  private async sell(id: string): Promise<void> {
    const g = this.g;
    const s = g.save;
    const it = itemData(id);
    const price = this.price(id);
    audio.sfx('select');
    const have = s.bag[id] ?? 0;
    const n = have > 1 ? await askQuantity(g, have, (k) => money(k * price)) : 1;
    if (n <= 0) return;
    if (!(await yesNo(g, `I can pay ${money(n * price)} for ${n > 1 ? `${n} ${it.name}s` : `the ${it.name}`}. Would that be OK?`))) return;
    s.money += n * price;
    addItem(s, id, -n);
    audio.sfx('buy');
    await say(g, `Turned over the ${it.name} and received ${money(n * price)}.`);
    if (!this.entries().length) this.done();
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const g = this.g;
    const L = this.layout();
    drawClose(ctx, g);
    const m = L.moneyR;
    panel(ctx, m.x, m.y, m.w, m.h);
    text(ctx, 'MONEY', m.x + 24, m.y + 46, { size: 20, color: '#6a6a78' });
    text(ctx, money(g.save.money), m.x + m.w - 24, m.y + 48, { size: 26, bold: true, align: 'right' });

    const r = L.listR;
    panel(ctx, r.x, r.y, r.w, r.h, { r: 14 });
    const entries = this.entries();
    this.list.draw(ctx, L.inner, 56, this.t, (i, x, y, w, h, sel) => {
      const id = entries[i];
      if (sel) rowHighlight(ctx, x, y, w - 40, h);
      text(ctx, itemData(id).name, x + 18, y + h / 2 + 9, { size: 24 });
      const right = this.mode === 'sell' ? `×${g.save.bag[id]}  ${money(this.price(id))}` : money(this.price(id));
      text(ctx, right, x + w - 52, y + h / 2 + 9, { size: 23, align: 'right' });
    });

    const id = entries[this.list.sel];
    const d = L.desc;
    panel(ctx, d.x, d.y, d.w, d.h, { r: 12 });
    if (id) {
      itemIcon(ctx, id, d.x + 70, d.y + d.h / 2, 38);
      const it = itemData(id);
      const owned = g.save.bag[id] ?? 0;
      wrap(ctx, it.desc, d.w - 320, 22).slice(0, 3).forEach((line, i) => text(ctx, line, d.x + 130, d.y + 50 + i * 30, { size: 22 }));
      text(ctx, `In bag: ${owned}`, d.x + d.w - 30, d.y + 50, { size: 20, align: 'right', color: '#6a6a78' });
    }
  }
}
