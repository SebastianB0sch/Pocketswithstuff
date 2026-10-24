/** The Pocklopedia: a list of every species, and a page for each one met. */
import { audio } from '../audio/audio';
import { DEX_ORDER, type Species } from '../data/species';
import { TYPE_COLORS } from '../data/types';
import type { Game } from '../game/game';
import { drawCreature } from '../gfx/creatures';
import { C, outlined, panel, pouchIcon, roundRect, text, typeBadge, wrap } from './draw';
import { backdrop, blitCreature, blitSilhouette, drawClose, header, ListView, MenuScene, rowHighlight, wantsClose, type Rect } from './list';

export function openDex(g: Game): Promise<void> {
  return new Dex(g).open();
}

function seen(g: Game, s: Species): boolean {
  return g.save.seen.includes(s.id);
}

function caught(g: Game, s: Species): boolean {
  return g.save.caught.includes(s.id);
}

class Dex extends MenuScene {
  opaque = true;
  private list = new ListView(() => DEX_ORDER.length);

  private layout() {
    const W = this.g.view.width;
    const H = this.g.view.height;
    const top = 74;
    const leftW = Math.min(440, W * 0.42);
    const left: Rect = { x: 16, y: top, w: leftW, h: H - top - 16 };
    const right: Rect = { x: leftW + 32, y: top, w: W - leftW - 48, h: H - top - 16 };
    const listR: Rect = { x: right.x + 14, y: right.y + 30, w: right.w - 28, h: right.h - 54 };
    return { left, right, listR };
  }

