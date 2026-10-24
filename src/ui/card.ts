/** The trainer card. */
import type { Game } from '../game/game';
import { drawTrainerPortrait, LOOKS } from '../gfx/characters';
import { outlined, panel, roundRect, text } from './draw';
import { badgeIcon } from './icons';
import { backdrop, drawClose, MenuScene, money, tappedRect, wantsClose } from './list';

const BADGES = ['quarry', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8'];

export function openCard(g: Game): Promise<void> {
  return new Card(g).open();
}

function playTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
}

class Card extends MenuScene {
  opaque = true;

  private rect() {
    const W = this.g.view.width;
    const H = this.g.view.height;
    const w = Math.min(W - 40, 900);
    const h = Math.min(H - 84, w * 0.62);
    return { x: (W - w) / 2, y: Math.max(66, (H - h) / 2 + 10), w, h };
  }

  step(): void {
    if (wantsClose(this.g) || this.g.input.pressed.a || tappedRect(this.g, this.rect())) this.done();
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const g = this.g;
    const s = g.save;
    backdrop(ctx, g, this.t, '#3a4a6a', '#445476');
    const r = this.rect();
    // Card body with a metallic sheen.
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    roundRect(ctx, r.x + 6, r.y + 8, r.w, r.h, 26);
    ctx.fill();
    const grad = ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h);
    grad.addColorStop(0, '#dfe6f0');
    grad.addColorStop(0.5, '#f8fbff');
    grad.addColorStop(1, '#c8d2e0');
    ctx.fillStyle = '#7a8aa8';
    roundRect(ctx, r.x, r.y, r.w, r.h, 26);
    ctx.fill();
    ctx.fillStyle = grad;
    roundRect(ctx, r.x + 6, r.y + 6, r.w - 12, r.h - 12, 22);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.moveTo(r.x + r.w * 0.55, r.y + 6);
    ctx.lineTo(r.x + r.w * 0.7, r.y + 6);
    ctx.lineTo(r.x + r.w * 0.45, r.y + r.h - 6);
    ctx.lineTo(r.x + r.w * 0.3, r.y + r.h - 6);
    ctx.closePath();
    ctx.fill();

    // Header strip.
    ctx.fillStyle = '#4a6aa8';
    roundRect(ctx, r.x + 20, r.y + 20, r.w - 40, 54, 14);
    ctx.fill();
    outlined(ctx, 'TRAINER CARD', r.x + 40, r.y + 58, { size: 28, stroke: '#2a3a68' });
    outlined(ctx, `IDNo. ${String(s.trainerId).padStart(5, '0')}`, r.x + r.w - 40, r.y + 58, { size: 22, align: 'right', stroke: '#2a3a68' });

    // Portrait.
    const portraitH = r.h * 0.6;
    const px = r.x + r.w - 40 - portraitH * 0.4;
    panel(ctx, px - portraitH * 0.45, r.y + 92, portraitH * 0.9, portraitH, { r: 14, fill: '#e8f0f8', shadow: false });
    drawTrainerPortrait(ctx, LOOKS.player, px, r.y + 92 + portraitH - 10, portraitH * 0.92);

    // Details.
    const lx = r.x + 44;
    const rowH = Math.min(46, (portraitH - 10) / 5);
    const rows: [string, string][] = [
      ['NAME', s.name],
      ['MONEY', money(s.money)],
      ['POCKLOPEDIA', String(s.caught.length)],
      ['PLAY TIME', playTime(s.playTime)],
      ['BADGES', String(s.badges.length)],
    ];
    const valueX = px - portraitH * 0.45 - 30;
    rows.forEach(([k, v], i) => {
      const y = r.y + 92 + i * rowH + rowH * 0.7;
      text(ctx, k, lx, y, { size: 22, color: '#5a6478' });
      text(ctx, v, valueX, y, { size: 24, bold: true, align: 'right' });
      ctx.fillStyle = 'rgba(80,100,140,0.2)';
      ctx.fillRect(lx, y + rowH * 0.25, valueX - lx, 2);
    });

    // Badge case.
    const by = r.y + 92 + portraitH + 16;
    const bh = r.y + r.h - 20 - by;
    if (bh > 40) {
      ctx.fillStyle = '#3a4a6a';
      roundRect(ctx, r.x + 20, by, r.w - 40, bh, 14);
      ctx.fill();
      const slot = (r.w - 60) / 8;
      const br = Math.min(slot * 0.36, bh * 0.38);
      BADGES.forEach((id, i) => badgeIcon(ctx, id, r.x + 30 + slot * (i + 0.5), by + bh / 2, br, s.badges.includes(id)));
    }
    drawClose(ctx, g);
  }
}
