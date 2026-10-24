/**
 * Dev contact sheet for the vector art: /dev/art.html
 *   ?view=creatures (default) | characters | big
 *   &cell=<px>      cell size for creatures
 *   &id=<species>   for view=big
 *   &px=<px>        sprite size for view=big
 */
import { DEX_ORDER } from '../src/data/species';
import { LOOKS, drawCharacter, drawTrainerPortrait, type Facing } from '../src/gfx/characters';
import { creatureSprite, drawCreature } from '../src/gfx/creatures';

const q = new URLSearchParams(location.search);
const view = q.get('view') ?? 'creatures';
const canvas = document.getElementById('sheet') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

function label(text: string, x: number, y: number, size = 12): void {
  ctx.fillStyle = '#223';
  ctx.font = `600 ${size}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(text, x, y);
}

if (view === 'big') {
  const px = Number(q.get('px') ?? 1600);
  canvas.width = px;
  canvas.height = px;
  drawCreature(ctx, q.get('id') ?? 'sprigfawn', px / 2, px * 0.98, px * 0.95, { back: q.has('back') });
} else if (view === 'characters') {
  const names = Object.keys(LOOKS);
  const h = Number(q.get('cell') ?? 96);
  const facings: Facing[] = ['down', 'left', 'right', 'up'];
  const cw = h * 0.7;
  const cols = facings.length * 4 + 2;
  canvas.width = cols * cw + 120;
  canvas.height = names.length * (h + 22) + 20;
  names.forEach((n, row) => {
    const y = 20 + row * (h + 22) + h;
    label(n, 50, y - h / 2);
    facings.forEach((f, fi) => {
      for (let fr = 0; fr < 4; fr++) {
        const x = 120 + (fi * 4 + fr) * cw + cw / 2;
        drawCharacter(ctx, LOOKS[n], f, fr as 0 | 1 | 2 | 3, x, y, h * 0.9);
      }
    });
    drawTrainerPortrait(ctx, LOOKS[n], 120 + 16 * cw + cw * 0.5, y, h);
    drawTrainerPortrait(ctx, LOOKS[n], 120 + 17 * cw + cw * 0.5, y, h, true);
  });
} else {
  const cell = Number(q.get('cell') ?? 160);
  const cols = 3;
  const pad = 18;
  const groupW = cell * 3 + pad;
  canvas.width = cols * groupW + pad;
  canvas.height = Math.ceil(DEX_ORDER.length / cols) * (cell + 28) + pad;
  DEX_ORDER.forEach((s, i) => {
    const gx = pad + (i % cols) * groupW;
    const gy = pad + Math.floor(i / cols) * (cell + 28);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(gx, gy, cell * 3, cell);
    ctx.fillStyle = '#c8d0dc';
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.ellipse(gx + cell * k + cell / 2, gy + cell * 0.95, cell * 0.36, cell * 0.06, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.drawImage(creatureSprite(s.id, cell), gx, gy, cell, cell);
    ctx.drawImage(creatureSprite(s.id, cell, { back: true }), gx + cell, gy, cell, cell);
    ctx.drawImage(creatureSprite(s.id, cell, { shiny: true }), gx + cell * 2, gy, cell, cell);
    label(`${s.num}. ${s.name}`, gx + cell * 1.5, gy + cell + 16);
  });
}
document.title = 'ready';
