/**
 * The overworld in real 3D, staged like DS-era games: a low-poly, flat-shaded
 * tile world seen through a steep, narrow perspective camera, with the people as
 * camera-facing billboards. It renders at the canvas' full pixel size, so it scales
 * to any display; billboard textures are re-painted when the resolution changes.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Rng } from '../core/rng';
import type { View } from '../core/view';
import type { Facing } from '../game/state';
import { drawCharacter, LOOKS } from '../gfx/characters';
import { pouchIcon } from '../ui/draw';
import { charAt, LEGEND, mapSize, type Building, type MapDef, type Obj } from './mapdef';
import { brickTexture, groundAtlas, groundUV, paintedTexture, roofTexture, sidingTexture, signTexture, wallpaperTexture, waterTexture } from './textures';

const PITCH = THREE.MathUtils.degToRad(52);
const DIST = 15.5;
const FOV = 28;
const ACTOR_W = 1.15;
const ACTOR_H = 1.45;
const FACINGS: Facing[] = ['down', 'up', 'left', 'right'];

export type TimeOfDay = 'morning' | 'day' | 'evening' | 'night';

export function timeOfDay(d = new Date()): TimeOfDay {
  const h = d.getHours();
  if (h >= 5 && h < 10) return 'morning';
  if (h >= 10 && h < 17) return 'day';
  if (h >= 17 && h < 20) return 'evening';
  return 'night';
}

const LIGHTING: Record<TimeOfDay, { sky: number; ground: number; hemi: number; sun: number; sunColor: number; bg: number; lamps: number }> = {
  morning: { sky: 0xfff0e0, ground: 0x8a9a70, hemi: 1.15, sun: 1.6, sunColor: 0xffe8c8, bg: 0xbfe0f0, lamps: 0.1 },
  day: { sky: 0xffffff, ground: 0x8aa070, hemi: 1.2, sun: 1.8, sunColor: 0xfff8ec, bg: 0xb8e0f8, lamps: 0 },
  evening: { sky: 0xfff0e4, ground: 0x8a8070, hemi: 1.25, sun: 1.45, sunColor: 0xffd8b8, bg: 0xf0b890, lamps: 0.7 },
  night: { sky: 0x8090d0, ground: 0x404868, hemi: 0.9, sun: 0.6, sunColor: 0xa8b8ff, bg: 0x202840, lamps: 1 },
};

// ---------------------------------------------------------------------------
// Geometry helpers

function tint(g: THREE.BufferGeometry, color: THREE.ColorRepresentation): THREE.BufferGeometry {
  const geo = g.index ? g.toNonIndexed() : g;
  const c = new THREE.Color(color);
  const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  // mergeGeometries needs identical attribute sets.
  if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  return geo;
}

function at(g: THREE.BufferGeometry, x: number, y: number, z: number, ry = 0, sx = 1, sy = 1, sz = 1): THREE.BufferGeometry {
  const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(sx, sy, sz));
  g.applyMatrix4(m);
  return g;
}

function merge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const g = mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)), false)!;
  g.computeVertexNormals();
  return g;
}

const box = (w: number, h: number, d: number, color: THREE.ColorRepresentation, x = 0, y = 0, z = 0) => at(tint(new THREE.BoxGeometry(w, h, d), color), x, y + h / 2, z);
const cyl = (rt: number, rb: number, h: number, seg: number, color: THREE.ColorRepresentation, x = 0, y = 0, z = 0) => at(tint(new THREE.CylinderGeometry(rt, rb, h, seg), color), x, y + h / 2, z);
const cone = (r: number, h: number, seg: number, color: THREE.ColorRepresentation, x = 0, y = 0, z = 0, ry = 0) => at(tint(new THREE.ConeGeometry(r, h, seg), color), x, y + h / 2, z, ry);
const ball = (r: number, detail: number, color: THREE.ColorRepresentation, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) => at(tint(new THREE.IcosahedronGeometry(r, detail), color), x, y, z, 0, sx, sy, sz);

/** Template geometry for each instanced prop, built once. */
const templates = new Map<Obj, THREE.BufferGeometry>();

