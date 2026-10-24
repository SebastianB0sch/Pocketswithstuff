/** Small vector icons for items and menu entries. */
import { item as itemData } from '../data/items';
import { pouchIcon, roundRect, star } from './draw';

const INK = '#2e2a36';

const POUCH_COLORS: Record<string, string> = { pouch: '#d85848', snugpouch: '#4878d8', deeppouch: '#8a48c8' };
const TONIC_COLORS: Record<string, string> = { tonic: '#b070e0', supertonic: '#f07848', megatonic: '#f0c040' };
const CURE_COLORS: Record<string, string> = { antidote: '#a050b0', unstiff: '#e0c030', coolsalve: '#58b8e8', wakebell: '#f0d050', thawdrop: '#f08848', cureall: '#58c878' };

function outline(ctx: CanvasRenderingContext2D, r: number): void {
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(1.5, r * 0.12);
  ctx.strokeStyle = INK;
  ctx.stroke();
}

function bottle(ctx: CanvasRenderingContext2D, r: number, liquid: string): void {
  // Body.
  ctx.beginPath();
  ctx.moveTo(-r * 0.25, -r * 0.55);
  ctx.lineTo(-r * 0.25, -r * 0.3);
  ctx.bezierCurveTo(-r * 0.75, -r * 0.15, -r * 0.7, r * 0.85, 0, r * 0.85);
  ctx.bezierCurveTo(r * 0.7, r * 0.85, r * 0.75, -r * 0.15, r * 0.25, -r * 0.3);
  ctx.lineTo(r * 0.25, -r * 0.55);
  ctx.closePath();
  ctx.fillStyle = '#e8f4fc';
  ctx.fill();
  outline(ctx, r);
  ctx.save();
  ctx.clip();
  ctx.fillStyle = liquid;
  ctx.fillRect(-r, r * 0.1, r * 2, r);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.28, r * 0.25, r * 0.1, r * 0.28, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Cap.
  ctx.beginPath();
  roundRect(ctx, -r * 0.33, -r * 0.85, r * 0.66, r * 0.34, r * 0.08);
  ctx.fillStyle = '#585868';
  ctx.fill();
  outline(ctx, r);
}

function jar(ctx: CanvasRenderingContext2D, r: number, cap: string): void {
  roundRect(ctx, -r * 0.55, -r * 0.35, r * 1.1, r * 1.15, r * 0.25);
  ctx.fillStyle = '#f4f4f0';
  ctx.fill();
  outline(ctx, r);
  roundRect(ctx, -r * 0.65, -r * 0.7, r * 1.3, r * 0.42, r * 0.12);
  ctx.fillStyle = cap;
  ctx.fill();
  outline(ctx, r);
  ctx.fillStyle = cap;
  roundRect(ctx, -r * 0.35, r * 0.05, r * 0.7, r * 0.4, r * 0.08);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-r * 0.06, r * 0.1, r * 0.12, r * 0.3);
  ctx.fillRect(-r * 0.15, r * 0.19, r * 0.3, r * 0.12);
}

function seed(ctx: CanvasRenderingContext2D, r: number): void {
  ctx.beginPath();
  ctx.ellipse(0, r * 0.15, r * 0.55, r * 0.68, 0.3, 0, Math.PI * 2);
  ctx.fillStyle = '#e8b048';
  ctx.fill();
  outline(ctx, r);
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.45);
  ctx.quadraticCurveTo(r * 0.5, -r * 1.0, r * 0.8, -r * 0.6);
  ctx.quadraticCurveTo(r * 0.4, -r * 0.35, 0, -r * 0.45);
  ctx.fillStyle = '#58b848';
  ctx.fill();
  outline(ctx, r);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.2, 0, r * 0.12, r * 0.25, 0.3, 0, Math.PI * 2);
  ctx.fill();
}

function spray(ctx: CanvasRenderingContext2D, r: number): void {
  roundRect(ctx, -r * 0.45, -r * 0.4, r * 0.9, r * 1.25, r * 0.15);
  ctx.fillStyle = '#58b878';
  ctx.fill();
  outline(ctx, r);
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, -r * 0.3, -r * 0.05, r * 0.6, r * 0.5, r * 0.08);
  ctx.fill();
  roundRect(ctx, -r * 0.22, -r * 0.75, r * 0.44, r * 0.35, r * 0.06);
  ctx.fillStyle = '#d0d4dc';
  ctx.fill();
  outline(ctx, r);
  ctx.fillStyle = 'rgba(120,200,240,0.6)';
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(r * 0.45 + i * r * 0.18, -r * 0.7 - i * r * 0.1, r * (0.08 + i * 0.03), 0, Math.PI * 2);
    ctx.fill();
  }
}

