/** "X wants to learn Y, but already knows four moves..." */
import { audio } from '../audio/audio';
import { move as moveData } from '../data/moves';
import { displayName, type Creature } from '../game/creature';
import type { Game } from '../game/game';
import { say, yesNo } from './dialog';
import { button, outlined, panel, text, typeBadge, wrap } from './draw';
import { backdrop, btnState, header, MenuScene, rowHighlight, tappedRect, type Rect } from './list';
import { drawCreature } from '../gfx/creatures';

/**
 * Runs the whole forget-a-move conversation, including the closing
 * "1, 2, and... Poof! ... learned Y!" lines. Does NOT mutate `c`: it resolves the
 * slot (0..3) the caller should overwrite with `newMove`, or -1 if nothing is learned.
 */
export async function askForgetMove(g: Game, c: Creature, newMove: string): Promise<number> {
  const name = displayName(c);
  const nm = moveData(newMove).name;
  await say(g, `${name} wants to learn the move ${nm}.`);
  await say(g, `However, ${name} already knows four moves.`);
  for (;;) {
    if (await yesNo(g, `Should a move be deleted and replaced with ${nm}?`)) {
      const slot = await new ForgetScreen(g, c, newMove).open();
      if (slot >= 0 && slot < 4) {
        const old = moveData(c.moves[slot].id).name;
        await say(g, '1, 2, and... ... ... Poof!');
        await say(g, `${name} forgot how to use ${old}.`);
        await say(g, 'And...');
        void audio.jingle('levelup');
        await say(g, `${name} learned ${nm}!`);
        return slot;
      }
    }
    if (await yesNo(g, `Stop trying to teach ${nm}?`)) {
      await say(g, `${name} did not learn ${nm}.`);
      return -1;
    }
  }
}

class ForgetScreen extends MenuScene<number> {
  opaque = true;
  private sel = 0;

  constructor(
    g: Game,
    private c: Creature,
    private newMove: string,
  ) {
    super(g);
  }

  private ids(): string[] {
    return [...this.c.moves.map((m) => m.id), this.newMove];
  }

  private layout() {
    const W = this.g.view.width;
    const H = this.g.view.height;
    const listW = Math.min(620, W * 0.58);
    const x = W - listW - 20;
    const desc: Rect = { x: 20, y: H - 150, w: W - 40, h: 134 };
    const cancel: Rect = { x: x + listW - 190, y: desc.y - 66, w: 190, h: 56 };
    const rowH = Math.min(78, (cancel.y - 8 - 84 - 16) / 5);
    const rows: Rect[] = this.ids().map((_, i) => ({ x, y: 84 + i * rowH + (i === 4 ? 16 : 0), w: listW, h: rowH }));
    const left: Rect = { x: 20, y: 84, w: W - listW - 60, h: cancel.y + cancel.h - 84 };
    return { rows, desc, left, cancel };
  }

  step(): void {
    const input = this.g.input;
    const L = this.layout();
    if (input.repeat.up) {
      this.sel = (this.sel + 4) % 5;
      audio.sfx('cursor');
    }
    if (input.repeat.down) {
      this.sel = (this.sel + 1) % 5;
      audio.sfx('cursor');
    }
    if (input.pressed.b || tappedRect(this.g, L.cancel)) {
      audio.sfx('back');
      return this.done(-1);
    }
    L.rows.forEach((r, i) => {
      if (tappedRect(this.g, r)) {
        if (this.sel === i) this.confirm();
        else {
          this.sel = i;
          audio.sfx('cursor');
        }
      }
    });
    if (input.pressed.a) this.confirm();
  }

  private confirm(): void {
    audio.sfx('select');
    this.done(this.sel === 4 ? -1 : this.sel);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const g = this.g;
    backdrop(ctx, g, this.t, '#5a7ab8', '#6686c4');
    header(ctx, g, 'Forget which move?', 'rgba(30,40,70,0.8)');
    const L = this.layout();
    const l = L.left;
    if (l.w > 160 && l.h > 160) {
      panel(ctx, l.x, l.y, l.w, l.h, { r: 16, fill: '#fbfbf6' });
      const size = Math.min(l.w - 40, l.h - 60, 260);
      drawCreature(ctx, this.c.species, l.x + l.w / 2, l.y + 20 + size, size, { t: this.t, shiny: this.c.shiny });
      text(ctx, displayName(this.c), l.x + l.w / 2, l.y + l.h - 18, { size: 24, align: 'center', bold: true });
    }
    const ids = this.ids();
    ids.forEach((id, i) => {
      const r = L.rows[i];
      const m = moveData(id);
      panel(ctx, r.x, r.y, r.w, r.h - 6, { r: 12, shadow: false, fill: i === 4 ? '#fff4d8' : '#fbfbf6' });
      if (i === this.sel) rowHighlight(ctx, r.x + 6, r.y + 3, r.w - 12, r.h - 12);
      typeBadge(ctx, m.type, r.x + 20, r.y + r.h / 2 - 16, 86, 26);
      text(ctx, m.name, r.x + 122, r.y + r.h / 2 + 5, { size: 24, bold: true });
      const pp = i < 4 ? this.c.moves[i].pp : m.pp;
      text(ctx, `PP ${pp}/${m.pp}`, r.x + r.w - 24, r.y + r.h / 2 + 5, { size: 21, align: 'right' });
      if (i === 4) outlined(ctx, 'NEW', r.x + r.w - 150, r.y + r.h / 2 + 5, { size: 18, color: '#f8a030' });
    });
    const m = moveData(ids[this.sel]);
    const d = L.desc;
    panel(ctx, d.x, d.y, d.w, d.h, { r: 12 });
    const cat = { physical: 'Physical', special: 'Special', status: 'Status' }[m.category];
    text(ctx, `${cat}   Power ${m.power > 1 ? m.power : '—'}   Accuracy ${m.accuracy || '—'}`, d.x + 30, d.y + 42, { size: 22, bold: true });
    wrap(ctx, m.desc, d.w - 60, 22).slice(0, 2).forEach((line, i) => text(ctx, line, d.x + 30, d.y + 78 + i * 30, { size: 22 }));
    button(ctx, L.cancel.x, L.cancel.y, L.cancel.w, L.cancel.h, 'Give up', { state: btnState(g, L.cancel), color: '#e06050', dark: '#a03028', size: 22 });
  }
}
