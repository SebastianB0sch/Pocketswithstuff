/**
 * Creature sprites: vector art from creature-art.ts drawn at any size.
 */
import { DESIGNS, type Design } from './creature-art';
import { Painter, hueShift } from './paint';

export interface CreatureOpts {
  back?: boolean;
  shiny?: boolean;
  /** Seconds, for the idle breathing bob. */
  t?: number;
}

const FALLBACK: Design = {
  pal: { body: '#a0a0a0' },
  shiny: 0.5,
  draw(p) {
    p.ellipse(50, 70, 24, 22, 'body');
    p.eye(42, 64, 3, 4);
    p.eye(54, 64, 3.6, 4.6);
  },
};

function design(id: string): Design {
  return DESIGNS[id] ?? FALLBACK;
}

const palCache = new Map<string, Record<string, string>>();

function palette(id: string, d: Design, shiny: boolean): Record<string, string> {
  if (!shiny) return d.pal;
  let pal = palCache.get(id);
  if (!pal) {
    const s = d.shiny;
    pal = typeof s === 'number'
      ? Object.fromEntries(Object.entries(d.pal).map(([k, v]) => [k, hueShift(v, s)]))
      : { ...d.pal, ...s };
    palCache.set(id, pal);
  }
  return pal;
}

/**
 * Draws a creature into a size x size box whose bottom-centre is (x, y).
 * Front views face left; `back` shows it from behind, facing up-right.
 */
export function drawCreature(ctx: CanvasRenderingContext2D, id: string, x: number, y: number, size: number, opts: CreatureOpts = {}): void {
  const d = design(id);
  const k = size / 100;
  ctx.save();
  ctx.translate(x, y);
  if (opts.t !== undefined) {
    // Breathing: a gentle squash anchored at the feet; floaters bob instead.
    const ph = Math.sin(opts.t * 2.6);
    if (d.float) ctx.translate(0, -size * (0.03 + 0.025 * ph));
    else ctx.scale(1 - 0.008 * ph, 1 + 0.018 * ph);
  }
  ctx.scale(k, k);
  ctx.translate(-50, -100);
  if (opts.back) {
    ctx.translate(100, 0);
    ctx.scale(-1, 1);
  }
  const p = new Painter(ctx, palette(id, d, !!opts.shiny));
  p.back = !!opts.back;
  d.draw(p);
  ctx.restore();
}

const spriteCache = new Map<string, HTMLCanvasElement>();

/** Cached raster of drawCreature, `px` pixels square (rounded up to a multiple of 16). */
export function creatureSprite(id: string, px: number, opts: { back?: boolean; shiny?: boolean } = {}): HTMLCanvasElement {
  const size = Math.max(16, Math.ceil(px / 16) * 16);
  const key = `${id}|${size}|${opts.back ? 1 : 0}|${opts.shiny ? 1 : 0}`;
  let c = spriteCache.get(key);
  if (!c) {
    if (spriteCache.size > 256) spriteCache.clear();
    c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    // A little inset so outlines and stray tips stay inside the canvas.
    const inner = size * 0.92;
    drawCreature(c.getContext('2d')!, id, size / 2, size - size * 0.04, inner, opts);
    spriteCache.set(key, c);
  }
  return c;
}

/** A representative main colour for UI accents. */
export function creatureColor(id: string): string {
  const d = design(id);
  return d.pal[d.main ?? 'body'] ?? Object.values(d.pal)[0];
}

/** Whether the species hovers (no ground contact). */
export function creatureFloats(id: string): boolean {
  return !!design(id).float;
}
