/**
 * People: chibi overworld walkers and larger battle-intro portraits, all vector,
 * in the same outlined, cel-shaded style as the creatures.
 *
 * Drawn in a design box 100 units tall with the feet at (50, 100).
 */
import { OUTLINE_INK, Painter, ell, mix, svg } from './paint';

export type Facing = 'down' | 'up' | 'left' | 'right';

export interface Look {
  skin: string;
  hair: string;
  hairStyle: 'short' | 'spiky' | 'long' | 'bun' | 'bald' | 'pony';
  top: string;
  bottom: string;
  shoes: string;
  hat?: { kind: 'cap' | 'beanie' | 'hardhat' | 'beret' | 'nurse' | 'bandana'; color: string };
  extra?: 'scarf' | 'labcoat' | 'backpack' | 'apron' | 'glasses' | 'beard';
  extraColor?: string;
  dress?: boolean;
  /** Beard colour, for characters whose `extra` slot is taken (the professor's labcoat). */
  beard?: string;
}

const SKIN = { light: '#fcdcc0', mid: '#eebc94', tan: '#c88c64', deep: '#8a5a3c' };

export const LOOKS: Record<string, Look> = {
  player: { skin: SKIN.light, hair: '#3a2a24', hairStyle: 'short', top: '#2a3a6a', bottom: '#3a3a48', shoes: '#c03030', hat: { kind: 'beanie', color: '#d8383a' }, extra: 'scarf', extraColor: '#f6f6f2' },
  rival: { skin: SKIN.light, hair: '#f2b030', hairStyle: 'spiky', top: '#4aa04a', bottom: '#2e3a4a', shoes: '#e88a2a', extra: 'scarf', extraColor: '#f08a30' },
  professor: { skin: SKIN.mid, hair: '#b8b8c0', hairStyle: 'short', top: '#6a5a4a', bottom: '#4a4038', shoes: '#3a2a20', extra: 'labcoat', extraColor: '#f6f6f4', beard: '#c8c8d0' },
  mom: { skin: SKIN.light, hair: '#8a4a2a', hairStyle: 'bun', top: '#f0a0a8', bottom: '#5a6a9a', shoes: '#6a4a3a', extra: 'apron', extraColor: '#fff8e8' },
  nurse: { skin: SKIN.light, hair: '#f08ab0', hairStyle: 'pony', top: '#f8f0f4', bottom: '#f8f0f4', shoes: '#f0f0f0', hat: { kind: 'nurse', color: '#ffffff' }, dress: true },
  clerk: { skin: SKIN.mid, hair: '#2a2a3a', hairStyle: 'short', top: '#4a8ac8', bottom: '#3a3a4a', shoes: '#2a2a2a', extra: 'apron', extraColor: '#3a6a3a' },
  youngster: { skin: SKIN.mid, hair: '#3a2a1a', hairStyle: 'short', top: '#f0d040', bottom: '#3a5ab0', shoes: '#e04040', hat: { kind: 'cap', color: '#e04040' } },
  lass: { skin: SKIN.light, hair: '#f0d070', hairStyle: 'long', top: '#e86a8a', bottom: '#e86a8a', shoes: '#8a3a5a', dress: true },
  hiker: { skin: SKIN.tan, hair: '#4a3020', hairStyle: 'short', top: '#a0603a', bottom: '#6a5a3a', shoes: '#4a3424', hat: { kind: 'beret', color: '#6a7a3a' }, extra: 'backpack', extraColor: '#c8602a' },
  bugcatcher: { skin: SKIN.light, hair: '#5a3a1a', hairStyle: 'short', top: '#f8f8f0', bottom: '#5a7a3a', shoes: '#4a4a4a', hat: { kind: 'cap', color: '#e8d48a' }, extra: 'backpack', extraColor: '#4a8a4a' },
  fisher: { skin: SKIN.tan, hair: '#2a2a2a', hairStyle: 'short', top: '#3a6aa0', bottom: '#4a4a3a', shoes: '#3a3a3a', hat: { kind: 'bandana', color: '#e04a3a' } },
  worker: { skin: SKIN.mid, hair: '#3a2a20', hairStyle: 'short', top: '#f08a2a', bottom: '#3a4a6a', shoes: '#4a3a2a', hat: { kind: 'hardhat', color: '#f6d030' } },
  leader: { skin: SKIN.mid, hair: '#c84a2a', hairStyle: 'short', top: '#7a6a5a', bottom: '#4a4a5a', shoes: '#3a2a20', hat: { kind: 'hardhat', color: '#e8c030' }, extra: 'glasses', extraColor: '#f0f0f0' },
  oldman: { skin: SKIN.mid, hair: '#e8e8ec', hairStyle: 'bald', top: '#8a6aa0', bottom: '#4a4a5a', shoes: '#3a2a2a', extra: 'beard', extraColor: '#f0f0f2' },
  girl: { skin: SKIN.deep, hair: '#2a1a14', hairStyle: 'pony', top: '#f6c040', bottom: '#4a8ac8', shoes: '#f0f0f0', dress: false },
  boy: { skin: SKIN.light, hair: '#6a3a1a', hairStyle: 'spiky', top: '#e04a4a', bottom: '#3a4a6a', shoes: '#2a2a3a' },
  aide: { skin: SKIN.tan, hair: '#2a2a40', hairStyle: 'short', top: '#4a8a8a', bottom: '#3a3a4a', shoes: '#2a2a2a', extra: 'labcoat', extraColor: '#f6f6f4' },
};

