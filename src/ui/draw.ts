/**
 * Vector UI primitives in the style of DS-era menus: rounded panels with a double
 * border, text with a drop shadow, chunky bars. Everything is in logical units and
 * drawn as paths, so it stays sharp at any resolution.
 */
import { TYPE_COLORS, type Type } from '../data/types';

export const FONT = 'Nunito, "Trebuchet MS", system-ui, sans-serif';

export const C = {
  ink: '#3a3a42',
  inkShadow: '#c8c8d0',
  white: '#ffffff',
  paper: '#f8f8f4',
  frame: '#4f5b73',
  frameLight: '#8fa0c0',
  accent: '#e05038',
  select: '#ff8a3a',
  dim: 'rgba(8, 10, 20, 0.55)',
  hpGreen: '#58d068',
  hpYellow: '#f0c838',
  hpRed: '#f05838',
  exp: '#48a8f0',
  gold: '#f8d048',
};

export function font(ctx: CanvasRenderingContext2D, size: number, bold = false): void {
  ctx.font = `${bold ? 800 : 600} ${size}px ${FONT}`;
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Classic text-box panel: dark outer rim, light inner rim, paper fill. */
export function panel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: { fill?: string; rim?: string; rimLight?: string; r?: number; shadow?: boolean } = {},
): void {
  const r = opts.r ?? 10;
  if (opts.shadow !== false) {
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    roundRect(ctx, x + 3, y + 4, w, h, r);
    ctx.fill();
  }
  ctx.fillStyle = opts.rim ?? C.frame;
  roundRect(ctx, x, y, w, h, r);
  ctx.fill();
  ctx.fillStyle = opts.rimLight ?? C.frameLight;
  roundRect(ctx, x + 3, y + 3, w - 6, h - 6, r - 2);
  ctx.fill();
  ctx.fillStyle = opts.fill ?? C.paper;
  roundRect(ctx, x + 6, y + 6, w - 12, h - 12, r - 4);
  ctx.fill();
}

/** Text with the one-unit drop shadow DS text is known for. */
export function text(
  ctx: CanvasRenderingContext2D,
  s: string,
  x: number,
  y: number,
  opts: { size?: number; color?: string; shadow?: string | null; align?: CanvasTextAlign; bold?: boolean; baseline?: CanvasTextBaseline; maxWidth?: number } = {},
): void {
  font(ctx, opts.size ?? 20, opts.bold);
  ctx.textAlign = opts.align ?? 'left';
  ctx.textBaseline = opts.baseline ?? 'alphabetic';
  const k = (opts.size ?? 20) / 14;
  const shadow = opts.shadow === undefined ? C.inkShadow : opts.shadow;
  if (shadow) {
    ctx.fillStyle = shadow;
    ctx.fillText(s, x + k, y + k, opts.maxWidth);
  }
  ctx.fillStyle = opts.color ?? C.ink;
  ctx.fillText(s, x, y, opts.maxWidth);
}

/** White text with a dark outline, for labels over busy backgrounds. */
export function outlined(
  ctx: CanvasRenderingContext2D,
  s: string,
  x: number,
  y: number,
  opts: { size?: number; color?: string; stroke?: string; align?: CanvasTextAlign; bold?: boolean } = {},
): void {
  const size = opts.size ?? 20;
  font(ctx, size, opts.bold ?? true);
  ctx.textAlign = opts.align ?? 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.lineWidth = size / 5;
  ctx.strokeStyle = opts.stroke ?? '#2a2a34';
  ctx.strokeText(s, x, y);
  ctx.fillStyle = opts.color ?? C.white;
  ctx.fillText(s, x, y);
}

export function measure(ctx: CanvasRenderingContext2D, s: string, size: number, bold = false): number {
  font(ctx, size, bold);
  return ctx.measureText(s).width;
}

/** Greedy word wrap to a pixel width. Honours explicit "\n". */
export function wrap(ctx: CanvasRenderingContext2D, s: string, width: number, size: number): string[] {
  font(ctx, size);
  const lines: string[] = [];
  for (const para of s.split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width > width && line) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    lines.push(line);
  }
  return lines;
}

