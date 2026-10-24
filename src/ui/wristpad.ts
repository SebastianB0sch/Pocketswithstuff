/**
 * The Wristpad: a little wrist gadget in the corner of the field screen, with a
 * clock, a step counter, a party monitor and a time-of-day dial. Tap the side
 * button (or press Y) to change apps; its MENU key opens the field menu.
 */
import { audio } from '../audio/audio';
import { maxHp } from '../game/creature';
import type { Game } from '../game/game';
import { timeOfDay } from '../world/world3d';
import { hpColor, outlined, roundRect, text } from './draw';
import { inRect, type Rect } from './list';

const LCD = '#b4cc9a';
const INK = '#2f4a28';
const DIM = 'rgba(40, 60, 30, 0.07)';
const APPS = ['clock', 'steps', 'party', 'sky'] as const;

// Seven-segment layout: a b c d e f g.
const DIGITS: Record<string, string> = {
  '0': 'abcdef', '1': 'bc', '2': 'abdeg', '3': 'abcdg', '4': 'bcfg',
  '5': 'acdfg', '6': 'acdefg', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg',
};

function segment(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, th: number, seg: string): void {
  const hh = h / 2;
  const s = th / 2;
  const horiz = (cx: number, cy: number) => {
    ctx.beginPath();
    ctx.moveTo(cx + s, cy);
    ctx.lineTo(cx + s * 2, cy - s);
    ctx.lineTo(cx + w - s * 2, cy - s);
    ctx.lineTo(cx + w - s, cy);
    ctx.lineTo(cx + w - s * 2, cy + s);
    ctx.lineTo(cx + s * 2, cy + s);
    ctx.closePath();
    ctx.fill();
  };
  const vert = (cx: number, cy: number) => {
    ctx.beginPath();
    ctx.moveTo(cx, cy + s);
    ctx.lineTo(cx + s, cy + s * 2);
    ctx.lineTo(cx + s, cy + hh - s * 2);
    ctx.lineTo(cx, cy + hh - s);
    ctx.lineTo(cx - s, cy + hh - s * 2);
    ctx.lineTo(cx - s, cy + s * 2);
    ctx.closePath();
    ctx.fill();
  };
  switch (seg) {
    case 'a': horiz(x, y); break;
    case 'g': horiz(x, y + hh); break;
    case 'd': horiz(x, y + h); break;
    case 'f': vert(x, y); break;
    case 'b': vert(x + w, y); break;
    case 'e': vert(x, y + hh); break;
    case 'c': vert(x + w, y + hh); break;
  }
}

/** Draws a string of digits (and ':') in seven-segment style, unlit segments faint. */
function segText(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, h: number, colon = true): void {
  const w = h * 0.5;
  const th = h * 0.13;
  let cx = x;
  for (const ch of s) {
    if (ch === ':') {
      if (colon) {
        ctx.fillStyle = INK;
        ctx.fillRect(cx + w * 0.15, y + h * 0.28, th, th);
        ctx.fillRect(cx + w * 0.15, y + h * 0.68, th, th);
      }
      cx += w * 0.55;
      continue;
    }
    const lit = DIGITS[ch] ?? '';
    for (const seg of 'abcdefg') {
      ctx.fillStyle = lit.includes(seg) ? INK : DIM;
      segment(ctx, cx, y, w, h, th, seg);
    }
    cx += w * 1.45;
  }
}

export class Wristpad {
  private app = 0;
  private alpha = 0;
  private menuRequest = false;
  private press = 0;
  private stepFlash = 0;

  constructor(private g: Game) {}

  private get owned(): boolean {
    return !!this.g.save?.bag.wristpad;
  }

  private layout(): { body: Rect; screen: Rect; side: Rect; menu: Rect; reset: Rect } {
    const W = this.g.view.width;
    const H = this.g.view.height;
    const w = 214;
    const h = 150;
    const x = W - w - 14;
    const y = H - h - 14;
    const screen = { x: x + 14, y: y + 14, w: 158, h: 92 };
    return {
      body: { x, y, w, h },
      screen,
      side: { x: x + w - 34, y: y + 22, w: 30, h: 76 },
      menu: this.owned ? { x: x + 14, y: y + h - 38, w: 92, h: 30 } : { x: W - 120, y: H - 56, w: 106, h: 42 },
      reset: { x: screen.x + screen.w - 34, y: screen.y + screen.h - 26, w: 30, h: 22 },
    };
  }

