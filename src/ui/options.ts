/** Options: text speed, volumes, render resolution, battle animations. */
import { audio } from '../audio/audio';
import { RESOLUTIONS } from '../core/view';
import type { Game } from '../game/game';
import { loadOptions, writeOptions, type Options, type SaveData } from '../game/state';
import { button, panel, roundRect, text } from './draw';
import { backdrop, btnState, drawClose, header, MenuScene, rowHighlight, tappedRect, wantsClose, type Rect } from './list';

/**
 * Edits `options` (default: the save's options, or the stored ones on the title
 * screen) in place, applies them live, and stores them on close.
 */
export function openOptions(g: Game, options?: Options): Promise<void> {
  const save = g.save as SaveData | undefined;
  const o = options ?? save?.options ?? loadOptions();
  return new OptionsScreen(g, o).open();
}

/** Applies volume and resolution settings (also call this at boot). */
export function applyOptions(g: Game, o: Options): void {
  audio.setVolumes(o.music, o.sfx);
  if (g.view.resolution !== o.resolution) g.view.setResolution(o.resolution);
}

interface Row {
  label: string;
  value: () => string;
  change: (d: number) => void;
  /** Fraction for a slider, or null for a value picker. */
  slider?: () => number;
}

class OptionsScreen extends MenuScene {
  opaque = true;
  private sel = 0;
  private rows: Row[];

  constructor(
    g: Game,
    private o: Options,
  ) {
    super(g);
    const speeds = ['Slow', 'Mid', 'Fast'];
    const vol = (k: 'music' | 'sfx') => ({
      value: () => String(Math.round(o[k] * 10)),
      slider: () => o[k],
      change: (d: number) => {
        o[k] = Math.max(0, Math.min(10, Math.round(o[k] * 10) + d)) / 10;
        audio.setVolumes(o.music, o.sfx);
        if (k === 'sfx') audio.sfx('cursor');
      },
    });
    this.rows = [
      { label: 'Text Speed', value: () => speeds[o.textSpeed], change: (d) => (o.textSpeed = ((o.textSpeed + d + 3) % 3) as 0 | 1 | 2) },
      { label: 'Music', ...vol('music') },
      { label: 'Sound', ...vol('sfx') },
      {
        label: 'Resolution',
        value: () => RESOLUTIONS[o.resolution].label,
        change: (d) => {
          o.resolution = (o.resolution + d + RESOLUTIONS.length) % RESOLUTIONS.length;
          g.view.setResolution(o.resolution);
        },
      },
      { label: 'Battle Scene', value: () => (o.animations ? 'On' : 'Off'), change: () => (o.animations = !o.animations) },
    ];
  }

  private layout() {
    const W = this.g.view.width;
    const H = this.g.view.height;
    const pw = Math.min(W - 40, 860);
    const rowH = Math.min(76, (H - 70 - 16 - 150) / this.rows.length);
    const ph = this.rows.length * rowH + 150;
    const px = (W - pw) / 2;
    const py = Math.max(70, Math.min(H - ph - 16, (H - ph) / 2 + 20));
    const rows: Rect[] = this.rows.map((_, i) => ({ x: px + 20, y: py + 24 + i * rowH, w: pw - 40, h: rowH }));
    const close: Rect = { x: px + pw / 2 - 100, y: py + ph - 92, w: 200, h: 64 };
    return { panel: { x: px, y: py, w: pw, h: ph }, rows, close };
  }

  private arrows(r: Rect): { left: Rect; right: Rect } {
    const vx = r.x + r.w * 0.45;
    return { left: { x: vx, y: r.y + 10, w: 56, h: r.h - 20 }, right: { x: r.x + r.w - 64, y: r.y + 10, w: 56, h: r.h - 20 } };
  }

  private close(): void {
    writeOptions(this.o);
    this.done();
  }

