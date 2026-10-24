/** "What? X is evolving!" — runs after battles for creatures that levelled up. */
import { audio } from '../audio/audio';
import { move as moveData } from '../data/moves';
import { species } from '../data/species';
import { displayName, evolve, movesLearnedAt, pendingEvolution, type Creature } from '../game/creature';
import type { Game, Scene } from '../game/game';
import { markCaught } from '../game/state';
import { creatureSprite } from '../gfx/creatures';
import { say } from './dialog';
import { stripes } from './draw';
import { askForgetMove } from './learnmove';

class EvolutionScene implements Scene {
  opaque = true;
  t = 0;
  /** 0 = showing the old form, 1 = the new one. */
  form = 0;
  white = 0;
  phase: 'intro' | 'morph' | 'done' = 'intro';
  cancelled = false;

  constructor(
    private g: Game,
    private from: string,
    private to: string,
    private shiny: boolean,
  ) {}

  update(dt: number): void {
    this.t += dt;
    if (this.phase !== 'morph') return;
    const T = this.t;
    // Flicker between silhouettes, faster and faster.
    const speed = 1 + T * 1.6;
    this.form = Math.sin(T * speed * 2.2) > 0 ? 1 : 0;
    this.white = Math.min(1, T / 0.6);
    if (this.g.input.pressed.b && T < 5) {
      this.cancelled = true;
      this.phase = 'done';
      this.form = 0;
      this.white = 0;
    }
    if (T >= 5.5) {
      this.phase = 'done';
      this.form = 1;
      this.white = 0;
      audio.sfx('sparkle');
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const W = this.g.view.width;
    const H = this.g.view.height;
    stripes(ctx, W, H, '#202838', '#283048', this.t, 40);
    // Rays.
    if (this.phase === 'morph') {
      ctx.save();
      ctx.translate(W / 2, H * 0.45);
      ctx.rotate(this.t * 0.6);
      ctx.fillStyle = 'rgba(255,240,200,0.08)';
      for (let i = 0; i < 12; i++) {
        ctx.rotate(Math.PI / 6);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(W, -60);
        ctx.lineTo(W, 60);
        ctx.fill();
      }
      ctx.restore();
    }
    const size = 300;
    const id = this.form ? this.to : this.from;
    const img = creatureSprite(id, size * this.g.view.scale, { shiny: this.shiny });
    const x = W / 2 - size / 2;
    const y = H * 0.45 - size * 0.6;
    if (this.white > 0) {
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const k = c.getContext('2d')!;
      k.drawImage(img, 0, 0);
      k.globalCompositeOperation = 'source-atop';
      k.fillStyle = `rgba(255,255,255,${this.white})`;
      k.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(c, x, y, size, size);
    } else ctx.drawImage(img, x, y, size, size);
  }
}

/** Evolves every eligible creature among the given party indices, one by one. */
export async function evolveAfterBattle(g: Game, leveled: number[]): Promise<void> {
  for (const i of leveled) {
    const c = g.save.party[i];
    if (!c || c.hp <= 0) continue;
    const to = pendingEvolution(c);
    if (!to) continue;
    await runEvolution(g, c, to);
  }
}

export async function runEvolution(g: Game, c: Creature, to: string): Promise<void> {
  const name = displayName(c);
  const scene = new EvolutionScene(g, c.species, to, !!c.shiny);
  audio.playMusic('evolution');
  const done = g.run(scene);
  await g.fadeIn(0.3);
  await say(g, `What? ${name} is evolving!`);
  scene.t = 0;
  scene.phase = 'morph';
  await new Promise<void>((r) => {
    const tick = () => (scene.phase === 'done' ? r() : requestAnimationFrame(tick));
    tick();
  });
  if (scene.cancelled) {
    await say(g, `Huh? ${name} stopped evolving!`);
  } else {
    const nick = !!c.nickname;
    evolve(c, to);
    markCaught(g.save, to);
    void audio.jingle('evolved');
    await say(g, `Congratulations! Your ${name} evolved into ${species(to).name}!`);
    if (!nick) c.nickname = undefined;
    for (const id of movesLearnedAt(c, c.level)) {
      if (c.moves.length < 4) {
        c.moves.push({ id, pp: moveData(id).pp });
        void audio.jingle('levelup');
        await say(g, `${displayName(c)} learned ${moveData(id).name}!`);
      } else {
        const slot = await askForgetMove(g, c, id);
        if (slot >= 0) c.moves[slot] = { id, pp: moveData(id).pp };
      }
    }
  }
  await g.fadeOut(0.3);
  g.close(scene);
  await done;
  await g.fadeIn(0.3);
}