function template(obj: Obj): THREE.BufferGeometry | null {
  const hit = templates.get(obj);
  if (hit) return hit;
  let g: THREE.BufferGeometry | null = null;
  switch (obj) {
    case 'tree':
      g = merge([
        cyl(0.11, 0.15, 0.45, 6, 0x7a5030),
        cone(0.62, 0.85, 8, 0x2a6e3a, 0, 0.35),
        cone(0.5, 0.75, 8, 0x348040, 0, 0.75),
        cone(0.34, 0.62, 8, 0x40944a, 0, 1.12),
      ]);
      break;
    case 'snowtree':
      g = merge([
        cyl(0.11, 0.15, 0.45, 6, 0x7a5030),
        cone(0.62, 0.85, 8, 0x2f6a4a, 0, 0.35),
        cone(0.64, 0.25, 8, 0xf4f8ff, 0, 0.72),
        cone(0.5, 0.75, 8, 0x3a7a54, 0, 0.75),
        cone(0.5, 0.22, 8, 0xf4f8ff, 0, 1.1),
        cone(0.34, 0.62, 8, 0xe8f0fa, 0, 1.12),
      ]);
      break;
    case 'snowtall': {
      const parts: THREE.BufferGeometry[] = [];
      const rng = new Rng(5);
      for (let i = 0; i < 9; i++) {
        const x = (rng.next() - 0.5) * 0.8;
        const z = (rng.next() - 0.5) * 0.8;
        parts.push(cone(0.09, 0.4 + rng.next() * 0.2, 3, i % 3 ? 0x6aa08a : 0xdce8f0, x, 0, z, rng.next() * 3));
      }
      g = merge(parts);
      break;
    }
    case 'roundtree':
      g = merge([
        cyl(0.1, 0.14, 0.6, 6, 0x7a5030),
        ball(0.55, 1, 0x3f8f3c, 0, 1.0, 0, 1, 0.9, 1),
        ball(0.36, 1, 0x4ea446, 0.18, 1.3, 0.12),
        ball(0.3, 1, 0x58b04e, -0.2, 1.2, 0.18),
      ]);
      break;
    case 'mountain':
      g = merge([box(1.0, 1.35, 1.0, 0x9c8462), box(1.02, 0.12, 1.02, 0x76a04c, 0, 1.33)]);
      break;
    case 'cliff':
      g = merge([box(1.0, 0.6, 1.0, 0xa08868), box(1.02, 0.1, 1.02, 0x7cb050, 0, 0.58)]);
      break;
    case 'rock':
      g = merge([ball(0.38, 0, 0x9a9aa4, 0, 0.26, 0, 1.1, 0.8, 1)]);
      break;
    case 'boulder':
      g = merge([ball(0.48, 0, 0x8c7a66, 0, 0.36, 0, 1.05, 0.85, 1)]);
      break;
    case 'fence':
      g = merge([
        box(0.1, 0.6, 0.1, 0xf4ecdc, -0.42),
        box(0.1, 0.6, 0.1, 0xf4ecdc, 0.42),
        box(1.0, 0.09, 0.06, 0xece2cc, 0, 0.42),
        box(1.0, 0.09, 0.06, 0xece2cc, 0, 0.18),
      ]);
      break;
    case 'hedge':
      g = merge([box(0.98, 0.55, 0.9, 0x3c8a3a), box(0.9, 0.12, 0.82, 0x4ea446, 0, 0.55)]);
      break;
    case 'tall': {
      const parts: THREE.BufferGeometry[] = [];
      const rng = new Rng(4);
      for (let i = 0; i < 9; i++) {
        const x = (rng.next() - 0.5) * 0.8;
        const z = (rng.next() - 0.5) * 0.8;
        parts.push(cone(0.09, 0.42 + rng.next() * 0.22, 3, i % 3 ? 0x3d9a3a : 0x5cb84a, x, 0, z, rng.next() * 3));
      }
      g = merge(parts);
      break;
    }
    case 'flowers': {
      const parts: THREE.BufferGeometry[] = [];
      const colors = [0xf05860, 0xf8d040, 0xffffff, 0xf890c8];
      const spots = [[-0.25, -0.22], [0.22, -0.18], [-0.18, 0.24], [0.26, 0.26]];
      spots.forEach(([x, z], i) => {
        parts.push(cyl(0.015, 0.015, 0.16, 3, 0x3c8a30, x, 0, z));
        parts.push(cyl(0.09, 0.09, 0.04, 6, colors[i], x, 0.16, z));
        parts.push(cyl(0.035, 0.035, 0.05, 5, 0xf8e070, x, 0.17, z));
      });
      g = merge(parts);
      break;
    }
    case 'sign':
      g = merge([box(0.08, 0.5, 0.08, 0x7a5030), box(0.62, 0.38, 0.07, 0x9a6a3a, 0, 0.4), box(0.54, 0.3, 0.02, 0xd8b880, 0, 0.44, 0.04)]);
      break;
    case 'lamp':
      g = merge([cyl(0.05, 0.07, 1.4, 6, 0x404858), box(0.24, 0.24, 0.24, 0x404858, 0, 1.4), box(0.18, 0.18, 0.18, 0xfff0b0, 0, 1.43)]);
      break;
    case 'ledge':
      g = merge([box(1.0, 0.22, 0.4, 0x8c6c48, 0, 0, 0.3), box(1.0, 0.04, 0.42, 0x7cc85a, 0, 0.22, 0.29)]);
      break;
    case 'bridge':
      g = merge([
        box(1.0, 0.08, 1.0, 0xa87848, 0, -0.06),
        box(0.08, 0.35, 1.0, 0x8a5c34, -0.46, 0),
        box(0.08, 0.35, 1.0, 0x8a5c34, 0.46, 0),
      ]);
      break;
    case 'counter':
      g = merge([box(1.0, 0.78, 0.9, 0xf0f0f4), box(1.02, 0.08, 0.94, 0xd84850, 0, 0.76)]);
      break;
    case 'pc':
      g = merge([box(0.7, 0.95, 0.55, 0xc8ccd8, 0, 0, -0.1), box(0.5, 0.36, 0.02, 0x58b0f0, 0, 0.5, 0.18), box(0.6, 0.1, 0.3, 0x9098a8, 0, 0.3, 0.22)]);
      break;
    case 'shelf':
      g = merge([
        box(0.92, 1.7, 0.5, 0x8a5a34, 0, 0, -0.2),
        box(0.8, 0.3, 0.05, 0xd05040, -0.02, 1.2, 0.06),
        box(0.8, 0.3, 0.05, 0x4870c0, 0.02, 0.75, 0.06),
        box(0.8, 0.3, 0.05, 0x50a050, 0, 0.3, 0.06),
      ]);
      break;
    case 'bookcase':
      g = merge([
        box(0.92, 1.3, 0.5, 0x7a4a2a, 0, 0, -0.2),
        box(0.8, 0.28, 0.05, 0xe0c060, 0, 0.85, 0.06),
        box(0.8, 0.28, 0.05, 0x9050a0, 0, 0.4, 0.06),
      ]);
      break;
    case 'shopshelf':
      g = merge([
        box(0.95, 1.1, 0.7, 0xd8dce4),
        box(0.25, 0.25, 0.25, 0xe85048, -0.28, 1.1),
        box(0.25, 0.3, 0.25, 0x48a0e0, 0.02, 1.1),
        box(0.25, 0.2, 0.25, 0xf0c840, 0.3, 1.1),
        box(0.85, 0.06, 0.05, 0x8890a0, 0, 0.6, 0.36),
      ]);
      break;
    case 'bed':
      g = merge([box(0.9, 0.35, 1.0, 0x8a5a34), box(0.84, 0.12, 0.7, 0x5880d8, 0, 0.35, 0.13), box(0.7, 0.14, 0.26, 0xffffff, 0, 0.35, -0.33)]);
      break;
    case 'table':
      g = merge([
        box(0.92, 0.08, 0.92, 0xb07840, 0, 0.55),
        box(0.08, 0.55, 0.08, 0x8a5a34, -0.38, 0, -0.38),
        box(0.08, 0.55, 0.08, 0x8a5a34, 0.38, 0, -0.38),
        box(0.08, 0.55, 0.08, 0x8a5a34, -0.38, 0, 0.38),
        box(0.08, 0.55, 0.08, 0x8a5a34, 0.38, 0, 0.38),
      ]);
      break;
    case 'chair':
      g = merge([box(0.5, 0.06, 0.5, 0xb07840, 0, 0.35), box(0.5, 0.45, 0.06, 0xa06a38, 0, 0.35, -0.22), box(0.06, 0.35, 0.06, 0x8a5a34, -0.2, 0, 0.2), box(0.06, 0.35, 0.06, 0x8a5a34, 0.2, 0, 0.2)]);
      break;
    case 'plant':
      g = merge([cyl(0.2, 0.15, 0.32, 8, 0xc06838), ball(0.32, 1, 0x48a048, 0, 0.6, 0), ball(0.2, 1, 0x5cb85a, 0.12, 0.8, 0.08)]);
      break;
    case 'tv':
      g = merge([box(0.9, 0.42, 0.5, 0x8a5a34), box(0.75, 0.5, 0.35, 0x303038, 0, 0.42), box(0.62, 0.38, 0.02, 0x60d0f0, 0, 0.48, 0.18)]);
      break;
    case 'stove':
      g = merge([box(0.92, 0.85, 0.7, 0xf4f4f0, 0, 0, -0.1), box(0.92, 0.04, 0.7, 0x404048, 0, 0.85, -0.1), box(0.6, 0.3, 0.02, 0x303038, 0, 0.3, 0.26)]);
      break;
    case 'healer':
      g = merge([
        box(0.95, 0.9, 0.6, 0xe8e8f0, 0, 0, -0.15),
        box(0.85, 0.06, 0.4, 0xc8c8d8, 0, 0.9, -0.15),
        ball(0.08, 1, 0xe85048, -0.25, 0.98, -0.2),
        ball(0.08, 1, 0xe85048, 0, 0.98, -0.2),
        ball(0.08, 1, 0xe85048, 0.25, 0.98, -0.2),
        box(0.4, 0.2, 0.02, 0x50e090, 0, 0.55, 0.16),
      ]);
      break;
    case 'statue':
      g = merge([box(0.8, 0.4, 0.8, 0xc0c0c8), ball(0.35, 0, 0xb0a890, 0, 0.75, 0), cone(0.2, 0.4, 5, 0xb0a890, 0, 0.95)]);
      break;
    case 'machine':
      g = merge([box(0.9, 1.2, 0.7, 0xb8c0d0, 0, 0, -0.1), box(0.5, 0.3, 0.02, 0x60e0a0, 0, 0.7, 0.26), box(0.1, 0.1, 0.03, 0xf05050, 0.3, 0.3, 0.26)]);
      break;
    case 'crate':
      g = merge([box(0.85, 0.7, 0.85, 0xb88850), box(0.87, 0.08, 0.87, 0x8a5a34, 0, 0.35)]);
      break;
    case 'mat':
      g = merge([box(0.9, 0.02, 0.8, 0xd04848, 0, 0, 0.05)]);
      break;
    default:
      g = null;
  }
  if (g) templates.set(obj, g);
  return g;
}

