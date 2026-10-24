/** The storage PC: withdraw creatures from the box, or deposit them. */
import { audio } from '../audio/audio';
import { species } from '../data/species';
import { displayName, maxHp, type Creature } from '../game/creature';
import type { Game } from '../game/game';
import { say, yesNo } from './dialog';
import { C, hpBar, panel, roundRect, text, typeBadge } from './draw';
import { backdrop, blitCreature, drawClose, header, MenuScene, tappedRect, wantsClose, type Rect } from './list';
import { openParty } from './party';
import { openSummary } from './summary';

/** Runs the whole PC session (mutates g.save.party and g.save.box). */
export async function openPC(g: Game): Promise<void> {
  for (;;) {
    const k = await say(g, 'Which would you like to do?', { choices: ['Withdraw Pocklet', 'Deposit Pocklet', 'See ya!'] });
    if (k === 0) {
      if (!g.save.box.length) await say(g, 'There are no Pocklets in the box.');
      else await new BoxScreen(g).open();
    } else if (k === 1) await deposit(g);
    else return;
  }
}

async function deposit(g: Game): Promise<void> {
  const s = g.save;
  for (;;) {
    const i = await openParty(g, 'select', { title: 'Deposit which Pocklet?' });
    if (i < 0) return;
    const c = s.party[i];
    const othersAlive = s.party.some((p, k) => k !== i && p.hp > 0);
    if (s.party.length <= 1 || !othersAlive) {
      audio.sfx('error');
      await say(g, "That's your last Pocklet able to battle! You can't deposit it.");
      continue;
    }
    if (!(await yesNo(g, `Deposit ${displayName(c)} in the box?`))) continue;
    s.party.splice(i, 1);
    s.box.push(c);
    audio.sfx('select');
    await say(g, `${displayName(c)} was stored in the box.`);
    return;
  }
}

class BoxScreen extends MenuScene {
  opaque = true;
  private sel = 0;
  private top = 0;

  private get box(): Creature[] {
    return this.g.save.box;
  }

  private layout() {
    const W = this.g.view.width;
    const H = this.g.view.height;
    const topY = 74;
    const leftW = Math.min(380, W * 0.36);
    const left: Rect = { x: 16, y: topY, w: leftW, h: H - topY - 16 };
    const grid: Rect = { x: leftW + 32, y: topY, w: W - leftW - 48, h: H - topY - 16 };
    const cols = 6;
    const cell = Math.min((grid.w - 40) / cols, 130);
    const rows = Math.max(1, Math.floor((grid.h - 40) / cell));
    return { left, grid, cols, rows, cell };
  }

  step(): void {
    const input = this.g.input;
    if (wantsClose(this.g)) return this.done();
    const L = this.layout();
    const n = this.box.length;
    if (!n) return this.done();
    const prev = this.sel;
    if (input.repeat.left) this.sel = Math.max(0, this.sel - 1);
    if (input.repeat.right) this.sel = Math.min(n - 1, this.sel + 1);
    if (input.repeat.up) this.sel = Math.max(0, this.sel - L.cols);
    if (input.repeat.down) this.sel = Math.min(n - 1, this.sel + L.cols);
    if (prev !== this.sel) audio.sfx('cursor');
    const row = Math.floor(this.sel / L.cols);
    if (row < this.top) this.top = row;
    if (row >= this.top + L.rows) this.top = row - L.rows + 1;
    for (let i = 0; i < L.rows * L.cols; i++) {
      const k = this.top * L.cols + i;
      if (k >= n) break;
      if (tappedRect(this.g, this.cellRect(L, i))) {
        this.sel = k;
        void this.pick();
        return;
      }
    }
    // Scroll by tapping above/below the grid.
    if (this.top > 0 && input.tapped(L.grid.x, L.grid.y, L.grid.w, 20)) this.top--;
    if ((this.top + L.rows) * L.cols < n && input.tapped(L.grid.x, L.grid.y + L.grid.h - 20, L.grid.w, 20)) this.top++;
    if (input.pressed.a) void this.pick();
  }

  private cellRect(L: ReturnType<BoxScreen['layout']>, i: number): Rect {
    const col = i % L.cols;
    const row = Math.floor(i / L.cols);
    return { x: L.grid.x + 20 + col * L.cell, y: L.grid.y + 20 + row * L.cell, w: L.cell, h: L.cell };
  }

  private async pick(): Promise<void> {
    const g = this.g;
    const c = this.box[this.sel];
    if (!c) return;
    audio.sfx('select');
    const k = await this.sub(() => say(g, `What will you do with ${displayName(c)}?`, { choices: ['Withdraw', 'Summary', 'Cancel'] }));
    if (k === 1) {
      await this.sub(() => openSummary(g, this.box, this.sel));
      return;
    }
    if (k !== 0) return;
    if (g.save.party.length >= 6) {
      audio.sfx('error');
      await this.sub(() => say(g, 'Your party is full!'));
      return;
    }
    this.box.splice(this.sel, 1);
    g.save.party.push(c);
    await this.sub(() => say(g, `${displayName(c)} was taken out of the box.`));
    this.sel = Math.max(0, Math.min(this.sel, this.box.length - 1));
    if (!this.box.length) this.done();
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const g = this.g;
    backdrop(ctx, g, this.t, '#7a68b0', '#8676bc');
    header(ctx, g, `BOX  (${this.box.length})`, 'rgba(40,30,70,0.8)');
    drawClose(ctx, g);
    const L = this.layout();
    const c = this.box[this.sel];

    const l = L.left;
    panel(ctx, l.x, l.y, l.w, l.h, { r: 16, fill: '#fbfbf6' });
    if (c) {
      const sp = species(c.species);
      const size = Math.min(l.w - 60, l.h - 200, 260);
      blitCreature(g, ctx, c.species, l.x + l.w / 2, l.y + 30 + size, size, { shiny: c.shiny });
      text(ctx, displayName(c), l.x + 26, l.y + size + 76, { size: 26, bold: true });
      text(ctx, `Lv${c.level}`, l.x + l.w - 26, l.y + size + 76, { size: 22, align: 'right' });
      let bx = l.x + 26;
      for (const t of sp.types) {
        typeBadge(ctx, t, bx, l.y + size + 92, 86, 26);
        bx += 96;
      }
      if (l.y + size + 150 < l.y + l.h) hpBar(ctx, l.x + 26, l.y + size + 140, l.w - 90, c.hp / maxHp(c), 11);
    }

    const r = L.grid;
    panel(ctx, r.x, r.y, r.w, r.h, { r: 16, fill: '#e8e4f4' });
    for (let i = 0; i < L.rows * L.cols; i++) {
      const k = this.top * L.cols + i;
      const cell = this.cellRect(L, i);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      roundRect(ctx, cell.x + 4, cell.y + 4, cell.w - 8, cell.h - 8, 12);
      ctx.fill();
      const m = this.box[k];
      if (!m) continue;
      if (k === this.sel) {
        ctx.strokeStyle = C.select;
        ctx.lineWidth = 4;
        roundRect(ctx, cell.x + 4, cell.y + 4, cell.w - 8, cell.h - 8, 12);
        ctx.stroke();
      }
      const bob = k === this.sel ? Math.abs(Math.sin(this.t * 6)) * 4 : 0;
      blitCreature(g, ctx, m.species, cell.x + cell.w / 2, cell.y + cell.h - 10 - bob, cell.w * 0.8, { shiny: m.shiny });
    }
  }
}