interface Frame {
  facing: Facing;
  /** -1, 0, 1: which leg is forward. */
  step: number;
  portrait: boolean;
}

/** Body proportions in design units. */
interface Prop {
  headY: number;
  headR: number;
  shoulder: number;
  waist: number;
  hip: number;
  legW: number;
  halfW: number;
  armL: number;
}

const CHIBI: Prop = { headY: 32, headR: 24, shoulder: 52, waist: 74, hip: 80, legW: 9, halfW: 14, armL: 21 };
const TALL: Prop = { headY: 19, headR: 15, shoulder: 34, waist: 60, hip: 63, legW: 9, halfW: 14, armL: 28 };

function render(ctx: CanvasRenderingContext2D, look: Look, f: Frame, x: number, y: number, h: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(h / 100, h / 100);
  ctx.translate(-50, -100);
  const side = f.facing === 'left' || f.facing === 'right';
  if (f.facing === 'left') {
    ctx.translate(100, 0);
    ctx.scale(-1, 1);
  }
  const p = new Painter(ctx, {});
  p.lw = f.portrait ? 1.5 : 2.2;
  p.flipLight = f.facing === 'left';
  const P = f.portrait ? TALL : CHIBI;
  const bob = f.step !== 0 ? -1.2 : 0;
  ctx.translate(0, bob);
  if (side) drawSide(p, look, P, f);
  else drawFrontBack(p, look, P, f, f.facing === 'up');
  ctx.restore();
}

// ---------------------------------------------------------------- front / back

