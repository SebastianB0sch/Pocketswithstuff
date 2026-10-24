/** Audio preview page: play everything live, or render offline and measure levels. */
import { audio } from '../src/audio/audio';
import { Player, compile, masterChain, type Song } from '../src/audio/engine';
import { SFX_IDS, playSfx } from '../src/audio/sfx';
import { JINGLES, TRACKS, type JingleId, type TrackId } from '../src/audio/songs';

const add = (parent: string, label: string, fn: () => void) => {
  const b = document.createElement('button');
  b.textContent = label;
  b.onclick = () => {
    audio.unlock();
    fn();
  };
  document.getElementById(parent)!.append(b);
};
for (const id of Object.keys(TRACKS) as TrackId[]) add('tracks', id, () => audio.playMusic(id));
for (const id of Object.keys(JINGLES) as JingleId[]) add('jingles', id, () => void audio.jingle(id));
for (const id of SFX_IDS) add('sfx', id, () => audio.sfx(id));
document.getElementById('stop')!.onclick = () => audio.stopMusic();

interface Stat { name: string; rms: number; peak: number }

async function measure(name: string, seconds: number, schedule: (ctx: OfflineAudioContext, dest: AudioNode) => void, bus: 'music' | 'sfx' = 'music'): Promise<Stat> {
  const rate = 44100;
  const ctx = new OfflineAudioContext(2, Math.ceil(rate * seconds), rate);
  const chain = masterChain(ctx);
  schedule(ctx, chain[bus]);
  const buf = await ctx.startRendering();
  let sum = 0;
  let peak = 0;
  let n = 0;
  for (let ch = 0; ch < buf.numberOfChannels; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < d.length; i++) {
      const v = Math.abs(d[i]);
      sum += v * v;
      if (v > peak) peak = v;
      n++;
    }
  }
  return { name, rms: Math.sqrt(sum / n), peak };
}

async function renderAll(seconds = 8): Promise<Stat[]> {
  const out: Stat[] = [];
  const song = (s: Song) => (ctx: OfflineAudioContext, dest: AudioNode) => {
    const c = compile(s);
    const p = new Player(ctx, dest, c, 0.01);
    p.scheduleUntil(c.loop ? seconds : p.endTime);
  };
  for (const [id, s] of Object.entries(TRACKS)) out.push(await measure(id, seconds, song(s)));
  for (const [id, s] of Object.entries(JINGLES)) out.push(await measure('jingle:' + id, Math.min(seconds, compile(s).length * compile(s).stepSec + 0.5), song(s)));
  for (const id of SFX_IDS) out.push(await measure('sfx:' + id, 1.2, (ctx, dest) => playSfx(ctx, dest, id, 0.01), 'sfx'));
  return out;
}

(window as unknown as { renderAll: typeof renderAll }).renderAll = renderAll;
document.getElementById('render')!.onclick = async () => {
  const res = await renderAll();
  document.getElementById('out')!.textContent = res.map((r) => `${r.name.padEnd(22)} rms ${r.rms.toFixed(4)}  peak ${r.peak.toFixed(3)}`).join('\n');
};