  step(): void {
    if (wantsClose(this.g)) return this.done();
    const L = this.layout();
    const input = this.g.input;
    const rows = this.list.rowsFor(L.listR, 54);
    if (input.repeat.right) {
      this.list.sel = Math.min(DEX_ORDER.length - 1, this.list.sel + rows);
      audio.sfx('cursor');
    }
    if (input.repeat.left) {
      this.list.sel = Math.max(0, this.list.sel - rows);
      audio.sfx('cursor');
    }
    if (this.list.update(this.g, L.listR, 54) === 'activate') {
      const s = DEX_ORDER[this.list.sel];
      if (seen(this.g, s)) {
        audio.sfx('select');
        void this.sub(() => new DexPage(this.g, this.list.sel).open()).then((i) => {
          if (typeof i === 'number') this.list.sel = i;
        });
      } else audio.sfx('error');
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const g = this.g;
    backdrop(ctx, g, this.t, '#c84848', '#d45454');
    header(ctx, g, 'POCKLOPEDIA', 'rgba(60,20,24,0.75)');
    drawClose(ctx, g);
    const W = g.view.width;
    text(ctx, `Seen ${g.save.seen.length}`, W - 300, 38, { size: 22, color: '#ffffff', shadow: 'rgba(0,0,0,0.4)', align: 'right' });
    text(ctx, `Caught ${g.save.caught.length}`, W - 90, 38, { size: 22, color: '#ffffff', shadow: 'rgba(0,0,0,0.4)', align: 'right' });
    const L = this.layout();
    const s = DEX_ORDER[this.list.sel];

    // Left: a preview of the selection on a glassy screen.
    const l = L.left;
    panel(ctx, l.x, l.y, l.w, l.h, { r: 18, rim: '#5a2a2a', rimLight: '#e08888', fill: '#d8eef4' });
    ctx.save();
    roundRect(ctx, l.x + 6, l.y + 6, l.w - 12, l.h - 12, 14);
    ctx.clip();
    ctx.strokeStyle = 'rgba(80,140,170,0.15)';
    ctx.lineWidth = 2;
    for (let x = l.x; x < l.x + l.w; x += 24) {
      ctx.beginPath();
      ctx.moveTo(x, l.y);
      ctx.lineTo(x, l.y + l.h);
      ctx.stroke();
    }
    for (let y = l.y; y < l.y + l.h; y += 24) {
      ctx.beginPath();
      ctx.moveTo(l.x, y);
      ctx.lineTo(l.x + l.w, y);
      ctx.stroke();
    }
    ctx.restore();
    const size = Math.min(l.w - 80, l.h - 170, 300);
    const floor = l.y + 40 + size;
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath();
    ctx.ellipse(l.x + l.w / 2, floor - 6, size * 0.36, size * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    if (seen(g, s)) drawCreature(ctx, s.id, l.x + l.w / 2, floor, size, { t: this.t });
    else outlined(ctx, '?', l.x + l.w / 2, floor - size * 0.3, { size: size * 0.45, align: 'center', color: '#a8c0cc', stroke: '#6a8a98' });
    text(ctx, `No.${String(s.num).padStart(3, '0')}  ${seen(g, s) ? s.name : '-----'}`, l.x + l.w / 2, floor + 44, { size: 28, align: 'center', bold: true });
    if (seen(g, s)) {
      let x = l.x + l.w / 2 - (s.types.length * 96 - 10) / 2;
      for (const t of s.types) {
        typeBadge(ctx, t, x, floor + 62, 86, 26);
        x += 96;
      }
    }

    // Right: the list.
    const r = L.right;
    panel(ctx, r.x, r.y, r.w, r.h, { r: 16, fill: '#fbfbf6' });
    this.list.draw(ctx, L.listR, 54, this.t, (i, x, y, w, h, sel) => {
      const e = DEX_ORDER[i];
      if (sel) rowHighlight(ctx, x, y, w - 40, h);
      text(ctx, String(e.num).padStart(3, '0'), x + 18, y + h / 2 + 8, { size: 22, color: '#7a7a88' });
      const known = seen(g, e);
      if (known) blitCreature(g, ctx, e.id, x + 98, y + h - 2, h - 4);
      else blitSilhouette(g, ctx, e.id, x + 98, y + h - 2, h - 4, '#c8c8d0');
      text(ctx, known ? e.name : '-----', x + 134, y + h / 2 + 9, { size: 25 });
      if (caught(g, e)) pouchIcon(ctx, x + w - 64, y + h / 2 + 2, 12);
    });
  }
}

class DexPage extends MenuScene<number> {
  opaque = true;

  constructor(
    g: Game,
    private index: number,
  ) {
    super(g);
  }

  step(): void {
    const input = this.g.input;
    if (wantsClose(this.g) || input.pressed.a) return this.done(this.index);
    const move = (d: number) => {
      let i = this.index;
      for (let k = 0; k < DEX_ORDER.length; k++) {
        i = (i + d + DEX_ORDER.length) % DEX_ORDER.length;
        if (seen(this.g, DEX_ORDER[i])) break;
      }
      if (i !== this.index) {
        this.index = i;
        audio.sfx('cursor');
      }
    };
    if (input.repeat.up || input.repeat.left) move(-1);
    if (input.repeat.down || input.repeat.right) move(1);
    const W = this.g.view.width;
    const H = this.g.view.height;
    if (input.tapped(0, 70, W * 0.15, H - 70)) move(-1);
    if (input.tapped(W * 0.85, 70, W * 0.15, H - 70)) move(1);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const g = this.g;
    const s = DEX_ORDER[this.index];
    const have = caught(g, s);
    const [light, dark] = TYPE_COLORS[s.types[0]];
    backdrop(ctx, g, this.t, dark, light);
    header(ctx, g, 'POCKLOPEDIA', 'rgba(60,20,24,0.75)');
    drawClose(ctx, g);
    const W = g.view.width;
    const H = g.view.height;
    const pw = Math.min(W - 40, 1100);
    const ph = Math.min(H - 100, 620);
    const px = (W - pw) / 2;
    const py = 74 + (H - 90 - ph) / 2;
    panel(ctx, px, py, pw, ph, { r: 18, fill: '#fbfbf6' });
    const size = Math.min(pw * 0.38, ph - 120, 360);
    const cx = px + 40 + size / 2;
    const floor = py + 40 + size;
    const grad = ctx.createRadialGradient(cx, floor - size / 2, 10, cx, floor - size / 2, size * 0.7);
    grad.addColorStop(0, light);
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(px + 10, py + 10, size + 60, size + 50);
    drawCreature(ctx, s.id, cx, floor, size, { t: this.t });

    const tx = px + size + 90;
    const tw = pw - size - 120;
    text(ctx, `No.${String(s.num).padStart(3, '0')}`, tx, py + 56, { size: 24, color: '#7a7a88' });
    text(ctx, s.name, tx + 100, py + 56, { size: 34, bold: true });
    text(ctx, have ? `The ${s.category} Pocklet` : 'The ????? Pocklet', tx, py + 98, { size: 23 });
    let bx = tx;
    for (const t of s.types) {
      typeBadge(ctx, t, bx, py + 116, 96, 30);
      bx += 106;
    }
    text(ctx, `HT  ${have ? `${s.height.toFixed(1)} m` : '??? m'}`, tx, py + 190, { size: 23 });
    text(ctx, `WT  ${have ? `${s.weight.toFixed(1)} kg` : '??? kg'}`, tx + Math.min(240, tw / 2), py + 190, { size: 23 });
    if (have) pouchIcon(ctx, px + pw - 50, py + 46, 18);
    // The entry text sits in the right column, under the measurements.
    const dy = py + 214;
    ctx.fillStyle = 'rgba(0,0,0,0.05)';
    roundRect(ctx, tx - 16, dy, tw + 16, py + ph - dy - 24, 12);
    ctx.fill();
    const body = have ? s.dex : 'Catch this Pocklet to learn more about it.';
    wrap(ctx, body, tw - 30, 24).forEach((line, i) => {
      const y = dy + 42 + i * 34;
      if (y < py + ph - 34) text(ctx, line, tx + 4, y, { size: 24, color: have ? C.ink : '#8a8a98' });
    });
  }
}
