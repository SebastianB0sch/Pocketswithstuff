/** On-screen keyboard for names; physical keyboards can type directly. */
import { audio } from '../audio/audio';
import type { Game, Scene } from '../game/game';
import { drawTrainerPortrait, LOOKS } from '../gfx/characters';
import { button, C, panel, stripes, text } from './draw';

const MAX = 10;
const ROWS = ['ABCDEFGHIJ', 'KLMNOPQRST', 'UVWXYZ.-\' ', 'abcdefghij', 'klmnopqrst', 'uvwxyz!?&♪'];

class NamingScene implements Scene {
  opaque = true;
  private name = '';
  private cx = 0;
  private cy = 0;
  private t = 0;
  private onKey = (e: KeyboardEvent) => this.key(e);

  constructor(
    private g: Game,
    private title: string,
    private look: string,
    private fallback: string,
  ) {
    window.addEventListener('keydown', this.onKey);
  }

  private key(e: KeyboardEvent): void {
    if (e.key === 'Backspace') this.del();
    else if (e.key === 'Enter') this.done();
    else if (e.key === 'ArrowUp') this.move(0, -1);
    else if (e.key === 'ArrowDown') this.move(0, 1);
    else if (e.key === 'ArrowLeft') this.move(-1, 0);
    else if (e.key === 'ArrowRight') this.move(1, 0);
    else if (e.key.length === 1 && /[\p{L}\p{N} .'!?&-]/u.test(e.key)) this.add(e.key);
  }

  private move(dx: number, dy: number): void {
    // Two extra keys in the last column row: DEL and OK live at cy === ROWS.length.
    this.cy = (this.cy + dy + ROWS.length + 1) % (ROWS.length + 1);
    const w = this.cy === ROWS.length ? 2 : 10;
    this.cx = (this.cx + dx + w) % w;
    audio.sfx('cursor');
  }

  private add(ch: string): void {
    if (this.name.length >= MAX) return audio.sfx('error');
    if (ch === ' ' && (!this.name || this.name.endsWith(' '))) return;
    this.name += ch;
    audio.sfx('click');
  }

  private del(): void {
    if (!this.name) return;
    this.name = this.name.slice(0, -1);
    audio.sfx('back');
  }

  private done(): void {
    const n = this.name.trim() || this.fallback;
    audio.sfx('select');
    window.removeEventListener('keydown', this.onKey);
    this.g.close(this, n);
  }

  private layout(): { x: number; y: number; k: number } {
    const W = this.g.view.width;
    const H = this.g.view.height;
    const k = 52;
    return { x: (W - k * 10) / 2 + 80, y: Math.max(190, H * 0.36), k };
  }

  update(dt: number): void {
    this.t += dt;
    const input = this.g.input;
    if (!input.touch.released) return;
    const { x, y, k } = this.layout();
    ROWS.forEach((row, r) =>
      [...row].forEach((ch, c) => {
        if (input.tapped(x + c * k, y + r * k, k - 6, k - 6)) {
          this.cx = c;
          this.cy = r;
          this.add(ch);
        }
      }),
    );
    const by = y + ROWS.length * k + 10;
    if (input.tapped(x, by, k * 5 - 6, 56)) this.del();
    if (input.tapped(x + k * 5, by, k * 5 - 6, 56)) this.done();
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const W = this.g.view.width;
    const H = this.g.view.height;
    stripes(ctx, W, H, '#5878c0', '#6888d0', this.t, 36);
    const { x, y, k } = this.layout();
    drawTrainerPortrait(ctx, LOOKS[this.look], x - 150, y + 260, 250);
    panel(ctx, x - 20, 40, k * 10 + 40, 120, { r: 14 });
    text(ctx, this.title, x, 82, { size: 24, bold: true });
    const shown = this.name + (Math.floor(this.t * 2) % 2 ? '_' : ' ');
    text(ctx, shown, x, 132, { size: 36, bold: true });
    for (let i = 0; i < MAX; i++) {
      ctx.fillStyle = i < this.name.length ? C.ink : '#b8bcc8';
      ctx.fillRect(x + i * 26, 142, 20, 3);
    }
    ROWS.forEach((row, r) =>
      [...row].forEach((ch, c) => {
        const sel = this.cx === c && this.cy === r;
        const press = this.g.input.touching(x + c * k, y + r * k, k - 6, k - 6);
        button(ctx, x + c * k, y + r * k, k - 6, k - 6, ch === ' ' ? '␣' : ch, { color: '#f4f6fa', dark: '#8890a8', state: press ? 2 : sel ? 1 : 0, size: 22, r: 10 });
      }),
    );
    const by = y + ROWS.length * k + 10;
    button(ctx, x, by, k * 5 - 6, 56, 'DELETE', { color: '#e87050', dark: '#a03820', state: this.cy === ROWS.length && this.cx === 0 ? 1 : 0, size: 22 });
    button(ctx, x + k * 5, by, k * 5 - 6, 56, 'OK', { color: '#50b060', dark: '#207030', state: this.cy === ROWS.length && this.cx === 1 ? 1 : 0, size: 22 });
    text(ctx, 'Type on your keyboard or tap the keys. Enter to confirm.', W / 2, H - 20, { size: 16, align: 'center', color: '#ffffff', shadow: 'rgba(0,0,0,0.4)' });
  }
}

export function enterName(g: Game, title: string, look: string, fallback: string): Promise<string> {
  return g.run<string>(new NamingScene(g, title, look, fallback));
}
