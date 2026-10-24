/**
 * Shared pieces for the menu screens: a scrolling list that works with both
 * buttons and taps, screen chrome (backdrop, header, close button), a quantity
 * picker and a creature-sprite blitter that stays pixel-exact at any resolution.
 */
import { audio } from '../audio/audio';
import type { Game, Scene } from '../game/game';
import { creatureSprite } from '../gfx/creatures';
import { C, button, outlined, panel, roundRect, stripes, text } from './draw';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Draws a cached creature raster with its bottom-centre at (cx, bottom). */
export function blitCreature(
  g: Game,
  ctx: CanvasRenderingContext2D,
  id: string,
  cx: number,
  bottom: number,
  size: number,
  opts: { back?: boolean; shiny?: boolean } = {},
): void {
  const img = creatureSprite(id, size * g.view.scale, opts);
  ctx.drawImage(img, cx - size / 2, bottom - size, size, size);
}

/** Black silhouette of a creature (for unseen dex entries and the like). */
const silhouettes = new Map<string, HTMLCanvasElement>();
export function blitSilhouette(g: Game, ctx: CanvasRenderingContext2D, id: string, cx: number, bottom: number, size: number, color = '#2a2a34'): void {
  const src = creatureSprite(id, size * g.view.scale);
  const key = `${id}|${src.width}|${color}`;
  let c = silhouettes.get(key);
  if (!c) {
    c = document.createElement('canvas');
    c.width = src.width;
    c.height = src.height;
    const x = c.getContext('2d')!;
    x.drawImage(src, 0, 0);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = color;
    x.fillRect(0, 0, c.width, c.height);
    silhouettes.set(key, c);
  }
  ctx.drawImage(c, cx - size / 2, bottom - size, size, size);
}

export function inRect(x: number, y: number, r: Rect): boolean {
  return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
}

export function tappedRect(g: Game, r: Rect): boolean {
  return g.input.tapped(r.x, r.y, r.w, r.h);
}

/** Visual state for a button: 2 while pressed under the finger, 1 when selected. */
export function btnState(g: Game, r: Rect, selected = false): number {
  return g.input.touching(r.x, r.y, r.w, r.h) ? 2 : selected ? 1 : 0;
}

/** Striped full-screen backdrop. */
export function backdrop(ctx: CanvasRenderingContext2D, g: Game, t: number, a = '#5a8ad0', b = '#6a98da'): void {
  stripes(ctx, g.view.width, g.view.height, a, b, t);
}

/** Title bar along the top of a full-screen menu. */
export function header(ctx: CanvasRenderingContext2D, g: Game, title: string, color = '#3f5f9a'): void {
  const w = g.view.width;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, 58);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(0, 0, w, 6);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(0, 58, w, 4);
  outlined(ctx, title, 24, 40, { size: 28, stroke: 'rgba(0,0,0,0.45)' });
}

/** The round ✕ button in the top-right corner. */
export function closeRect(g: Game): Rect {
  return { x: g.view.width - 62, y: 6, w: 50, h: 46 };
}