/** Objects whose vertices sway in the wind. */
const SWAY: Obj[] = ['tall', 'flowers', 'snowtall'];

// ---------------------------------------------------------------------------
// Actors (people and items as billboards)

const TMP_DIR = new THREE.Vector3();
const TMP_RIGHT = new THREE.Vector3();

const atlasCache = new Map<string, { tex: THREE.CanvasTexture; px: number }>();

function characterAtlas(look: string, framePx: number): THREE.CanvasTexture {
  const hit = atlasCache.get(look);
  if (hit && hit.px === framePx) return hit.tex;
  hit?.tex.dispose();
  const fw = Math.round(framePx * (ACTOR_W / ACTOR_H));
  const fh = framePx;
  const c = document.createElement('canvas');
  c.width = fw * 4;
  c.height = fh * 4;
  const ctx = c.getContext('2d')!;
  const L = LOOKS[look] ?? LOOKS.boy;
  FACINGS.forEach((f, row) => {
    for (let frame = 0; frame < 4; frame++) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(frame * fw, row * fh, fw, fh);
      ctx.clip();
      drawCharacter(ctx, L, f, frame as 0 | 1 | 2 | 3, frame * fw + fw / 2, row * fh + fh * 0.97, fh * 0.92);
      ctx.restore();
    }
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.repeat.set(0.25, 0.25);
  atlasCache.set(look, { tex, px: framePx });
  return tex;
}

let shadowTex: THREE.CanvasTexture | null = null;
function blobShadow(): THREE.CanvasTexture {
  if (shadowTex) return shadowTex;
  shadowTex = paintedTexture('blob', 128, 128, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(0,0,0,0.42)');
    g.addColorStop(0.65, 'rgba(0,0,0,0.3)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }, false);
  return shadowTex;
}

export class Actor {
  /** Position in tile units (tile centre = integer + 0.5 is handled internally). */
  x = 0;
  y = 0;
  /** Height above ground (ledge hops). */
  lift = 0;
  facing: Facing = 'down';
  frame = 0;
  visible = true;
  readonly group = new THREE.Group();
  private mesh: THREE.Mesh;
  private shadow: THREE.Mesh;
  private tex: THREE.Texture;
  private look: string;

  constructor(
    private world: World3D,
    look: string,
  ) {
    this.look = look;
    this.tex = characterAtlas(look, world.framePx()).clone();
    const geo = new THREE.PlaneGeometry(ACTOR_W, ACTOR_H / Math.cos(PITCH));
    geo.translate(0, ACTOR_H / Math.cos(PITCH) / 2, 0);
    const mat = new THREE.MeshBasicMaterial({ map: this.tex, alphaTest: 0.5, alphaToCoverage: true });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.matrixAutoUpdate = false;
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.5), new THREE.MeshBasicMaterial({ map: blobShadow(), transparent: true, depthWrite: false }));
    sh.rotation.x = -Math.PI / 2;
    sh.position.y = 0.015;
    this.shadow = sh;
    this.group.add(this.mesh, sh);
  }

  setLook(look: string): void {
    if (look === this.look) return;
    this.look = look;
    this.refreshTexture();
  }

  refreshTexture(): void {
    const old = this.tex;
    this.tex = characterAtlas(this.look, this.world.framePx()).clone();
    (this.mesh.material as THREE.MeshBasicMaterial).map = this.tex;
    old.dispose();
  }

  /**
   * Places the billboard. Upright planes seen through a pitched perspective camera
   * lean outward away from the screen centre; a horizontal shear proportional to
   * height cancels that so people stand straight wherever they are on screen.
   */
  sync(camera: THREE.PerspectiveCamera): void {
    this.group.visible = this.visible;
    const wx = this.x + 0.5;
    const wz = this.y + 0.5;
    this.group.position.set(wx, 0, wz);
    const dir = camera.getWorldDirection(TMP_DIR);
    const depth = (wx - camera.position.x) * dir.x + (0 - camera.position.y) * dir.y + (wz - camera.position.z) * dir.z;
    const right = TMP_RIGHT.crossVectors(dir, camera.up).normalize();
    const side = (wx - camera.position.x) * right.x + (wz - camera.position.z) * right.z;
    const k = depth > 0.1 ? (side * dir.y) / depth : 0;
    // Nudged towards the camera so it wins against the ground it stands on.
    this.mesh.matrix.set(1, k, 0, 0, 0, 1, 0, this.lift, 0, 0, 1, 0.12, 0, 0, 0, 1);
    this.mesh.matrixWorldNeedsUpdate = true;
    const row = FACINGS.indexOf(this.facing);
    this.tex.offset.set((this.frame % 4) * 0.25, 1 - (row + 1) * 0.25);
    const s = 1 - Math.min(0.4, this.lift * 0.6);
    this.shadow.scale.set(s, s, 1);
  }

  dispose(): void {
    this.tex.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.mesh.geometry.dispose();
  }
}

// ---------------------------------------------------------------------------

interface Rustle {
  mesh: THREE.InstancedMesh;
  index: number;
  base: THREE.Matrix4;
  t: number;
}

export class World3D {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(FOV, 16 / 9, 0.5, 120);
  readonly focus = new THREE.Vector3();
  /** Extra camera yaw/zoom for the title screen fly-around. */
  orbit = 0;
  zoom = 1;
  private hemi = new THREE.HemisphereLight(0xffffff, 0x88a070, 1.2);
  private sun = new THREE.DirectionalLight(0xffffff, 1.8);
  private mapGroup = new THREE.Group();
  private actors = new Set<Actor>();
  private time = 0;
  private swayUniform = { value: 0 };
  private water: THREE.Texture | null = null;
  private lampMats: THREE.MeshBasicMaterial[] = [];
  private rustles: Rustle[] = [];
  private tallIndex = new Map<string, { mesh: THREE.InstancedMesh; index: number }>();
  private items = new Map<string, THREE.Object3D>();
  private outdoor = true;
  private tod: TimeOfDay = timeOfDay();

  constructor(
    readonly canvas: HTMLCanvasElement,
    private view: View,
  ) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene.add(this.hemi, this.sun, this.sun.target, this.mapGroup);
    this.sun.position.set(-4, 10, 6);
    view.onResize(() => this.resize());
    this.resize();
  }

  /** Billboard frame height in texture pixels, matched to how big people appear on screen. */
  framePx(): number {
    const tilesTall = 2 * DIST * Math.tan(THREE.MathUtils.degToRad(FOV / 2)) / this.zoom;
    const pxPerUnit = this.view.pixelH / tilesTall;
    return Math.min(640, Math.max(96, Math.round((pxPerUnit * ACTOR_H) / 16) * 16));
  }

  resize(): void {
    this.renderer.setSize(this.view.pixelW, this.view.pixelH, false);
    this.camera.aspect = this.view.pixelW / this.view.pixelH;
    this.camera.updateProjectionMatrix();
    for (const a of this.actors) a.refreshTexture();
  }

  setVisible(v: boolean): void {
    this.canvas.style.visibility = v ? 'visible' : 'hidden';
  }

  addActor(look: string): Actor {
    const a = new Actor(this, look);
    this.actors.add(a);
    this.mapGroup.add(a.group);
    return a;
  }

  removeActor(a: Actor): void {
    this.actors.delete(a);
    a.group.removeFromParent();
    a.dispose();
  }

  /** World tile position (+ height) to logical screen units. */
  project(x: number, y: number, h = 0): { x: number; y: number } {
    const v = new THREE.Vector3(x + 0.5, h, y + 0.5).project(this.camera);
    return { x: ((v.x + 1) / 2) * this.view.width, y: ((1 - v.y) / 2) * this.view.height };
  }

  /** Squashes the tall grass on a tile when someone walks into it. */
  rustle(x: number, y: number): void {
    const hit = this.tallIndex.get(`${x},${y}`);
    if (!hit) return;
    const base = new THREE.Matrix4();
    hit.mesh.getMatrixAt(hit.index, base);
    if (this.rustles.some((r) => r.mesh === hit.mesh && r.index === hit.index)) return;
    this.rustles.push({ mesh: hit.mesh, index: hit.index, base, t: 0 });
  }

  /** Item balls lying on the map, keyed by their flag. */
  setItemVisible(flag: string, v: boolean): void {
    const o = this.items.get(flag);
    if (o) o.visible = v;
  }

  // -------------------------------------------------------------------------

  load(map: MapDef, itemBalls: { x: number; y: number; flag: string }[] = []): void {
    for (const a of this.actors) this.removeActor(a);
    this.mapGroup.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry && !templates.has(m.geometry as unknown as Obj)) m.geometry.dispose?.();
    });
    this.scene.remove(this.mapGroup);
    this.mapGroup = new THREE.Group();
    this.scene.add(this.mapGroup);
    this.lampMats = [];
    this.rustles = [];
    this.tallIndex.clear();
    this.items.clear();
    this.outdoor = map.outdoor;

    const { w, h } = mapSize(map);
    const mx = map.outdoor ? 16 : 0;
    const my = map.outdoor ? 12 : 0;
    const rng = new Rng(map.id.length * 131 + w * 7 + h);
    const cells: { x: number; y: number; ch: string }[] = [];
    for (let y = -my; y < h + my; y++) for (let x = -mx; x < w + mx; x++) cells.push({ x, y, ch: charAt(map, x, y) });

    this.buildGround(map, cells, rng);
    this.buildWater(map, cells);
    this.buildProps(map, cells, rng);
    for (const b of map.buildings ?? []) this.mapGroup.add(buildBuilding(b));
    if (!map.outdoor) this.buildWalls(map, cells);
    for (const it of itemBalls) {
      const o = itemBillboard();
      o.position.set(it.x + 0.5, 0, it.y + 0.5);
      this.items.set(it.flag, o);
      this.mapGroup.add(o);
    }
    this.applyLighting();
  }

  private buildGround(map: MapDef, cells: { x: number; y: number; ch: string }[], rng: Rng): void {
    const pos: number[] = [];
    const uv: number[] = [];
    const col: number[] = [];
    for (const { x, y, ch } of cells) {
      const info = LEGEND[ch] ?? LEGEND[' '];
      if (info.obj === 'water' || (ch === ' ' && !map.outdoor)) continue;
      const [u0, v0, u1, v1] = groundUV(info.ground);
      const x0 = x, x1 = x + 1, z0 = y, z1 = y + 1;
      pos.push(x0, 0, z0, x0, 0, z1, x1, 0, z1, x0, 0, z0, x1, 0, z1, x1, 0, z0);
      uv.push(u0, v1, u0, v0, u1, v0, u0, v1, u1, v0, u1, v1);
      const k = 0.95 + rng.next() * 0.07;
      for (let i = 0; i < 6; i++) col.push(k, k, k);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.computeVertexNormals();
    const mat = new THREE.MeshLambertMaterial({ map: groundAtlas(this.renderer), vertexColors: true });
    this.mapGroup.add(new THREE.Mesh(g, mat));
  }

  private buildWater(map: MapDef, cells: { x: number; y: number; ch: string }[]): void {
    const isWater = (x: number, y: number) => LEGEND[charAt(map, x, y)]?.obj === 'water';
    const pos: number[] = [];
    const uv: number[] = [];
    const bank: number[] = [];
    const Y = -0.14;
    for (const { x, y } of cells) {
      if (!isWater(x, y)) continue;
      pos.push(x, Y, y, x, Y, y + 1, x + 1, Y, y + 1, x, Y, y, x + 1, Y, y + 1, x + 1, Y, y);
      uv.push(x / 2, -y / 2, x / 2, -(y + 1) / 2, (x + 1) / 2, -(y + 1) / 2, x / 2, -y / 2, (x + 1) / 2, -(y + 1) / 2, (x + 1) / 2, -y / 2);
      const wall = (ax: number, az: number, bx: number, bz: number) => bank.push(ax, 0, az, ax, Y - 0.05, az, bx, Y - 0.05, bz, ax, 0, az, bx, Y - 0.05, bz, bx, 0, bz);
      if (!isWater(x, y - 1)) wall(x + 1, y, x, y);
      if (!isWater(x, y + 1)) wall(x, y + 1, x + 1, y + 1);
      if (!isWater(x - 1, y)) wall(x, y, x, y + 1);
      if (!isWater(x + 1, y)) wall(x + 1, y + 1, x + 1, y);
    }
    if (!pos.length) return;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    this.water = waterTexture();
    // A little self-light keeps water bright under every time-of-day lighting.
    const mat = new THREE.MeshLambertMaterial({ map: this.water, color: 0xffffff, emissive: 0x18385a });
    this.mapGroup.add(new THREE.Mesh(g, mat));
    const bg = new THREE.BufferGeometry();
    bg.setAttribute('position', new THREE.Float32BufferAttribute(bank, 3));
    bg.computeVertexNormals();
    this.mapGroup.add(new THREE.Mesh(bg, new THREE.MeshLambertMaterial({ color: 0xc8a870, side: THREE.DoubleSide })));
  }

  private buildProps(map: MapDef, cells: { x: number; y: number; ch: string }[], rng: Rng): void {
    const byObj = new Map<Obj, { x: number; y: number; ch: string }[]>();
    for (const c of cells) {
      const obj = LEGEND[c.ch]?.obj;
      if (!obj || obj === 'water' || obj === 'wall') continue;
      if (!byObj.has(obj)) byObj.set(obj, []);
      byObj.get(obj)!.push(c);
    }
    const isObj = (x: number, y: number, o: Obj) => LEGEND[charAt(map, x, y)]?.obj === o;
    const shadowSpots: { x: number; y: number; s: number }[] = [];
    for (const [obj, list] of byObj) {
      const geo = template(obj);
      if (!geo) continue;
      const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
      if (SWAY.includes(obj)) {
        const u = this.swayUniform;
        mat.onBeforeCompile = (shader) => {
          shader.uniforms.uTime = u;
          shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader.replace(
            '#include <begin_vertex>',
            `#include <begin_vertex>
            #ifdef USE_INSTANCING
              vec3 ip = instanceMatrix[3].xyz;
            #else
              vec3 ip = vec3(0.0);
            #endif
            float sw = sin(uTime * 2.2 + ip.x * 0.8 + ip.z * 0.6) + 0.5 * sin(uTime * 3.7 + ip.x * 1.7);
            transformed.x += sw * 0.05 * position.y * 2.0;`,
          );
        };
      }
      const mesh = new THREE.InstancedMesh(geo, mat, list.length);
      const m = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const color = new THREE.Color();
      list.forEach((c, i) => {
        let ry = 0;
        let s = 1;
        let jitter = 0;
        if (obj === 'tree' || obj === 'roundtree' || obj === 'snowtree') {
          s = 0.92 + rng.next() * 0.16;
          ry = rng.next() * Math.PI;
          jitter = 0.08;
          shadowSpots.push({ x: c.x, y: c.y, s: 1.3 });
        } else if (obj === 'rock' || obj === 'boulder') {
          ry = rng.next() * Math.PI;
          shadowSpots.push({ x: c.x, y: c.y, s: 0.9 });
        } else if (obj === 'fence') {
          const horiz = isObj(c.x - 1, c.y, 'fence') || isObj(c.x + 1, c.y, 'fence');
          const vert = isObj(c.x, c.y - 1, 'fence') || isObj(c.x, c.y + 1, 'fence');
          ry = vert && !horiz ? Math.PI / 2 : 0;
        } else if (obj === 'tall' || obj === 'flowers' || obj === 'snowtall') {
          ry = (rng.int(0, 3) * Math.PI) / 2;
        } else if (obj === 'mountain') {
          s = 1;
        }
        q.setFromEuler(new THREE.Euler(0, ry, 0));
        const jx = (rng.next() - 0.5) * jitter;
        const jz = (rng.next() - 0.5) * jitter;
        m.compose(new THREE.Vector3(c.x + 0.5 + jx, 0, c.y + 0.5 + jz), q, new THREE.Vector3(s, obj === 'mountain' ? 0.9 + rng.next() * 0.25 : s, s));
        mesh.setMatrixAt(i, m);
        const k = obj === 'tree' || obj === 'roundtree' || obj === 'tall' || obj === 'snowtree' ? 0.9 + rng.next() * 0.18 : 0.96 + rng.next() * 0.08;
        mesh.setColorAt(i, color.setRGB(k, k, k));
        if (obj === 'tall' || obj === 'snowtall') this.tallIndex.set(`${c.x},${c.y}`, { mesh, index: i });
      });
      mesh.instanceMatrix.needsUpdate = true;
      this.mapGroup.add(mesh);
      if (obj === 'lamp') {
        // Lamp glow halos that brighten in the evening.
        for (const c of list) {
          const mat = new THREE.MeshBasicMaterial({ map: glowTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
          const sp = new THREE.Sprite(mat as unknown as THREE.SpriteMaterial);
          sp.position.set(c.x + 0.5, 1.45, c.y + 0.5);
          sp.scale.set(1.6, 1.6, 1);
          this.lampMats.push(mat);
          this.mapGroup.add(sp);
        }
      }
    }
    if (shadowSpots.length) {
      const sh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 0.8).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: blobShadow(), transparent: true, depthWrite: false }), shadowSpots.length);
      const m = new THREE.Matrix4();
      shadowSpots.forEach((p, i) => {
        m.makeScale(p.s, 1, p.s).setPosition(p.x + 0.5, 0.012, p.y + 0.55);
        sh.setMatrixAt(i, m);
      });
      this.mapGroup.add(sh);
    }
  }

  private buildWalls(map: MapDef, cells: { x: number; y: number; ch: string }[]): void {
    const [a, b] = map.wallpaper ?? ['#f0e0c0', '#e8d4b0'];
    const front = new THREE.MeshLambertMaterial({ map: wallpaperTexture(a, b) });
    const top = new THREE.MeshBasicMaterial({ color: 0x2a2630 });
    const side = new THREE.MeshLambertMaterial({ color: new THREE.Color(b).multiplyScalar(0.8) });
    // BoxGeometry face order: +x, -x, +y, -y, +z, -z.
    const mats = [side, side, top, top, front, side];
    const geo = new THREE.BoxGeometry(1, 2.3, 1);
    geo.translate(0, 1.15, 0);
    for (const c of cells) {
      if (LEGEND[c.ch]?.obj !== 'wall') continue;
      const m = new THREE.Mesh(geo, mats);
      m.position.set(c.x + 0.5, 0, c.y + 0.5);
      this.mapGroup.add(m);
    }
  }

  private applyLighting(): void {
    this.tod = timeOfDay();
    const L = this.outdoor ? LIGHTING[this.tod] : LIGHTING.day;
    this.hemi.color.setHex(L.sky);
    this.hemi.groundColor.setHex(L.ground);
    this.hemi.intensity = this.outdoor ? L.hemi : 1.25;
    this.sun.color.setHex(L.sunColor);
    this.sun.intensity = this.outdoor ? L.sun : 1.3;
    const bg = this.outdoor ? L.bg : 0x0a0a10;
    this.scene.background = new THREE.Color(bg);
    this.scene.fog = this.outdoor ? new THREE.Fog(bg, DIST + 8, DIST + 30) : null;
    for (const m of this.lampMats) m.opacity = this.outdoor ? L.lamps * 0.8 : 0;
  }

  render(dt: number): void {
    this.time += dt;
    this.swayUniform.value = this.time;
    if (this.water) this.water.offset.set(Math.sin(this.time * 0.4) * 0.05, this.time * 0.03);
    if (timeOfDay() !== this.tod) this.applyLighting();

    for (let i = this.rustles.length - 1; i >= 0; i--) {
      const r = this.rustles[i];
      r.t += dt;
      const p = Math.min(1, r.t / 0.35);
      const squash = 1 - Math.sin(p * Math.PI) * 0.35;
      const wob = Math.sin(p * Math.PI * 3) * 0.1 * (1 - p);
      const m = r.base.clone().multiply(new THREE.Matrix4().makeRotationZ(wob)).multiply(new THREE.Matrix4().makeScale(1 + (1 - squash) * 0.5, squash, 1 + (1 - squash) * 0.5));
      r.mesh.setMatrixAt(r.index, p >= 1 ? r.base : m);
      r.mesh.instanceMatrix.needsUpdate = true;
      if (p >= 1) this.rustles.splice(i, 1);
    }

    const d = DIST / this.zoom;
    const yaw = this.orbit;
    const cx = this.focus.x + 0.5 + Math.sin(yaw) * Math.cos(PITCH) * d;
    const cz = this.focus.z + 0.5 + Math.cos(yaw) * Math.cos(PITCH) * d;
    this.camera.position.set(cx, this.focus.y + Math.sin(PITCH) * d, cz);
    this.camera.lookAt(this.focus.x + 0.5, this.focus.y + 0.5, this.focus.z + 0.5);
    this.camera.updateMatrixWorld();
    for (const a of this.actors) a.sync(this.camera);
    this.sun.position.set(this.focus.x - 6, 14, this.focus.z + 8);
    this.sun.target.position.set(this.focus.x, 0, this.focus.z);
    this.renderer.render(this.scene, this.camera);
  }
}