  /** Steps counted since the last reset. */
  private steps(): number {
    const s = this.g.save;
    return Math.max(0, s.steps - Number(s.flags.wristpadSteps ?? 0));
  }

  onStep(): void {
    this.stepFlash = 0.15;
  }

  /** True once after the MENU key was tapped. */
  menuTapped(): boolean {
    const r = this.menuRequest;
    this.menuRequest = false;
    return r;
  }

  update(dt: number, active: boolean): void {
    this.alpha = Math.max(0, Math.min(1, this.alpha + (active ? dt : -dt) * 6));
    this.press = Math.max(0, this.press - dt);
    this.stepFlash = Math.max(0, this.stepFlash - dt);
    if (!active || !this.g.save) return;
    const input = this.g.input;
    const L = this.layout();
    if (input.tapped(L.menu.x, L.menu.y, L.menu.w, L.menu.h)) {
      this.menuRequest = true;
      return;
    }
    if (!this.owned) return;
    const next = () => {
      this.app = (this.app + 1) % APPS.length;
      this.press = 0.15;
      audio.sfx('click');
    };
    if (input.pressed.y) next();
    if (input.tapped(L.side.x, L.side.y, L.side.w, L.side.h)) next();
    else if (APPS[this.app] === 'steps' && input.tapped(L.reset.x, L.reset.y, L.reset.w, L.reset.h)) {
      this.g.save.flags.wristpadSteps = this.g.save.steps;
      audio.sfx('click');
    } else if (input.touch.released && inRect(input.touch.x, input.touch.y, L.screen)) next();
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.g.save || this.alpha <= 0) return;
    const L = this.layout();
    ctx.save();
    ctx.globalAlpha = this.alpha;
    if (!this.owned) {
      this.menuKey(ctx, L.menu, 20);
      ctx.restore();
      return;
    }
    const b = L.body;
    // Strap stubs and body.
    ctx.fillStyle = '#7a2a2a';
    roundRect(ctx, b.x + 40, b.y - 10, b.w - 90, b.h + 20, 10);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    roundRect(ctx, b.x + 3, b.y + 5, b.w, b.h, 22);
    ctx.fill();
    ctx.fillStyle = '#c83838';
    roundRect(ctx, b.x, b.y, b.w, b.h, 22);
    ctx.fill();
    ctx.fillStyle = '#e05050';
    roundRect(ctx, b.x + 4, b.y + 4, b.w - 8, b.h - 8, 19);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    roundRect(ctx, b.x + 10, b.y + 6, b.w - 20, 10, 5);
    ctx.fill();
    // Side button.
    const sd = L.side;
    const down = this.press > 0 || this.g.input.touching(sd.x, sd.y, sd.w, sd.h);
    ctx.fillStyle = '#8a2020';
    roundRect(ctx, sd.x, sd.y, sd.w, sd.h, 12);
    ctx.fill();
    ctx.fillStyle = down ? '#b83030' : '#f07070';
    roundRect(ctx, sd.x + 3, sd.y + 3 + (down ? 3 : 0), sd.w - 6, sd.h - 10, 10);
    ctx.fill();
    // Screen.
    const s = L.screen;
    ctx.fillStyle = '#3a2a2a';
    roundRect(ctx, s.x - 4, s.y - 4, s.w + 8, s.h + 8, 10);
    ctx.fill();
    ctx.fillStyle = LCD;
    roundRect(ctx, s.x, s.y, s.w, s.h, 7);
    ctx.fill();
    ctx.save();
    roundRect(ctx, s.x, s.y, s.w, s.h, 7);
    ctx.clip();
    this.drawApp(ctx, s);
    ctx.restore();
    // App dots.
    APPS.forEach((_, i) => {
      ctx.fillStyle = i === this.app ? '#ffffff' : 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.arc(b.x + 128 + i * 14, b.y + b.h - 23, 4, 0, Math.PI * 2);
      ctx.fill();
    });
    this.menuKey(ctx, L.menu, 16);
    ctx.restore();
  }

  private menuKey(ctx: CanvasRenderingContext2D, r: Rect, size: number): void {
    const down = this.g.input.touching(r.x, r.y, r.w, r.h);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    roundRect(ctx, r.x + 2, r.y + 3, r.w, r.h, r.h / 2);
    ctx.fill();
    ctx.fillStyle = down ? '#3a3a48' : '#4a4a5a';
    roundRect(ctx, r.x, r.y + (down ? 2 : 0), r.w, r.h, r.h / 2);
    ctx.fill();
    outlined(ctx, 'MENU', r.x + r.w / 2, r.y + r.h / 2 + size * 0.36 + (down ? 2 : 0), { size, align: 'center', stroke: '#2a2a34' });
  }

  private drawApp(ctx: CanvasRenderingContext2D, s: Rect): void {
    const app = APPS[this.app];
    const ink = { color: INK, shadow: null } as const;
    if (app === 'clock') {
      const d = new Date();
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      segText(ctx, `${hh}:${mm}`, s.x + 12, s.y + 16, 44, d.getSeconds() % 2 === 0);
      const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
      text(ctx, `${days[d.getDay()]} ${d.getMonth() + 1}/${d.getDate()}`, s.x + s.w / 2, s.y + s.h - 10, { ...ink, size: 15, align: 'center' });
    } else if (app === 'steps') {
      text(ctx, 'STEPS', s.x + 10, s.y + 20, { ...ink, size: 15, bold: true });
      const n = String(Math.min(99999, this.steps())).padStart(5, '0');
      segText(ctx, n, s.x + 10, s.y + 30, 36);
      if (this.stepFlash > 0) {
        ctx.fillStyle = INK;
        ctx.beginPath();
        ctx.arc(s.x + s.w - 14, s.y + 14, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      roundRect(ctx, s.x + s.w - 34, s.y + s.h - 26, 30, 22, 5);
      ctx.stroke();
      text(ctx, 'R', s.x + s.w - 19, s.y + s.h - 9, { ...ink, size: 14, align: 'center', bold: true });
    } else if (app === 'party') {
      const party = this.g.save.party;
      if (!party.length) {
        text(ctx, 'NO POCKLETS', s.x + s.w / 2, s.y + s.h / 2 + 6, { ...ink, size: 15, align: 'center' });
        return;
      }
      party.forEach((c, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const x = s.x + 8 + col * 76;
        const y = s.y + 10 + row * 27;
        const f = c.hp / maxHp(c);
        text(ctx, `${c.level}`, x, y + 13, { ...ink, size: 13 });
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x + 22, y + 3, 44, 10);
        ctx.fillStyle = f > 0 ? INK : 'transparent';
        ctx.fillRect(x + 24, y + 5, Math.max(0, 40 * f), 6);
        if (f <= 0.2 && f > 0 && Math.floor(this.g.time * 3) % 2) {
          ctx.fillStyle = hpColor(f);
          ctx.fillRect(x + 24, y + 5, Math.max(0, 40 * f), 6);
        }
      });
    } else {
      const tod = timeOfDay();
      const cx = s.x + 44;
      const cy = s.y + s.h / 2;
      ctx.fillStyle = INK;
      if (tod === 'night') {
        ctx.beginPath();
        ctx.arc(cx, cy, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = LCD;
        ctx.beginPath();
        ctx.arc(cx + 10, cy - 7, 19, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(cx, cy, tod === 'day' ? 14 : 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = INK;
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + this.g.time * 0.3;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * 19, cy + Math.sin(a) * 19);
          ctx.lineTo(cx + Math.cos(a) * 26, cy + Math.sin(a) * 26);
          ctx.stroke();
        }
        if (tod !== 'day') {
          ctx.fillStyle = LCD;
          ctx.fillRect(s.x, cy + 6, 90, 40);
          ctx.fillStyle = INK;
          ctx.fillRect(s.x + 10, cy + 6, 70, 3);
        }
      }
      text(ctx, tod.toUpperCase(), s.x + 112, cy + 6, { ...ink, size: 16, align: 'center', bold: true });
    }
  }
}
