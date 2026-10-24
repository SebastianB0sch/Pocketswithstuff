/**
 * Vector painting helpers for the cel-shaded, outlined sprite style.
 *
 * Art is authored in a 100x100 design box (y down, ground contact near y = 100)
 * using absolute SVG path data (M/L/Q/C/Z only, so a bounding box can be read
 * straight off the numbers) or ellipses. Each part is filled with three tones —
 * a shadow crescent toward the lower right, a soft highlight toward the upper
 * left and the base colour between — and stroked with a darker outline of its
 * own colour, so overlapping parts get internal lines like DS-era sprites.
 */

// ---------------------------------------------------------------- colour

type RGB = [number, number, number];

function hexToRgb(hex: string): RGB {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex([r, g, b]: RGB): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

export function mix(a: string, b: string, t: number): string {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return rgbToHex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
}

function rgbToHsl([r, g, b]: RGB): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h / 6, s, l];
}

function hslToRgb(h: number, s: number, l: number): RGB {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const hue = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [hue(p, q, h + 1 / 3) * 255, hue(p, q, h) * 255, hue(p, q, h - 1 / 3) * 255];
}

/** Rotates the hue by `turns` (0..1); near-grey colours are left alone. */
export function hueShift(hex: string, turns: number): string {
  const [h, s, l] = rgbToHsl(hexToRgb(hex));
  if (s < 0.12) return hex;
  return rgbToHex(hslToRgb((h + turns + 1) % 1, s, l));
}

export const OUTLINE_INK = '#1c1424';
const SHADOW_INK = '#2b2148';

export function outlineOf(c: string): string {
  return mix(c, OUTLINE_INK, 0.68);
}
export function shadowOf(c: string): string {
  return mix(c, SHADOW_INK, 0.3);
}
export function lightOf(c: string): string {
  return mix(c, '#ffffff', 0.32);
}

// ---------------------------------------------------------------- shapes

export interface Shape {
  path: Path2D;
  /** Bounding box in design units. */
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

const pathCache = new Map<string, Shape>();

/** Absolute SVG path data -> shape (cached). */
export function svg(d: string): Shape {
  let s = pathCache.get(d);
  if (s) return s;
  const nums = (d.match(/-?\d*\.?\d+/g) ?? []).map(Number);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i + 1 < nums.length; i += 2) {
    x0 = Math.min(x0, nums[i]); x1 = Math.max(x1, nums[i]);
    y0 = Math.min(y0, nums[i + 1]); y1 = Math.max(y1, nums[i + 1]);
  }
  s = { path: new Path2D(d), x0, y0, x1, y1 };
  pathCache.set(d, s);
  return s;
}

export function ell(cx: number, cy: number, rx: number, ry: number, rot = 0): Shape {
  const p = new Path2D();
  p.ellipse(cx, cy, rx, ry, (rot * Math.PI) / 180, 0, Math.PI * 2);
  const r = Math.max(rx, ry);
  return { path: p, x0: cx - r, y0: cy - r, x1: cx + r, y1: cy + r };
}

/** Closed smooth blob through points (Catmull-Rom converted to cubic Béziers). */
export function blob(pts: [number, number][], tension = 1): Shape {
  const n = pts.length;
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const k = tension / 6;
    const c1x = p1[0] + (p2[0] - p0[0]) * k, c1y = p1[1] + (p2[1] - p0[1]) * k;
    const c2x = p2[0] - (p3[0] - p1[0]) * k, c2y = p2[1] - (p3[1] - p1[1]) * k;
    d += ` C${r2(c1x)} ${r2(c1y)} ${r2(c2x)} ${r2(c2y)} ${p2[0]} ${p2[1]}`;
  }
  return svg(d + ' Z');
}

/** Straight-edged polygon. */
export function poly(pts: [number, number][]): Shape {
  return svg(`M${pts.map((p) => `${p[0]} ${p[1]}`).join(' L')} Z`);
}

function r2(v: number): number {
  return Math.round(v * 100) / 100;
}

// ---------------------------------------------------------------- painter

export interface PartOpts {
  /** Three-tone shading (default true). */
  shade?: boolean;
  /** Outline (default true). */
  outline?: boolean;
  /** Outline width multiplier. */
  lw?: number;
  /** Face detail: hidden in the back view. */
  face?: boolean;
  /** Only drawn in the back view. */
  backOnly?: boolean;
  /** Only drawn in the front view. */
  frontOnly?: boolean;
  /** Far-side limb: drawn a touch darker. */
  far?: boolean;
  /** Override outline colour. */
  ink?: string;
  /** Global alpha. */
  alpha?: number;
}