  step(): void {
    const input = this.g.input;
    const L = this.layout();
    if (wantsClose(this.g)) return this.close();
    const n = this.rows.length + 1;
    if (input.repeat.up) {
      this.sel = (this.sel + n - 1) % n;
      audio.sfx('cursor');
    }
    if (input.repeat.down) {
      this.sel = (this.sel + 1) % n;
      audio.sfx('cursor');
    }
    const row = this.rows[this.sel];
    if (row && (input.repeat.left || input.repeat.right)) {
      row.change(input.repeat.left ? -1 : 1);
      audio.sfx('cursor');
    }
    L.rows.forEach((r, i) => {
      const a = this.arrows(r);
      if (tappedRect(this.g, a.left)) {
        this.sel = i;
        this.rows[i].change(-1);
        audio.sfx('cursor');
      } else if (tappedRect(this.g, a.right)) {
        this.sel = i;
        this.rows[i].change(1);
        audio.sfx('cursor');
      } else if (tappedRect(this.g, r)) this.sel = i;
    });
    if (tappedRect(this.g, L.close) || (input.pressed.a && this.sel === this.rows.length)) {
      audio.sfx('select');
      this.close();
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const g = this.g;
    backdrop(ctx, g, this.t, '#6a6a88', '#76769a');
    header(ctx, g, 'OPTIONS', 'rgba(30,30,44,0.8)');
    drawClose(ctx, g);
    const L = this.layout();
    const p = L.panel;
    panel(ctx, p.x, p.y, p.w, p.h, { r: 18, fill: '#fbfbf6' });
    this.rows.forEach((row, i) => {
      const r = L.rows[i];
      if (i === this.sel) rowHighlight(ctx, r.x, r.y, r.w, r.h);
      text(ctx, row.label, r.x + 24, r.y + r.h / 2 + 9, { size: 26 });
      const a = this.arrows(r);
      for (const [rect, dir] of [[a.left, -1], [a.right, 1]] as [Rect, number][]) {
        const pressed = g.input.touching(rect.x, rect.y, rect.w, rect.h);
        ctx.fillStyle = pressed ? '#c86030' : '#e07a40';
        roundRect(ctx, rect.x + 8, rect.y + 6, rect.w - 16, rect.h - 12, 8);
        ctx.fill();
        const cx = rect.x + rect.w / 2;
        const cy = rect.y + rect.h / 2;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(cx + dir * 8, cy);
        ctx.lineTo(cx - dir * 6, cy - 10);
        ctx.lineTo(cx - dir * 6, cy + 10);
        ctx.closePath();
        ctx.fill();
      }
      const vx0 = a.left.x + a.left.w + 10;
      const vx1 = a.right.x - 10;
      if (row.slider) {
        const f = row.slider();
        const by = r.y + r.h / 2 - 6;
        ctx.fillStyle = '#d8d8e0';
        roundRect(ctx, vx0, by, vx1 - vx0 - 54, 12, 6);
        ctx.fill();
        ctx.fillStyle = '#58a8e0';
        roundRect(ctx, vx0, by, Math.max(12, (vx1 - vx0 - 54) * f), 12, 6);
        ctx.fill();
        text(ctx, row.value(), vx1, r.y + r.h / 2 + 9, { size: 24, align: 'right', bold: true });
      } else {
        text(ctx, row.value(), (vx0 + vx1) / 2, r.y + r.h / 2 + 9, { size: 26, align: 'center', bold: true });
      }
    });
    text(ctx, resolutionNote(this.o), p.x + p.w / 2, L.rows[L.rows.length - 1].y + rowH(L) + 26, { size: 18, align: 'center', color: '#8a8a98' });
    button(ctx, L.close.x, L.close.y, L.close.w, L.close.h, 'Done', {
      state: btnState(g, L.close, this.sel === this.rows.length),
      color: '#58b868',
      dark: '#2f7a3c',
      size: 24,
    });
  }
}

function rowH(L: { rows: Rect[] }): number {
  return L.rows[0].h;
}

function resolutionNote(o: Options): string {
  return o.resolution === 0 ? 'Native renders at your display\'s full resolution (capped at 8K).' : `Renders at ${RESOLUTIONS[o.resolution].label} and scales to fit.`;
}
