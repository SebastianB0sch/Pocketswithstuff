/**
 * Resolution handling.
 *
 * Nothing in the game is drawn into a fixed-size buffer: the 3D world renders at the
 * canvas' real pixel size and every 2D element is a vector path, so the picture is
 * sharp from a phone up to 8K. Layout uses *logical units*: the short side of a
 * 16:9 frame is always 540 units, and the frame extends on whichever axis the window
 * is longer, so `width >= 960` and `height >= 540` everywhere.
 */
export const MAX_W = 7680;
export const MAX_H = 4320;
export const BASE_W = 960;
export const BASE_H = 540;

/** Render-resolution presets for the options menu: 0 means "match the display". */
export const RESOLUTIONS: { label: string; height: number }[] = [
  { label: 'Native', height: 0 },
  { label: '720p', height: 720 },
  { label: '1080p', height: 1080 },
  { label: '1440p', height: 1440 },
  { label: '4K', height: 2160 },
  { label: '8K', height: 4320 },
];

export class View {
  /** Backing-store size in device pixels. */
  pixelW = 1;
  pixelH = 1;
  /** Logical size (see file comment). */
  width = BASE_W;
  height = BASE_H;
  /** Device pixels per logical unit. */
  scale = 1;
  /** Index into RESOLUTIONS. */
  resolution = 0;
  readonly ctx: CanvasRenderingContext2D;
  private listeners: (() => void)[] = [];

  constructor(readonly ui: HTMLCanvasElement) {
    this.ctx = ui.getContext('2d')!;
    const ro = new ResizeObserver(() => this.resize());
    ro.observe(ui);
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  onResize(fn: () => void): void {
    this.listeners.push(fn);
  }

  setResolution(i: number): void {
    this.resolution = Math.max(0, Math.min(RESOLUTIONS.length - 1, i));
    this.resize();
  }

  resize(): void {
    const cssW = Math.max(1, this.ui.clientWidth || window.innerWidth);
    const cssH = Math.max(1, this.ui.clientHeight || window.innerHeight);
    const target = RESOLUTIONS[this.resolution].height;
    let ratio = target > 0 ? target / Math.min(cssW, cssH) : window.devicePixelRatio || 1;
    // Never exceed 8K on either axis.
    ratio = Math.min(ratio, MAX_W / cssW, MAX_H / cssH);
    const pw = Math.max(1, Math.round(cssW * ratio));
    const ph = Math.max(1, Math.round(cssH * ratio));
    if (pw === this.pixelW && ph === this.pixelH && this.ui.width === pw) return;
    this.pixelW = pw;
    this.pixelH = ph;
    this.ui.width = pw;
    this.ui.height = ph;
    this.scale = Math.min(pw / BASE_W, ph / BASE_H);
    this.width = pw / this.scale;
    this.height = ph / this.scale;
    for (const fn of this.listeners) fn();
  }

  /** CSS pixels (relative to the canvas) to logical units. */
  toLogical(cssX: number, cssY: number): { x: number; y: number } {
    const k = this.pixelW / Math.max(1, this.ui.clientWidth || window.innerWidth);
    return { x: (cssX * k) / this.scale, y: (cssY * k) / this.scale };
  }

  /** Resets the 2D context to logical units with a clear canvas. */
  begin(): CanvasRenderingContext2D {
    const c = this.ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, this.pixelW, this.pixelH);
    c.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = 'high';
    return c;
  }
}
