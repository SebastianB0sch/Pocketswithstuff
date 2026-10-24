/**
 * One design per species, drawn in the 100x100 design box (see paint.ts).
 *
 * Front views face the viewer's left in a three-quarter pose; the back view is the
 * same design mirrored with face details hidden (`face: true` parts) and
 * `backOnly` markings shown instead. Draw order is back to front: far limbs, tail,
 * body, near limbs, head, face.
 */
import { Painter, blob, ell, mix, outlineOf, poly, svg } from './paint';

export interface Design {
  pal: Record<string, string>;
  /** Main colour key for UI accents (default 'body'). */
  main?: string;
  /** Shiny palette: hue rotation in turns, or explicit overrides. */
  shiny: number | Record<string, string>;
  /** Hovering creatures bob more and cast no contact. */
  float?: boolean;
  draw(p: Painter): void;
}

// ---------------------------------------------------------------- shared bits

/** A stubby rounded leg from hip (x, y) down to the ground at `gy`. */
function leg(p: Painter, x: number, y: number, w: number, gy: number, color: string, o: { far?: boolean; hoof?: string; paw?: string } = {}): void {
  // Filled as a closed shape but outlined without its top edge, so the leg
  // grows out of the body instead of looking pasted on.
  const t = w * 0.6;
  const my = (y + gy) / 2;
  const sides = `M${r(x - t)} ${y} Q${r(x - t * 0.95)} ${r(my)} ${r(x - w / 2)} ${r(gy - w * 0.3)} Q${r(x - w / 2)} ${gy} ${x} ${gy} Q${r(x + w / 2)} ${gy} ${r(x + w / 2)} ${r(gy - w * 0.3)} Q${r(x + t * 0.85)} ${r(my)} ${r(x + t)} ${y}`;
  p.path(`${sides} Z`, color, { far: o.far, outline: false });
  if (o.hoof) p.path(`M${r(x - w / 2)} ${r(gy - w * 0.45)} L${r(x + w / 2)} ${r(gy - w * 0.45)} L${r(x + w / 2)} ${r(gy - w * 0.3)} Q${r(x + w / 2)} ${gy} ${x} ${gy} Q${r(x - w / 2)} ${gy} ${r(x - w / 2)} ${r(gy - w * 0.3)} Z`, o.hoof, { far: o.far, shade: false, outline: false });
  if (o.paw) p.ellipse(r(x - w * 0.08), r(gy - w * 0.2), w * 0.5, w * 0.22, o.paw, { far: o.far, shade: false, outline: false });
  const base = p.col(color);
  p.line(sides, outlineOf(o.far ? mix(base, '#2b2148', 0.18) : base), 1, { face: false });
}

/** A leaf shape from base (x0,y0) to tip (x1,y1), bulging by `w`. */
function leafPath(x0: number, y0: number, x1: number, y1: number, w: number): string {
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  const dx = x1 - x0, dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * w, ny = (dx / len) * w;
  return `M${x0} ${y0} Q${r(mx + nx)} ${r(my + ny)} ${x1} ${y1} Q${r(mx - nx)} ${r(my - ny)} ${x0} ${y0} Z`;
}

function leaf(p: Painter, x0: number, y0: number, x1: number, y1: number, w: number, color: string, vein = true): void {
  p.path(leafPath(x0, y0, x1, y1, w), color);
  if (vein) p.line(`M${x0} ${y0} Q${r((x0 + x1) / 2)} ${r((y0 + y1) / 2)} ${r(x0 + (x1 - x0) * 0.8)} ${r(y0 + (y1 - y0) * 0.8)}`, 'veins', 0.6, { face: false });
}

/** A flame tongue from base (x, y) of width w, height h, leaning by `lean`. */
function flamePath(x: number, y: number, w: number, h: number, lean = 0): string {
  return `M${r(x - w / 2)} ${y} Q${r(x - w * 0.7)} ${r(y - h * 0.5)} ${r(x + lean)} ${r(y - h)} Q${r(x + w * 0.1)} ${r(y - h * 0.55)} ${r(x + w * 0.35)} ${r(y - h * 0.6)} Q${r(x + w * 0.75)} ${r(y - h * 0.3)} ${r(x + w / 2)} ${y} Z`;
}

function flame(p: Painter, x: number, y: number, w: number, h: number, lean = 0): void {
  p.path(flamePath(x, y, w, h, lean), 'flame');
  p.path(flamePath(x, y - h * 0.05, w * 0.55, h * 0.6, lean * 0.6), 'flame2', { outline: false, shade: false });
}

/**
 * A feathered wing rooted at (x, y) pointing along `ang` degrees (0 = right,
 * -90 = up): fanned primaries behind a rounded covert.
 */
function wing(p: Painter, x: number, y: number, ang: number, len: number, color: string, o: { far?: boolean; tip?: string } = {}): void {
  const n = 5;
  for (let i = n - 1; i >= 0; i--) {
    const a = ((ang + (i - 1) * 13 * Math.sign(Math.cos((ang * Math.PI) / 180) || 1)) * Math.PI) / 180;
    const l = len * (1 - i * 0.11);
    const bx = x + Math.cos(a) * len * 0.25, by = y + Math.sin(a) * len * 0.25;
    const tx = x + Math.cos(a) * l, ty = y + Math.sin(a) * l;
    p.part(svg(leafPath(r(bx), r(by), r(tx), r(ty), len * 0.085)), i === 0 && o.tip ? o.tip : color, { far: o.far });
  }
  const a = (ang * Math.PI) / 180;
  const cx = x + Math.cos(a) * len * 0.3, cy = y + Math.sin(a) * len * 0.3;
  p.part(ell(r(cx), r(cy), len * 0.34, len * 0.17, ang), color, { far: o.far });
}

function r(v: number): number {
  return Math.round(v * 10) / 10;
}

/** A small open mouth (3/4 view) with optional fang. */
function mouth(p: Painter, x: number, y: number, w: number, o: { open?: number; fang?: boolean; tongue?: boolean } = {}): void {
  const open = o.open ?? 0;
  if (open > 0) {
    p.path(`M${x - w / 2} ${y} Q${x} ${y + open * 1.6} ${x + w / 2} ${y} Z`, '#5a1f2c', { face: true, shade: false, lw: 0.8 });
    if (o.tongue) p.path(`M${x - w * 0.25} ${y + open * 0.55} Q${x} ${y + open * 0.15} ${x + w * 0.3} ${y + open * 0.55} Q${x} ${y + open * 1.15} ${x - w * 0.25} ${y + open * 0.55} Z`, '#f07a8a', { face: true, shade: false, outline: false });
    if (o.fang) p.path(`M${x - w * 0.35} ${y} L${x - w * 0.22} ${y + open * 0.75} L${x - w * 0.08} ${y} Z`, '#ffffff', { face: true, shade: false, lw: 0.5 });
  } else {
    p.line(`M${x - w / 2} ${y} Q${x - w / 4} ${y + w * 0.3} ${x} ${y} Q${x + w / 4} ${y + w * 0.3} ${x + w / 2} ${y}`, '#3a2030', 0.75);
  }
}

function blush(p: Painter, x: number, y: number, rr: number): void {
  p.ellipse(x, y, rr, rr * 0.55, '#ff8fa0', { face: true, shade: false, outline: false, alpha: 0.55 });
}

// ---------------------------------------------------------------- designs

