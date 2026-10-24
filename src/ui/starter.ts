/** The professor's briefcase: pick one of three starter Pocklets. */
import { audio } from '../audio/audio';
import { species } from '../data/species';
import type { Game, Scene } from '../game/game';
import { creatureSprite } from '../gfx/creatures';
import { yesNo } from './dialog';
import { C, outlined, panel, pouchIcon, roundRect, text, typeBadge } from './draw';

const STARTERS = ['sprigfawn', 'kindlekit', 'pupple'];
const BLURB: Record<string, string> = {
  sprigfawn: 'the Grass-type Sapling Pocklet',
  kindlekit: 'the Fire-type Ember Fox Pocklet',
  pupple: 'the Water-type Pup Pocklet',
};

class StarterScene implements Scene {
  showWorld = true;
  private sel = 1;
  private t = 0;
  private asking = false;

  constructor(private g: Game) {}

  private slots(): { x: number; y: number; r: number }[] {
    const W = this.g.view.width;
    const H = this.g.view.height;
    const cy = H * 0.62;
    return STARTERS.map((_, i) => ({ x: W / 2 + (i - 1) * 170, y: cy, r: 44 }));
  }

  update(dt: number): void {
    this.t += dt;
    if (this.asking) return;
    const input = this.g.input;
    const before = this.sel;
    if (input.repeat.left) this.sel = (this.sel + 2) % 3;
    if (input.repeat.right) this.sel = (this.sel + 1) % 3;
    if (this.sel !== before) audio.sfx('cursor');
    let chosen = input.pressed.a;
    this.slots().forEach((s, i) => {
      if (input.tapped(s.x - 70, s.y - 70, 140, 140)) {
        this.sel = i;
        chosen = true;
      }
    });
    if (chosen) void this.confirm();
  }

  private async confirm(): Promise<void> {
    this.asking = true;
    audio.sfx('select');
    const id = STARTERS[this.sel];
    const ok = await yesNo(this.g, `Will you choose ${species(id).name}, ${BLURB[id]}?`);
    this.asking = false;
    if (ok) this.g.close(this, id);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const W = this.g.view.width;
    const H = this.g.view.height;
    ctx.fillStyle = C.dim;
    ctx.fillRect(0, 0, W, H);
    // Briefcase.
    const bw = 620;
    const bh = 250;
    const bx = (W - bw) / 2;
    const by = H * 0.62 - bh / 2;
    ctx.fillStyle = '#5a3a24';
    roundRect(ctx, bx - 10, by - 10, bw + 20, bh + 20, 26);
    ctx.fill();
    ctx.fillStyle = '#8a5a34';
    roundRect(ctx, bx, by, bw, bh, 20);
    ctx.fill();
    ctx.fillStyle = '#3a6a4a';
    roundRect(ctx, bx + 20, by + 20, bw - 40, bh - 40, 14);
    ctx.fill();
    ctx.fillStyle = '#c8a050';
    ctx.fillRect(bx + bw / 2 - 40, by - 24, 80, 18);
    this.slots().forEach((s, i) => {
      const lift = i === this.sel ? -10 - Math.abs(Math.sin(this.t * 4)) * 8 : 0;
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(s.x, s.y + 44, 56, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      pouchIcon(ctx, s.x, s.y + lift, s.r, ['#58b048', '#e86838', '#4888e0'][i]);
      if (i === this.sel) {
        ctx.strokeStyle = C.select;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(s.x, s.y + lift, s.r + 26, 0, Math.PI * 2);
        ctx.stroke();
      }
    });
    // Preview of the highlighted Pocklet.
    const id = STARTERS[this.sel];
    const sp = species(id);
    const pw = 520;
    const ph = 230;
    const px = (W - pw) / 2;
    const py = Math.max(20, by - ph - 40);
    panel(ctx, px, py, pw, ph, { r: 16 });
    const size = 190;
    const img = creatureSprite(id, size * this.g.view.scale);
    const bob = Math.sin(this.t * 3) * 3;
    ctx.drawImage(img, px + 20, py + 22 + bob, size, size);
    text(ctx, sp.name, px + 230, py + 70, { size: 34, bold: true });
    sp.types.forEach((t, i) => typeBadge(ctx, t, px + 230 + i * 80, py + 88, 74, 24));
    text(ctx, `The ${sp.category} Pocklet`, px + 230, py + 150, { size: 20 });
    outlined(ctx, 'Choose your partner!', W / 2, by + bh + 50, { size: 26, align: 'center' });
  }
}

export function chooseStarter(g: Game): Promise<string> {
  return g.run<string>(new StarterScene(g));
}