function gem(ctx: CanvasRenderingContext2D, r: number): void {
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.7);
  ctx.lineTo(r * 0.7, -r * 0.1);
  ctx.lineTo(r * 0.35, r * 0.7);
  ctx.lineTo(-r * 0.35, r * 0.7);
  ctx.lineTo(-r * 0.7, -r * 0.1);
  ctx.closePath();
  ctx.fillStyle = '#d8e0ec';
  ctx.fill();
  outline(ctx, r);
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.55);
  ctx.lineTo(r * 0.25, -r * 0.1);
  ctx.lineTo(-r * 0.25, -r * 0.1);
  ctx.closePath();
  ctx.fill();
}

function watch(ctx: CanvasRenderingContext2D, r: number): void {
  ctx.fillStyle = '#d84848';
  roundRect(ctx, -r * 0.35, -r * 0.95, r * 0.7, r * 1.9, r * 0.2);
  ctx.fill();
  outline(ctx, r);
  roundRect(ctx, -r * 0.65, -r * 0.55, r * 1.3, r * 1.1, r * 0.25);
  ctx.fillStyle = '#e85858';
  ctx.fill();
  outline(ctx, r);
  roundRect(ctx, -r * 0.45, -r * 0.38, r * 0.9, r * 0.76, r * 0.12);
  ctx.fillStyle = '#b8d8a0';
  ctx.fill();
  ctx.fillStyle = '#3a5a30';
  ctx.fillRect(-r * 0.3, -r * 0.1, r * 0.6, r * 0.08);
  ctx.fillRect(-r * 0.04, -r * 0.25, r * 0.08, r * 0.3);
}

function book(ctx: CanvasRenderingContext2D, r: number): void {
  roundRect(ctx, -r * 0.7, -r * 0.6, r * 1.4, r * 1.2, r * 0.15);
  ctx.fillStyle = '#d84848';
  ctx.fill();
  outline(ctx, r);
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, -r * 0.5, -r * 0.42, r * 0.55, r * 0.5, r * 0.08);
  ctx.fill();
  ctx.fillStyle = '#58b8f0';
  ctx.beginPath();
  ctx.arc(-r * 0.22, -r * 0.17, r * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f8d048';
  ctx.beginPath();
  ctx.arc(r * 0.4, -r * 0.3, r * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(-r * 0.5, r * 0.25, r * 1.0, r * 0.08);
}

function shoe(ctx: CanvasRenderingContext2D, r: number): void {
  ctx.beginPath();
  ctx.moveTo(-r * 0.6, -r * 0.6);
  ctx.lineTo(-r * 0.1, -r * 0.6);
  ctx.lineTo(0, -r * 0.05);
  ctx.quadraticCurveTo(r * 0.8, 0, r * 0.8, r * 0.35);
  ctx.lineTo(r * 0.8, r * 0.5);
  ctx.lineTo(-r * 0.7, r * 0.5);
  ctx.closePath();
  ctx.fillStyle = '#e85848';
  ctx.fill();
  outline(ctx, r);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-r * 0.72, r * 0.3, r * 1.52, r * 0.2);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = r * 0.08;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(-r * 0.15 + i * r * 0.15, -r * 0.05 + i * r * 0.04);
    ctx.lineTo(r * 0.05 + i * r * 0.15, -r * 0.15 + i * r * 0.04);
    ctx.stroke();
  }
}

/** An item's icon, centred at (x, y) with radius r. */
export function itemIcon(ctx: CanvasRenderingContext2D, id: string, x: number, y: number, r: number): void {
  const it = itemData(id);
  if (it.use.t === 'catch') {
    pouchIcon(ctx, x, y + r * 0.05, r * 0.85, POUCH_COLORS[id] ?? '#d85848');
    return;
  }
  ctx.save();
  ctx.translate(x, y);
  switch (it.use.t) {
    case 'heal': bottle(ctx, r, TONIC_COLORS[id] ?? '#b070e0'); break;
    case 'restorePP': bottle(ctx, r, '#4890e8'); break;
    case 'cure': jar(ctx, r, CURE_COLORS[id] ?? '#58c878'); break;
    case 'revive': seed(ctx, r); break;
    case 'repel': spray(ctx, r); break;
    default:
      if (id === 'wristpad') watch(ctx, r);
      else if (id === 'pocklopedia') book(ctx, r);
      else if (id === 'runshoes') shoe(ctx, r);
      else gem(ctx, r);
  }
  ctx.restore();
}

export type MenuIcon = 'dex' | 'party' | 'bag' | 'card' | 'save' | 'options' | 'exit';

