/**
 * The scene stack and main loop.
 *
 * Scenes are pushed with `run()`, which returns a promise of the scene's result, so
 * event scripts read top to bottom: `await g.run(new Dialog(...))`. Only the top
 * scene updates; scenes are drawn bottom-up from the topmost opaque one, and the 3D
 * world is rendered underneath when any visible scene asks for it.
 */
import type { Input } from '../core/input';
import type { View } from '../core/view';
import type { SaveData } from './state';
import type { World3D } from '../world/world3d';

export interface Scene {
  /** Covers the whole screen, so nothing below needs drawing. */
  opaque?: boolean;
  /** Wants the 3D world rendered behind it. */
  showWorld?: boolean;
  update(dt: number): void;
  draw(ctx: CanvasRenderingContext2D): void;
  /** Called when this scene becomes the top again. */
  resume?(): void;
}

interface Entry {
  scene: Scene;
  resolve: (v: unknown) => void;
}

export class Game {
  save!: SaveData;
  time = 0;
  private stack: Entry[] = [];
  private fade = 0;
  private fadeTarget = 0;
  private fadeSpeed = 4;
  private fadeColor = '#000';
  private fadeWaiters: (() => void)[] = [];

  constructor(
    readonly view: View,
    readonly input: Input,
    readonly world: World3D,
  ) {}

  get top(): Scene | undefined {
    return this.stack[this.stack.length - 1]?.scene;
  }

  /** Pushes a scene and resolves with whatever it passes to `close`. */
  run<T = void>(scene: Scene): Promise<T> {
    return new Promise<T>((resolve) => {
      this.stack.push({ scene, resolve: resolve as (v: unknown) => void });
      this.input.consume();
    });
  }

  /** Removes a scene (normally the top one) and settles its promise. */
  close(scene: Scene, result?: unknown): void {
    const i = this.stack.findIndex((e) => e.scene === scene);
    if (i < 0) return;
    const [e] = this.stack.splice(i, 1);
    this.input.consume();
    this.top?.resume?.();
    e.resolve(result);
  }

  /** Replaces the whole stack (title -> game, game over...). */
  reset(scene: Scene): void {
    this.stack = [];
    void this.run(scene);
  }

  /** Fades to a colour and resolves once fully covered. */
  fadeOut(seconds = 0.25, color = '#000'): Promise<void> {
    this.fadeColor = color;
    this.fadeTarget = 1;
    this.fadeSpeed = 1 / Math.max(0.01, seconds);
    return new Promise((r) => (this.fade >= 1 ? r() : this.fadeWaiters.push(r)));
  }

  fadeIn(seconds = 0.25): Promise<void> {
    this.fadeTarget = 0;
    this.fadeSpeed = 1 / Math.max(0.01, seconds);
    return new Promise((r) => (this.fade <= 0 ? r() : this.fadeWaiters.push(r)));
  }

  wait(seconds: number): Promise<void> {
    return new Promise((resolve) => {
      const scene: Scene = {
        update: (dt) => {
          seconds -= dt;
          if (seconds <= 0) this.close(scene);
        },
        draw: () => {},
      };
      // A wait is transparent and inherits the world view from below.
      Object.defineProperty(scene, 'showWorld', { get: () => this.stack.some((e) => e.scene !== scene && e.scene.showWorld) });
      void this.run(scene).then(resolve);
    });
  }

  frame(dt: number): void {
    this.time += dt;
    if (this.save) this.save.playTime += dt;
    this.input.poll();
    this.top?.update(dt);

    if (this.fade !== this.fadeTarget) {
      const d = this.fadeSpeed * dt;
      this.fade = this.fade < this.fadeTarget ? Math.min(this.fadeTarget, this.fade + d) : Math.max(this.fadeTarget, this.fade - d);
      if (this.fade === this.fadeTarget) {
        const w = this.fadeWaiters;
        this.fadeWaiters = [];
        for (const r of w) r();
      }
    }

    let first = this.stack.length - 1;
    while (first > 0 && !this.stack[first].scene.opaque) first--;
    const visible = this.stack.slice(Math.max(0, first));
    const wantWorld = visible.some((e) => e.scene.showWorld);
    this.world.setVisible(wantWorld);
    if (wantWorld) this.world.render(dt);

    const ctx = this.view.begin();
    for (const e of visible) {
      ctx.save();
      e.scene.draw(ctx);
      ctx.restore();
    }
    if (this.fade > 0) {
      ctx.globalAlpha = this.fade;
      ctx.fillStyle = this.fadeColor;
      ctx.fillRect(0, 0, this.view.width, this.view.height);
      ctx.globalAlpha = 1;
    }
  }
}
