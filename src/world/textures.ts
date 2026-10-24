/**
 * Procedural textures for the 3D world, painted with Canvas 2D paths at a high
 * resolution (512 px per tile) so they hold up on very large displays. Every
 * pattern wraps seamlessly.
 */
import * as THREE from 'three';
import { Rng } from '../core/rng';

export const GROUND = ['grass', 'tallbase', 'path', 'sand', 'pave', 'wood', 'tile', 'carpetRed', 'carpetBlue', 'gym', 'dirt', 'snow'] as const;
export type Ground = (typeof GROUND)[number];

export const SLOT = 512;
const PAD = 16;
export const ATLAS_COLS = 4;
export const ATLAS_ROWS = 3;

/** UV rectangle (u0, v0, u1, v1) of a ground slot, inset to its padded centre. */
export function groundUV(g: Ground): [number, number, number, number] {
  const i = GROUND.indexOf(g);
  const cx = i % ATLAS_COLS;
  const cy = Math.floor(i / ATLAS_COLS);
  const W = ATLAS_COLS * SLOT;
  const H = ATLAS_ROWS * SLOT;
  const u0 = (cx * SLOT + PAD) / W;
  const u1 = ((cx + 1) * SLOT - PAD) / W;
  // Canvas y grows downward; texture v grows upward (flipY).
  const v1 = 1 - (cy * SLOT + PAD) / H;
  const v0 = 1 - ((cy + 1) * SLOT - PAD) / H;
  return [u0, v0, u1, v1];
}

type Painter = (ctx: CanvasRenderingContext2D, s: number, rng: Rng) => void;

/** Calls `fn` at the offsets needed to wrap a motif drawn near an edge. */
function wrapDraw(s: number, x: number, y: number, r: number, fn: (x: number, y: number) => void): void {
  for (const ox of [-s, 0, s]) for (const oy of [-s, 0, s]) {
    const px = x + ox;
    const py = y + oy;
    if (px + r < 0 || px - r > s || py + r < 0 || py - r > s) continue;
    fn(px, py);
  }
}