/** Icons for the start menu entries. */
export function menuIcon(ctx: CanvasRenderingContext2D, kind: MenuIcon, x: number, y: number, r: number): void {
  ctx.save();
  ctx.translate(x, y);
  switch (kind) {
    case 'dex':
      book(ctx, r);
      break;
    case 'party':
      ctx.restore();
      pouchIcon(ctx, x, y, r * 0.85, '#d85848');
      return;
    case 'bag':
      roundRect(ctx, -r * 0.75, -r * 0.4, r * 1.5, r * 1.15, r * 0.3);
      ctx.fillStyle = '#e09848';
      ctx.fill();
      outline(ctx, r);
      ctx.beginPath();
      ctx.arc(0, -r * 0.4, r * 0.38, Math.PI, 0);
      ctx.lineWidth = r * 0.16;
      ctx.strokeStyle = INK;
      ctx.stroke();
      roundRect(ctx, -r * 0.75, -r * 0.4, r * 1.5, r * 0.45, r * 0.2);
      ctx.fillStyle = '#c87830';
      ctx.fill();
      outline(ctx, r);
      ctx.fillStyle = '#f8d048';
      roundRect(ctx, -r * 0.15, -r * 0.1, r * 0.3, r * 0.3, r * 0.06);
      ctx.fill();
      break;
    case 'card':
      roundRect(ctx, -r * 0.85, -r * 0.55, r * 1.7, r * 1.1, r * 0.15);
      ctx.fillStyle = '#58a8e0';
      ctx.fill();
      outline(ctx, r);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(r * 0.4, -r * 0.08, r * 0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(r * 0.12, r * 0.15, r * 0.56, r * 0.25);
      ctx.fillRect(-r * 0.65, -r * 0.3, r * 0.6, r * 0.12);
      ctx.fillRect(-r * 0.65, -r * 0.05, r * 0.6, r * 0.12);
      ctx.fillRect(-r * 0.65, r * 0.2, r * 0.45, r * 0.12);
      break;
    case 'save':
      roundRect(ctx, -r * 0.7, -r * 0.7, r * 1.4, r * 1.4, r * 0.15);
      ctx.fillStyle = '#5868c8';
      ctx.fill();
      outline(ctx, r);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-r * 0.45, -r * 0.7, r * 0.9, r * 0.55);
      ctx.fillStyle = '#5868c8';
      ctx.fillRect(r * 0.12, -r * 0.62, r * 0.18, r * 0.38);
      ctx.fillStyle = '#e8ecf4';
      ctx.fillRect(-r * 0.5, r * 0.1, r * 1.0, r * 0.5);
      break;
    case 'options': {
      ctx.beginPath();
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const rr = i % 2 ? r * 0.62 : r * 0.82;
        ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fillStyle = '#9aa4b8';
      ctx.fill();
      outline(ctx, r);
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2);
      ctx.fillStyle = '#e8ecf4';
      ctx.fill();
      outline(ctx, r);
      break;
    }
    case 'exit':
      ctx.beginPath();
      ctx.moveTo(r * 0.2, -r * 0.7);
      ctx.lineTo(-r * 0.7, 0);
      ctx.lineTo(r * 0.2, r * 0.7);
      ctx.lineTo(r * 0.2, r * 0.3);
      ctx.lineTo(r * 0.75, r * 0.3);
      ctx.lineTo(r * 0.75, -r * 0.3);
      ctx.lineTo(r * 0.2, -r * 0.3);
      ctx.closePath();
      ctx.fillStyle = '#e06050';
      ctx.fill();
      outline(ctx, r);
      break;
  }
  ctx.restore();
}

/** A shiny badge medal. */
export function badgeIcon(ctx: CanvasRenderingContext2D, id: string, x: number, y: number, r: number, earned: boolean): void {
  ctx.save();
  ctx.translate(x, y);
  if (!earned) {
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.8, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fill();
    ctx.restore();
    return;
  }
  const colors: Record<string, [string, string]> = { quarry: ['#b8a078', '#7a6440'] };
  const [light, dark] = colors[id] ?? ['#c0c8d8', '#7880a0'];
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI / 2 + (i / 8) * Math.PI * 2;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fillStyle = dark;
  ctx.fill();
  outline(ctx, r);
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI / 2 + (i / 8) * Math.PI * 2;
    ctx.lineTo(Math.cos(a) * r * 0.72, Math.sin(a) * r * 0.72);
  }
  ctx.closePath();
  ctx.fillStyle = light;
  ctx.fill();
  // A boulder emblem for the quarry badge, a star otherwise.
  ctx.fillStyle = dark;
  if (id === 'quarry') {
    ctx.beginPath();
    ctx.moveTo(-r * 0.4, r * 0.3);
    ctx.lineTo(-r * 0.3, -r * 0.15);
    ctx.lineTo(0, -r * 0.38);
    ctx.lineTo(r * 0.35, -r * 0.1);
    ctx.lineTo(r * 0.4, r * 0.3);
    ctx.closePath();
    ctx.fill();
  } else star(ctx, 0, 0, r * 0.45);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.3, -r * 0.35, r * 0.18, r * 0.08, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