// ---------------------------------------------------------------------------
// Buildings

function buildBuilding(b: Building): THREE.Group {
  const g = new THREE.Group();
  const W = b.w;
  const D = b.h;
  const style = {
    house: { wall: '#f4ead8', roof: '#d0584c', wallH: 1.85, brick: false },
    bighouse: { wall: '#f0e4cc', roof: '#4c78c8', wallH: 2.0, brick: false },
    center: { wall: '#f8f4f0', roof: '#e04848', wallH: 2.3, brick: false },
    mart: { wall: '#f4f6fa', roof: '#3c78d8', wallH: 2.2, brick: false },
    lab: { wall: '#e8ecf0', roof: '#6a7888', wallH: 2.4, brick: false },
    gym: { wall: '#b89c7c', roof: '#7a5a48', wallH: 2.7, brick: true },
  }[b.kind];
  const wallColor = b.wall ?? style.wall;
  const roofColor = b.roof ?? style.roof;
  const wallTex = style.brick ? brickTexture(wallColor) : sidingTexture(wallColor);
  const wt = wallTex.clone();
  wt.repeat.set(W / 2, style.wallH / 2);
  wt.needsUpdate = true;
  const wallMat = new THREE.MeshLambertMaterial({ map: wt });
  const walls = new THREE.Mesh(new THREE.BoxGeometry(W - 0.1, style.wallH, D - 0.4), wallMat);
  walls.position.set(b.x + W / 2, style.wallH / 2, b.y + D / 2 - 0.1);
  g.add(walls);
  // Base trim.
  const trim = new THREE.Mesh(new THREE.BoxGeometry(W - 0.02, 0.22, D - 0.32), new THREE.MeshLambertMaterial({ color: 0x8a7a6a }));
  trim.position.set(b.x + W / 2, 0.11, b.y + D / 2 - 0.1);
  g.add(trim);

  const frontZ = b.y + D - 0.3;
  const roofTex = roofTexture(roofColor).clone();
  roofTex.repeat.set(W / 1.5, 2);
  roofTex.needsUpdate = true;
  const roofMat = new THREE.MeshLambertMaterial({ map: roofTex, flatShading: true });
  if (b.kind === 'lab' || b.kind === 'mart' || b.kind === 'center') {
    // Flat roof with a raised rim.
    const roof = new THREE.Mesh(new THREE.BoxGeometry(W + 0.2, 0.35, D - 0.1), roofMat);
    roof.position.set(b.x + W / 2, style.wallH + 0.17, b.y + D / 2 - 0.1);
    g.add(roof);
    const lip = new THREE.Mesh(new THREE.BoxGeometry(W + 0.3, 0.14, 0.3), new THREE.MeshLambertMaterial({ color: new THREE.Color(roofColor).multiplyScalar(0.75) }));
    lip.position.set(b.x + W / 2, style.wallH + 0.05, frontZ + 0.15);
    g.add(lip);
  } else {
    // Gabled roof running left-right, overhanging the walls.
    const rise = b.kind === 'gym' ? 1.0 : 1.15;
    const half = D / 2 + 0.05;
    const shape = new THREE.Shape();
    shape.moveTo(-half, 0);
    shape.lineTo(0, rise);
    shape.lineTo(half, 0);
    shape.lineTo(-half, 0);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: W + 0.3, bevelEnabled: false });
    geo.rotateY(Math.PI / 2);
    // Extrusion UVs come out in shape units; rescale for the tile texture.
    const roof = new THREE.Mesh(geo, roofMat);
    roof.position.set(b.x - 0.15, style.wallH, b.y + D / 2 - 0.1);
    g.add(roof);
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(W + 0.34, 0.12, 0.16), new THREE.MeshLambertMaterial({ color: new THREE.Color(roofColor).multiplyScalar(0.7) }));
    ridge.position.set(b.x + W / 2, style.wallH + rise, b.y + D / 2 - 0.1);
    g.add(ridge);
    if (b.kind === 'house' || b.kind === 'bighouse') {
      const ch = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.7, 0.32), new THREE.MeshLambertMaterial({ color: 0x9a6a50 }));
      ch.position.set(b.x + W * 0.75, style.wallH + rise * 0.75, b.y + D / 2 - 0.4);
      g.add(ch);
    }
  }

  // Door on the front, at the bottom-row door tile (centre column by convention, or b.x + W/2).
  const doorX = b.x + Math.floor(W / 2) + 0.5;
  const doorMat = new THREE.MeshLambertMaterial({ color: b.kind === 'center' || b.kind === 'mart' ? 0x9ad0f0 : 0x8a5a38 });
  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.86, 1.18, 0.06), new THREE.MeshLambertMaterial({ color: 0xffffff }));
  doorFrame.position.set(doorX, 0.59, frontZ + 0.02);
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.72, 1.08, 0.06), doorMat);
  door.position.set(doorX, 0.54, frontZ + 0.05);
  g.add(doorFrame, door);
  const step = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.06, 0.4), new THREE.MeshLambertMaterial({ color: 0xc8c0b0 }));
  step.position.set(doorX, 0.03, frontZ + 0.22);
  g.add(step);

  // Windows on the front.
  const winMat = new THREE.MeshLambertMaterial({ color: 0xa8d8f8, emissive: 0x203040 });
  const frameMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  for (let i = 0; i < W; i++) {
    const wx = b.x + i + 0.5;
    if (Math.abs(wx - doorX) < 0.9) continue;
    if (b.kind === 'center' || b.kind === 'mart' || b.kind === 'lab') {
      const fr = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.7, 0.04), frameMat);
      fr.position.set(wx, 0.95, frontZ + 0.02);
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.58, 0.05), winMat);
      win.position.set(wx, 0.95, frontZ + 0.04);
      g.add(fr, win);
    } else if (i % 2 === (W % 2 ? 0 : 1) || W <= 4) {
      const fr = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.58, 0.04), frameMat);
      fr.position.set(wx, 0.92, frontZ + 0.02);
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.46, 0.05), winMat);
      win.position.set(wx, 0.92, frontZ + 0.04);
      const sill = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 0.14), new THREE.MeshLambertMaterial({ color: 0x7a5a40 }));
      sill.position.set(wx, 0.62, frontZ + 0.08);
      g.add(fr, win, sill);
    }
  }

  // Signs over the door.
  const label = { center: ['REST STOP', '#e04848'], mart: ['SHOP', '#3c78d8'], gym: ['GYM', '#7a5a48'], lab: ['LAB', '#5a6878'] }[b.kind as string];
  if (label) {
    const tex = signTexture(label[0], label[1]);
    const sw = Math.min(W - 0.6, 2.6);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(sw, sw * (160 / 512)), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
    sign.position.set(doorX, style.wallH - 0.2, frontZ + 0.08);
    g.add(sign);
  }
  return g;
}

let glow: THREE.CanvasTexture | null = null;
function glowTexture(): THREE.CanvasTexture {
  if (glow) return glow;
  glow = paintedTexture('glow', 128, 128, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,240,180,0.9)');
    g.addColorStop(0.4, 'rgba(255,220,140,0.35)');
    g.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }, false);
  return glow;
}

let itemTex: THREE.CanvasTexture | null = null;
function itemBillboard(): THREE.Object3D {
  if (!itemTex) {
    itemTex = paintedTexture('itemball', 256, 256, (ctx, w) => pouchIcon(ctx, w / 2, w * 0.55, w * 0.36), false);
  }
  const g = new THREE.Group();
  const h = 0.55 / Math.cos(PITCH);
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.55, h), new THREE.MeshBasicMaterial({ map: itemTex, alphaTest: 0.5, alphaToCoverage: true }));
  plane.position.set(0, h / 2, 0.1);
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.3), new THREE.MeshBasicMaterial({ map: blobShadow(), transparent: true, depthWrite: false }));
  sh.rotation.x = -Math.PI / 2;
  sh.position.y = 0.012;
  g.add(plane, sh);
  return g;
}