export function drawClose(ctx: CanvasRenderingContext2D, g: Game): void {
  const r = closeRect(g);
  const pressed = g.input.touching(r.x, r.y, r.w, r.h);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.arc(r.x + r.w / 2 + 2, r.y + r.h / 2 + 3, 21, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = pressed ? '#c03838' : '#e04848';
  ctx.beginPath();
  ctx.arc(r.x + r.w / 2, r.y + r.h / 2 + (pressed ? 2 : 0), 21, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.lineCap = 'round';
  ctx.lineWidth = 5;
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2 + (pressed ? 2 : 0);
  ctx.beginPath();
  ctx.moveTo(cx - 8, cy - 8);
  ctx.lineTo(cx + 8, cy + 8);
  ctx.moveTo(cx + 8, cy - 8);
  ctx.lineTo(cx - 8, cy + 8);
  ctx.stroke();
}

/** B pressed or the ✕ tapped. */
export function wantsClose(g: Game): boolean {
  if (g.input.pressed.b || tappedRect(g, closeRect(g))) {
    audio.sfx('back');
    return true;
  }
  return false;
}

/** Small up/down scroll chevrons. */
export function chevron(ctx: CanvasRenderingContext2D, x: number, y: number, up: boolean, t: number, color = C.accent): void {
  const d = Math.sin(t * 5) * 2 * (up ? -1 : 1);
  ctx.fillStyle = color;
  ctx.beginPath();
  if (up) {
    ctx.moveTo(x - 9, y + 5 + d);
    ctx.lineTo(x + 9, y + 5 + d);
    ctx.lineTo(x, y - 6 + d);
  } else {
    ctx.moveTo(x - 9, y - 5 + d);
    ctx.lineTo(x + 9, y - 5 + d);
    ctx.lineTo(x, y + 6 + d);
  }
  ctx.closePath();
  ctx.fill();
}

/**
 * A vertical list: arrows move (with key repeat and wrap-around), taps select and
 * activate, and it scrolls to keep the selection visible.
 */
export class ListView {
  sel = 0;
  top = 0;

  constructor(public count: () => number) {}

  rowsFor(r: Rect, rowH: number): number {
    return Math.max(1, Math.floor(r.h / rowH));
  }

  clamp(rows: number): void {
    const n = this.count();
    if (n === 0) {
      this.sel = 0;
      this.top = 0;
      return;
    }
    this.sel = Math.max(0, Math.min(n - 1, this.sel));
    if (this.sel < this.top) this.top = this.sel;
    if (this.sel >= this.top + rows) this.top = this.sel - rows + 1;
    this.top = Math.max(0, Math.min(Math.max(0, n - rows), this.top));
  }

  /** Returns 'activate' when A is pressed or a row is tapped. */
  update(g: Game, r: Rect, rowH: number): 'activate' | null {
    const n = this.count();
    const rows = this.rowsFor(r, rowH);
    const input = g.input;
    if (n > 0) {
      if (input.repeat.up) {
        this.sel = (this.sel + n - 1) % n;
        audio.sfx('cursor');
      }
      if (input.repeat.down) {
        this.sel = (this.sel + 1) % n;
        audio.sfx('cursor');
      }
      // Scroll arrows.
      if (this.top > 0 && input.tapped(r.x + r.w - 44, r.y - 26, 44, 30)) {
        this.sel = Math.max(0, this.top - 1);
        this.top = this.sel;
        audio.sfx('cursor');
      }
      if (this.top + rows < n && input.tapped(r.x + r.w - 44, r.y + rows * rowH - 4, 44, 30)) {
        this.top = Math.min(n - rows, this.top + 1);
        this.sel = Math.max(this.sel, this.top);
        audio.sfx('cursor');
      }
    }
    this.clamp(rows);
    for (let i = 0; i < rows && this.top + i < n; i++) {
      if (input.tapped(r.x, r.y + i * rowH, r.w - 44, rowH)) {
        this.sel = this.top + i;
        return 'activate';
      }
    }
    if (input.pressed.a && n > 0) return 'activate';
    return null;
  }

  draw(
    ctx: CanvasRenderingContext2D,
    r: Rect,
    rowH: number,
    t: number,
    row: (i: number, x: number, y: number, w: number, h: number, selected: boolean) => void,
  ): void {
    const n = this.count();
    const rows = this.rowsFor(r, rowH);
    this.clamp(rows);
    for (let i = 0; i < rows && this.top + i < n; i++) {
      row(this.top + i, r.x, r.y + i * rowH, r.w, rowH, this.top + i === this.sel);
    }
    if (this.top > 0) chevron(ctx, r.x + r.w - 22, r.y - 10, true, t);
    if (this.top + rows < n) chevron(ctx, r.x + r.w - 22, r.y + rows * rowH + 10, false, t);
  }
}

/** Highlight behind the selected list row. */
export function rowHighlight(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = 'rgba(255, 150, 70, 0.28)';
  roundRect(ctx, x, y + 2, w, h - 4, 8);
  ctx.fill();
  ctx.strokeStyle = C.select;
  ctx.lineWidth = 3;
  roundRect(ctx, x, y + 2, w, h - 4, 8);
  ctx.stroke();
}

/** Base class with the bits every menu scene shares. */
export abstract class MenuScene<R = void> implements Scene {
  opaque = false;
  showWorld = false;
  t = 0;
  protected busy = false;

  constructor(readonly g: Game) {}

  abstract step(dt: number): void;
  abstract draw(ctx: CanvasRenderingContext2D): void;

  update(dt: number): void {
    this.t += dt;
    if (!this.busy) this.step(dt);
  }

  done(result?: R): void {
    this.g.close(this, result);
  }

  /** Runs an async sub-flow while ignoring input here. */
  protected async sub<T>(fn: () => Promise<T>): Promise<T> {
    this.busy = true;
    try {
      return await fn();
    } finally {
      this.busy = false;
      this.g.input.consume();
    }
  }

  open(): Promise<R> {
    return this.g.run<R>(this);
  }
}

/**
 * Asks for a quantity from 1 to `max`. `label` renders the line under the number
 * (e.g. the total price). Resolves 0 when cancelled.
 */
export function askQuantity(g: Game, max: number, label?: (n: number) => string): Promise<number> {
  return new QuantityPicker(g, max, label).open();
}

class QuantityPicker extends MenuScene<number> {
  showWorld = true;
  private n = 1;

  constructor(
    g: Game,
    private max: number,
    private label?: (n: number) => string,
  ) {
    super(g);
  }

  private rect(): Rect {
    const w = 300;
    const h = this.label ? 190 : 160;
    return { x: 24, y: Math.max(70, this.g.view.height - h - 180), w, h };
  }

  private btns() {
    const r = this.rect();
    return {
      minus: { x: r.x + 18, y: r.y + 30, w: 56, h: 60 },
      plus: { x: r.x + r.w - 74, y: r.y + 30, w: 56, h: 60 },
      ok: { x: r.x + 18, y: r.y + r.h - 62, w: r.w / 2 - 24, h: 50 },
      cancel: { x: r.x + r.w / 2 + 6, y: r.y + r.h - 62, w: r.w / 2 - 24, h: 50 },
    };
  }

  step(): void {
    const input = this.g.input;
    const b = this.btns();
    const before = this.n;
    if (input.repeat.up || tappedRect(this.g, b.plus)) this.n = this.n >= this.max ? 1 : this.n + 1;
    if (input.repeat.down || tappedRect(this.g, b.minus)) this.n = this.n <= 1 ? this.max : this.n - 1;
    if (input.repeat.right) this.n = Math.min(this.max, this.n + 10);
    if (input.repeat.left) this.n = Math.max(1, this.n - 10);
    if (this.n !== before) audio.sfx('cursor');
    if (input.pressed.a || tappedRect(this.g, b.ok)) {
      audio.sfx('select');
      this.done(this.n);
    } else if (input.pressed.b || tappedRect(this.g, b.cancel)) {
      audio.sfx('back');
      this.done(0);
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const r = this.rect();
    const b = this.btns();
    panel(ctx, r.x, r.y, r.w, r.h);
    button(ctx, b.minus.x, b.minus.y, b.minus.w, b.minus.h, '−', { state: btnState(this.g, b.minus), size: 30, color: '#7a8aa8', dark: '#4a5a78' });
    button(ctx, b.plus.x, b.plus.y, b.plus.w, b.plus.h, '+', { state: btnState(this.g, b.plus), size: 30, color: '#7a8aa8', dark: '#4a5a78' });
    text(ctx, `×${String(this.n).padStart(2, '0')}`, r.x + r.w / 2, r.y + 74, { size: 38, align: 'center', bold: true });
    if (this.label) text(ctx, this.label(this.n), r.x + r.w / 2, r.y + 112, { size: 22, align: 'center' });
    button(ctx, b.ok.x, b.ok.y, b.ok.w, b.ok.h, 'OK', { state: btnState(this.g, b.ok), size: 22, color: '#58b868', dark: '#2f7a3c' });
    button(ctx, b.cancel.x, b.cancel.y, b.cancel.w, b.cancel.h, 'Cancel', { state: btnState(this.g, b.cancel), size: 22, color: '#e06050', dark: '#a03028' });
  }
}

/** "$1,234" */
export function money(n: number): string {
  return `$${n.toLocaleString('en-US')}`;
}