function drawFrontBack(p: Painter, L: Look, P: Prop, f: Frame, back: boolean): void {
  const cx = 50;
  const s = f.step;
  const legTop = P.hip - 4;
  const shoeH = 5;
  // legs: the stepping leg is lifted a little and the other is planted
  for (const side of [-1, 1]) {
    const lift = s !== 0 && side === s ? 3 : 0;
    const lx = cx + side * (P.halfW * 0.45);
    const bottom = 100 - shoeH * 0.6 - lift;
    p.path(`M${lx - P.legW / 2} ${legTop} L${lx + P.legW / 2} ${legTop} L${lx + P.legW / 2} ${bottom} L${lx - P.legW / 2} ${bottom} Z`, L.dress ? L.skin : L.bottom);
    p.ellipse(lx + side * 0.5, 100 - shoeH * 0.55 - lift, P.legW * 0.62, shoeH * 0.62, L.shoes);
  }
  const coat = L.extra === 'labcoat';
  // arms swing opposite to legs
  const armSwing = (side: number) => (s === 0 ? 0 : side === s ? -2.5 : 2.5);
  const arm = (side: number) => {
    const ax = cx + side * (P.halfW + 2.5);
    const top = P.shoulder + 2;
    const len = P.armL + armSwing(side);
    p.path(`M${ax - 3.4} ${top} L${ax + 3.4} ${top} L${ax + 3.4 + side * 0.8} ${top + len} L${ax - 3.4 + side * 0.8} ${top + len} Z`, coat ? L.extraColor! : L.top);
    p.ellipse(ax + side * 0.8, top + len + 1.5, 3.6, 3.4, L.skin);
  };
  arm(-1);
  arm(1);
  // torso
  const tTop = P.shoulder - 2;
  const tBot = L.dress ? P.hip + 6 : P.hip;
  const hw = P.halfW;
  const flare = L.dress ? 6 : 0;
  p.path(`M${cx - hw} ${tTop + 6} Q${cx - hw} ${tTop} ${cx - hw + 6} ${tTop} L${cx + hw - 6} ${tTop} Q${cx + hw} ${tTop} ${cx + hw} ${tTop + 6} L${cx + hw + flare} ${tBot} L${cx - hw - flare} ${tBot} Z`, L.top);
  if (!L.dress) {
    p.path(`M${cx - hw} ${P.waist} L${cx + hw} ${P.waist} L${cx + hw} ${P.hip + 1} L${cx - hw} ${P.hip + 1} Z`, L.bottom);
    if (f.portrait) p.flat(svg(`M${cx - hw} ${P.waist - 1} L${cx + hw} ${P.waist - 1} L${cx + hw} ${P.waist + 1.5} L${cx - hw} ${P.waist + 1.5} Z`), mix(L.bottom, OUTLINE_INK, 0.4));
  }
  // rival's striped top
  if (L.top === LOOKS.rival.top) {
    for (let yy = tTop + 6; yy < P.waist - 2; yy += 6) p.flat(svg(`M${cx - hw + 0.5} ${yy} L${cx + hw - 0.5} ${yy} L${cx + hw - 0.5} ${yy + 2.6} L${cx - hw + 0.5} ${yy + 2.6} Z`), '#f6f6f2');
  }
  if (L.extra === 'labcoat') {
    const c = L.extraColor!;
    if (back) p.path(`M${cx - hw - 1} ${tTop + 4} Q${cx - hw - 1} ${tTop - 1} ${cx - hw + 6} ${tTop - 1} L${cx + hw - 6} ${tTop - 1} Q${cx + hw + 1} ${tTop - 1} ${cx + hw + 1} ${tTop + 4} L${cx + hw + 3} ${P.hip + 8} L${cx - hw - 3} ${P.hip + 8} Z`, c);
    else {
      p.path(`M${cx - hw - 1} ${tTop + 4} Q${cx - hw - 1} ${tTop - 1} ${cx - hw + 5} ${tTop - 1} L${cx - 4} ${tTop - 1} L${cx - 3} ${P.hip + 8} L${cx - hw - 3} ${P.hip + 8} Z`, c);
      p.path(`M${cx + hw + 1} ${tTop + 4} Q${cx + hw + 1} ${tTop - 1} ${cx + hw - 5} ${tTop - 1} L${cx + 4} ${tTop - 1} L${cx + 3} ${P.hip + 8} L${cx + hw + 3} ${P.hip + 8} Z`, c);
    }
  }
  if (L.extra === 'apron' && !back) {
    p.path(`M${cx - hw + 3} ${tTop + 7} L${cx + hw - 3} ${tTop + 7} L${cx + hw - 1} ${P.hip + 4} L${cx - hw + 1} ${P.hip + 4} Z`, L.extraColor!);
  }
  if (L.extra === 'backpack') {
    if (back) {
      p.path(`M${cx - hw + 2} ${tTop + 3} Q${cx} ${tTop - 2} ${cx + hw - 2} ${tTop + 3} L${cx + hw - 1} ${P.waist + 2} Q${cx} ${P.waist + 5} ${cx - hw + 1} ${P.waist + 2} Z`, L.extraColor!);
      p.path(`M${cx - hw + 4} ${P.waist - 9} L${cx + hw - 4} ${P.waist - 9} L${cx + hw - 4} ${P.waist - 1} L${cx - hw + 4} ${P.waist - 1} Z`, mix(L.extraColor!, '#000000', 0.15));
    } else {
      p.flat(svg(`M${cx - hw + 3} ${tTop} L${cx - hw + 6} ${tTop} L${cx - hw + 6} ${P.waist} L${cx - hw + 3} ${P.waist} Z`), mix(L.extraColor!, '#000000', 0.2));
      p.flat(svg(`M${cx + hw - 6} ${tTop} L${cx + hw - 3} ${tTop} L${cx + hw - 3} ${P.waist} L${cx + hw - 6} ${P.waist} Z`), mix(L.extraColor!, '#000000', 0.2));
    }
  }
  // head
  const hy = P.headY;
  const hr = P.headR;
  if (L.hairStyle === 'long' || (back && L.hairStyle === 'pony')) {
    // hair hanging behind the shoulders
    if (L.hairStyle === 'long') p.path(`M${cx - hr * 0.95} ${hy} Q${cx - hr * 1.05} ${hy + hr * 1.3} ${cx - hr * 0.7} ${hy + hr * 1.5} L${cx + hr * 0.7} ${hy + hr * 1.5} Q${cx + hr * 1.05} ${hy + hr * 1.3} ${cx + hr * 0.95} ${hy} Z`, L.hair);
  }
  if (L.extra === 'scarf') {
    p.ellipse(cx, P.shoulder - 1, hw * 0.95, 4.5, L.extraColor!);
    if (back) p.path(`M${cx + 2} ${P.shoulder} L${cx + 9} ${P.shoulder + 1} L${cx + 10} ${P.shoulder + 14} L${cx + 4} ${P.shoulder + 13} Z`, L.extraColor!);
  }
  p.ellipse(cx, hy, hr, hr * 0.92, L.skin);
  hairFrontBack(p, L, cx, hy, hr, back);
  if (!back) face(p, L, cx, hy, hr, f.portrait);
  hatFrontBack(p, L, cx, hy, hr, back);
  if (L.extra === 'scarf' && !back) {
    p.path(`M${cx - 6} ${P.shoulder} L${cx - 1} ${P.shoulder + 1} L${cx - 2} ${P.shoulder + 13} L${cx - 8} ${P.shoulder + 12} Z`, L.extraColor!);
  }
  const beard = L.beard ?? (L.extra === 'beard' ? L.extraColor : undefined);
  if (beard && !back) {
    p.path(`M${cx - hr * 0.75} ${hy + hr * 0.35} Q${cx} ${hy + hr * 0.6} ${cx + hr * 0.75} ${hy + hr * 0.35} Q${cx + hr * 0.6} ${hy + hr * 1.35} ${cx} ${hy + hr * 1.55} Q${cx - hr * 0.6} ${hy + hr * 1.35} ${cx - hr * 0.75} ${hy + hr * 0.35} Z`, beard);
    p.line(`M${cx - 3} ${hy + hr * 0.62} Q${cx} ${hy + hr * 0.7} ${cx + 3} ${hy + hr * 0.62}`, '#6a4a4a', 0.6);
  }
}

