/** Title screen over a slow fly-around of Brightleaf Town, then New Game / Continue. */
import { audio } from '../audio/audio';
import type { Game, Scene } from '../game/game';
import { hasSave, loadOptions, loadSave, newSave, type Options } from '../game/state';
import { creatureSprite } from '../gfx/creatures';
import { Overworld } from '../world/overworld';
import { MAPS } from '../world/maps';
import { button, C, outlined, star } from './draw';
import { runIntro } from './intro';
import { openOptions } from './options';

export class TitleScene implements Scene {
  showWorld = true;
  private t = 0;
  private stage: 'press' | 'menu' = 'press';
  private sel = 0;
  private busy = false;
  private options: Options = loadOptions();

  constructor(private g: Game) {
    g.world.load(MAPS.brightleaf);
    g.world.focus.set(12, 0, 9);
    g.world.zoom = 0.82;
    audio.playMusic('title');
  }

  private entries(): string[] {
    return hasSave() ? ['Continue', 'New Game', 'Options'] : ['New Game', 'Options'];
  }

  private rects(): { x: number; y: number; w: number; h: number }[] {
    const W = this.g.view.width;
    const H = this.g.view.height;
    const n = this.entries().length;
    const w = 300;
    const h = 62;
    const top = H * 0.6;
    return Array.from({ length: n }, (_, i) => ({ x: (W - w) / 2, y: top + i * (h + 12), w, h }));
  }

  update(dt: number): void {
    this.t += dt;
    this.g.world.orbit = Math.sin(this.t * 0.08) * 0.6;
    if (this.busy) return;
    const input = this.g.input;
    if (this.stage === 'press') {
      if (input.pressed.a || input.pressed.start || input.touch.released) {
        audio.unlock();
        audio.sfx('select');
        this.stage = 'menu';
        input.consume();
      }
      return;
    }
    const n = this.entries().length;
    const before = this.sel;
    if (input.repeat.up) this.sel = (this.sel + n - 1) % n;
    if (input.repeat.down) this.sel = (this.sel + 1) % n;
    if (before !== this.sel) audio.sfx('cursor');
    let pick = input.pressed.a ? this.sel : -1;
    this.rects().forEach((r, i) => {
      if (input.tapped(r.x, r.y, r.w, r.h)) pick = i;
    });
    if (input.pressed.b) this.stage = 'press';
    if (pick >= 0) void this.choose(this.entries()[pick]);
  }

  private async choose(entry: string): Promise<void> {
    this.busy = true;
    audio.sfx('select');
    const g = this.g;
    if (entry === 'Options') {
      await openOptions(g, this.options);
      this.busy = false;
      return;
    }
    if (entry === 'Continue') {
      const s = loadSave();
      if (!s) {
        this.busy = false;
        return;
      }
      await g.fadeOut(0.5);
      g.save = s;
      startOverworld(g, s.map, s.x, s.y, s.facing);
      await g.fadeIn(0.5);
      return;
    }
    await g.fadeOut(0.5);
    const names = await runIntro(g);
    g.save = newSave(names.player, names.rival, this.options);
    startOverworld(g, 'home', g.save.x, g.save.y, 'down');
    await g.fadeIn(0.8);
    const ow = g.top as Overworld;
    await ow.runEnterScript();
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const W = this.g.view.width;
    const H = this.g.view.height;
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, 'rgba(10,14,30,0.55)');
    grad.addColorStop(0.5, 'rgba(10,14,30,0.15)');
    grad.addColorStop(1, 'rgba(10,14,30,0.6)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // A Pocklet trio peeking around the logo.
    const s = this.g.view.scale;
    const bob = (k: number) => Math.sin(this.t * 2 + k) * 5;
    const sz = 170;
    ctx.drawImage(creatureSprite('sprigfawn', sz * s), W / 2 - 390, H * 0.12 + bob(0), sz, sz);
    ctx.drawImage(creatureSprite('pupple', sz * s), W / 2 + 230, H * 0.12 + bob(2), sz, sz);
    ctx.drawImage(creatureSprite('kindlekit', sz * s), W / 2 - 85, H * 0.02 + bob(1), sz, sz);

    this.drawLogo(ctx, W / 2, H * 0.36);

    if (this.stage === 'press') {
      if (Math.floor(this.t * 1.6) % 2 === 0) outlined(ctx, 'PRESS START', W / 2, H * 0.72, { size: 32, align: 'center' });
      outlined(ctx, 'Arrows / WASD move · Z or Enter = A · X or Esc = B · Tab = menu · Shift = run', W / 2, H - 24, { size: 16, align: 'center', bold: false });
    } else {
      this.entries().forEach((e, i) => {
        const r = this.rects()[i];
        button(ctx, r.x, r.y, r.w, r.h, e, { state: this.g.input.touching(r.x, r.y, r.w, r.h) ? 2 : i === this.sel ? 1 : 0, color: '#5a8ae0', dark: '#2a4a98', size: 26 });
      });
    }
    outlined(ctx, 'An original fan-style adventure · Not affiliated with any existing franchise', W / 2, H - 6, { size: 12, align: 'center', bold: false, color: '#c8d0e0' });
  }

  private drawLogo(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    const size = 92;
    ctx.font = `700 ${size}px "Pixelify Sans", sans-serif`;
    const label = 'POCKETS';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 22;
    ctx.strokeStyle = '#1c2a5a';
    ctx.strokeText(label, x, y);
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#f0f4ff';
    ctx.strokeText(label, x, y);
    const g = ctx.createLinearGradient(0, y - size, 0, y);
    g.addColorStop(0, '#fff6b0');
    g.addColorStop(0.5, '#ffd040');
    g.addColorStop(1, '#f08a20');
    ctx.fillStyle = g;
    ctx.fillText(label, x, y);
    const sub = 'with STUFF';
    ctx.font = `700 ${size * 0.5}px "Pixelify Sans", sans-serif`;
    ctx.lineWidth = 12;
    ctx.strokeStyle = '#1c2a5a';
    ctx.strokeText(sub, x, y + 56);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(sub, x, y + 56);
    // Iridium plate.
    const pw = 300;
    const py = y + 78;
    const pg = ctx.createLinearGradient(x - pw / 2, 0, x + pw / 2, 0);
    pg.addColorStop(0, '#9aa4b8');
    pg.addColorStop(0.3, '#f4f6fa');
    pg.addColorStop(0.5, '#c8d0dc');
    pg.addColorStop(0.75, '#ffffff');
    pg.addColorStop(1, '#8a94a8');
    ctx.fillStyle = '#2a3048';
    ctx.beginPath();
    ctx.roundRect(x - pw / 2 - 4, py - 4, pw + 8, 44, 12);
    ctx.fill();
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.roundRect(x - pw / 2, py, pw, 36, 10);
    ctx.fill();
    ctx.font = `700 24px "Pixelify Sans", sans-serif`;
    ctx.fillStyle = '#3a4060';
    ctx.fillText('IRIDIUM VERSION', x, py + 27);
    // Glints.
    ctx.fillStyle = C.white;
    const k = (this.t * 0.7) % 3;
    if (k < 1) {
      ctx.globalAlpha = Math.sin(k * Math.PI);
      star(ctx, x - pw / 2 + k * pw, py + 6, 10);
    }
    ctx.restore();
  }
}

export function startOverworld(g: Game, map: string, x: number, y: number, facing: 'up' | 'down' | 'left' | 'right'): Overworld {
  g.world.orbit = 0;
  g.world.zoom = 1;
  const ow = new Overworld(g);
  ow.enter(map, x, y, facing);
  g.reset(ow);
  return ow;
}