function speckle(ctx: CanvasRenderingContext2D, s: number, rng: Rng, n: number, colors: string[], rMin: number, rMax: number): void {
  for (let i = 0; i < n; i++) {
    const x = rng.next() * s;
    const y = rng.next() * s;
    const r = rMin + rng.next() * (rMax - rMin);
    ctx.fillStyle = rng.pick(colors);
    wrapDraw(s, x, y, r, (px, py) => {
      ctx.beginPath();
      ctx.ellipse(px, py, r, r * 0.75, 0, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}

function blades(ctx: CanvasRenderingContext2D, s: number, rng: Rng, n: number, colors: string[], len: number): void {
  ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const x = rng.next() * s;
    const y = rng.next() * s;
    const l = len * (0.6 + rng.next() * 0.6);
    const lean = (rng.next() - 0.5) * l * 0.6;
    ctx.strokeStyle = rng.pick(colors);
    ctx.lineWidth = s / 110;
    wrapDraw(s, x, y, l, (px, py) => {
      ctx.beginPath();
      ctx.moveTo(px - s / 140, py);
      ctx.quadraticCurveTo(px + lean * 0.3, py - l * 0.6, px + lean, py - l);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(px + s / 140, py);
      ctx.quadraticCurveTo(px + lean * 0.1 + s / 100, py - l * 0.5, px + lean * 0.6 + s / 60, py - l * 0.75);
      ctx.stroke();
    });
  }
}

const PAINTERS: Record<Ground, Painter> = {
  grass(ctx, s, rng) {
    ctx.fillStyle = '#7cc85a';
    ctx.fillRect(0, 0, s, s);
    speckle(ctx, s, rng, 26, ['#86d064', '#72bc52'], s / 18, s / 9);
    blades(ctx, s, rng, 60, ['#5aa844', '#62b04a', '#9ad874'], s / 16);
    speckle(ctx, s, rng, 14, ['#b8e890'], s / 120, s / 70);
  },
  tallbase(ctx, s, rng) {
    ctx.fillStyle = '#4f9a3e';
    ctx.fillRect(0, 0, s, s);
    blades(ctx, s, rng, 70, ['#3f8432', '#5aa646', '#2f7026'], s / 12);
  },
  path(ctx, s, rng) {
    ctx.fillStyle = '#dcc28a';
    ctx.fillRect(0, 0, s, s);
    speckle(ctx, s, rng, 30, ['#d4b87c', '#e4cc98'], s / 16, s / 7);
    speckle(ctx, s, rng, 46, ['#b89c64', '#c8ac74', '#f0dcb0'], s / 90, s / 40);
  },
  sand(ctx, s, rng) {
    ctx.fillStyle = '#f0e0a8';
    ctx.fillRect(0, 0, s, s);
    speckle(ctx, s, rng, 120, ['#e4d094', '#f8ecc0', '#dcc488'], s / 160, s / 70);
  },
  pave(ctx, s, rng) {
    ctx.fillStyle = '#b8b0a0';
    ctx.fillRect(0, 0, s, s);
    const n = 2;
    const q = s / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const shade = 220 + Math.floor(rng.next() * 18);
      ctx.fillStyle = `rgb(${shade},${shade - 6},${shade - 18})`;
      const g = s / 64;
      ctx.beginPath();
      ctx.roundRect(i * q + g, j * q + g, q - 2 * g, q - 2 * g, s / 40);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(i * q + g * 2, j * q + g * 2, q - 4 * g, g * 1.5);
    }
    speckle(ctx, s, rng, 30, ['rgba(120,110,90,0.25)'], s / 140, s / 80);
  },
  wood(ctx, s, rng) {
    ctx.fillStyle = '#c88850';
    ctx.fillRect(0, 0, s, s);
    const rows = 4;
    const h = s / rows;
    for (let r = 0; r < rows; r++) {
      const off = r % 2 ? s / 2 : 0;
      const tone = rng.pick(['#cc8c54', '#c4844c', '#d09460']);
      ctx.fillStyle = tone;
      ctx.fillRect(0, r * h + 2, s, h - 4);
      ctx.strokeStyle = 'rgba(110,60,30,0.25)';
      ctx.lineWidth = s / 200;
      for (let k = 0; k < 3; k++) {
        const yy = r * h + h * (0.25 + 0.25 * k) + (rng.next() - 0.5) * 6;
        ctx.beginPath();
        ctx.moveTo(0, yy);
        ctx.bezierCurveTo(s * 0.3, yy - 4, s * 0.6, yy + 4, s, yy);
        ctx.stroke();
      }
      ctx.fillStyle = '#7a4a28';
      ctx.fillRect(0, r * h, s, s / 128);
      ctx.fillRect(((off + s / 2) % s) - 2, r * h, s / 128, h);
    }
  },
  tile(ctx, s) {
    const n = 2;
    const q = s / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      ctx.fillStyle = (i + j) % 2 ? '#f4f0e4' : '#e0e8f0';
      ctx.fillRect(i * q, j * q, q, q);
    }
    ctx.strokeStyle = 'rgba(150,150,170,0.5)';
    ctx.lineWidth = s / 128;
    ctx.strokeRect(0, 0, s, s);
    ctx.beginPath();
    ctx.moveTo(q, 0); ctx.lineTo(q, s);
    ctx.moveTo(0, q); ctx.lineTo(s, q);
    ctx.stroke();
  },
  carpetRed(ctx, s, rng) {
    ctx.fillStyle = '#c84850';
    ctx.fillRect(0, 0, s, s);
    speckle(ctx, s, rng, 60, ['#d05058', '#b84048'], s / 60, s / 30);
    ctx.strokeStyle = '#e8b058';
    ctx.lineWidth = s / 48;
    ctx.strokeRect(s * 0.1, s * 0.1, s * 0.8, s * 0.8);
  },
  carpetBlue(ctx, s, rng) {
    ctx.fillStyle = '#5070c0';
    ctx.fillRect(0, 0, s, s);
    speckle(ctx, s, rng, 60, ['#5878c8', '#4868b4'], s / 60, s / 30);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      ctx.beginPath();
      ctx.arc((i + 0.5) * (s / 4), (j + 0.5) * (s / 4), s / 40, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  gym(ctx, s, rng) {
    ctx.fillStyle = '#a08060';
    ctx.fillRect(0, 0, s, s);
    const q = s / 2;
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      ctx.fillStyle = rng.pick(['#b08c68', '#a88460', '#b89470']);
      ctx.beginPath();
      ctx.roundRect(i * q + s / 50, j * q + s / 50, q - s / 25, q - s / 25, s / 30);
      ctx.fill();
    }
    speckle(ctx, s, rng, 40, ['rgba(80,60,40,0.3)', 'rgba(255,240,220,0.2)'], s / 120, s / 50);
  },
  dirt(ctx, s, rng) {
    ctx.fillStyle = '#a07850';
    ctx.fillRect(0, 0, s, s);
    speckle(ctx, s, rng, 70, ['#8c6844', '#b08860', '#946c48'], s / 80, s / 25);
  },
  snow(ctx, s, rng) {
    ctx.fillStyle = '#f4f8fc';
    ctx.fillRect(0, 0, s, s);
    speckle(ctx, s, rng, 40, ['#e4ecf8', '#ffffff', '#dce6f4'], s / 20, s / 8);
  },
};

let atlasTex: THREE.CanvasTexture | null = null;

export function groundAtlas(renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  if (atlasTex) return atlasTex;
  const inner = SLOT - 2 * PAD;
  const fixed = document.createElement('canvas');
  fixed.width = ATLAS_COLS * SLOT;
  fixed.height = ATLAS_ROWS * SLOT;
  const f = fixed.getContext('2d')!;
  GROUND.forEach((g, i) => {
    const ox = (i % ATLAS_COLS) * SLOT;
    const oy = Math.floor(i / ATLAS_COLS) * SLOT;
    const tile = document.createElement('canvas');
    tile.width = tile.height = inner;
    PAINTERS[g](tile.getContext('2d')!, inner, new Rng(1000 + i * 77));
    // Each slot holds its tile plus a wrapped copy in the padding, so mipmaps don't bleed.
    f.save();
    f.beginPath();
    f.rect(ox, oy, SLOT, SLOT);
    f.clip();
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) f.drawImage(tile, ox + PAD + dx * inner, oy + PAD + dy * inner);
    f.restore();
  });
  atlasTex = new THREE.CanvasTexture(fixed);
  atlasTex.colorSpace = THREE.SRGBColorSpace;
  atlasTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  atlasTex.generateMipmaps = true;
  atlasTex.minFilter = THREE.LinearMipmapLinearFilter;
  return atlasTex;
}

const cache = new Map<string, THREE.CanvasTexture>();

/** A repeating texture painted once and cached by key. */
export function paintedTexture(key: string, w: number, h: number, paint: (ctx: CanvasRenderingContext2D, w: number, h: number) => void, repeat = true): THREE.CanvasTexture {
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  paint(c.getContext('2d')!, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  cache.set(key, t);
  return t;
}

export function sidingTexture(color: string): THREE.CanvasTexture {
  return paintedTexture(`siding-${color}`, 256, 256, (ctx, w, h) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);
    const rows = 6;
    for (let i = 0; i < rows; i++) {
      const y = (i * h) / rows;
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(0, y + h / rows - 5, w, 5);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(0, y, w, 3);
    }
  });
}

