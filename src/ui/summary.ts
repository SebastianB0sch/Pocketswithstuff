/** A creature's summary: Info, Skills and Moves pages. */
import { audio } from '../audio/audio';
import { move as moveData } from '../data/moves';
import { expForLevel, species } from '../data/species';
import { TYPE_COLORS } from '../data/types';
import { calcStats, displayName, maxHp, type Creature } from '../game/creature';
import type { Game } from '../game/game';
import { drawCreature } from '../gfx/creatures';
import { C, bar, hpBar, outlined, panel, roundRect, statusBadge, text, typeBadge, wrap } from './draw';
import { backdrop, btnState, chevron, drawClose, MenuScene, rowHighlight, tappedRect, wantsClose, type Rect } from './list';

const PAGES = ['INFO', 'SKILLS', 'MOVES'] as const;

export function openSummary(g: Game, party: Creature[], index: number): Promise<void> {
  return new Summary(g, party, index).open();
}

class Summary extends MenuScene {
  opaque = true;
  private page = 0;
  private moveSel = 0;
  private born = 0;

  constructor(
    g: Game,
    private party: Creature[],
    private index: number,
  ) {
    super(g);
  }

  private get c(): Creature {
    return this.party[this.index];
  }

  private layout() {
    const W = this.g.view.width;
    const H = this.g.view.height;
    const avail = H - 70 - 16;
    const contentH = Math.min(avail, 680);
    const top = 70 + (avail - contentH) / 2;
    const leftW = Math.min(380, W * 0.36);
    const left: Rect = { x: 16, y: top, w: leftW, h: contentH };
    const right: Rect = { x: 32 + leftW, y: top + 56, w: W - leftW - 48, h: contentH - 56 };
    const tabs: Rect[] = PAGES.map((_, i) => ({ x: right.x + i * 158, y: top - 2, w: 150, h: 52 }));
    const size = this.spriteSize(left);
    const midY = left.y + 60 + size / 2;
    const prev: Rect = { x: left.x + 8, y: midY - 30, w: 44, h: 60 };
    const next: Rect = { x: left.x + left.w - 52, y: midY - 30, w: 44, h: 60 };
    return { left, right, tabs, prev, next };
  }

  private spriteSize(l: Rect): number {
    return Math.min(l.w - 70, l.h * 0.55, 300);
  }

  private switchCreature(d: number): void {
    const n = this.party.length;
    if (n < 2) return;
    this.index = (this.index + d + n) % n;
    this.moveSel = Math.min(this.moveSel, this.c.moves.length - 1);
    this.born = this.t;
    audio.sfx('cursor');
  }

  step(): void {
    const input = this.g.input;
    const L = this.layout();
    if (wantsClose(this.g)) return this.done();
    if (input.repeat.right) {
      this.page = (this.page + 1) % PAGES.length;
      audio.sfx('cursor');
    }
    if (input.repeat.left) {
      this.page = (this.page + PAGES.length - 1) % PAGES.length;
      audio.sfx('cursor');
    }
    L.tabs.forEach((r, i) => {
      if (tappedRect(this.g, r)) {
        this.page = i;
        audio.sfx('cursor');
      }
    });
    if (tappedRect(this.g, L.prev)) this.switchCreature(-1);
    if (tappedRect(this.g, L.next)) this.switchCreature(1);
    if (this.page === 2) {
      const n = this.c.moves.length;
      if (input.repeat.up && n) {
        this.moveSel = (this.moveSel + n - 1) % n;
        audio.sfx('cursor');
      }
      if (input.repeat.down && n) {
        this.moveSel = (this.moveSel + 1) % n;
        audio.sfx('cursor');
      }
      this.moveRows(L.right).forEach((r, i) => {
        if (tappedRect(this.g, r)) {
          this.moveSel = i;
          audio.sfx('cursor');
        }
      });
    } else {
      if (input.repeat.up) this.switchCreature(-1);
      if (input.repeat.down) this.switchCreature(1);
    }
    if (input.pressed.a && this.page !== 2) {
      this.page = (this.page + 1) % PAGES.length;
      audio.sfx('cursor');
    }
  }

