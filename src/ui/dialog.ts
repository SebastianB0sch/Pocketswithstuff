/** The bottom-of-screen text box, with typewriter text and an optional choice list. */
import { audio } from '../audio/audio';
import type { Game, Scene } from '../game/game';
import { C, cursor, measure, moreArrow, panel, text, wrap } from './draw';

const SIZE = 25;
const LINE = 36;
const SPEEDS = [35, 70, 160];

export interface DialogOptions {
  /** Choices shown once the last page is out; resolves with the chosen index (-1 if cancelled). */
  choices?: string[];
  /** Index B selects; defaults to the last choice. Use -1 to make B do nothing. */
  cancel?: number;
  /** Close by itself after the text is out (for battle messages); seconds to linger. */
  auto?: number;
  /** Speaker name shown in a tab above the box. */
  speaker?: string;
}

export function dialogBox(g: Game): { x: number; y: number; w: number; h: number } {
  const w = Math.min(g.view.width - 32, 940);
  const h = 128;
  return { x: (g.view.width - w) / 2, y: g.view.height - h - 14, w, h };
}

export class Dialog implements Scene {
  showWorld = true;
  private pages: string[][] = [];
  private page = 0;
  private shown = 0;
  private t = 0;
  private sel = 0;
  private choosing = false;
  private lingering = 0;

  constructor(
    private g: Game,
    msg: string,
    private opts: DialogOptions = {},
  ) {
    const box = dialogBox(g);
    const lines = wrap(g.view.ctx, msg, box.w - 64, SIZE);
    for (let i = 0; i < lines.length; i += 2) this.pages.push(lines.slice(i, i + 2));
    // showWorld follows whatever is underneath (battle or overworld).
    this.showWorld = true;
  }

  private get pageText(): string {
    return this.pages[this.page].join('\n');
  }

  update(dt: number): void {
    const input = this.g.input;
    this.t += dt;
    const total = this.pageText.length;
    const speed = SPEEDS[this.g.save?.options.textSpeed ?? 1];
    const fast = input.held.a || input.held.b || input.touch.down;
    if (this.shown < total) {
      const before = Math.floor(this.shown);
      this.shown = Math.min(total, this.shown + dt * speed * (fast ? 3 : 1));
      if (Math.floor(this.shown) !== before && before % 3 === 0) audio.sfx('text');
      if ((input.pressed.a || input.touch.pressed) && this.shown < total) this.shown = total;
      return;
    }
    const last = this.page === this.pages.length - 1;
    if (last && this.opts.choices) {
      this.choosing = true;
      const n = this.opts.choices.length;
      if (input.repeat.up) { this.sel = (this.sel + n - 1) % n; audio.sfx('cursor'); }
      if (input.repeat.down) { this.sel = (this.sel + 1) % n; audio.sfx('cursor'); }
      const r = this.choiceRect();
      for (let i = 0; i < n; i++) {
        if (input.tapped(r.x, r.y + 14 + i * 40, r.w, 40)) {
          this.sel = i;
          return this.choose(i);
        }
      }
      if (input.pressed.a) return this.choose(this.sel);
      const cancel = this.opts.cancel ?? n - 1;
      if (input.pressed.b && cancel >= 0) {
        audio.sfx('back');
        this.g.close(this, cancel);
      }
      return;
    }
    if (this.opts.auto !== undefined && last) {
      this.lingering += dt;
      if (this.lingering >= this.opts.auto || input.pressed.a) this.g.close(this, 0);
      return;
    }
    if (input.pressed.a || input.pressed.b || input.touch.released) {
      audio.sfx('click');
      if (last) this.g.close(this, 0);
      else {
        this.page++;
        this.shown = 0;
      }
    }
  }

  private choose(i: number): void {
    audio.sfx('select');
    this.g.close(this, i);
  }

  private choiceRect(): { x: number; y: number; w: number; h: number } {
    const box = dialogBox(this.g);
    const n = this.opts.choices!.length;
    const w = Math.max(150, ...this.opts.choices!.map((c) => measure(this.g.view.ctx, c, SIZE) + 80));
    const h = n * 40 + 28;
    return { x: box.x + box.w - w, y: box.y - h - 6, w, h };
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const box = dialogBox(this.g);
    if (this.opts.speaker) {
      panel(ctx, box.x + 16, box.y - 34, Math.max(120, this.opts.speaker.length * 14 + 40), 44, { r: 8, rim: C.frame });
      text(ctx, this.opts.speaker, box.x + 34, box.y - 5, { size: 20, bold: true });
    }
    panel(ctx, box.x, box.y, box.w, box.h, { r: 12 });
    const visible = this.pageText.slice(0, Math.floor(this.shown)).split('\n');
    visible.forEach((line, i) => text(ctx, line, box.x + 32, box.y + 50 + i * LINE, { size: SIZE }));
    const done = this.shown >= this.pageText.length;
    if (done && !this.choosing && this.opts.auto === undefined) moreArrow(ctx, box.x + box.w - 36, box.y + box.h - 30, this.t);
    if (this.choosing && this.opts.choices) {
      const r = this.choiceRect();
      panel(ctx, r.x, r.y, r.w, r.h, { r: 10 });
      this.opts.choices.forEach((c, i) => {
        const y = r.y + 14 + i * 40 + 28;
        text(ctx, c, r.x + 44, y, { size: SIZE });
        if (i === this.sel) cursor(ctx, r.x + 20, y - 8, 16, this.t);
      });
    }
  }
}

/** Shows text and waits for the player. */
export function say(g: Game, msg: string, opts: DialogOptions = {}): Promise<number> {
  return g.run<number>(new Dialog(g, msg, opts));
}

export async function yesNo(g: Game, msg: string): Promise<boolean> {
  return (await say(g, msg, { choices: ['Yes', 'No'], cancel: 1 })) === 0;
}
