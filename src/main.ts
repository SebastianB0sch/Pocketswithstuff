/**
 * Entry point: sets up the full-window canvases, input, the 3D world and the
 * scene stack, then runs the main loop.
 */
import '@fontsource/nunito/600.css';
import '@fontsource/nunito/800.css';
import '@fontsource/pixelify-sans/700.css';
import './style.css';
import { audio } from './audio/audio';
import { Input } from './core/input';
import { View } from './core/view';
import { Game } from './game/game';
import { loadOptions } from './game/state';
import { TitleScene } from './ui/title';
import { World3D } from './world/world3d';

async function boot(): Promise<void> {
  const uiCanvas = document.getElementById('ui') as HTMLCanvasElement;
  const worldCanvas = document.getElementById('world') as HTMLCanvasElement;
  const view = new View(uiCanvas);
  const options = loadOptions();
  view.setResolution(options.resolution);
  audio.setVolumes(options.music, options.sfx);
  const input = new Input(uiCanvas, (x, y) => view.toLogical(x, y));
  const world = new World3D(worldCanvas, view);
  const g = new Game(view, input, world);
  // The vector UI font must be ready before the first text is measured.
  await Promise.race([
    Promise.all([document.fonts.load('600 20px Nunito'), document.fonts.load('800 20px Nunito'), document.fonts.load('700 20px "Pixelify Sans"')]),
    new Promise((r) => setTimeout(r, 2500)),
  ]);
  g.reset(new TitleScene(g));

  let last = performance.now();
  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    requestAnimationFrame(frame);
    if (input.any) audio.unlock();
    try {
      g.frame(dt);
    } catch (e) {
      // Keep the loop alive; a broken frame should not freeze the game.
      console.error(e);
    }
  };
  requestAnimationFrame(frame);
  // Exposed for debugging and automated play-testing.
  (window as unknown as { game: Game }).game = g;
}

void boot();