  private moveRows(r: Rect): Rect[] {
    const rowH = Math.min(78, (r.h * 0.6) / 4);
    return this.c.moves.map((_, i) => ({ x: r.x, y: r.y + 10 + i * rowH, w: r.w, h: rowH }));
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const g = this.g;
    const c = this.c;
    const sp = species(c.species);
    const [light, dark] = TYPE_COLORS[sp.types[0]];
    backdrop(ctx, g, this.t, dark, light);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(0, 0, g.view.width, g.view.height);
    const L = this.layout();

    // Header.
    ctx.fillStyle = 'rgba(30,30,40,0.75)';
    ctx.fillRect(0, 0, g.view.width, 58);
    outlined(ctx, 'POCKLET SUMMARY', 24, 40, { size: 26, stroke: 'rgba(0,0,0,0.5)' });
    drawClose(ctx, g);

    // Left: the creature.
    const l = L.left;
    panel(ctx, l.x, l.y, l.w, l.h, { r: 16, fill: '#fbfbf6' });
    text(ctx, displayName(c), l.x + 26, l.y + 46, { size: 28, bold: true });
    text(ctx, `Lv${c.level}`, l.x + l.w - 24, l.y + 46, { size: 24, align: 'right' });
    const size = this.spriteSize(l);
    const floorY = l.y + 60 + size;
    const grad = ctx.createRadialGradient(l.x + l.w / 2, floorY - size * 0.45, 10, l.x + l.w / 2, floorY - size * 0.45, size * 0.7);
    grad.addColorStop(0, light);
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(l.x + 8, l.y + 56, l.w - 16, size + 10);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath();
    ctx.ellipse(l.x + l.w / 2, floorY - 6, size * 0.38, size * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    const pop = Math.min(1, (this.t - this.born) / 0.18);
    ctx.save();
    ctx.translate(l.x + l.w / 2, floorY);
    ctx.scale(pop, pop);
    drawCreature(ctx, c.species, 0, 0, size, { shiny: c.shiny, t: this.t });
    ctx.restore();
    if (c.shiny) outlined(ctx, '★', l.x + 30, l.y + 90, { size: 26, color: '#f8d048' });
    if (this.party.length > 1) {
      for (const [r, up] of [[L.prev, true], [L.next, false]] as [Rect, boolean][]) {
        ctx.save();
        ctx.translate(r.x + r.w / 2, r.y + r.h / 2);
        ctx.rotate(up ? -Math.PI / 2 : Math.PI / 2);
        chevron(ctx, 0, 0, true, this.t, btnState(g, r) ? '#c03030' : C.accent);
        ctx.restore();
      }
    }
    let y = floorY + 30;
    let bx = l.x + 26;
    for (const t of sp.types) {
      typeBadge(ctx, t, bx, y - 18, 86, 26);
      bx += 96;
    }
    if (c.hp <= 0) statusBadge(ctx, 'fnt', l.x + l.w - 74, y - 16, 22);
    else if (c.status) statusBadge(ctx, c.status, l.x + l.w - 74, y - 16, 22);
    y += 30;
    if (y + 30 < l.y + l.h) {
      hpBar(ctx, l.x + 26, y, l.w - 90, c.hp / maxHp(c), 12);
      text(ctx, `${c.hp}/${maxHp(c)}`, l.x + l.w - 26, y + 40, { size: 20, align: 'right' });
    }

    // Tabs.
    L.tabs.forEach((r, i) => {
      const on = i === this.page;
      ctx.fillStyle = on ? '#fbfbf6' : 'rgba(255,255,255,0.45)';
      roundRect(ctx, r.x, r.y, r.w, r.h + 12, 12);
      ctx.fill();
      text(ctx, PAGES[i], r.x + r.w / 2, r.y + 35, { size: 22, align: 'center', bold: on, color: on ? C.ink : '#4a4a58' });
    });

    const r = L.right;
    panel(ctx, r.x, r.y, r.w, r.h, { r: 14, fill: '#fbfbf6', shadow: false });
    if (this.page === 0) this.drawInfo(ctx, r);
    else if (this.page === 1) this.drawSkills(ctx, r);
    else this.drawMoves(ctx, r);
  }

  private kv(ctx: CanvasRenderingContext2D, r: Rect, row: number, k: string, v: string): void {
    const rowH = Math.min(52, (r.h - 50) / 9);
    const y = r.y + 28 + row * rowH;
    ctx.fillStyle = row % 2 ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0)';
    ctx.fillRect(r.x + 14, y - 6, r.w - 28, rowH);
    text(ctx, k, r.x + 30, y + rowH * 0.55, { size: 22, color: '#6a6a78' });
    text(ctx, v, r.x + r.w * 0.42, y + rowH * 0.55, { size: 22, bold: true, maxWidth: r.w * 0.55 });
  }