export function hpColor(frac: number): string {
  return frac > 0.5 ? C.hpGreen : frac > 0.2 ? C.hpYellow : C.hpRed;
}

/** An HP bar with the "HP" tag. */
export function hpBar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, frac: number, h = 10): void {
  const tagW = 30;
  ctx.fillStyle = '#404850';
  roundRect(ctx, x, y - 2, w + tagW, h + 4, (h + 4) / 2);
  ctx.fill();
  text(ctx, 'HP', x + 6, y + h - 1, { size: h + 2, color: C.gold, shadow: null, bold: true });
  ctx.fillStyle = '#e8ece8';
  roundRect(ctx, x + tagW - 2, y, w, h, h / 2);
  ctx.fill();
  const f = Math.max(0, Math.min(1, frac));
  if (f > 0) {
    ctx.fillStyle = hpColor(f);
    roundRect(ctx, x + tagW - 2, y, Math.max(h, w * f), h, h / 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(x + tagW - 2 + h / 3, y + 2, Math.max(0, w * f - h), h * 0.25);
  }
}

export function bar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, frac: number, color: string, back = '#38404a'): void {
  ctx.fillStyle = back;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fill();
  const f = Math.max(0, Math.min(1, frac));
  if (f > 0) {
    ctx.fillStyle = color;
    roundRect(ctx, x, y, Math.max(h, w * f), h, h / 2);
    ctx.fill();
  }
}

export function typeBadge(ctx: CanvasRenderingContext2D, t: Type, x: number, y: number, w = 64, h = 20): void {
  const [light, dark] = TYPE_COLORS[t];
  ctx.fillStyle = dark;
  roundRect(ctx, x, y, w, h, 5);
  ctx.fill();
  ctx.fillStyle = light;
  roundRect(ctx, x + 2, y + 2, w - 4, h - 4, 4);
  ctx.fill();
  outlined(ctx, t.toUpperCase(), x + w / 2, y + h * 0.74, { size: h * 0.62, align: 'center', stroke: dark });
}

/** Status condition tag (BRN, PAR...). */
export function statusBadge(ctx: CanvasRenderingContext2D, status: string, x: number, y: number, h = 16): void {
  const colors: Record<string, string> = { brn: '#e86030', psn: '#a050b0', par: '#d8b020', slp: '#8890a0', frz: '#58b8e0', fnt: '#c03030' };
  const w = h * 2.4;
  ctx.fillStyle = colors[status] ?? '#888';
  roundRect(ctx, x, y, w, h, 4);
  ctx.fill();
  outlined(ctx, status.toUpperCase(), x + w / 2, y + h * 0.78, { size: h * 0.75, align: 'center', stroke: 'rgba(0,0,0,0.5)' });
}

/** A chunky touch button. `state` 0 normal, 1 hover/selected, 2 pressed. */
export function button(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  opts: { color?: string; dark?: string; state?: number; size?: number; sub?: string; disabled?: boolean; r?: number } = {},
): void {
  const color = opts.disabled ? '#9aa0aa' : opts.color ?? '#5b8de0';
  const dark = opts.disabled ? '#6a707a' : opts.dark ?? '#2f5aa8';
  const pressed = opts.state === 2;
  const r = opts.r ?? 14;
  const lift = pressed ? 0 : 4;
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  roundRect(ctx, x + 2, y + 6, w, h - 2, r);
  ctx.fill();
  ctx.fillStyle = dark;
  roundRect(ctx, x, y + 4 - (4 - lift) * 0, w, h - 4, r);
  ctx.fill();
  const top = y + (4 - lift);
  ctx.fillStyle = dark;
  roundRect(ctx, x, top, w, h - 4, r);
  ctx.fill();
  ctx.fillStyle = color;
  roundRect(ctx, x + 3, top + 3, w - 6, h - 10, r - 3);
  ctx.fill();
  // Gloss.
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  roundRect(ctx, x + 8, top + 6, w - 16, (h - 10) * 0.38, (r - 3) / 1.5);
  ctx.fill();
  if (opts.state === 1) {
    ctx.strokeStyle = C.select;
    ctx.lineWidth = 4;
    roundRect(ctx, x - 3, top - 3, w + 6, h - 4 + 6, r + 3);
    ctx.stroke();
  }
  const size = opts.size ?? Math.min(26, h * 0.36);
  const cy = top + (h - 4) / 2 + size * 0.35 - (opts.sub ? size * 0.4 : 0);
  outlined(ctx, label, x + w / 2, cy, { size, align: 'center', stroke: dark });
  if (opts.sub) outlined(ctx, opts.sub, x + w / 2, cy + size * 0.95, { size: size * 0.65, align: 'center', stroke: dark, bold: false });
}

