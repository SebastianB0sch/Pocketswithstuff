/**
 * Buttons and the touch screen, polled once per frame.
 *
 * Keyboard and gamepads feed the same handful of buttons; mouse and touch
 * feed `touch`, in logical UI units. `pressed` is true only on the frame a button went down, `held`
 * for as long as it stays down, and `repeat` fires on press and then every
 * few frames while held (for scrolling lists).
 */
export type Button = 'up' | 'down' | 'left' | 'right' | 'a' | 'b' | 'x' | 'y' | 'start' | 'select' | 'run';

const BUTTONS: Button[] = ['up', 'down', 'left', 'right', 'a', 'b', 'x', 'y', 'start', 'select', 'run'];

const KEYMAP: Record<string, Button> = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  KeyZ: 'a', Enter: 'a', Space: 'a', KeyJ: 'a',
  KeyX: 'b', Escape: 'b', Backspace: 'b', KeyK: 'b',
  KeyC: 'x', KeyI: 'x',
  KeyV: 'y',
  Tab: 'start', KeyM: 'start', KeyP: 'start',
  KeyQ: 'select',
  ShiftLeft: 'run', ShiftRight: 'run',
};

export interface Touch {
  /** Pointer position in logical UI units (see View). */
  x: number;
  y: number;
  down: boolean;
  /** Went down this frame. */
  pressed: boolean;
  /** Came up this frame; x/y are where it was lifted. */
  released: boolean;
}

export class Input {
  readonly held: Record<Button, boolean>;
  readonly pressed: Record<Button, boolean>;
  readonly repeat: Record<Button, boolean>;
  readonly touch: Touch = { x: 0, y: 0, down: false, pressed: false, released: false };
  /** Set when any input happened this frame; used to unlock audio and wake the title. */
  any = false;
  /** A finger (not a mouse) has touched the screen, so on-screen controls are wanted. */
  touchMode = false;

  private raw: Record<Button, number>;
  /** Presses seen since the last poll, so a tap shorter than a frame still counts. */
  private latched = new Set<Button>();
  private touchDownLatch = false;
  private prev: Record<Button, boolean>;
  private holdFrames: Record<Button, number>;
  private touchRaw = { x: 0, y: 0, down: false };
  private touchPrev = false;
  private sawInput = false;

  constructor(surface: HTMLCanvasElement, toLogical: (cssX: number, cssY: number) => { x: number; y: number }) {
    const blank = () => Object.fromEntries(BUTTONS.map((b) => [b, false])) as Record<Button, boolean>;
    this.held = blank();
    this.pressed = blank();
    this.repeat = blank();
    this.prev = blank();
    this.raw = Object.fromEntries(BUTTONS.map((b) => [b, 0])) as Record<Button, number>;
    this.holdFrames = Object.fromEntries(BUTTONS.map((b) => [b, 0])) as Record<Button, number>;

    window.addEventListener('keydown', (e) => {
      const b = KEYMAP[e.code];
      if (!b) return;
      e.preventDefault();
      if (!e.repeat) {
        this.raw[b] |= 1;
        this.latched.add(b);
      }
      this.sawInput = true;
    });
    window.addEventListener('keyup', (e) => {
      const b = KEYMAP[e.code];
      if (b) this.raw[b] &= ~1;
    });
    window.addEventListener('blur', () => {
      for (const b of BUTTONS) this.raw[b] = 0;
    });

    const toLocal = (e: PointerEvent) => {
      const r = surface.getBoundingClientRect();
      const p = toLogical(e.clientX - r.left, e.clientY - r.top);
      this.touchRaw.x = p.x;
      this.touchRaw.y = p.y;
    };
    surface.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (e.pointerType === 'touch') this.touchMode = true;
      surface.setPointerCapture(e.pointerId);
      toLocal(e);
      this.touchRaw.down = true;
      this.touchDownLatch = true;
      this.sawInput = true;
    });
    surface.addEventListener('pointermove', (e) => {
      if (this.touchRaw.down) toLocal(e);
    });
    const up = (e: PointerEvent) => {
      toLocal(e);
      this.touchRaw.down = false;
    };
    surface.addEventListener('pointerup', up);
    surface.addEventListener('pointercancel', up);
  }

  /** Samples everything for this frame. Call once at the top of each update. */
  poll(): void {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = pads.find((p) => p && p.connected);
    const padHeld = (b: Button): boolean => {
      if (!pad) return false;
      const btn = (i: number) => !!pad.buttons[i]?.pressed;
      const ax = pad.axes[0] ?? 0;
      const ay = pad.axes[1] ?? 0;
      switch (b) {
        case 'up': return btn(12) || ay < -0.5;
        case 'down': return btn(13) || ay > 0.5;
        case 'left': return btn(14) || ax < -0.5;
        case 'right': return btn(15) || ax > 0.5;
        case 'a': return btn(0);
        case 'b': return btn(1);
        case 'x': return btn(3);
        case 'y': return btn(2);
        case 'start': return btn(9);
        case 'select': return btn(8);
        case 'run': return false;
      }
    };

    this.any = this.sawInput;
    this.sawInput = false;
    for (const b of BUTTONS) {
      const h = this.raw[b] !== 0 || padHeld(b) || this.latched.has(b);
      if (h && !this.prev[b] && pad) this.any = true;
      this.held[b] = h;
      this.pressed[b] = h && !this.prev[b];
      this.holdFrames[b] = h ? this.holdFrames[b] + 1 : 0;
      const f = this.holdFrames[b];
      this.repeat[b] = this.pressed[b] || (f > 18 && f % 5 === 0);
      this.prev[b] = h;
    }
    // Holding B runs, as on the DS (Shift does too).
    if (this.held.b) this.held.run = true;

    this.latched.clear();

    const t = this.touch;
    t.x = this.touchRaw.x;
    t.y = this.touchRaw.y;
    // A tap that went down and up between two frames reads as a press now and a
    // release on the next frame (when the raw state is already up).
    const was = this.touchPrev;
    t.down = this.touchRaw.down || (!was && this.touchDownLatch);
    t.pressed = t.down && !was;
    t.released = !t.down && was;
    this.touchDownLatch = false;
    this.touchPrev = t.down;
  }

  /** On-screen controls: holds a button down (bit 4 of the raw state) until released. */
  setVirtual(b: Button, held: boolean): void {
    if (held) {
      if (!(this.raw[b] & 4)) this.latched.add(b);
      this.raw[b] |= 4;
    } else this.raw[b] &= ~4;
  }

  /** Swallows this frame's presses so a scene that just opened does not see the key that opened it. */
  consume(): void {
    for (const b of BUTTONS) {
      this.pressed[b] = false;
      this.repeat[b] = false;
    }
    this.touch.pressed = false;
    this.touch.released = false;
  }

  /** A tap that went down and came up inside the rectangle. */
  tapped(x: number, y: number, w: number, h: number): boolean {
    const t = this.touch;
    return t.released && t.x >= x && t.x < x + w && t.y >= y && t.y < y + h;
  }

  /** The finger is down inside the rectangle (for pressed-button visuals). */
  touching(x: number, y: number, w: number, h: number): boolean {
    const t = this.touch;
    return t.down && t.x >= x && t.x < x + w && t.y >= y && t.y < y + h;
  }
}