/**
 * Draws parts into the current transform, which maps the 100x100 design box
 * to the target. `pal` maps colour keys to hex; unknown keys pass through as hex.
 */
export class Painter {
  back = false;
  /** Light from the upper right instead (mirrored drawings); defaults to `back`. */
  flipLight?: boolean;
  /** Base outline width in design units. */
  lw = 1.9;

  constructor(readonly ctx: CanvasRenderingContext2D, readonly pal: Record<string, string>) {}

  col(key: string): string {
    return this.pal[key] ?? key;
  }

  private visible(o: PartOpts): boolean {
    if (this.back && (o.face || o.frontOnly)) return false;
    if (!this.back && o.backOnly) return false;
    return true;
  }

  /** A filled, shaded, outlined part. */
  part(shape: Shape, color: string, o: PartOpts = {}): void {
    if (!this.visible(o)) return;
    const c = this.ctx;
    let base = this.col(color);
    if (o.far) base = mix(base, SHADOW_INK, 0.18);
    c.save();
    if (o.alpha !== undefined) c.globalAlpha = o.alpha;
    if (o.shade === false) {
      c.fillStyle = base;
      c.fill(shape.path);
    } else {
      const dim = Math.min(shape.x1 - shape.x0, shape.y1 - shape.y0);
      const k = Math.max(0.6, Math.min(4.2, dim * 0.16));
      const h = Math.max(0.4, Math.min(2.6, dim * 0.09));
      // In the mirrored back view the design is flipped, so flip the light too
      // to keep it coming from the screen's upper left.
      const sx = (this.flipLight ?? this.back) ? -1 : 1;
      c.save();
      c.clip(shape.path);
      c.fillStyle = shadowOf(base);
      c.fill(shape.path);
      c.translate(-k * sx, -k);
      c.clip(shape.path);
      c.translate(k * sx, k);
      c.fillStyle = lightOf(base);
      c.fill(shape.path);
      c.translate(h * sx, h);
      c.clip(shape.path);
      c.translate(-h * sx, -h);
      c.fillStyle = base;
      c.fill(shape.path);
      c.restore();
    }
    if (o.outline !== false) {
      c.lineJoin = 'round';
      c.lineCap = 'round';
      c.lineWidth = this.lw * (o.lw ?? 1);
      c.strokeStyle = o.ink ? this.col(o.ink) : outlineOf(base);
      c.stroke(shape.path);
    }
    c.restore();
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, color: string, o: PartOpts & { rot?: number } = {}): void {
    this.part(ell(cx, cy, rx, ry, o.rot ?? 0), color, o);
  }

  path(d: string, color: string, o: PartOpts = {}): void {
    this.part(svg(d), color, o);
  }

  blob(pts: [number, number][], color: string, o: PartOpts = {}): void {
    this.part(blob(pts), color, o);
  }

  /** Flat fill, no outline (markings, spots, belly patches drawn over a part). */
  flat(shape: Shape, color: string, o: PartOpts = {}): void {
    this.part(shape, color, { ...o, shade: false, outline: false });
  }

  /** A stroked line (mouths, whiskers, claws). Defaults to face detail. */
  line(d: string, color = OUTLINE_INK, w = 1, o: PartOpts = {}): void {
    if (!this.visible({ face: true, ...o })) return;
    const c = this.ctx;
    c.save();
    if (o.alpha !== undefined) c.globalAlpha = o.alpha;
    c.lineJoin = 'round';
    c.lineCap = 'round';
    c.lineWidth = this.lw * w;
    c.strokeStyle = this.col(color);
    c.stroke(svg(d).path);
    c.restore();
  }