function hairFrontBack(p: Painter, L: Look, cx: number, hy: number, hr: number, back: boolean): void {
  const c = L.hair;
  const st = L.hairStyle;
  if (st === 'bald') {
    p.ellipse(cx - hr * 0.9, hy + hr * 0.05, hr * 0.22, hr * 0.32, c);
    p.ellipse(cx + hr * 0.9, hy + hr * 0.05, hr * 0.22, hr * 0.32, c);
    if (back) p.path(`M${cx - hr * 0.9} ${hy} Q${cx} ${hy + hr * 0.5} ${cx + hr * 0.9} ${hy} L${cx + hr * 0.8} ${hy + hr * 0.5} Q${cx} ${hy + hr * 0.9} ${cx - hr * 0.8} ${hy + hr * 0.5} Z`, c);
    return;
  }
  if (back) {
    // whole back of the head
    p.path(`M${cx - hr * 1.02} ${hy + hr * 0.2} Q${cx - hr * 1.05} ${hy - hr * 1.02} ${cx} ${hy - hr * 1.0} Q${cx + hr * 1.05} ${hy - hr * 1.02} ${cx + hr * 1.02} ${hy + hr * 0.2} Q${cx + hr * 0.9} ${hy + hr * (st === 'long' ? 1.4 : 0.85)} ${cx} ${hy + hr * (st === 'long' ? 1.5 : 0.92)} Q${cx - hr * 0.9} ${hy + hr * (st === 'long' ? 1.4 : 0.85)} ${cx - hr * 1.02} ${hy + hr * 0.2} Z`, c);
  } else {
    // crown with a fringe over the forehead
    p.path(`M${cx - hr * 1.04} ${hy + hr * 0.25} Q${cx - hr * 1.08} ${hy - hr * 1.02} ${cx} ${hy - hr * 1.02} Q${cx + hr * 1.08} ${hy - hr * 1.02} ${cx + hr * 1.04} ${hy + hr * 0.25} L${cx + hr * 0.82} ${hy - hr * 0.05} Q${cx + hr * 0.5} ${hy - hr * 0.42} ${cx + hr * 0.2} ${hy - hr * 0.28} Q${cx} ${hy - hr * 0.5} ${cx - hr * 0.25} ${hy - hr * 0.3} Q${cx - hr * 0.55} ${hy - hr * 0.42} ${cx - hr * 0.82} ${hy - hr * 0.05} Z`, c);
  }
  if (st === 'spiky') {
    for (const [ax, ay, bx, by] of [[-0.9, -0.5, -1.35, -0.95], [-0.5, -0.9, -0.65, -1.5], [0.05, -1.0, 0.15, -1.6], [0.55, -0.9, 0.85, -1.45], [0.9, -0.5, 1.35, -0.85]]) {
      p.path(`M${cx + hr * (ax - 0.22)} ${hy + hr * (ay + 0.2)} L${cx + hr * bx} ${hy + hr * by} L${cx + hr * (ax + 0.25)} ${hy + hr * (ay + 0.12)} Z`, c);
    }
  }
  if (st === 'bun') p.ellipse(cx, hy - hr * 1.05, hr * 0.42, hr * 0.36, c);
  if (st === 'pony') {
    if (back) p.path(`M${cx - hr * 0.2} ${hy + hr * 0.1} Q${cx - hr * 0.35} ${hy + hr * 1.2} ${cx} ${hy + hr * 1.5} Q${cx + hr * 0.35} ${hy + hr * 1.2} ${cx + hr * 0.2} ${hy + hr * 0.1} Z`, c);
    else p.path(`M${cx + hr * 0.85} ${hy - hr * 0.4} Q${cx + hr * 1.5} ${hy - hr * 0.2} ${cx + hr * 1.35} ${hy + hr * 0.9} Q${cx + hr * 1.05} ${hy + hr * 0.4} ${cx + hr * 0.9} ${hy + hr * 0.1} Z`, c);
  }
  if (st === 'long' && !back) {
    p.path(`M${cx - hr * 1.04} ${hy + hr * 0.1} Q${cx - hr * 1.15} ${hy + hr * 0.9} ${cx - hr * 0.95} ${hy + hr * 1.35} L${cx - hr * 0.72} ${hy + hr * 1.3} Q${cx - hr * 0.82} ${hy + hr * 0.6} ${cx - hr * 0.8} ${hy} Z`, c);
    p.path(`M${cx + hr * 1.04} ${hy + hr * 0.1} Q${cx + hr * 1.15} ${hy + hr * 0.9} ${cx + hr * 0.95} ${hy + hr * 1.35} L${cx + hr * 0.72} ${hy + hr * 1.3} Q${cx + hr * 0.82} ${hy + hr * 0.6} ${cx + hr * 0.8} ${hy} Z`, c);
  }
}