export function brickTexture(color: string): THREE.CanvasTexture {
  return paintedTexture(`brick-${color}`, 256, 256, (ctx, w, h) => {
    ctx.fillStyle = 'rgba(70,60,50,1)';
    ctx.fillRect(0, 0, w, h);
    const rows = 8;
    const bh = h / rows;
    for (let r = 0; r < rows; r++) {
      const off = r % 2 ? w / 8 : 0;
      for (let x = -w / 4 + off; x < w; x += w / 4) {
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.85 + ((r * 7 + x) % 3) * 0.05;
        ctx.fillRect(x + 3, r * bh + 3, w / 4 - 6, bh - 6);
      }
    }
    ctx.globalAlpha = 1;
  });
}

export function roofTexture(color: string): THREE.CanvasTexture {
  return paintedTexture(`roof-${color}`, 256, 256, (ctx, w, h) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);
    const rows = 5;
    for (let r = 0; r < rows; r++) {
      const y = (r * h) / rows;
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(0, y + h / rows - 7, w, 7);
      const off = r % 2 ? w / 8 : 0;
      for (let x = off; x < w + w / 4; x += w / 4) {
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        ctx.fillRect(x - 2, y, 4, h / rows);
      }
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(0, y, w, 4);
    }
  });
}

export function wallpaperTexture(a: string, b: string): THREE.CanvasTexture {
  return paintedTexture(`wall-${a}-${b}`, 256, 256, (ctx, w, h) => {
    ctx.fillStyle = a;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = b;
    for (let x = 0; x < w; x += w / 8) ctx.fillRect(x, 0, w / 16, h);
    ctx.fillStyle = 'rgba(90,60,40,0.85)';
    ctx.fillRect(0, h * 0.8, w, h * 0.2);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(0, h * 0.8, w, 4);
  });
}

export function waterTexture(): THREE.CanvasTexture {
  return paintedTexture('water', 512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#4c9ce0';
    ctx.fillRect(0, 0, w, h);
    const rng = new Rng(9);
    ctx.lineCap = 'round';
    for (let i = 0; i < 40; i++) {
      const x = rng.next() * w;
      const y = rng.next() * h;
      const l = w * (0.05 + rng.next() * 0.08);
      ctx.strokeStyle = rng.pick(['rgba(255,255,255,0.55)', 'rgba(170,220,255,0.6)', 'rgba(40,110,190,0.6)']);
      ctx.lineWidth = w / 120;
      wrapDraw(w, x, y, l, (px, py) => {
        ctx.beginPath();
        ctx.moveTo(px - l / 2, py);
        ctx.quadraticCurveTo(px, py - l * 0.25, px + l / 2, py);
        ctx.stroke();
      });
    }
  });
}

/** A sign face with text, used on shop and Rest Stop fronts. */
export function signTexture(label: string, bg: string, fg = '#ffffff'): THREE.CanvasTexture {
  return paintedTexture(`sign-${label}-${bg}`, 512, 160, (ctx, w, h) => {
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, 30);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.roundRect(10, 10, w - 20, h - 20, 22);
    ctx.stroke();
    ctx.fillStyle = fg;
    ctx.font = `700 ${h * 0.55}px "Pixelify Sans", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, w / 2, h / 2 + 4);
  }, false);
}