/** The selection arrow ▶. */
export function cursor(ctx: CanvasRenderingContext2D, x: number, y: number, size = 14, t = 0): void {
  const dx = Math.sin(t * 8) * 2;
  ctx.fillStyle = C.ink;
  ctx.beginPath();
  ctx.moveTo(x + dx, y - size / 2);
  ctx.lineTo(x + dx + size * 0.8, y);
  ctx.lineTo(x + dx, y + size / 2);
  ctx.closePath();
  ctx.fill();
}

/** Bouncing "more text" triangle ▼. */
export function moreArrow(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, color = C.accent): void {
  const dy = Math.abs(Math.sin(t * 5)) * 3;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x - 7, y - 5 + dy);
  ctx.lineTo(x + 7, y - 5 + dy);
  ctx.lineTo(x, y + 5 + dy);
  ctx.closePath();
  ctx.fill();
}

/** Diagonal-stripe backdrop used behind menus. */
export function stripes(ctx: CanvasRenderingContext2D, w: number, h: number, a: string, b: string, t = 0, step = 28): void {
  ctx.fillStyle = a;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = b;
  const off = (t * 20) % (step * 2);
  for (let x = -h - step * 2 + off; x < w; x += step * 2) {
    ctx.beginPath();
    ctx.moveTo(x, h);
    ctx.lineTo(x + step, h);
    ctx.lineTo(x + step + h, 0);
    ctx.lineTo(x + h, 0);
    ctx.closePath();
    ctx.fill();
  }
}

/** A Pouch icon (the game's capture item), drawn as a drawstring bag. */
export function pouchIcon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color = '#d85848', open = 0): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineJoin = 'round';
  ctx.lineWidth = r * 0.16;
  ctx.strokeStyle = '#3a2a2a';
  // Body.
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-r * 0.55, -r * 0.35);
  ctx.bezierCurveTo(-r * 1.15, r * 0.2, -r * 0.9, r * 0.95, 0, r * 0.95);
  ctx.bezierCurveTo(r * 0.9, r * 0.95, r * 1.15, r * 0.2, r * 0.55, -r * 0.35);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Shade.
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.moveTo(r * 0.2, r * 0.9);
  ctx.bezierCurveTo(r * 0.8, r * 0.85, r * 1.0, r * 0.3, r * 0.5, -r * 0.3);
  ctx.lineTo(r * 0.35, -r * 0.2);
  ctx.bezierCurveTo(r * 0.7, r * 0.3, r * 0.6, r * 0.8, r * 0.2, r * 0.9);
  ctx.fill();
  // Neck + frill.
  ctx.fillStyle = '#f4e4c8';
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.45 - open * r * 0.2, r * 0.62, r * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#f8d048';
  ctx.lineWidth = r * 0.14;
  ctx.beginPath();
  ctx.moveTo(-r * 0.5, -r * 0.25);
  ctx.quadraticCurveTo(0, -r * 0.1, r * 0.5, -r * 0.25);
  ctx.stroke();
  // Star stitch.
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  star(ctx, 0, r * 0.35, r * 0.25);
  ctx.restore();
}

export function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}