export const DESIGNS: Record<string, Design> = {
  // 1 ---------------------------------------------------------------- Sprigfawn
  sprigfawn: {
    pal: { body: '#86cfa0', cream: '#f4ecd0', leaf: '#5fbf4a', leaf2: '#3e9a38', veins: '#2d6a2a', hoof: '#6b5040', nose: '#3a2a2a' },
    shiny: { body: '#e0c27a', leaf: '#e58fb0', leaf2: '#c0607f', veins: '#8a3a5a' },
    draw(p) {
      leg(p, 50, 72, 7, 95, 'body', { far: true, hoof: 'hoof' });
      leg(p, 72, 72, 7, 94, 'body', { far: true, hoof: 'hoof' });
      p.ellipse(77, 63, 6, 5, 'cream', { rot: -30 });
      p.ellipse(60, 72, 21, 13.5, 'body');
      p.flat(ell(58, 79, 13, 5), 'cream');
      p.ellipse(62, 66, 2.6, 2, 'cream', { shade: false, outline: false });
      p.ellipse(70, 70, 2.2, 1.7, 'cream', { shade: false, outline: false });
      p.ellipse(55, 64, 2, 1.6, 'cream', { shade: false, outline: false, backOnly: true });
      p.ellipse(66, 62, 2.4, 1.8, 'cream', { shade: false, outline: false, backOnly: true });
      leg(p, 44, 74, 8, 97, 'body', { hoof: 'hoof' });
      leg(p, 66, 75, 8, 97, 'body', { hoof: 'hoof' });
      // ears
      p.path(leafPath(48, 44, 62, 34, 4.5), 'body');
      p.path(leafPath(49, 43, 59, 36.5, 2.2), 'cream', { outline: false, shade: false, face: true });
      p.path(leafPath(26, 42, 13, 36, 4), 'body', { far: true });
      // head
      p.blob([[22, 50], [27, 37], [40, 31], [52, 37], [54, 50], [46, 61], [30, 63]], 'body');
      p.ellipse(25, 55, 9, 7, 'cream', { face: true });
      p.ellipse(19.5, 52.5, 2.8, 2, 'nose', { face: true, shade: false });
      // sprouts
      p.path('M36 33 Q35 27 37 22', 'leaf2', { shade: false, outline: false });
      p.line('M37 33 Q36 27 38 22', 'leaf2', 1.2, { face: false });
      leaf(p, 38, 23, 26, 15, 4.6, 'leaf');
      leaf(p, 38, 23, 48, 12, 5, 'leaf');
      p.eye(31, 46, 3.4, 4.6, { iris: '#6a4a2a' });
      p.eye(43, 46.5, 4.2, 5.4, { iris: '#6a4a2a' });
      mouth(p, 28, 58.5, 5);
      blush(p, 46, 54, 3);
    },
  },
  // 2 ---------------------------------------------------------------- Fernbuck
  fernbuck: {
    pal: { body: '#5aa86a', cream: '#efe4c4', fern: '#7cc950', fern2: '#4f9a34', veins: '#2f6a28', hoof: '#5a4434', nose: '#2e2424', dark: '#3f7a4c' },
    shiny: { body: '#5a8fb0', fern: '#e2b452', fern2: '#b8862a', veins: '#7a5418', dark: '#3a6680' },
    draw(p) {
      leg(p, 40, 64, 6, 94, 'body', { far: true, hoof: 'hoof' });
      leg(p, 72, 64, 6, 93, 'body', { far: true, hoof: 'hoof' });
      // leafy tail
      leaf(p, 80, 56, 92, 46, 4, 'fern');
      p.blob([[36, 56], [50, 48], [72, 48], [84, 56], [80, 68], [60, 72], [40, 68]], 'body');
      p.flat(blob([[42, 64], [56, 68], [72, 66], [64, 71], [48, 71]]), 'cream');
      p.path('M50 50 Q62 47 76 51', 'dark', { outline: false, shade: false, backOnly: true });
      leg(p, 45, 64, 7, 97, 'body', { hoof: 'hoof' });
      leg(p, 76, 64, 7, 96, 'body', { hoof: 'hoof' });
      // neck
      p.path('M30 34 Q28 50 38 60 L52 54 Q44 44 44 30 Z', 'body');
      p.path('M33 46 Q36 55 41 58 L44 53 Q39 48 38 40 Z', 'cream', { outline: false, shade: false, face: true });
      // fern antlers (fronds curling up)
      p.line('M34 20 Q30 10 22 6', 'fern2', 2.2, { face: false });
      p.line('M38 19 Q44 8 54 6', 'fern2', 2.2, { face: false });
      for (const [x0, y0, x1, y1] of [[30, 14, 22, 15], [27, 10, 20, 8], [42, 13, 49, 14], [47, 9, 55, 11], [32, 17, 25, 21], [40, 17, 46, 20]]) leaf(p, x0, y0, x1, y1, 2.4, 'fern', false);
      p.path('M22 6 Q19 4 21 2 Q24 2 23 5', 'fern2', { shade: false });
      p.path('M54 6 Q58 3 56 1.5 Q53 1.5 54 4', 'fern2', { shade: false });
      // ears
      p.path(leafPath(42, 24, 54, 18, 3.4), 'body');
      p.path(leafPath(26, 24, 16, 20, 3), 'body', { far: true });
      // head
      p.blob([[17, 34], [24, 24], [36, 21], [46, 27], [44, 38], [30, 42], [18, 41]], 'body');
      p.ellipse(19, 37, 6, 4.5, 'cream', { face: true });
      p.ellipse(14.5, 35.5, 2.2, 1.6, 'nose', { face: true, shade: false });
      p.eye(26.5, 30.5, 2.4, 3.2, { iris: '#7a5a20' });
      p.eye(36, 30.5, 3, 3.8, { iris: '#7a5a20' });
      mouth(p, 21, 40, 4);
    },
  },
  // 3 ---------------------------------------------------------------- Grovestag
  grovestag: {
    pal: { body: '#4c7a46', earth: '#8a6440', mane: '#6b9a3e', canopy: '#5fae48', canopy2: '#3f8a34', trunk: '#7a5232', rock: '#8a8f96', cream: '#d9cfae', nose: '#2a2020', veins: '#2b5a24' },
    shiny: { body: '#8a6a4c', mane: '#c0a040', canopy: '#e8a050', canopy2: '#c0703a', earth: '#5a5f78' },
    draw(p) {
      leg(p, 32, 66, 9, 94, 'earth', { far: true, hoof: 'rock' });
      leg(p, 74, 66, 9, 93, 'earth', { far: true, hoof: 'rock' });
      p.path('M84 58 Q94 60 92 70 Q86 66 82 66 Z', 'mane');
      p.blob([[24, 54], [40, 42], [66, 40], [86, 50], [86, 66], [66, 76], [36, 76], [24, 68]], 'body');
      p.flat(blob([[32, 70], [50, 75], [70, 73], [60, 77], [40, 77]]), 'earth');
      // mossy mane over shoulders
      p.blob([[22, 46], [32, 36], [46, 36], [52, 46], [44, 58], [28, 60]], 'mane');
      p.ellipse(60, 46, 3, 2, 'canopy2', { shade: false, outline: false, backOnly: true });
      p.ellipse(72, 50, 2.5, 1.8, 'canopy2', { shade: false, outline: false, backOnly: true });
      leg(p, 38, 66, 10, 97, 'earth', { hoof: 'rock' });
      leg(p, 78, 66, 10, 96, 'earth', { hoof: 'rock' });
      // tree antlers
      p.path('M30 26 Q26 18 20 14 L22 12 Q28 15 33 22 Z', 'trunk');
      p.path('M36 25 Q40 16 48 12 L49 14 Q42 18 39 26 Z', 'trunk');
      p.path('M24 16 Q20 12 14 13 L14 11 Q21 9 26 14 Z', 'trunk');
      p.ellipse(16, 10, 8, 6.5, 'canopy');
      p.ellipse(26, 6, 7, 5.5, 'canopy');
      p.ellipse(49, 8, 9, 7, 'canopy');
      p.ellipse(41, 4, 6, 4.5, 'canopy2');
      p.ellipse(58, 11, 5.5, 4.5, 'canopy2');
      // head
      p.path(leafPath(40, 30, 52, 25, 3), 'body');
      p.blob([[12, 38], [18, 27], [32, 22], [42, 28], [40, 40], [26, 46], [13, 45]], 'body');
      p.ellipse(15, 41, 6.5, 4.8, 'cream', { face: true });
      p.ellipse(10.5, 39, 2.4, 1.7, 'nose', { face: true, shade: false });
      p.eye(22, 33, 2.4, 3, { iris: '#c08a20', lid: 'angry' });
      p.eye(32, 33, 2.9, 3.5, { iris: '#c08a20', lid: 'angry' });
      p.line('M14 45 Q19 46 23 44', '#3a2030', 0.8);
    },
  },
  // 4 ---------------------------------------------------------------- Kindlekit
  kindlekit: {
    pal: { body: '#f08a3c', cream: '#fbe9c8', dark: '#9a4a24', flame: '#ff9a2a', flame2: '#ffe066', nose: '#2e1e1e', inner: '#ffc0a0' },
    shiny: { body: '#e8d4a0', dark: '#9a7a50', flame: '#4ab8ff', flame2: '#c8f0ff' },
    draw(p) {
      // tail with flame tip
      p.path('M66 78 Q82 76 86 62 Q90 50 82 44 Q86 58 74 66 Q68 70 62 70 Z', 'body');
      p.path('M84 50 Q88 46 84 42 Q80 46 80 50 Z', 'cream', { shade: false });
      flame(p, 84, 46, 12, 18, -2);
      leg(p, 46, 78, 6, 95, 'dark', { far: true });
      leg(p, 64, 79, 6, 95, 'dark', { far: true });
      p.ellipse(56, 78, 15, 11, 'body');
      p.flat(ell(51, 81, 8, 6), 'cream', { face: true });
      leg(p, 50, 82, 6.5, 97, 'body', { paw: 'dark' });
      leg(p, 63, 83, 6.5, 97, 'body', { paw: 'dark' });
      // ears
      p.path('M42 44 Q46 22 58 18 Q60 34 54 46 Z', 'body');
      p.path('M46 42 Q49 28 56 23 Q56 34 52 43 Z', 'inner', { outline: false, shade: false, face: true });
      p.path('M24 46 Q18 28 24 18 Q32 26 34 42 Z', 'body', { far: true });
      // head
      p.blob([[20, 58], [22, 46], [34, 40], [50, 42], [56, 54], [50, 66], [34, 70], [22, 66]], 'body');
      p.blob([[14, 60], [22, 54], [34, 58], [36, 66], [26, 70], [16, 66]], 'cream', { face: true });
      p.path('M22 58 Q16 56 13 58 Q14 61 19 61 Z', 'cream', { face: true });
      p.ellipse(13.5, 58.5, 2.2, 1.7, 'nose', { face: true, shade: false });
      p.path('M36 41 Q40 36 44 41', 'cream', { shade: false, outline: false, face: true });
      p.eye(28, 52, 3.3, 4.4, { iris: '#a8501a' });
      p.eye(40, 52.5, 4.1, 5.2, { iris: '#a8501a' });
      mouth(p, 21, 64, 5, { open: 2.6, fang: true, tongue: true });
      blush(p, 44, 61, 2.6);
    },
  },
  // 5 ---------------------------------------------------------------- Blazevix
  blazevix: {
    pal: { body: '#e86a2c', cream: '#fbe2bc', sock: '#9a2a1a', flame: '#ff8a1a', flame2: '#ffd84a', nose: '#2a1a1a', inner: '#ffb08a' },
    shiny: { body: '#f0c040', sock: '#a0602a', flame: '#ff5aa8', flame2: '#ffd0ea' },
    draw(p) {
      // three flaming tails
      for (const [bx, by, tx, ty] of [[70, 62, 88, 30], [72, 64, 95, 46], [70, 66, 92, 60]]) {
        p.path(`M${bx} ${by - 4} Q${(bx + tx) / 2 + 2} ${(by + ty) / 2 - 6} ${tx} ${ty} Q${(bx + tx) / 2 + 4} ${(by + ty) / 2 + 4} ${bx} ${by + 4} Z`, 'body');
        flame(p, tx, ty + 6, 9, 14, 1);
      }
      leg(p, 34, 68, 5.5, 94, 'sock', { far: true });
      leg(p, 64, 68, 5.5, 93, 'sock', { far: true });
      p.blob([[28, 58], [44, 52], [64, 54], [74, 62], [68, 72], [48, 74], [32, 70]], 'body');
      p.flat(blob([[32, 66], [44, 72], [56, 72], [46, 75], [36, 72]]), 'cream');
      p.path('M40 70 L40 84 Q40 88 37 89 L36 97 L44 97 L45 84 L46 72 Z', 'body');
      p.path('M36 88 L36 97 L45 97 L45 88 Z', 'sock', { shade: false });
      p.path('M66 68 L68 84 L66 96 L74 96 L74 84 L72 66 Z', 'body');
      p.path('M66 88 L66 96 L74 96 L74 88 Z', 'sock', { shade: false });
      // neck + chest ruff
      p.path('M22 38 Q20 54 34 62 L46 54 Q38 46 40 34 Z', 'body');
      p.path('M22 48 Q26 60 36 62 Q32 56 36 50 Q28 52 22 48 Z', 'cream', { face: true });
      // ears with flame tufts
      p.path('M34 28 Q38 8 48 4 Q50 18 42 30 Z', 'body');
      p.path('M38 26 Q41 13 46 9 Q47 18 42 27 Z', 'inner', { outline: false, shade: false, face: true });
      flame(p, 47, 8, 5, 8, 1);
      p.path('M20 30 Q14 14 18 6 Q26 14 28 28 Z', 'body', { far: true });
      // head — sharp, confident
      p.blob([[6, 38], [14, 30], [26, 24], [40, 28], [42, 38], [32, 44], [16, 44]], 'body');
      p.path('M4 40 Q14 36 26 40 Q22 46 12 46 Q6 44 4 40 Z', 'cream', { face: true });
      p.ellipse(4.5, 39, 2, 1.6, 'nose', { face: true, shade: false });
      p.eye(20, 33, 2.4, 3, { iris: '#c0401a', lid: 'angry' });
      p.eye(30, 33.5, 3, 3.6, { iris: '#c0401a', lid: 'angry' });
      p.line('M10 44 Q15 45 20 42', '#3a1a20', 0.8);
    },
  },
  // 6 ---------------------------------------------------------------- Pyrolupe
  pyrolupe: {
    pal: { body: '#38323e', dark: '#221e28', flame: '#e8302a', flame2: '#ffb030', mark: '#ff6a2a', cream: '#5a5262', nose: '#121014' },
    shiny: { body: '#e8e4ee', dark: '#b0a8bc', cream: '#ffffff', flame: '#3a7aff', flame2: '#a0f0ff', mark: '#3ab0ff' },
    draw(p) {
      // flaming tail
      p.path('M76 54 Q90 50 94 36 Q96 50 88 60 Q82 64 76 62 Z', 'body');
      flame(p, 93, 40, 10, 22, 2);
      leg(p, 30, 62, 7, 93, 'dark', { far: true });
      leg(p, 72, 62, 7, 92, 'dark', { far: true });
      p.blob([[22, 50], [44, 42], [70, 44], [82, 54], [76, 68], [50, 72], [28, 68]], 'body');
      p.path('M50 58 L56 50 L58 60 L64 52 L64 64', 'mark', { shade: false, outline: false, alpha: 0.9 });
      leg(p, 38, 64, 8, 97, 'body');
      flame(p, 38, 88, 6, 8, 0);
      leg(p, 76, 64, 8, 96, 'body');
      flame(p, 76, 87, 6, 8, 0);
      // fiery mane
      for (const [x, y, w, h, l] of [[46, 46, 14, 26, 6], [36, 40, 16, 32, 2], [26, 40, 14, 26, -4], [52, 50, 12, 18, 8]] as const) flame(p, x, y, w, h, l);
      // head
      p.path('M34 22 Q36 6 46 2 Q48 14 42 24 Z', 'body');
      p.path('M22 24 Q18 10 22 4 Q28 12 30 22 Z', 'body', { far: true });
      p.blob([[4, 32], [14, 22], [30, 18], [42, 24], [42, 36], [30, 42], [12, 42]], 'body');
      p.path('M2 34 Q14 30 26 34 Q22 42 10 42 Q4 40 2 34 Z', 'cream', { face: true });
      p.ellipse(3, 33.5, 2.2, 1.7, 'nose', { face: true, shade: false });
      p.path('M18 24 Q26 22 34 26', 'mark', { shade: false, lw: 0.5, face: true });
      p.eye(19, 29, 2.6, 2.8, { iris: '#ffb020', lid: 'angry' });
      p.eye(30, 29.5, 3.2, 3.4, { iris: '#ffb020', lid: 'angry' });
      mouth(p, 12, 40, 8, { open: 2.4, fang: true });
    },
  },
  // 7 ---------------------------------------------------------------- Pupple
  pupple: {
    pal: { body: '#7cb8ec', belly: '#f6fbff', dark: '#4a7ab0', nose: '#2a2a3a', bubble: '#bfe8ff' },
    shiny: { body: '#f0b0d0', dark: '#b06090', bubble: '#ffe0f0' },
    draw(p) {
      // tail flippers
      p.path('M74 86 Q88 78 92 84 Q86 88 90 94 Q82 96 74 92 Z', 'dark');
      // body (teardrop seal)
      p.blob([[26, 70], [36, 56], [56, 56], [74, 70], [80, 88], [60, 96], [34, 96], [24, 86]], 'body');
      p.flat(blob([[32, 80], [44, 72], [60, 78], [66, 90], [50, 95], [34, 92]]), 'belly', { face: true });
      p.ellipse(56, 64, 3, 2, 'dark', { shade: false, outline: false, backOnly: true });
      p.ellipse(64, 72, 2.5, 1.8, 'dark', { shade: false, outline: false, backOnly: true });
      // flippers
      p.path('M58 78 Q70 86 70 96 Q60 94 54 86 Z', 'dark');
      p.path('M28 80 Q16 86 18 94 Q28 92 34 86 Z', 'dark', { far: true });
      // head
      p.ellipse(40, 54, 21, 18, 'body');
      p.ellipse(28, 60, 10, 7.5, 'belly', { face: true });
      p.ellipse(22.5, 56, 3.4, 2.4, 'nose', { face: true, shade: false });
      p.line('M18 60 L10 58 M18 62 L10 63 M34 61 L41 60', '#5a6a80', 0.5);
      p.eye(29, 48, 3.8, 5, { iris: '#3a6ab0' });
      p.eye(43, 48.5, 4.6, 5.8, { iris: '#3a6ab0' });
      mouth(p, 27, 65, 6, { open: 2.2, tongue: true });
      blush(p, 47, 58, 3);
      // nose bubble
      p.ellipse(15, 50, 6, 6, 'bubble', { alpha: 0.75, shade: false, face: true, lw: 0.7 });
      p.sparkle(13, 48, 1.8);
    },
  },
  // 8 ---------------------------------------------------------------- Tidalrus
  tidalrus: {
    pal: { body: '#3c78c4', belly: '#eef4fa', dark: '#28508a', tusk: '#fff4dc', crest: '#7cc4f0', nose: '#1e2230' },
    shiny: { body: '#4aa890', dark: '#2a7060', crest: '#f0e08a' },
    draw(p) {
      p.path('M70 84 Q90 72 96 82 Q88 86 92 94 Q80 96 70 92 Z', 'dark');
      p.blob([[22, 64], [34, 44], [58, 44], [76, 62], [82, 86], [60, 96], [30, 96], [20, 84]], 'body');
      p.flat(blob([[26, 74], [40, 62], [56, 70], [64, 88], [48, 95], [30, 92]]), 'belly', { face: true });
      p.path('M50 50 Q60 54 66 62 Q60 60 52 56 Z', 'crest', { shade: false, outline: false, backOnly: true });
      p.path('M60 70 Q76 80 76 96 Q62 96 54 84 Z', 'dark');
      p.path('M24 74 Q10 82 10 94 Q24 92 30 84 Z', 'dark', { far: true });
      // wave crest
      p.path('M32 22 Q38 10 50 10 Q44 14 46 20 Q52 14 58 18 Q52 22 50 30 L36 32 Z', 'crest');
      p.blob([[16, 40], [22, 26], [38, 20], [54, 26], [56, 42], [44, 52], [24, 54]], 'body');
      p.ellipse(22, 46, 10, 7, 'belly', { face: true });
      p.ellipse(15, 42, 3.2, 2.3, 'nose', { face: true, shade: false });
      p.path('M17 50 Q16 58 19 62 Q21 57 21 50 Z', 'tusk', { face: true, lw: 0.7 });
      p.path('M27 51 Q27 60 31 63 Q32 57 31 51 Z', 'tusk', { face: true, lw: 0.7 });
      p.line('M14 46 L7 45 M14 48 L7 49', '#5a6a80', 0.5);
      p.eye(24, 34, 2.8, 3.6, { iris: '#2a5a9a' });
      p.eye(36, 34.5, 3.4, 4.2, { iris: '#2a5a9a' });
    },
  },
  // 9 ---------------------------------------------------------------- Admirseal
  admirseal: {
    pal: { body: '#24407a', belly: '#f0f4fa', steel: '#c4ccd8', gold: '#e8c050', dark: '#162a54', nose: '#10141e', crest: '#2e5294' },
    shiny: { body: '#3a3a44', dark: '#22222a', crest: '#4a4a56', gold: '#ff7a5a' },
    draw(p) {
      p.path('M60 90 Q80 84 88 94 L60 97 Z', 'dark');
      p.blob([[26, 52], [40, 34], [60, 34], [72, 52], [76, 82], [62, 97], [34, 97], [22, 80]], 'body');
      p.flat(blob([[32, 58], [44, 46], [58, 54], [62, 80], [52, 95], [34, 92], [28, 72]]), 'belly', { face: true });
      // flippers held at sides
      p.path('M66 56 Q84 66 86 86 Q74 84 64 72 Z', 'dark');
      p.path('M28 58 Q12 70 12 88 Q24 84 30 72 Z', 'dark', { far: true });
      // epaulettes
      p.ellipse(68, 50, 9, 5.5, 'steel', { rot: 15 });
      p.line('M62 54 L61 58 M66 55 L65.5 59 M70 55 L70 59 M74 53 L75 57', 'gold', 0.9, { face: false });
      p.ellipse(28, 50, 7, 4.5, 'steel', { rot: -15, far: true });
      p.ellipse(46, 60, 2, 2, 'gold', { face: true });
      p.ellipse(46, 70, 2, 2, 'gold', { face: true });
      // head with admiral crest
      p.path('M22 18 Q30 2 52 4 Q60 6 64 14 Q50 12 46 20 Z', 'crest');
      p.path('M30 10 Q42 4 56 8', 'gold', { shade: false, outline: false });
      p.blob([[16, 28], [24, 16], [42, 12], [56, 20], [56, 34], [44, 42], [22, 42]], 'body');
      p.ellipse(22, 34, 9.5, 6.5, 'belly', { face: true });
      p.ellipse(15, 31, 3, 2.2, 'nose', { face: true, shade: false });
      p.path('M17 38 Q15 50 19 58 Q22 50 21.5 38 Z', 'steel', { face: true, lw: 0.8 });
      p.path('M28 39 Q28 52 33 58 Q34 50 32 39 Z', 'steel', { face: true, lw: 0.8 });
      p.eye(26, 24.5, 2.6, 3.2, { iris: '#3a7ad0', lid: 'half' });
      p.eye(37, 25, 3.1, 3.8, { iris: '#3a7ad0', lid: 'half' });
    },
  },
  // 10 --------------------------------------------------------------- Chirpip
  chirpip: {
    pal: { body: '#a8784a', cream: '#f6e8cc', cap: '#2e2420', beak: '#f0a030', feet: '#e09030', wing: '#8a5e38' },
    shiny: { body: '#c0b070', wing: '#a09050', cap: '#7a3a2a' },
    draw(p) {
      p.line('M48 88 L46 96 M46 96 L42 97 M46 96 L49 97', 'feet', 1.6, { face: false });
      p.line('M58 88 L58 96 M58 96 L54 97 M58 96 L62 97', 'feet', 1.6, { face: false });
      p.path('M66 70 L86 64 L82 72 L88 76 L68 80 Z', 'wing');
      p.ellipse(52, 70, 22, 20, 'body');
      p.flat(ell(46, 78, 14, 11), 'cream', { face: true });
      p.path('M58 62 Q74 66 72 82 Q62 84 54 74 Z', 'wing');
      p.line('M60 70 Q66 72 68 78 M58 74 Q63 76 64 80', '#5a3a24', 0.6, { face: false });
      p.path('M36 52 Q44 42 60 48 Q52 52 46 58 Z', 'cap', { shade: false });
      p.path('M24 64 L32 60 L32 68 Z', 'beak', { face: true });
      p.line('M24 64 L32 64', '#8a5010', 0.5);
      p.eye(36, 60, 2.8, 3.6, { iris: '#5a3a1a' });
      p.eye(46, 60, 3.4, 4.2, { iris: '#5a3a1a' });
      blush(p, 50, 68, 2.4);
    },
  },
  // 11 --------------------------------------------------------------- Gustling
  gustling: {
    pal: { body: '#5a4e48', grey: '#9a9aa4', speck: '#f4f0e8', beak: '#f0c030', feet: '#e0a030', dark: '#3a322e' },
    shiny: { body: '#4a6a8a', dark: '#2a4a6a', beak: '#f07050' },
    draw(p) {
      // far wing
      wing(p, 58, 52, -40, 40, 'dark', { far: true });
      p.line('M48 76 L44 88 L40 90 M44 88 L47 91', 'feet', 1.4, { face: false });
      p.line('M58 76 L58 88 L54 90 M58 88 L61 91', 'feet', 1.4, { face: false });
      p.path('M66 64 L88 74 L84 78 L90 84 L68 76 Z', 'dark');
      p.blob([[30, 54], [44, 44], [62, 48], [70, 62], [62, 76], [44, 78], [32, 68]], 'body');
      p.flat(blob([[34, 62], [44, 58], [52, 68], [46, 76], [36, 72]]), 'grey');
      for (const [x, y] of [[40, 64], [46, 70], [38, 70], [56, 56], [60, 64], [52, 52]]) p.ellipse(x, y, 1.2, 1.2, 'speck', { shade: false, outline: false });
      // near wing spread
      wing(p, 48, 56, -135, 42, 'body', { tip: 'dark' });
      // head with swept crest
      p.path('M38 36 Q46 24 60 26 Q52 30 54 32 Q46 32 44 40 Z', 'dark');
      p.ellipse(36, 44, 10, 9, 'body');
      p.path('M22 44 L30 40 L31 47 Z', 'beak', { face: true });
      p.eye(32, 41, 2, 2.6, { iris: '#c02020', lid: 'angry' });
      p.eye(40, 41.5, 2.5, 3, { iris: '#c02020', lid: 'angry' });
    },
  },
  // 12 --------------------------------------------------------------- Galeharrow
  galeharrow: {
    pal: { body: '#7a7e8a', white: '#f2f2f4', dark: '#4a4e5a', crest: '#d83a2a', beak: '#f0c030', feet: '#e8b030' },
    shiny: { body: '#9a8a6a', dark: '#6a5a40', crest: '#3a8ad8' },
    draw(p) {
      wing(p, 58, 50, -38, 50, 'dark', { far: true });
      p.path('M60 70 L84 92 L76 92 L80 98 L62 86 Z', 'dark');
      p.line('M44 80 L42 92 L37 95 M42 92 L45 96 M42 92 L41 96', 'feet', 1.6, { face: false });
      p.line('M54 80 L56 92 L51 95 M56 92 L60 95', 'feet', 1.6, { face: false });
      p.blob([[30, 50], [44, 40], [62, 44], [70, 60], [62, 78], [44, 82], [32, 70]], 'body');
      p.flat(blob([[33, 56], [42, 50], [52, 62], [48, 78], [36, 72]]), 'white');
      p.line('M38 62 L42 64 M36 68 L41 70 M40 74 L45 75', 'dark', 0.6, { face: true });
      // near wing, spread wide
      wing(p, 46, 56, -140, 54, 'body', { tip: 'dark' });
      // crest: tall swept, red-tipped
      p.path('M36 28 Q38 6 56 2 Q48 12 52 14 Q46 16 50 20 Q44 24 44 32 Z', 'body');
      p.path('M46 4 Q52 2 56 2 Q48 12 52 14 Q48 14 46 10 Z', 'crest', { shade: false });
      p.ellipse(36, 36, 11, 10, 'body');
      p.ellipse(31, 40, 6, 5, 'white', { face: true, shade: false, outline: false });
      p.path('M20 34 Q16 38 20 44 L28 40 L28 32 Z', 'beak', { face: true });
      p.path('M20 44 L22 42 L24 44 Z', 'beak', { face: true });
      p.eye(31, 33, 2, 2.4, { iris: '#e0a020', lid: 'angry' });
      p.eye(39, 33.5, 2.5, 2.9, { iris: '#e0a020', lid: 'angry' });
    },
  },
  // 13 --------------------------------------------------------------- Nibbun
  nibbun: {
    pal: { body: '#b88a5a', cream: '#efd9b0', dark: '#6a4a2e', nose: '#2a1a14', tooth: '#fffaf0', tail: '#5a4030' },
    shiny: { body: '#c8b4c8', dark: '#8a6a8a', tail: '#6a4a6a' },
    draw(p) {
      p.ellipse(80, 88, 12, 5, 'tail', { rot: -10 });
      p.line('M74 86 L86 84 M76 90 L88 88', '#3a2a20', 0.5, { face: false });
      p.ellipse(56, 76, 24, 20, 'body');
      p.flat(ell(50, 82, 14, 11), 'cream', { face: true });
      p.ellipse(42, 94, 6, 3.5, 'dark');
      p.ellipse(64, 95, 6, 3.5, 'dark');
      p.ellipse(38, 80, 4, 3.5, 'dark');
      p.ellipse(62, 54, 5, 4.5, 'body', { far: true });
      p.ellipse(42, 52, 5.5, 5, 'body');
      p.ellipse(42, 52, 3, 2.6, 'cream', { shade: false, outline: false, face: true });
      p.ellipse(42, 66, 19, 15, 'body');
      p.ellipse(32, 70, 10, 8, 'cream', { face: true });
      p.ellipse(25, 66, 3, 2.2, 'nose', { face: true, shade: false });
      p.path('M28 73 L28 79 L32 79 L32 73 Z', 'tooth', { face: true, lw: 0.6 });
      p.path('M32 73 L32 79 L36 79 L36 73 Z', 'tooth', { face: true, lw: 0.6 });
      p.eye(32, 61, 2.6, 3.2, { lid: 'sleepy' });
      p.eye(44, 61.5, 3.2, 3.8, { lid: 'sleepy' });
    },
  },
  // 14 --------------------------------------------------------------- Dambuck
  dambuck: {
    pal: { body: '#8a5a34', cream: '#e8cfa4', tail: '#4a3424', nose: '#1e1410', tooth: '#fffaf0', dark: '#6a4428' },
    shiny: { body: '#c0903a', tail: '#6a4a24', dark: '#9a6a2a' },
    draw(p) {
      p.path('M58 82 Q72 66 90 70 Q96 80 86 90 Q72 94 60 92 Z', 'tail');
      p.line('M68 76 L84 88 M74 72 L90 82 M66 84 L76 92', '#2e2018', 0.6, { face: false });
      p.ellipse(38, 94, 8, 4, 'dark', { far: true });
      p.blob([[30, 54], [46, 46], [62, 54], [66, 76], [58, 94], [36, 94], [26, 76]], 'body');
      p.flat(blob([[34, 62], [46, 58], [56, 66], [56, 86], [44, 92], [34, 84]]), 'cream', { face: true });
      p.ellipse(54, 95, 9, 4, 'dark');
      p.path('M56 60 Q66 66 62 76 Q56 76 54 68 Z', 'body');
      p.ellipse(26, 66, 5, 4, 'body', { far: true });
      // head
      p.ellipse(56, 20, 4.5, 4, 'body', { far: true });
      p.ellipse(32, 20, 5, 4.5, 'body');
      p.blob([[16, 34], [20, 20], [34, 14], [52, 18], [56, 32], [46, 44], [26, 46]], 'body');
      p.ellipse(24, 37, 9.5, 7, 'cream', { face: true });
      p.ellipse(16, 33, 3, 2.2, 'nose', { face: true, shade: false });
      p.path('M19 42 L19 50 L24 50 L24 42 Z', 'tooth', { face: true, lw: 0.6 });
      p.path('M24 42 L24 50 L29 50 L29 42 Z', 'tooth', { face: true, lw: 0.6 });
      p.eye(26, 27, 2.4, 3, { iris: '#3a2a1a', lid: 'angry' });
      p.eye(37, 27.5, 2.9, 3.5, { iris: '#3a2a1a', lid: 'angry' });
      p.line('M30 44 Q34 44 36 41', '#3a2018', 0.8);
    },
  },
  // 15 --------------------------------------------------------------- Wrigglet
  wrigglet: {
    pal: { body: '#9ad04a', spot: '#f6e040', belly: '#e8f0a0', ant: '#f08a30', head: '#a8dc58' },
    shiny: { body: '#e08ab0', head: '#eca0c0', belly: '#ffe0f0', spot: '#ffffff' },
    draw(p) {
      const segs: [number, number, number][] = [[84, 86, 8], [74, 84, 9.5], [63, 80, 10.5], [52, 76, 11.5]];
      for (const [x, y, rr] of segs) {
        p.ellipse(x, y, rr, rr * 0.95, 'body');
        p.flat(ell(x - 1, y + rr * 0.55, rr * 0.7, rr * 0.35), 'belly');
        p.ellipse(x - 1, y - rr * 0.35, rr * 0.25, rr * 0.25, 'spot', { shade: false, lw: 0.5 });
        p.ellipse(x, y + rr * 0.95, 2, 1.4, 'ant', { shade: false, lw: 0.5 });
      }
      p.line('M40 52 Q38 40 32 36 M46 50 Q48 38 54 34', 'ant', 1.4, { face: false });
      p.ellipse(32, 36, 2.2, 2.2, 'ant', { shade: false });
      p.ellipse(54, 34, 2.2, 2.2, 'ant', { shade: false });
      p.ellipse(38, 66, 15, 14, 'head');
      p.eye(30, 62, 3.6, 4.6, {});
      p.eye(42, 62.5, 4.4, 5.4, {});
      mouth(p, 32, 72, 5, { open: 1.6 });
      blush(p, 47, 70, 2.4);
    },
  },
  // 16 --------------------------------------------------------------- Cocoonix
  cocoonix: {
    pal: { body: '#c8bcd8', band: '#a898c0', slit: '#3a2e4a', leaf: '#6ab84a', veins: '#3a6a2a' },
    shiny: { body: '#e8d090', band: '#c8a860', slit: '#4a3a1a' },
    draw(p) {
      p.path('M50 14 Q50 6 52 2', 'band', { shade: false });
      p.line('M51 14 Q51 6 53 2', 'band', 1.5, { face: false });
      p.blob([[36, 30], [50, 12], [64, 30], [68, 62], [62, 90], [50, 97], [38, 90], [32, 62]], 'body');
      for (const y of [24, 40, 56, 72, 86]) p.line(`M${36 + Math.abs(y - 56) * 0.12} ${y} Q50 ${y + 5} ${64 - Math.abs(y - 56) * 0.12} ${y - 2}`, 'band', 1, { face: false });
      p.path('M36 38 Q50 30 62 36 Q60 46 50 48 Q38 46 36 38 Z', 'slit', { face: true, shade: false });
      p.eye(43, 40, 2.6, 3, {});
      p.eye(55, 39.5, 3, 3.4, {});
      leaf(p, 60, 70, 76, 60, 5, 'leaf');
    },
  },
  // 17 --------------------------------------------------------------- Glimmoth
  glimmoth: {
    float: true,
    pal: { body: '#b4a0d8', wing: '#a8c8f0', wing2: '#c4a8e8', spot: '#f8e050', fuzz: '#f6eedc', ant: '#7a6aa0', dark: '#6a5a8a' },
    shiny: { wing: '#f0b8a0', wing2: '#f0d890', body: '#e0a0b0', spot: '#60e0d0' },
    draw(p) {
      // far wings
      p.path('M52 50 Q62 14 92 10 Q98 30 80 48 Q70 54 54 54 Z', 'wing2', { far: true });
      p.path('M54 58 Q80 58 88 74 Q80 88 64 80 Q56 72 54 60 Z', 'wing', { far: true });
      // abdomen
      p.ellipse(56, 72, 9, 14, 'body', { rot: -20 });
      p.line('M50 66 Q56 64 60 68 M50 74 Q56 72 62 76', 'dark', 0.6, { face: false });
      // near wings
      p.path('M48 50 Q36 10 6 8 Q0 30 18 48 Q30 56 46 56 Z', 'wing');
      p.path('M46 58 Q22 58 12 76 Q22 92 38 82 Q46 74 48 60 Z', 'wing2');
      p.ellipse(22, 30, 7, 6, 'spot', { lw: 0.8 });
      p.ellipse(22, 30, 3, 2.6, 'dark', { shade: false, outline: false });
      p.ellipse(26, 74, 5, 4.5, 'spot', { lw: 0.8 });
      p.ellipse(78, 30, 5, 4.5, 'spot', { lw: 0.8, far: true });
      p.ellipse(52, 52, 9, 9, 'body');
      p.blob([[38, 50], [44, 42], [54, 44], [60, 50], [54, 56], [44, 58]], 'fuzz');
      p.line('M40 32 Q34 20 26 16 M48 32 Q52 20 60 14', 'ant', 1.1, { face: false });
      p.path(leafPath(36, 26, 24, 14, 4), 'ant', { shade: false });
      p.path(leafPath(52, 24, 62, 12, 4), 'ant', { shade: false });
      p.ellipse(44, 38, 9, 8, 'body');
      p.eye(39.5, 37, 2.6, 3.2, { iris: '#7a4ac0' });
      p.eye(48, 37.5, 3, 3.6, { iris: '#7a4ac0' });
      mouth(p, 42, 43, 3);
    },
  },
  // 18 --------------------------------------------------------------- Sparkit
  sparkit: {
    pal: { body: '#5a8ad8', mane: '#2a3a6a', bolt: '#f8d830', dark: '#3a5a9a', nose: '#1a1a2a', inner: '#ffd0e0', cream: '#dce8fa' },
    shiny: { body: '#e8c040', dark: '#b08a20', bolt: '#4a7af0', mane: '#6a4a10', cream: '#fff4d0' },
    draw(p) {
      p.path('M68 76 Q82 74 84 60 Q87 66 83 72 Q76 80 68 81 Z', 'body');
      p.path('M84 44 L87 52 L95 53 L89 58 L91 66 L84 61 L77 66 L79 58 L73 53 L81 52 Z', 'bolt');
      leg(p, 46, 78, 8, 95, 'dark', { far: true });
      leg(p, 66, 79, 8, 95, 'dark', { far: true });
      p.ellipse(57, 78, 18, 12.5, 'body');
      p.flat(ell(52, 84, 10, 5), 'cream', { face: true });
      leg(p, 50, 82, 8.5, 97, 'body', { paw: 'dark' });
      leg(p, 66, 83, 8.5, 97, 'body', { paw: 'dark' });
      p.path('M46 89 L50 86 L54 89', 'bolt', { shade: false, lw: 0.5 });
      p.path('M62 90 L66 87 L70 90', 'bolt', { shade: false, lw: 0.5 });
      // ears
      p.path('M40 44 Q44 26 56 24 Q56 38 50 48 Z', 'body');
      p.path('M44 42 Q47 32 53 29 Q53 37 49 44 Z', 'inner', { shade: false, outline: false, face: true });
      p.path('M22 46 Q14 32 20 24 Q30 32 32 44 Z', 'body', { far: true });
      // round head with a cheek ruff
      p.blob([[14, 62], [20, 48], [34, 42], [48, 46], [54, 58], [46, 70], [28, 72], [16, 68]], 'body');
      p.path('M44 66 L52 70 L46 72 L52 76 L42 74 Z', 'body', { shade: false });
      p.path('M30 42 Q34 32 40 36 Q40 28 47 31 Q46 40 40 44 Z', 'mane', { shade: false });
      p.ellipse(19, 64, 7.5, 5.5, 'cream', { face: true, shade: false, outline: false });
      p.ellipse(13.5, 61, 2.4, 1.8, 'nose', { face: true, shade: false });
      p.eye(25, 55, 3.8, 4.8, { iris: '#f0b020' });
      p.eye(38, 55.5, 4.6, 5.6, { iris: '#f0b020' });
      mouth(p, 18, 67, 4, { open: 2, fang: true });
    },
  },
  // 19 --------------------------------------------------------------- Voltabby
  voltabby: {
    pal: { body: '#4a76c4', mane: '#22305e', bolt: '#f8d830', dark: '#2e4a88', nose: '#141420', tuft: '#1a2448', cream: '#cfdcf4' },
    shiny: { body: '#e0b030', dark: '#a07a10', mane: '#5a3a08', tuft: '#4a2a04', bolt: '#3a6af0', cream: '#fff0c8' },
    draw(p) {
      p.path('M74 60 Q88 52 88 38 Q92 46 88 54 Q82 64 74 66 Z', 'body');
      p.path('M88 24 L91 32 L99 33 L93 38 L95 46 L88 41 L81 46 L83 38 L77 33 L85 32 Z', 'bolt');
      leg(p, 36, 66, 8.5, 94, 'dark', { far: true });
      leg(p, 70, 66, 8.5, 93, 'dark', { far: true });
      p.blob([[26, 58], [44, 50], [66, 52], [80, 62], [74, 74], [50, 76], [30, 72]], 'body');
      p.path('M52 56 L56 62 L52 64 L58 70', 'bolt', { shade: false, outline: false });
      p.path('M62 56 L66 62 L62 64 L68 70', 'bolt', { shade: false, outline: false });
      leg(p, 42, 70, 9.5, 97, 'body', { paw: 'dark' });
      leg(p, 74, 70, 9.5, 96, 'body', { paw: 'dark' });
      p.path('M38 84 L42 81 L46 84', 'bolt', { shade: false, lw: 0.5 });
      p.path('M70 84 L74 81 L78 84', 'bolt', { shade: false, lw: 0.5 });
      // mane over the shoulders
      p.blob([[24, 36], [34, 28], [48, 30], [54, 42], [50, 58], [36, 62], [26, 54]], 'mane');
      // tufted ears
      p.path('M34 28 Q36 14 46 10 Q48 20 42 30 Z', 'body');
      p.path('M45 11 L49 3 L47 13 Z', 'tuft', { shade: false });
      p.path('M18 30 Q12 18 18 12 Q26 20 28 28 Z', 'body', { far: true });
      p.path('M18 13 L15 5 L20 12 Z', 'tuft', { shade: false });
      // head with lynx cheek ruffs
      // cheek ruffs: fluffy points flaring down and back from the jaw
      p.path('M30 40 L47 44 L40 47 L46 52 L38 52 L41 57 L28 52 Z', 'body');
      p.blob([[11, 40], [14, 29], [27, 23], [40, 28], [41, 40], [31, 48], [16, 48]], 'body');
      p.ellipse(15, 43, 5.5, 4, 'cream', { face: true, shade: false, outline: false });
      p.ellipse(10.5, 40.5, 2.2, 1.6, 'nose', { face: true, shade: false });
      p.eye(20, 35, 3.2, 3.8, { iris: '#f8c020', lid: 'angry' });
      p.eye(31.5, 35.5, 3.8, 4.5, { iris: '#f8c020', lid: 'angry' });
      p.line('M13 46 Q16 47 20 45', '#1a1a2a', 0.8);
    },
  },
  // 20 --------------------------------------------------------------- Thunderion
  thunderion: {
    pal: { body: '#2e4e96', mane: '#1a1a2a', gold: '#f2c430', bolt: '#f8d830', dark: '#1e3468', nose: '#0e0e14', cream: '#9ab0dc' },
    shiny: { body: '#8a8a96', dark: '#5a5a66', mane: '#e8e8f0', gold: '#e04a3a', bolt: '#ff6a4a', cream: '#d8d8e0' },
    draw(p) {
      p.path('M80 54 Q94 46 94 30 Q98 40 94 50 Q88 60 80 62 Z', 'body');
      p.path('M94 14 L97 23 L106 24 L99 29 L101 38 L94 33 L87 38 L89 29 L82 24 L91 23 Z', 'bolt');
      leg(p, 44, 64, 11, 93, 'dark', { far: true });
      leg(p, 76, 64, 11, 92, 'dark', { far: true });
      p.blob([[30, 54], [50, 46], [74, 48], [86, 58], [80, 72], [54, 76], [34, 70]], 'body');
      for (const x of [58, 68]) p.path(`M${x} 52 L${x + 4} 60 L${x} 62 L${x + 6} 70`, 'bolt', { shade: false, outline: false });
      leg(p, 50, 68, 12, 97, 'body', { paw: 'dark' });
      leg(p, 80, 68, 12, 96, 'body', { paw: 'dark' });
      // huge spiky mane edged in gold
      const spikes: [number, number][] = [];
      const cx = 34, cy = 38;
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        const rr = i % 2 ? 23 : 30;
        spikes.push([r(cx + Math.cos(a) * rr * 1.08), r(cy + Math.sin(a) * rr)]);
      }
      p.part(blob(spikes, 0.35), 'gold');
      const inner = spikes.map(([x, y]) => [r(cx + (x - cx) * 0.84), r(cy + (y - cy) * 0.84)] as [number, number]);
      p.part(blob(inner, 0.35), 'mane', { outline: false });
      p.ellipse(42, 22, 4.5, 4, 'body');
      p.ellipse(24, 24, 4, 3.6, 'body', { far: true });
      p.blob([[14, 44], [18, 32], [32, 26], [46, 30], [48, 46], [36, 54], [18, 52]], 'body');
      p.ellipse(19, 47, 7, 5.2, 'cream', { face: true, shade: false, outline: false });
      p.ellipse(13, 44, 2.4, 1.8, 'nose', { face: true, shade: false });
      p.eye(25, 37, 2.8, 3, { iris: '#f8c020', lid: 'angry' });
      p.eye(37, 37.5, 3.4, 3.6, { iris: '#f8c020', lid: 'angry' });
      mouth(p, 20, 50, 7, { open: 2.2, fang: true });
    },
  },
  // 21 --------------------------------------------------------------- Pebblet
  pebblet: {
    pal: { body: '#9a9aa0', dark: '#6a6a72', moss: '#6ab048', crack: '#4a4a52' },
    shiny: { body: '#c8a878', dark: '#8a6a48', moss: '#e080b0' },
    draw(p) {
      p.ellipse(72, 74, 7, 6, 'body', { far: true });
      p.blob([[26, 70], [32, 52], [50, 44], [68, 50], [76, 68], [70, 88], [50, 96], [30, 90]], 'body');
      p.line('M60 54 L56 62 L62 68 M36 80 L42 84 L40 90', 'crack', 0.8, { face: false });
      p.line('M64 74 L70 80', 'crack', 0.8, { face: false });
      p.blob([[44, 46], [48, 40], [54, 41], [58, 46], [52, 49]], 'moss');
      p.ellipse(30, 78, 7.5, 6.5, 'body', { rot: 20 });
      p.eye(36, 64, 3, 3.8, { lid: 'angry' });
      p.eye(48, 64.5, 3.6, 4.4, { lid: 'angry' });
      p.line('M36 76 Q42 73 48 76', '#2a2a32', 0.9);
    },
  },
  // 22 --------------------------------------------------------------- Boulderon
  boulderon: {
    pal: { body: '#8a7a6a', strata: '#6a5a4a', light: '#b0a090', crystal: '#a8dcf0', dark: '#5a4a3a' },
    shiny: { body: '#6a7a8a', strata: '#4a5a6a', light: '#90a0b0', crystal: '#f0a8d8' },
    draw(p) {
      leg(p, 32, 72, 11, 93, 'dark', { far: true });
      leg(p, 74, 72, 11, 92, 'dark', { far: true });
      p.blob([[16, 62], [24, 40], [48, 30], [74, 34], [90, 52], [86, 74], [60, 82], [28, 80]], 'body');
      p.path('M22 56 Q50 50 88 58 L87 64 Q50 56 21 62 Z', 'strata', { shade: false, outline: false });
      p.path('M24 70 Q52 64 86 70 L84 75 Q52 70 26 76 Z', 'light', { shade: false, outline: false });
      // crystals
      for (const [x, y, h, l] of [[44, 34, 18, -3], [56, 32, 22, 2], [66, 36, 16, 4], [76, 42, 12, 5]]) {
        p.path(`M${x - 4} ${y + 2} L${x + l} ${y - h} L${x + 4} ${y + 2} Z`, 'crystal');
        p.line(`M${x + l * 0.5} ${y - h * 0.6} L${x + l * 0.3} ${y}`, '#ffffff', 0.5, { face: false, alpha: 0.8 });
      }
      leg(p, 38, 74, 12, 97, 'body');
      leg(p, 78, 74, 12, 96, 'body');
      // head (low, forward)
      p.blob([[6, 60], [10, 48], [22, 42], [34, 48], [34, 62], [24, 70], [10, 68]], 'body');
      p.path('M8 52 Q20 48 32 52', 'strata', { shade: false, outline: false, face: true });
      p.eye(15, 56, 2.4, 2.8, { lid: 'angry', iris: '#e0a030' });
      p.eye(25, 56.5, 2.9, 3.4, { lid: 'angry', iris: '#e0a030' });
      p.line('M10 65 Q16 63 22 65', '#2a2018', 0.9);
    },
  },
  // 23 --------------------------------------------------------------- Craniodon
  craniodon: {
    pal: { body: '#4aa0a0', dome: '#8a9ab0', spike: '#c8ccd8', belly: '#d8e4c8', dark: '#2e7070', claw: '#f0f0e0' },
    shiny: { body: '#c08a4a', dark: '#8a5a2a', dome: '#7a7a8a' },
    draw(p) {
      p.path('M62 74 Q82 72 94 82 Q82 86 64 86 Z', 'body');
      leg(p, 60, 78, 8, 95, 'dark', { far: true });
      p.blob([[34, 62], [48, 54], [64, 62], [66, 80], [54, 90], [38, 86], [30, 74]], 'body');
      p.flat(blob([[36, 70], [46, 66], [54, 74], [50, 86], [40, 84]]), 'belly', { face: true });
      p.path('M50 56 L54 52 L56 58 L60 54 L62 62', 'dark', { shade: false, outline: false, backOnly: true });
      leg(p, 44, 80, 9, 97, 'body');
      p.path('M38 96 L40 93 L42 96 M44 96 L46 93 L48 96', 'claw', { shade: false, lw: 0.5 });
      p.path('M32 68 Q24 70 22 76 Q26 76 30 74', 'body');
      // dome head
      p.blob([[12, 52], [14, 40], [24, 34], [36, 38], [40, 50], [32, 60], [16, 60]], 'body');
      p.path('M14 40 Q16 16 38 16 Q54 18 54 36 Q50 46 40 46 Q30 38 14 40 Z', 'dome');
      for (const [x, y] of [[52, 24], [56, 32], [54, 40]]) p.path(`M${x - 2} ${y - 3} L${x + 5} ${y} L${x - 2} ${y + 3} Z`, 'spike', { lw: 0.7 });
      p.line('M24 24 Q34 20 44 24', '#ffffff', 0.8, { face: false, alpha: 0.6 });
      p.eye(20, 47, 2.4, 3, { lid: 'angry', iris: '#e04020' });
      p.eye(29, 47.5, 2.9, 3.5, { lid: 'angry', iris: '#e04020' });
      mouth(p, 15, 56, 6, { open: 1.6, fang: true });
    },
  },
  // 24 --------------------------------------------------------------- Ramparadon
  ramparadon: {
    pal: { body: '#2e6a80', dome: '#7a8aa0', spike: '#d4d8e4', belly: '#a8c4c8', dark: '#1e4658', claw: '#f0f0e0', stripe: '#1a3a4a' },
    shiny: { body: '#7a3a3a', dark: '#4a2020', stripe: '#3a1818', belly: '#d8b0a0' },
    draw(p) {
      p.path('M64 66 Q86 62 98 80 Q84 82 66 82 Z', 'body');
      leg(p, 64, 74, 11, 94, 'dark', { far: true });
      p.blob([[30, 50], [50, 40], [68, 50], [72, 72], [60, 86], [38, 84], [26, 68]], 'body');
      p.flat(blob([[32, 60], [44, 54], [56, 64], [54, 82], [40, 82]]), 'belly', { face: true });
      for (const y of [58, 66, 74]) p.line(`M60 ${y} L70 ${y - 2}`, 'stripe', 1.4, { face: false });
      leg(p, 46, 76, 12, 97, 'body');
      p.path('M38 96 L41 92 L44 96 M47 96 L50 92 L53 96', 'claw', { shade: false, lw: 0.5 });
      // muscular arm
      p.path('M36 56 Q20 58 16 70 Q22 76 30 70 Q34 64 42 64 Z', 'body');
      p.path('M14 68 L12 72 M18 72 L17 76', 'claw', { lw: 1 });
      // armoured dome with spike ring
      for (let i = 0; i < 7; i++) {
        const a = Math.PI * (0.95 + i * 0.17);
        const x = 32 + Math.cos(a) * 24, y = 30 + Math.sin(a) * 20;
        const x2 = 32 + Math.cos(a) * 33, y2 = 30 + Math.sin(a) * 28;
        p.path(`M${r(x - Math.sin(a) * 4)} ${r(y + Math.cos(a) * 4)} L${r(x2)} ${r(y2)} L${r(x + Math.sin(a) * 4)} ${r(y - Math.cos(a) * 4)} Z`, 'spike', { lw: 0.8 });
      }
      p.blob([[6, 46], [10, 36], [22, 32], [34, 36], [38, 48], [28, 56], [12, 56]], 'body');
      p.path('M8 36 Q8 8 34 8 Q58 10 58 32 Q54 42 42 42 Q28 32 8 36 Z', 'dome');
      p.line('M18 18 Q32 12 46 18', '#ffffff', 1, { face: false, alpha: 0.5 });
      p.eye(15, 42, 2.4, 2.8, { lid: 'angry', iris: '#f04020' });
      p.eye(24, 42.5, 2.9, 3.3, { lid: 'angry', iris: '#f04020' });
      mouth(p, 12, 52, 9, { open: 2.4, fang: true });
    },
  },
  // 25 --------------------------------------------------------------- Mosscap
  mosscap: {
    pal: { cap: '#b0386a', spot: '#f6e8d0', stalk: '#f0e2c4', moss: '#6aa848', gill: '#d8b8a0', dark: '#8a6a50' },
    shiny: { cap: '#3a7ac0', moss: '#c8a848' },
    main: 'cap',
    draw(p) {
      p.ellipse(42, 95, 7, 3.5, 'dark', { far: true });
      p.ellipse(60, 95, 7, 3.5, 'dark');
      p.blob([[34, 62], [50, 56], [66, 62], [68, 84], [58, 94], [40, 94], [32, 84]], 'stalk');
      p.ellipse(30, 76, 4.5, 6, 'stalk', { rot: 20 });
      p.ellipse(70, 76, 4.5, 6, 'stalk', { rot: -20, far: true });
      p.eye(42, 74, 2.8, 3.4, { lid: 'sleepy' });
      p.eye(54, 74.5, 3.3, 3.9, { lid: 'sleepy' });
      mouth(p, 46, 84, 4);
      p.path('M14 60 Q50 72 88 60 Q80 66 50 68 Q22 66 14 60 Z', 'gill', { shade: false });
      p.path('M12 60 Q14 26 50 22 Q86 26 88 60 Q50 70 12 60 Z', 'cap');
      for (const [x, y, rr] of [[30, 40, 5], [50, 32, 6], [70, 42, 5], [40, 54, 3.5], [62, 55, 3.5], [20, 52, 3]]) p.ellipse(x, y, rr, rr * 0.85, 'spot', { shade: false, lw: 0.6 });
      p.blob([[26, 64], [30, 60], [36, 62], [34, 67], [28, 67]], 'moss');
      p.blob([[70, 64], [74, 60], [80, 61], [78, 66]], 'moss');
    },
  },
  // 26 --------------------------------------------------------------- Wispurr
  wispurr: {
    float: true,
    pal: { body: '#b8a4e0', dark: '#7a64b0', inner: '#f0c0e0', glow: '#60f0f0' },
    shiny: { body: '#a0e0b8', dark: '#60a07a', glow: '#ffb040' },
    draw(p) {
      p.part(svg('M48 64 Q70 66 76 80 Q80 92 92 90 Q84 98 72 94 Q60 90 54 82 Z'), 'body', { alpha: 0.75 });
      p.part(svg('M76 82 Q86 74 94 78 Q88 82 86 86 Z'), 'body', { alpha: 0.6 });
      p.part(blob([[30, 60], [44, 52], [60, 58], [62, 74], [54, 84], [38, 82], [30, 72]]), 'body', { alpha: 0.88 });
      p.ellipse(40, 80, 4.5, 6, 'body', { alpha: 0.9 });
      p.ellipse(30, 78, 4, 5.5, 'body', { alpha: 0.85, far: true });
      p.path('M42 34 Q46 16 58 12 Q60 26 52 38 Z', 'body');
      p.path('M46 32 Q49 21 55 18 Q55 27 51 34 Z', 'inner', { shade: false, outline: false, face: true });
      p.path('M22 36 Q16 20 20 12 Q28 20 32 34 Z', 'body', { far: true });
      p.blob([[18, 50], [22, 38], [36, 32], [52, 36], [56, 48], [48, 60], [30, 62], [20, 58]], 'body');
      p.eye(28, 45, 3.4, 4.4, { iris: 'glow' });
      p.eye(40, 45.5, 4, 5, { iris: 'glow' });
      p.line('M22 54 Q26 58 30 54 Q34 58 38 54', '#3a2a5a', 0.9);
      p.line('M18 50 L10 48 M18 53 L10 54', '#7a64b0', 0.5);
      p.ellipse(56, 66, 1.8, 1.8, 'glow', { shade: false, outline: false, alpha: 0.7, backOnly: true });
    },
  },
  // 27 --------------------------------------------------------------- Frostbun
  frostbun: {
    pal: { body: '#f4f8fc', ice: '#8ad0f0', dark: '#c4d4e4', inner: '#c8ecfa', nose: '#6a8ab0' },
    shiny: { body: '#fce8f0', ice: '#f08ab8', inner: '#fcd0e4', dark: '#e4c4d4' },
    draw(p) {
      p.ellipse(76, 80, 7, 7, 'body');
      p.ellipse(44, 94, 7, 3.5, 'ice', { far: true });
      p.ellipse(58, 76, 17, 15, 'body');
      p.ellipse(64, 94, 8, 3.8, 'ice');
      p.ellipse(42, 82, 4, 4.5, 'ice');
      // long ears
      p.path('M42 46 Q40 14 50 6 Q58 16 50 48 Z', 'body');
      p.path('M45 42 Q44 18 50 11 Q54 20 49 42 Z', 'inner', { shade: false, outline: false, face: true });
      p.path('M44 14 Q50 2 54 12 Q50 10 46 16 Z', 'ice', { shade: false, outline: false });
      p.path('M30 46 Q22 18 28 10 Q38 20 36 46 Z', 'body', { far: true });
      p.path('M24 16 Q28 6 34 16 Q30 14 26 18 Z', 'ice', { shade: false, outline: false });
      p.ellipse(38, 60, 16, 14, 'body');
      p.path('M36 47 L37 50 L40 50 L37.5 52 L38.5 55 L36 53 L33.5 55 L34.5 52 L32 50 L35 50 Z', 'ice', { shade: false, lw: 0.5, face: true });
      p.ellipse(25, 64, 2, 1.5, 'nose', { face: true, shade: false });
      p.eye(31, 58, 3, 4, { iris: '#4a9ad0' });
      p.eye(42, 58.5, 3.7, 4.7, { iris: '#4a9ad0' });
      mouth(p, 28, 68, 4);
      blush(p, 46, 66, 2.6);
      p.ellipse(16, 66, 4, 2.5, 'inner', { face: true, shade: false, outline: false, alpha: 0.6 });
    },
  },
  // 28 --------------------------------------------------------------- Brawlet
  brawlet: {
    pal: { body: '#e06a3a', face: '#f6d8b0', wrap: '#f8f8f0', band: '#3a6ad8', dark: '#a8442a' },
    shiny: { body: '#6a8ae0', dark: '#3a5aa8', band: '#e04a4a' },
    draw(p) {
      p.path('M60 80 Q80 84 80 70 Q78 62 72 66 Q76 74 64 74 Z', 'body');
      leg(p, 56, 78, 8, 96, 'dark', { far: true });
      p.blob([[36, 58], [50, 52], [64, 58], [64, 76], [56, 86], [40, 86], [34, 74]], 'body');
      p.flat(ell(47, 72, 9, 10), 'face', { face: true });
      leg(p, 42, 80, 9, 97, 'body');
      // fists
      p.path('M62 60 Q74 58 74 68 L70 70 Q68 64 62 66 Z', 'body', { far: true });
      p.ellipse(76, 66, 8, 7.5, 'wrap', { far: true });
      p.path('M36 60 Q26 66 24 74 L30 76 Q32 70 38 66 Z', 'body');
      p.ellipse(22, 74, 9, 8.5, 'wrap');
      p.line('M16 72 Q22 70 28 72 M16 76 Q22 74 28 76', '#c0c0b0', 0.6, { face: false });
      // head
      p.path('M58 36 Q72 40 80 32 Q76 42 66 44 Z', 'band', { shade: false });
      p.path('M60 40 Q74 50 82 46 Q74 54 62 46 Z', 'band', { shade: false });
      p.ellipse(56, 38, 5, 5, 'body', { far: true });
      p.ellipse(46, 44, 16, 15, 'body');
      p.blob([[30, 48], [36, 40], [48, 40], [54, 48], [48, 58], [34, 58]], 'face', { face: true });
      p.path('M30 34 Q46 28 62 36 L62 40 Q46 32 30 39 Z', 'band');
      p.eye(37, 46, 2.6, 3.2, { lid: 'angry', iris: '#3a2a1a' });
      p.eye(47, 46.5, 3.1, 3.7, { lid: 'angry', iris: '#3a2a1a' });
      mouth(p, 40, 53, 7, { open: 2, fang: true });
    },
  },
  // 29 --------------------------------------------------------------- Gearling
  gearling: {
    pal: { body: '#b8c0cc', gear: '#d8a840', visor: '#2a3a5a', dark: '#7a8494', glow: '#7af0ff' },
    shiny: { body: '#d8b8c0', gear: '#60c0a0', glow: '#ff9a7a' },
    draw(p) {
      // cog gear on back
      const teeth: [number, number][] = [];
      const gx = 60, gy = 52;
      for (let i = 0; i < 20; i++) {
        const a = (i / 20) * Math.PI * 2;
        const rr = i % 2 ? 19 : 24;
        const a2 = a + (i % 2 ? 0.08 : -0.08);
        teeth.push([r(gx + Math.cos(a2) * rr), r(gy + Math.sin(a2) * rr)]);
      }
      p.part(poly(teeth), 'gear');
      p.ellipse(gx, gy, 7, 7, 'dark');
      p.ellipse(gx, gy, 3, 3, 'gear', { shade: false });
      for (const [x, s] of [[34, 1], [48, 1], [62, 1]] as const) leg(p, x + 6 * s, 84, 4.5, 95, 'dark', { far: true });
      p.blob([[20, 72], [30, 56], [52, 52], [72, 60], [78, 76], [66, 90], [34, 90], [22, 84]], 'body');
      p.line('M30 66 Q50 60 72 70', 'dark', 0.8, { face: false });
      p.ellipse(56, 76, 2, 2, 'dark', { shade: false });
      p.ellipse(66, 74, 2, 2, 'dark', { shade: false });
      for (const x of [32, 46, 60]) leg(p, x, 86, 5, 97, 'body');
      p.path('M18 64 Q34 58 50 64 Q50 74 34 76 Q20 74 18 64 Z', 'visor', { face: true });
      p.ellipse(28, 67, 3.4, 3.8, 'glow', { face: true, shade: false, outline: false });
      p.ellipse(41, 67.5, 4, 4.4, 'glow', { face: true, shade: false, outline: false });
      p.ellipse(27, 65.5, 1.2, 1.2, '#ffffff', { face: true, shade: false, outline: false });
      p.ellipse(40, 66, 1.4, 1.4, '#ffffff', { face: true, shade: false, outline: false });
      p.line('M26 82 Q31 84 36 82', '#3a3a4a', 0.8);
    },
  },
  // 30 --------------------------------------------------------------- Finfry
  finfry: {
    pal: { body: '#d8c890', silver: '#eceae0', fin: '#f6d040', mouth: '#c0505a', dark: '#a89060' },
    shiny: { body: '#e89a6a', silver: '#f8e0d0', fin: '#f0f0f0' },
    draw(p) {
      p.path('M70 64 Q86 48 94 54 Q88 64 94 76 Q86 80 70 70 Z', 'fin');
      p.path('M40 46 Q42 28 52 24 Q58 30 54 34 Q62 30 64 36 Q66 42 62 50 Z', 'fin');
      p.path('M50 76 Q54 90 62 92 Q60 82 60 76 Z', 'fin', { far: true });
      p.blob([[14, 62], [24, 46], [46, 42], [66, 50], [74, 66], [62, 80], [38, 82], [18, 76]], 'body');
      p.flat(blob([[22, 68], [40, 62], [60, 66], [62, 76], [40, 80], [22, 76]]), 'silver');
      for (const [x, y] of [[44, 56], [52, 58], [48, 64], [56, 66], [60, 58]]) p.line(`M${x - 2} ${y - 2} Q${x + 1} ${y} ${x - 2} ${y + 2}`, 'dark', 0.6, { face: false });
      p.path('M36 70 Q44 78 48 70 Q44 74 36 70 Z', 'fin');
      // gaping mouth
      p.path('M10 58 Q6 64 10 70 Q16 72 20 64 Q16 58 10 58 Z', 'mouth', { face: true, shade: false });
      p.path('M12 62 Q14 66 12 68', '#ffffff', { face: true, shade: false, outline: false, alpha: 0.6 });
      p.line('M18 70 Q14 80 18 86 M22 70 Q24 80 28 84', 'fin', 1, { face: true });
      p.ellipse(30, 56, 6, 6, '#ffffff', { face: true, shade: false, lw: 0.8 });
      p.ellipse(29, 56, 1.6, 1.6, '#1c1424', { face: true, shade: false, outline: false });
    },
  },
  // 31 --------------------------------------------------------------- Leviafin
  leviafin: {
    pal: { body: '#2a8a8a', belly: '#e8c860', fin: '#c8e8f0', dark: '#1a5a60', whisker: '#f0e0a0' },
    shiny: { body: '#c83a3a', dark: '#8a2020', fin: '#f0e0e0', belly: '#f8e8a0' },
    draw(p) {
      // S-coil body (back to front)
      p.path('M58 86 Q92 92 92 70 Q92 50 70 52 Q60 54 58 62 Q70 58 78 62 Q84 70 76 78 Q66 82 54 76 Z', 'body');
      p.path('M78 52 L86 44 L88 52 L94 50 L92 58', 'fin', { lw: 0.8 });
      p.path('M88 86 Q98 90 96 98 Q90 94 84 94 Z', 'fin');
      p.path('M24 90 Q20 70 38 64 Q56 60 62 74 Q66 90 50 96 Q36 98 24 90 Z', 'body');
      p.flat(svg('M28 88 Q26 76 38 72 Q50 70 54 80 Q54 90 44 92 Q34 94 28 88 Z'), 'belly', { face: true });
      for (const x of [34, 42, 50]) p.line(`M${x - 4} ${x === 42 ? 74 : 78} Q${x} ${x === 42 ? 76 : 80} ${x + 2} ${x === 42 ? 74 : 78}`, 'dark', 0.5, { face: false });
      // neck rising
      p.path('M30 70 Q22 50 26 34 Q30 22 42 22 Q50 34 46 50 Q44 60 48 66 Z', 'body');
      p.flat(svg('M30 66 Q24 50 28 38 L34 38 Q32 52 38 66 Z'), 'belly', { face: true });
      for (const [x, y] of [[44, 30], [47, 40], [46, 50], [48, 60]]) p.path(`M${x} ${y - 4} L${x + 9} ${y - 2} L${x} ${y + 3} Z`, 'fin', { lw: 0.8 });
      // head
      p.path('M30 12 Q38 0 50 2 Q44 8 46 12 Z', 'fin');
      p.blob([[6, 26], [12, 14], [30, 10], [44, 16], [44, 30], [30, 34], [10, 34]], 'body');
      p.path('M6 28 Q16 24 26 30 Q22 36 12 36 Q6 34 6 28 Z', 'belly', { face: true });
      p.path('M8 32 Q16 36 24 32 L22 38 Q14 42 8 36 Z', '#5a1f2c', { face: true, shade: false });
      p.path('M10 33 L11 37 L13 33 Z M17 34 L18 38 L20 34 Z', '#ffffff', { face: true, shade: false, lw: 0.4 });
      p.line('M10 24 Q0 22 -2 30 M14 26 Q6 30 6 38', 'whisker', 0.9, { face: true });
      p.eye(22, 20, 2.4, 2.6, { iris: '#e02020', lid: 'angry' });
      p.eye(32, 20.5, 3, 3.2, { iris: '#e02020', lid: 'angry' });
    },
  },
  // 32 --------------------------------------------------------------- Lumipix
  lumipix: {
    float: true,
    pal: { body: '#f6c4dc', white: '#fff6fb', crystal: '#a88af0', wing: '#d8f0ff', ribbon: '#f490c0' },
    shiny: { body: '#c4e4f6', ribbon: '#90b8f4', crystal: '#f0c84a' },
    draw(p) {
      p.path('M48 70 Q62 82 58 92 Q70 86 74 96 Q80 82 64 74 Q56 70 52 68 Z', 'ribbon');
      p.part(svg('M54 50 Q74 30 88 40 Q84 56 60 60 Z'), 'wing', { alpha: 0.7, far: true });
      p.ellipse(46, 66, 9, 10, 'body');
      p.ellipse(38, 70, 3, 4.5, 'white', { rot: 30 });
      p.part(svg('M40 52 Q20 30 8 40 Q10 58 36 60 Z'), 'wing', { alpha: 0.8 });
      p.ellipse(44, 46, 15, 14, 'body');
      p.ellipse(42, 50, 11, 8, 'white', { shade: false, outline: false, face: true });
      p.path('M40 26 L44 34 L52 34 L46 38 L48 46 L42 41 L36 46 L38 38 L32 34 L40 34 Z', 'crystal');
      p.sparkle(40, 31, 2);
      p.eye(37, 47, 2.8, 3.6, { iris: '#c04a8a' });
      p.eye(47, 47.5, 3.3, 4.1, { iris: '#c04a8a' });
      mouth(p, 41, 55, 3);
      blush(p, 51, 52, 2.2);
      p.sparkle(20, 66, 2.4);
      p.sparkle(70, 62, 1.8);
      p.sparkle(62, 90, 1.6);
    },
  },
  // 33 --------------------------------------------------------------- Duskit
  duskit: {
    pal: { body: '#2e2838', sheen: '#6a4a9a', beak: '#f0c030', feet: '#e0a030', dark: '#1a1622' },
    shiny: { body: '#e8e4ec', sheen: '#f0a0c0', dark: '#b8b0c4' },
    draw(p) {
      p.path('M60 70 Q80 66 90 76 Q84 78 88 84 Q76 82 72 86 Q66 80 60 80 Z', 'body');
      p.line('M44 84 L42 94 L38 96 M42 94 L45 97', 'feet', 1.4, { face: false });
      p.line('M54 84 L54 94 L50 96 M54 94 L58 96', 'feet', 1.4, { face: false });
      p.ellipse(50, 70, 18, 16, 'body');
      p.path('M56 60 Q72 64 70 80 Q60 82 52 72 Z', 'body');
      p.path('M58 64 Q66 66 66 76', 'sheen', { shade: false, outline: false, alpha: 0.7 });
      // hat-like crest
      p.path('M20 40 Q36 24 60 30 Q66 34 64 40 Q44 36 22 44 Z', 'body');
      p.path('M30 34 Q42 26 56 30', 'sheen', { shade: false, outline: false, alpha: 0.7 });
      p.ellipse(42, 50, 14, 12, 'body');
      p.path('M24 52 L33 48 L34 56 Z', 'beak', { face: true });
      p.eye(35, 48, 2.6, 3, { iris: '#e02a2a', lid: 'half' });
      p.eye(45, 48.5, 3, 3.5, { iris: '#e02a2a', lid: 'half' });
      p.line('M36 57 Q40 58 44 56', '#000000', 0.7);
    },
  },
  // 34 --------------------------------------------------------------- Molekin
  molekin: {
    pal: { body: '#8a6a5a', claw: '#f4b0b8', nose: '#f48a9a', tuft: '#f2d040', dark: '#5a4438' },
    shiny: { body: '#4a4a5a', dark: '#2e2e3a', tuft: '#40d0f0' },
    draw(p) {
      p.ellipse(66, 90, 9, 5, 'dark', { far: true });
      p.ellipse(54, 72, 22, 21, 'body');
      p.ellipse(40, 92, 9, 5, 'dark');
      // big pink claws
      p.path('M30 74 Q18 74 14 84 L18 86 L20 82 L22 88 L26 84 L28 89 L32 82 Z', 'claw');
      p.path('M66 72 Q78 74 80 84 L76 86 L74 82 L72 88 L68 83 L66 88 L62 80 Z', 'claw', { far: true });
      p.path('M44 52 Q46 40 54 42 Q50 46 54 48 Q58 42 62 46 Q56 50 52 54 Z', 'tuft');
      p.eye(36, 62, 2.6, 2.2, { lid: 'happy' });
      p.eye(47, 62, 3, 2.4, { lid: 'happy' });
      // star nose
      const star: [number, number][] = [];
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        const rr = i % 2 ? 3 : 6;
        star.push([r(28 + Math.cos(a) * rr), r(68 + Math.sin(a) * rr)]);
      }
      p.part(poly(star), 'nose', { face: true });
      p.line('M30 76 Q34 78 38 76', '#3a2020', 0.8);
    },
  },
  // 35 --------------------------------------------------------------- Toxitoad
  toxitoad: {
    pal: { body: '#7a4a9a', wart: '#f08a30', throat: '#f6e8a0', dark: '#5a3478', web: '#9a6ab8' },
    shiny: { body: '#4a9a6a', dark: '#2e6a48', wart: '#f04a8a', web: '#6ab88a' },
    draw(p) {
      p.path('M60 80 Q78 74 84 86 Q86 96 72 97 L56 96 Z', 'dark', { far: true });
      p.blob([[20, 74], [30, 56], [52, 50], [72, 58], [80, 76], [68, 92], [36, 94], [22, 86]], 'body');
      for (const [x, y, rr] of [[52, 58, 3.5], [62, 62, 3], [70, 70, 2.6], [44, 56, 2.6], [58, 72, 2.2]]) p.ellipse(x, y, rr, rr, 'wart', { lw: 0.6 });
      p.path('M20 80 Q30 92 46 90 Q36 82 34 76 Z', 'throat', { face: true });
      p.path('M28 84 Q16 92 12 97 L34 97 Q36 92 34 86 Z', 'body');
      p.path('M12 97 L16 92 L20 97 L24 92 L28 97 Z', 'web', { shade: false, lw: 0.6 });
      p.path('M60 84 Q70 92 74 97 L52 97 Q52 92 54 86 Z', 'body');
      // eyes on top of head
      p.ellipse(28, 54, 7, 7, 'body', { far: true });
      p.ellipse(42, 52, 8, 8, 'body');
      p.eye(28, 53, 3.6, 4.2, { iris: '#f0c030' });
      p.eye(42, 51.5, 4.2, 4.8, { iris: '#f0c030' });
      p.line('M22 70 Q32 77 48 70', '#2a1438', 1.1);
      p.line('M22 70 L20 68', '#2a1438', 1.1);
    },
  },
};