  private drawInfo(ctx: CanvasRenderingContext2D, r: Rect): void {
    const c = this.c;
    const sp = species(c.species);
    const s = this.g.save;
    this.kv(ctx, r, 0, 'Dex No.', String(sp.num).padStart(3, '0'));
    this.kv(ctx, r, 1, 'Species', sp.name);
    this.kv(ctx, r, 2, 'Category', `${sp.category} Pocklet`);
    this.kv(ctx, r, 3, 'OT', s?.name ?? '-');
    this.kv(ctx, r, 4, 'ID No.', String(s?.trainerId ?? 0).padStart(5, '0'));
    this.kv(ctx, r, 5, 'Met', `${c.met ?? 'Unknown'}${c.metLevel ? ` (Lv${c.metLevel})` : ''}`);
    const now = expForLevel(sp.growth, c.level);
    const next = expForLevel(sp.growth, c.level + 1);
    const toNext = c.level >= 100 ? 0 : Math.max(0, next - c.exp);
    this.kv(ctx, r, 6, 'Exp. Points', String(c.exp));
    this.kv(ctx, r, 7, 'To Next Lv', String(toNext));
    const rowH = Math.min(52, (r.h - 50) / 9);
    const by = r.y + 28 + 8 * rowH + 4;
    if (by + 14 < r.y + r.h) {
      text(ctx, 'EXP', r.x + 30, by + 13, { size: 16, color: C.exp, bold: true, shadow: null });
      bar(ctx, r.x + 80, by, r.w - 120, 12, c.level >= 100 ? 1 : (c.exp - now) / Math.max(1, next - now), C.exp);
    }
  }

  private drawSkills(ctx: CanvasRenderingContext2D, r: Rect): void {
    const c = this.c;
    const st = calcStats(c);
    const rows: [string, string, number][] = [
      ['HP', `${c.hp}/${st.hp}`, st.hp],
      ['Attack', String(st.atk), st.atk],
      ['Defense', String(st.def), st.def],
      ['Sp. Atk', String(st.spa), st.spa],
      ['Sp. Def', String(st.spd), st.spd],
      ['Speed', String(st.spe), st.spe],
    ];
    const rowH = Math.min(62, (r.h - 60) / 6);
    const max = Math.max(...rows.map((x) => x[2]));
    rows.forEach(([k, v, n], i) => {
      const y = r.y + 30 + i * rowH;
      ctx.fillStyle = i % 2 ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0)';
      ctx.fillRect(r.x + 14, y - 6, r.w - 28, rowH);
      text(ctx, k, r.x + 30, y + rowH * 0.5, { size: 23, color: '#5a5a68' });
      text(ctx, v, r.x + r.w * 0.5, y + rowH * 0.5, { size: 23, bold: true, align: 'right' });
      if (i === 0) hpBar(ctx, r.x + r.w * 0.55, y + rowH * 0.5 - 14, r.w * 0.4 - 40, c.hp / st.hp, 12);
      else bar(ctx, r.x + r.w * 0.55, y + rowH * 0.5 - 14, r.w * 0.4, 12, n / Math.max(max, 1), '#f0a040', '#d8d8e0');
    });
  }

  private drawMoves(ctx: CanvasRenderingContext2D, r: Rect): void {
    const c = this.c;
    const rows = this.moveRows(r);
    rows.forEach((row, i) => {
      const m = moveData(c.moves[i].id);
      if (i === this.moveSel) rowHighlight(ctx, row.x + 10, row.y, row.w - 20, row.h);
      typeBadge(ctx, m.type, row.x + 26, row.y + row.h / 2 - 14, 90, 28);
      text(ctx, m.name, row.x + 132, row.y + row.h / 2 + 9, { size: 25, bold: true });
      const pp = c.moves[i].pp;
      text(ctx, `PP ${pp}/${m.pp}`, row.x + row.w - 30, row.y + row.h / 2 + 9, { size: 22, align: 'right', color: pp === 0 ? '#d04040' : C.ink });
    });
    const m = c.moves[this.moveSel] && moveData(c.moves[this.moveSel].id);
    if (!m) return;
    const y0 = rows.length ? rows[rows.length - 1].y + rows[rows.length - 1].h + 14 : r.y + 20;
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    roundRect(ctx, r.x + 14, y0, r.w - 28, r.y + r.h - y0 - 14, 10);
    ctx.fill();
    const cat = { physical: ['PHYSICAL', '#e06838'], special: ['SPECIAL', '#5878d8'], status: ['STATUS', '#9898a8'] }[m.category];
    ctx.fillStyle = cat[1];
    roundRect(ctx, r.x + 30, y0 + 14, 120, 26, 6);
    ctx.fill();
    outlined(ctx, cat[0], r.x + 90, y0 + 33, { size: 16, align: 'center', stroke: 'rgba(0,0,0,0.4)' });
    text(ctx, `Power ${m.power > 1 ? m.power : '—'}`, r.x + 172, y0 + 35, { size: 21 });
    text(ctx, `Accuracy ${m.accuracy ? m.accuracy : '—'}`, r.x + 330, y0 + 35, { size: 21 });
    wrap(ctx, m.desc, r.w - 70, 21).forEach((line, i) => {
      if (y0 + 72 + i * 28 < r.y + r.h - 16) text(ctx, line, r.x + 30, y0 + 72 + i * 28, { size: 21 });
    });
  }
}
