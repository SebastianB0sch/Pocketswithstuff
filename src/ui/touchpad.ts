/**
 * On-screen controls for touch screens in the overworld: a d-pad on the left,
 * A and B on the right, and a run toggle. They appear once a finger touches the
 * screen and feed the same buttons as the keyboard.
 */
import type { Button, Input } from '../core/input';
import type { View } from '../core/view';
import { C, outlined } from './draw';

type Dir = 'up' | 'down' | 'left' | 'right';

export class TouchPad {
  running = false;
  private dir: Dir | null = null;
  private heldButton: Button | null = null;

  constructor(
    private input: Input,
    private view: View,
  ) {}

  private layout() {
    const W = this.view.width;
    const H = this.view.height;
    return {
      pad: { x: 120, y: H - 130, r: 96 },
      a: { x: W - 80, y: H - 250, r: 44 },
      b: { x: W - 170, y: H - 210, r: 38 },
      run: { x: 120, y: H - 262, r: 30 },
    };
  }

  /** Call before the overworld reads input. Returns false when touch controls are off. */
  update(active: boolean): boolean {
    const input = this.input;
    if (!input.touchMode) return false;
    const L = this.layout();
    const t = input.touch;
    let dir: Dir | null = null;
    let btn: Button | null = null;
    if (active && t.down) {
      const dx = t.x - L.pad.x;
      const dy = t.y - L.pad.y;
      if (Math.hypot(dx, dy) < L.pad.r * 1.25 && Math.hypot(dx, dy) > 12) {
        dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
      } else if (Math.hypot(t.x - L.a.x, t.y - L.a.y) < L.a.r * 1.3) btn = 'a';
      else if (Math.hypot(t.x - L.b.x, t.y - L.b.y) < L.b.r * 1.3) btn = 'b';
    }
    if (active && t.pressed && Math.hypot(t.x - L.run.x, t.y - L.run.y) < L.run.r * 1.4) this.running = !this.running;
    if (dir !== this.dir) {
      if (this.dir) input.setVirtual(this.dir, false);
      if (dir) input.setVirtual(dir, true);
      this.dir = dir;
    }
    if (btn !== this.heldButton) {
      if (this.heldButton) input.setVirtual(this.heldButton, false);
      if (btn) input.setVirtual(btn, true);
      this.heldButton = btn;
    }
    input.setVirtual('run', active && this.running);
    return true;
  }

  /** True if a tap at this point belongs to the on-screen controls (so it isn't treated as a world tap). */
  owns(x: number, y: number): boolean {
    if (!this.input.touchMode) return false;
    const L = this.layout();
    return [L.pad, L.a, L.b, L.run].some((c) => Math.hypot(x - c.x, y - c.y) < c.r * 1.3);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.input.touchMode) return;
    const L = this.layout();
    ctx.save();
    ctx.globalAlpha = 0.55;
    // D-pad.
    ctx.fillStyle = 'rgba(20,24,36,0.55)';
    ctx.beginPath();
    ctx.arc(L.pad.x, L.pad.y, L.pad.r, 0, Math.PI * 2);
    ctx.fill();
    const arm = L.pad.r * 0.34;
    const len = L.pad.r * 0.78;
    ctx.fillStyle = '#e8ecf4';
    for (const d of ['up', 'down', 'left', 'right'] as Dir[]) {
      ctx.save();
      ctx.translate(L.pad.x, L.pad.y);
      ctx.rotate({ up: 0, right: Math.PI / 2, down: Math.PI, left: -Math.PI / 2 }[d]);
      ctx.globalAlpha = this.dir === d ? 0.95 : 0.6;
      ctx.beginPath();
      ctx.moveTo(-arm / 2, -arm / 2);
      ctx.lineTo(-arm / 2, -len + arm * 0.4);
      ctx.lineTo(0, -len);
      ctx.lineTo(arm / 2, -len + arm * 0.4);
      ctx.lineTo(arm / 2, -arm / 2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    const round = (c: { x: number; y: number; r: number }, label: string, color: string, on: boolean) => {
      ctx.globalAlpha = on ? 0.9 : 0.6;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      outlined(ctx, label, c.x, c.y + c.r * 0.28, { size: c.r * 0.8, align: 'center' });
    };
    round(L.a, 'A', C.accent, this.heldButton === 'a');
    round(L.b, 'B', '#4878d8', this.heldButton === 'b');
    round(L.run, this.running ? 'RUN' : 'WALK', this.running ? '#48a858' : '#606878', this.running);
    ctx.restore();
  }
}
