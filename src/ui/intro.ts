/** The professor's welcome speech and naming the player and rival. */
import { audio } from '../audio/audio';
import type { Game, Scene } from '../game/game';
import { drawTrainerPortrait, LOOKS } from '../gfx/characters';
import { creatureSprite } from '../gfx/creatures';
import { say, yesNo } from './dialog';
import { pouchIcon } from './draw';
import { enterName } from './naming';

class IntroScene implements Scene {
  opaque = true;
  t = 0;
  who: 'professor' | 'player' | 'rival' | 'none' = 'professor';
  pocklet = 0;
  pouch = 0;
  shrink = 0;

  constructor(private g: Game) {}

  update(dt: number): void {
    this.t += dt;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const W = this.g.view.width;
    const H = this.g.view.height;
    const bg = ctx.createRadialGradient(W / 2, H * 0.42, 40, W / 2, H * 0.42, Math.max(W, H) * 0.7);
    bg.addColorStop(0, '#5a6aa8');
    bg.addColorStop(0.5, '#2a3468');
    bg.addColorStop(1, '#0c1028');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    // Floor glow.
    ctx.fillStyle = 'rgba(160,190,255,0.18)';
    ctx.beginPath();
    ctx.ellipse(W / 2, H * 0.72, 260, 50, 0, 0, Math.PI * 2);
    ctx.fill();
    const k = 1 - this.shrink;
    if (k <= 0) return;
    ctx.save();
    ctx.translate(W / 2, H * 0.72);
    ctx.scale(k, k);
    if (this.who !== 'none') drawTrainerPortrait(ctx, LOOKS[this.who], this.who === 'professor' ? -60 : 0, 0, 340);
    if (this.who === 'professor') {
      if (this.pouch > 0 && this.pocklet < 1) pouchIcon(ctx, 140, -120 - Math.sin(this.pouch * Math.PI) * 80, 20, '#d85848', this.pouch > 0.9 ? 1 : 0);
      if (this.pocklet > 0) {
        const s = 170 * Math.min(1, this.pocklet);
        const img = creatureSprite('lumipix', 170 * this.g.view.scale);
        ctx.drawImage(img, 140 - s / 2, -s - 20 + Math.sin(this.t * 2.4) * 8, s, s);
      }
    }
    ctx.restore();
  }
}

function tween(g: Game, dur: number, fn: (p: number) => void): Promise<void> {
  return new Promise((resolve) => {
    let t = 0;
    const s: Scene = {
      update: (dt) => {
        t += dt;
        fn(Math.min(1, t / dur));
        if (t >= dur) g.close(s);
      },
      draw: () => {},
    };
    void g.run(s).then(resolve);
  });
}

export async function runIntro(g: Game): Promise<{ player: string; rival: string }> {
  const scene = new IntroScene(g);
  void g.run(scene);
  audio.playMusic('lab');
  await g.fadeIn(0.6);
  const P = 'Professor Hemlock';
  await say(g, 'Hello there! Welcome to the world of Pocklets!', { speaker: P });
  await say(g, 'My name is Hemlock. People call me the Pocklet Professor, though I prefer "Rowdy Old Man With Clipboard".', { speaker: P });
  await say(g, 'This world is home to creatures we call Pocklets. Like this one here...', { speaker: P });
  audio.sfx('throw');
  await tween(g, 0.7, (p) => (scene.pouch = p));
  audio.sfx('sparkle');
  await tween(g, 0.4, (p) => (scene.pocklet = p));
  await say(g, 'This is Lumipix. They say seeing one brings lucky dreams.', { speaker: P });
  await say(g, 'People and Pocklets live side by side. Some play together, some work together, and some battle together as partners.', { speaker: P });
  await say(g, 'Why are they called Pocklets? Because they love snuggling into pockets! And pouches. And, well, stuff.', { speaker: P });
  await say(g, 'But enough about me. Tell me about yourself!', { speaker: P });

  scene.who = 'player';
  let player = '';
  for (;;) {
    player = await enterName(g, 'Your name?', 'player', 'Remy');
    if (await yesNo(g, `So, your name is ${player}?`)) break;
  }
  scene.who = 'rival';
  await say(g, 'And this is your best friend and neighbour. The two of you have been rivals since you could walk.', { speaker: P });
  let rival = '';
  for (;;) {
    rival = await enterName(g, 'Your rival\'s name?', 'rival', 'Dash');
    if (await yesNo(g, `So, your rival is called ${rival}?`)) break;
  }
  scene.who = 'player';
  await say(g, `${player}! Your very own Pocklet adventure is about to unfold.`, { speaker: P });
  await say(g, 'A world of dreams and adventures with Pocklets awaits! Let\'s go!', { speaker: P });
  audio.stopMusic(1);
  await tween(g, 1.0, (p) => (scene.shrink = p));
  await g.fadeOut(0.6);
  g.close(scene);
  return { player, rival };
}