function face(p: Painter, L: Look, cx: number, hy: number, hr: number, portrait: boolean): void {
  const ctx = p.ctx;
  const ey = hy + hr * 0.12;
  const ex = hr * 0.36;
  const erx = hr * (portrait ? 0.12 : 0.14);
  const ery = hr * (portrait ? 0.17 : 0.22);
  for (const sgn of [-1, 1]) {
    ctx.fillStyle = OUTLINE_INK;
    ctx.beginPath();
    ctx.ellipse(cx + sgn * ex, ey, erx, ery, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(cx + sgn * ex - erx * 0.3, ey - ery * 0.4, erx * 0.42, erx * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (portrait) {
    p.line(`M${cx - ex - erx} ${ey - ery - 2} L${cx - ex + erx} ${ey - ery - 2.6} M${cx + ex - erx} ${ey - ery - 2.6} L${cx + ex + erx} ${ey - ery - 2}`, mix(L.hair, OUTLINE_INK, 0.3), 0.9);
  }
  // cheeks + mouth
  p.flat(ell(cx - hr * 0.6, hy + hr * 0.45, hr * 0.14, hr * 0.08), '#ff9aa0', { alpha: 0.5 });
  p.flat(ell(cx + hr * 0.6, hy + hr * 0.45, hr * 0.14, hr * 0.08), '#ff9aa0', { alpha: 0.5 });
  p.line(`M${cx - hr * 0.12} ${hy + hr * 0.55} Q${cx} ${hy + hr * 0.65} ${cx + hr * 0.12} ${hy + hr * 0.55}`, '#8a3a3a', 0.6);
  if (L.extra === 'glasses') {
    ctx.save();
    ctx.lineWidth = p.lw * 0.7;
    ctx.strokeStyle = '#3a3a4a';
    ctx.fillStyle = 'rgba(200,230,255,0.35)';
    for (const sgn of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(cx + sgn * ex, ey, erx * 2.2, ery * 1.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(cx - ex + erx * 2.2, ey);
    ctx.lineTo(cx + ex - erx * 2.2, ey);
    ctx.stroke();
    ctx.restore();
  }
}

function hatFrontBack(p: Painter, L: Look, cx: number, hy: number, hr: number, back: boolean): void {
  const h = L.hat;
  if (!h) return;
  const c = h.color;
  switch (h.kind) {
    case 'beanie':
      p.path(`M${cx - hr * 1.06} ${hy - hr * 0.15} Q${cx - hr * 1.1} ${hy - hr * 1.15} ${cx} ${hy - hr * 1.15} Q${cx + hr * 1.1} ${hy - hr * 1.15} ${cx + hr * 1.06} ${hy - hr * 0.15} Z`, c);
      p.path(`M${cx - hr * 1.1} ${hy - hr * 0.42} L${cx + hr * 1.1} ${hy - hr * 0.42} L${cx + hr * 1.1} ${hy - hr * 0.08} Q${cx} ${hy + hr * 0.02} ${cx - hr * 1.1} ${hy - hr * 0.08} Z`, mix(c, '#ffffff', 0.12));
      p.ellipse(cx, hy - hr * 1.2, hr * 0.26, hr * 0.24, '#f6f6f2');
      if (!back) p.path(`M${cx - hr * 0.25} ${hy - hr * 0.95} L${cx + hr * 0.25} ${hy - hr * 0.95} L${cx} ${hy - hr * 0.62} Z`, '#f6f6f2', { shade: false, lw: 0.5 });
      break;
    case 'cap':
      p.path(`M${cx - hr * 1.02} ${hy - hr * 0.25} Q${cx - hr * 1.05} ${hy - hr * 1.12} ${cx} ${hy - hr * 1.12} Q${cx + hr * 1.05} ${hy - hr * 1.12} ${cx + hr * 1.02} ${hy - hr * 0.25} Z`, c);
      if (back) p.path(`M${cx - hr * 0.3} ${hy - hr * 0.42} L${cx + hr * 0.3} ${hy - hr * 0.42} L${cx + hr * 0.3} ${hy - hr * 0.25} L${cx - hr * 0.3} ${hy - hr * 0.25} Z`, mix(c, '#000000', 0.2));
      else p.path(`M${cx - hr * 0.95} ${hy - hr * 0.3} Q${cx} ${hy - hr * 0.55} ${cx + hr * 0.95} ${hy - hr * 0.3} Q${cx + hr * 0.9} ${hy - hr * 0.08} ${cx} ${hy - hr * 0.12} Q${cx - hr * 0.9} ${hy - hr * 0.08} ${cx - hr * 0.95} ${hy - hr * 0.3} Z`, mix(c, '#000000', 0.12));
      break;
    case 'hardhat':
      p.path(`M${cx - hr * 0.98} ${hy - hr * 0.3} Q${cx - hr * 1.0} ${hy - hr * 1.2} ${cx} ${hy - hr * 1.2} Q${cx + hr * 1.0} ${hy - hr * 1.2} ${cx + hr * 0.98} ${hy - hr * 0.3} Z`, c);
      p.ellipse(cx, hy - hr * 0.3, hr * 1.2, hr * 0.16, c);
      p.line(`M${cx} ${hy - hr * 1.18} L${cx} ${hy - hr * 0.42}`, mix(c, '#000000', 0.25), 1, { face: false });
      if (!back) p.ellipse(cx, hy - hr * 0.75, hr * 0.17, hr * 0.15, '#fff8c0');
      break;
    case 'beret':
      p.ellipse(cx - hr * 0.1, hy - hr * 0.72, hr * 1.12, hr * 0.42, c, { rot: -6 });
      p.ellipse(cx - hr * 0.1, hy - hr * 1.12, hr * 0.12, hr * 0.1, mix(c, '#000000', 0.2));
      break;
    case 'nurse':
      p.path(`M${cx - hr * 0.6} ${hy - hr * 0.72} L${cx + hr * 0.6} ${hy - hr * 0.72} L${cx + hr * 0.5} ${hy - hr * 1.2} L${cx - hr * 0.5} ${hy - hr * 1.2} Z`, c);
      if (!back) {
        p.flat(svg(`M${cx - hr * 0.06} ${hy - hr * 1.12} L${cx + hr * 0.06} ${hy - hr * 1.12} L${cx + hr * 0.06} ${hy - hr * 0.8} L${cx - hr * 0.06} ${hy - hr * 0.8} Z`), '#e83a4a');
        p.flat(svg(`M${cx - hr * 0.18} ${hy - hr * 1.02} L${cx + hr * 0.18} ${hy - hr * 1.02} L${cx + hr * 0.18} ${hy - hr * 0.9} L${cx - hr * 0.18} ${hy - hr * 0.9} Z`), '#e83a4a');
      }
      break;
    case 'bandana':
      p.path(`M${cx - hr * 1.04} ${hy - hr * 0.2} Q${cx - hr * 1.06} ${hy - hr * 1.1} ${cx} ${hy - hr * 1.08} Q${cx + hr * 1.06} ${hy - hr * 1.1} ${cx + hr * 1.04} ${hy - hr * 0.2} Q${cx} ${hy - hr * 0.42} ${cx - hr * 1.04} ${hy - hr * 0.2} Z`, c);
      if (back) {
        p.path(`M${cx - hr * 0.05} ${hy - hr * 0.3} L${cx - hr * 0.3} ${hy + hr * 0.15} L${cx - hr * 0.02} ${hy + hr * 0.05} Z`, c);
        p.path(`M${cx + hr * 0.05} ${hy - hr * 0.3} L${cx + hr * 0.32} ${hy + hr * 0.1} L${cx + hr * 0.04} ${hy + hr * 0.04} Z`, c);
        p.ellipse(cx, hy - hr * 0.3, hr * 0.12, hr * 0.1, c);
      }
      for (const [dx, dy] of [[-0.5, -0.7], [0.1, -0.85], [0.6, -0.6]]) p.flat(ell(cx + hr * dx, hy + hr * dy, hr * 0.07, hr * 0.07), '#ffffff');
      break;
  }
}

// ---------------------------------------------------------------- side view (facing right)

function drawSide(p: Painter, L: Look, P: Prop, f: Frame): void {
  const cx = 50;
  const s = f.step;
  const legTop = P.hip - 4;
  const shoeH = 5;
  const stride = s === 0 ? 0 : 5;
  const hw = P.halfW * 0.72;
  const coat = L.extra === 'labcoat';
  // far arm swings opposite to the near arm
  const armAngle = s === 0 ? 0 : s * 22;
  const armPath = (ang: number, far: boolean) => {
    const top = P.shoulder + 2;
    const a = (ang * Math.PI) / 180;
    const ex = cx + Math.sin(a) * P.armL;
    const ey = top + Math.cos(a) * P.armL;
    p.path(`M${cx - 3.2} ${top} L${cx + 3.2} ${top} L${r(ex + 3.2)} ${r(ey)} L${r(ex - 3.2)} ${r(ey)} Z`, coat ? L.extraColor! : L.top, { far });
    p.ellipse(r(ex), r(ey + 1.5), 3.5, 3.3, L.skin, { far });
  };
  armPath(-armAngle, true);
  // legs: far then near
  for (const leg of [-1, 1]) {
    const off = s === 0 ? 0 : leg * s * stride;
    const lx = cx + off;
    const lift = s !== 0 && leg * s < 0 ? 2 : 0;
    const bottom = 100 - shoeH * 0.6 - lift;
    p.path(`M${lx - P.legW / 2} ${legTop} L${lx + P.legW / 2} ${legTop} L${lx + P.legW / 2} ${bottom} L${lx - P.legW / 2} ${bottom} Z`, L.dress ? L.skin : L.bottom, { far: leg < 0 });
    p.path(`M${lx - P.legW * 0.55} ${bottom - 2} L${lx + P.legW * 0.55} ${bottom - 2} Q${lx + P.legW * 1.1} ${bottom - 1} ${lx + P.legW * 0.95} ${100 - lift} L${lx - P.legW * 0.55} ${100 - lift} Z`, L.shoes, { far: leg < 0 });
  }
  if (L.extra === 'backpack') {
    p.path(`M${cx - hw - 9} ${P.shoulder + 1} Q${cx - hw - 11} ${P.shoulder - 2} ${cx - hw - 3} ${P.shoulder - 2} L${cx - hw + 1} ${P.shoulder} L${cx - hw + 1} ${P.waist + 2} L${cx - hw - 8} ${P.waist + 2} Z`, L.extraColor!);
  }
  const tTop = P.shoulder - 2;
  const tBot = L.dress ? P.hip + 6 : P.hip;
  const flare = L.dress ? 5 : 0;
  p.path(`M${cx - hw} ${tTop + 5} Q${cx - hw} ${tTop} ${cx - hw + 5} ${tTop} L${cx + hw - 5} ${tTop} Q${cx + hw} ${tTop} ${cx + hw} ${tTop + 5} L${cx + hw + flare} ${tBot} L${cx - hw - flare} ${tBot} Z`, L.top);
  if (!L.dress) p.path(`M${cx - hw} ${P.waist} L${cx + hw} ${P.waist} L${cx + hw} ${P.hip + 1} L${cx - hw} ${P.hip + 1} Z`, L.bottom);
  if (L.top === LOOKS.rival.top) {
    for (let yy = tTop + 6; yy < P.waist - 2; yy += 6) p.flat(svg(`M${cx - hw + 0.5} ${yy} L${cx + hw - 0.5} ${yy} L${cx + hw - 0.5} ${yy + 2.6} L${cx - hw + 0.5} ${yy + 2.6} Z`), '#f6f6f2');
  }
  if (coat) p.path(`M${cx - hw - 1} ${tTop + 4} Q${cx - hw - 1} ${tTop - 1} ${cx - hw + 5} ${tTop - 1} L${cx + hw - 3} ${tTop - 1} L${cx + hw + 1} ${P.hip + 8} L${cx - hw - 3} ${P.hip + 8} Z`, L.extraColor!);
  if (L.extra === 'apron') p.path(`M${cx + hw - 3} ${tTop + 7} L${cx + hw + 1} ${tTop + 7} L${cx + hw + 3} ${P.hip + 4} L${cx + hw - 4} ${P.hip + 4} Z`, L.extraColor!);
  const hy = P.headY;
  const hr = P.headR;
  if (L.hairStyle === 'long') p.path(`M${cx - hr * 0.95} ${hy - hr * 0.2} Q${cx - hr * 1.15} ${hy + hr * 1.2} ${cx - hr * 0.55} ${hy + hr * 1.45} L${cx + hr * 0.1} ${hy + hr * 1.3} Q${cx - hr * 0.2} ${hy + hr * 0.5} ${cx} ${hy} Z`, L.hair);
  if (L.extra === 'scarf') {
    p.ellipse(cx, P.shoulder - 1, hw + 1.5, 4.5, L.extraColor!);
    p.path(`M${cx - hw} ${P.shoulder - 1} L${cx - hw - 9} ${P.shoulder + 3 - s * 1.5} L${cx - hw - 8} ${P.shoulder + 8 - s * 1.5} L${cx - hw + 2} ${P.shoulder + 3} Z`, L.extraColor!);
  }
  // head, face toward +x
  p.ellipse(cx + 1, hy, hr, hr * 0.92, L.skin);
  hairSide(p, L, cx + 1, hy, hr);
  const beard = L.beard ?? (L.extra === 'beard' ? L.extraColor : undefined);
  if (beard) {
    p.path(`M${cx - hr * 0.1} ${hy + hr * 0.4} Q${cx + hr * 0.5} ${hy + hr * 0.5} ${cx + hr * 0.95} ${hy + hr * 0.4} Q${cx + hr * 0.8} ${hy + hr * 1.3} ${cx + hr * 0.3} ${hy + hr * 1.45} Q${cx - hr * 0.1} ${hy + hr} ${cx - hr * 0.1} ${hy + hr * 0.4} Z`, beard);
  }
  // eye + cheek
  const ctx = p.ctx;
  const ex = cx + hr * 0.55;
  const ey = hy + hr * 0.1;
  ctx.fillStyle = OUTLINE_INK;
  ctx.beginPath();
  ctx.ellipse(ex, ey, hr * 0.11, hr * 0.21, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(ex - hr * 0.03, ey - hr * 0.08, hr * 0.05, hr * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();
  p.flat(ell(cx + hr * 0.45, hy + hr * 0.45, hr * 0.14, hr * 0.08), '#ff9aa0', { alpha: 0.5 });
  if (L.extra === 'glasses') {
    ctx.save();
    ctx.lineWidth = p.lw * 0.7;
    ctx.strokeStyle = '#3a3a4a';
    ctx.fillStyle = 'rgba(200,230,255,0.35)';
    ctx.beginPath();
    ctx.ellipse(ex, ey, hr * 0.24, hr * 0.26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ex - hr * 0.24, ey);
    ctx.lineTo(cx - hr * 0.2, ey - hr * 0.05);
    ctx.stroke();
    ctx.restore();
  }
  hatSide(p, L, cx + 1, hy, hr);
  armPath(armAngle, false);
}

function hairSide(p: Painter, L: Look, cx: number, hy: number, hr: number): void {
  const c = L.hair;
  const st = L.hairStyle;
  if (st === 'bald') {
    p.path(`M${cx - hr * 0.98} ${hy - hr * 0.15} Q${cx - hr * 0.6} ${hy - hr * 0.3} ${cx - hr * 0.45} ${hy + hr * 0.1} Q${cx - hr * 0.6} ${hy + hr * 0.5} ${cx - hr * 0.92} ${hy + hr * 0.4} Z`, c);
    return;
  }
  // back of the head and the top, fringe sweeping forward
  p.path(`M${cx - hr * 0.95} ${hy + hr * (st === 'short' || st === 'spiky' ? 0.55 : 0.7)} Q${cx - hr * 1.12} ${hy - hr * 1.05} ${cx + hr * 0.15} ${hy - hr * 1.02} Q${cx + hr * 0.95} ${hy - hr * 0.95} ${cx + hr * 0.98} ${hy - hr * 0.3} L${cx + hr * 0.78} ${hy - hr * 0.42} L${cx + hr * 0.62} ${hy - hr * 0.3} L${cx + hr * 0.42} ${hy - hr * 0.48} Q${cx + hr * 0.05} ${hy - hr * 0.5} ${cx - hr * 0.2} ${hy - hr * 0.2} Q${cx - hr * 0.42} ${hy + hr * 0.15} ${cx - hr * 0.42} ${hy + hr * 0.55} Z`, c);
  if (st === 'spiky') {
    for (const [ax, ay, bx, by] of [[-0.8, -0.5, -1.45, -0.7], [-0.45, -0.9, -0.85, -1.5], [0.1, -1.0, 0.0, -1.65], [0.6, -0.8, 0.9, -1.35]]) {
      p.path(`M${cx + hr * (ax - 0.22)} ${hy + hr * (ay + 0.2)} L${cx + hr * bx} ${hy + hr * by} L${cx + hr * (ax + 0.25)} ${hy + hr * (ay + 0.1)} Z`, c);
    }
  }
  if (st === 'bun') p.ellipse(cx - hr * 0.55, hy - hr * 0.85, hr * 0.38, hr * 0.34, c);
  p.ellipse(cx - hr * 0.22, hy + hr * 0.24, hr * 0.11, hr * 0.15, L.skin, { shade: false, lw: 0.6 });
  if (st === 'pony') p.path(`M${cx - hr * 0.85} ${hy - hr * 0.4} Q${cx - hr * 1.6} ${hy - hr * 0.2} ${cx - hr * 1.45} ${hy + hr * 0.95} Q${cx - hr * 1.1} ${hy + hr * 0.4} ${cx - hr * 0.9} ${hy + hr * 0.05} Z`, c);
}

function hatSide(p: Painter, L: Look, cx: number, hy: number, hr: number): void {
  const h = L.hat;
  if (!h) return;
  const c = h.color;
  switch (h.kind) {
    case 'beanie':
      p.path(`M${cx - hr * 1.06} ${hy - hr * 0.1} Q${cx - hr * 1.1} ${hy - hr * 1.15} ${cx} ${hy - hr * 1.15} Q${cx + hr * 1.1} ${hy - hr * 1.15} ${cx + hr * 1.04} ${hy - hr * 0.2} Z`, c);
      p.path(`M${cx - hr * 1.1} ${hy - hr * 0.36} L${cx + hr * 1.08} ${hy - hr * 0.46} L${cx + hr * 1.06} ${hy - hr * 0.14} Q${cx} ${hy - hr * 0.02} ${cx - hr * 1.1} ${hy - hr * 0.02} Z`, mix(c, '#ffffff', 0.12));
      p.ellipse(cx - hr * 0.25, hy - hr * 1.2, hr * 0.26, hr * 0.24, '#f6f6f2');
      break;
    case 'cap':
      p.path(`M${cx - hr * 1.02} ${hy - hr * 0.2} Q${cx - hr * 1.05} ${hy - hr * 1.12} ${cx} ${hy - hr * 1.12} Q${cx + hr * 1.0} ${hy - hr * 1.1} ${cx + hr * 1.0} ${hy - hr * 0.35} Z`, c);
      p.path(`M${cx + hr * 0.7} ${hy - hr * 0.4} L${cx + hr * 1.55} ${hy - hr * 0.3} Q${cx + hr * 1.6} ${hy - hr * 0.15} ${cx + hr * 1.45} ${hy - hr * 0.12} L${cx + hr * 0.7} ${hy - hr * 0.18} Z`, mix(c, '#000000', 0.12));
      break;
    case 'hardhat':
      p.path(`M${cx - hr * 0.98} ${hy - hr * 0.3} Q${cx - hr * 1.0} ${hy - hr * 1.2} ${cx} ${hy - hr * 1.2} Q${cx + hr * 1.0} ${hy - hr * 1.2} ${cx + hr * 0.98} ${hy - hr * 0.3} Z`, c);
      p.ellipse(cx + hr * 0.1, hy - hr * 0.3, hr * 1.25, hr * 0.16, c);
      p.ellipse(cx + hr * 0.95, hy - hr * 0.7, hr * 0.12, hr * 0.16, '#fff8c0');
      break;
    case 'beret':
      p.ellipse(cx - hr * 0.15, hy - hr * 0.75, hr * 1.1, hr * 0.4, c, { rot: 8 });
      break;
    case 'nurse':
      p.path(`M${cx - hr * 0.5} ${hy - hr * 0.75} L${cx + hr * 0.4} ${hy - hr * 0.75} L${cx + hr * 0.3} ${hy - hr * 1.2} L${cx - hr * 0.4} ${hy - hr * 1.2} Z`, c);
      break;
    case 'bandana':
      p.path(`M${cx - hr * 1.04} ${hy - hr * 0.15} Q${cx - hr * 1.06} ${hy - hr * 1.1} ${cx} ${hy - hr * 1.08} Q${cx + hr * 1.06} ${hy - hr * 1.1} ${cx + hr * 1.02} ${hy - hr * 0.3} Q${cx} ${hy - hr * 0.42} ${cx - hr * 1.04} ${hy - hr * 0.15} Z`, c);
      p.path(`M${cx - hr * 0.95} ${hy - hr * 0.3} L${cx - hr * 1.5} ${hy + hr * 0.15} L${cx - hr * 1.05} ${hy + hr * 0.05} Z`, c);
      break;
  }
}

function r(v: number): number {
  return Math.round(v * 100) / 100;
}

// ---------------------------------------------------------------- public API

/**
 * Overworld walker. (x, y) is the bottom-centre (feet), h the total height.
 * Frames 0 and 2 stand; 1 and 3 step with the left and right foot.
 */
export function drawCharacter(ctx: CanvasRenderingContext2D, look: Look, facing: Facing, frame: 0 | 1 | 2 | 3, x: number, y: number, h: number): void {
  const step = frame === 1 ? -1 : frame === 3 ? 1 : 0;
  render(ctx, look, { facing, step, portrait: false }, x, y, h);
}

/** Larger battle-intro pose: front view, or from behind (`back`) for the player. */
export function drawTrainerPortrait(ctx: CanvasRenderingContext2D, look: Look, x: number, y: number, h: number, back = false): void {
  render(ctx, look, { facing: back ? 'up' : 'down', step: 0, portrait: true }, x, y, h);
}