  /**
   * A DS-style eye: a dark rounded eye with a coloured iris and two white
   * highlights. `look` shifts the pupil horizontally (-1 left .. 1 right).
   */
  eye(cx: number, cy: number, rx: number, ry: number, o: { iris?: string; look?: number; sclera?: boolean; lid?: 'none' | 'half' | 'angry' | 'sleepy' | 'happy'; tilt?: number } = {}): void {
    if (this.back) return;
    const c = this.ctx;
    const ink = OUTLINE_INK;
    const look = o.look ?? -0.25;
    const lid = o.lid ?? 'none';
    c.save();
    c.translate(cx, cy);
    if (o.tilt) c.rotate((o.tilt * Math.PI) / 180);
    if (lid === 'happy') {
      c.lineCap = 'round';
      c.lineWidth = this.lw * 1.3;
      c.strokeStyle = ink;
      c.beginPath();
      c.moveTo(-rx, ry * 0.3);
      c.quadraticCurveTo(0, -ry * 1.1, rx, ry * 0.3);
      c.stroke();
      c.restore();
      return;
    }
    const shape = new Path2D();
    shape.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    if (o.sclera) {
      c.fillStyle = '#ffffff';
      c.fill(shape);
      c.save();
      c.clip(shape);
      const pr = Math.min(rx, ry) * 0.72;
      c.fillStyle = o.iris ? this.col(o.iris) : ink;
      c.beginPath();
      c.ellipse(look * rx * 0.35, ry * 0.08, pr, ry * 0.82, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = ink;
      c.beginPath();
      c.ellipse(look * rx * 0.4, ry * 0.1, pr * 0.5, ry * 0.5, 0, 0, Math.PI * 2);
      c.fill();
      c.restore();
    } else {
      c.fillStyle = ink;
      c.fill(shape);
      if (o.iris) {
        c.save();
        c.clip(shape);
        c.fillStyle = this.col(o.iris);
        c.beginPath();
        c.ellipse(look * rx * 0.25, ry * 0.42, rx * 0.8, ry * 0.55, 0, 0, Math.PI * 2);
        c.fill();
        c.restore();
      }
    }
    // highlights
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.ellipse(-rx * 0.3 + look * rx * 0.2, -ry * 0.38, Math.max(rx, ry) * 0.3, Math.max(rx, ry) * 0.3, 0, 0, Math.PI * 2);
    c.fill();
    c.globalAlpha = 0.85;
    c.beginPath();
    c.ellipse(rx * 0.3 + look * rx * 0.2, ry * 0.35, Math.max(rx, ry) * 0.13, Math.max(rx, ry) * 0.13, 0, 0, Math.PI * 2);
    c.fill();
    c.globalAlpha = 1;
    c.lineWidth = this.lw * 0.8;
    c.strokeStyle = ink;
    c.stroke(shape);
    // lids
    if (lid !== 'none') {
      c.save();
      c.clip(shape);
      c.fillStyle = this.col('lid' in this.pal ? 'lid' : (this.pal.body ?? '#888888'));
      c.beginPath();
      if (lid === 'half' || lid === 'sleepy') c.rect(-rx * 1.2, -ry * 1.2, rx * 2.4, ry * (lid === 'sleepy' ? 1.35 : 0.95));
      else {
        // angry: a slanted brow cut, higher on the outer (right) side
        c.moveTo(-rx * 1.3, -ry * 1.3);
        c.lineTo(rx * 1.3, -ry * 1.3);
        c.lineTo(rx * 1.3, -ry * 0.75);
        c.lineTo(-rx * 1.3, -ry * 0.05);
        c.closePath();
      }
      c.fill();
      c.restore();
      c.lineWidth = this.lw * 1.1;
      c.strokeStyle = ink;
      c.beginPath();
      if (lid === 'angry') {
        c.moveTo(-rx * 1.1, -ry * 0.02);
        c.lineTo(rx * 1.1, -ry * 0.8);
      } else {
        const yy = -ry * 1.2 + ry * (lid === 'sleepy' ? 1.35 : 0.95);
        c.moveTo(-rx * 1.05, yy);
        c.lineTo(rx * 1.05, yy);
      }
      c.stroke();
    }
    c.restore();
  }

  /** Small white sparkle (shiny gleam, gems). */
  sparkle(cx: number, cy: number, r: number, color = '#ffffff'): void {
    const c = this.ctx;
    c.save();
    c.fillStyle = this.col(color);
    c.beginPath();
    c.moveTo(cx, cy - r);
    c.quadraticCurveTo(cx, cy, cx + r, cy);
    c.quadraticCurveTo(cx, cy, cx, cy + r);
    c.quadraticCurveTo(cx, cy, cx - r, cy);
    c.quadraticCurveTo(cx, cy, cx, cy - r);
    c.fill();
    c.restore();
  }
}
