import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ITEMS } from '../src/data/items';
import { SPECIES } from '../src/data/species';
import { LOOKS } from '../src/gfx/characters';
import { doorOf, LEGEND, mapSize, tileAt, type MapDef } from '../src/world/mapdef';
import { MAPS, STOCK } from '../src/world/maps';

const maps = Object.values(MAPS);
const scriptSource = readFileSync(new URL('../src/world/scripts.ts', import.meta.url), 'utf8');

function walkable(m: MapDef, x: number, y: number): boolean {
  const { w, h } = mapSize(m);
  return x >= 0 && y >= 0 && x < w && y < h && !tileAt(m, x, y).solid;
}

function scriptExists(name: string): boolean {
  return new RegExp(`(async ${name}\\(|\\b${name}:|^  ${name},)`, 'm').test(scriptSource);
}

describe('maps', () => {
  for (const m of maps) {
    describe(m.id, () => {
      it('has a rectangular grid of known tiles', () => {
        const w = m.tiles[0].length;
        m.tiles.forEach((row, y) => {
          expect(row.length, `row ${y}`).toBe(w);
          for (const ch of row) expect(LEGEND[ch], `char "${ch}" in row ${y}`).toBeDefined();
        });
        expect(LEGEND[m.border]).toBeDefined();
      });

      it('has warps that land on walkable tiles', () => {
        for (const wp of m.warps) {
          const dest = MAPS[wp.to];
          expect(dest, `warp to ${wp.to}`).toBeDefined();
          expect(walkable(dest, wp.tx, wp.ty), `${m.id} -> ${wp.to} (${wp.tx},${wp.ty})`).toBe(true);
        }
        for (const b of m.buildings ?? []) {
          if (!b.to) continue;
          const dest = MAPS[b.to.map];
          expect(dest, `door to ${b.to.map}`).toBeDefined();
          expect(walkable(dest, b.to.x, b.to.y), `door into ${b.to.map}`).toBe(true);
          const d = doorOf(b);
          expect(walkable(m, d.x, d.y + 1), `tile in front of the ${b.kind} door on ${m.id}`).toBe(true);
          // The interior's exit mat leads back to that tile.
          const back = dest.warps.find((w) => w.x === b.to!.x && w.y === b.to!.y);
          expect(back, `exit mat in ${b.to.map}`).toBeDefined();
          expect([back!.to, back!.tx, back!.ty]).toEqual([m.id, d.x, d.y + 1]);
        }
      });

      it('connects to neighbours through open edges', () => {
        const { w, h } = mapSize(m);
        for (const c of m.connections ?? []) {
          const dest = MAPS[c.to];
          expect(dest).toBeDefined();
          const ds = mapSize(dest);
          // Every open tile on this edge must arrive on an open tile over there.
          const edge = c.dir === 'up' ? 0 : c.dir === 'down' ? h - 1 : c.dir === 'left' ? 0 : w - 1;
          const len = c.dir === 'up' || c.dir === 'down' ? w : h;
          let open = 0;
          for (let i = 0; i < len; i++) {
            const [x, y] = c.dir === 'up' || c.dir === 'down' ? [i, edge] : [edge, i];
            if (!walkable(m, x, y)) continue;
            open++;
            const [nx, ny] =
              c.dir === 'up' ? [x + c.offset, ds.h - 1] : c.dir === 'down' ? [x + c.offset, 0] : c.dir === 'left' ? [ds.w - 1, y + c.offset] : [0, y + c.offset];
            expect(walkable(dest, nx, ny), `${m.id} ${c.dir} (${x},${y}) -> ${c.to} (${nx},${ny})`).toBe(true);
          }
          expect(open, `${m.id} has an open ${c.dir} edge`).toBeGreaterThan(0);
          const back = { up: 'down', down: 'up', left: 'right', right: 'left' }[c.dir];
          const ret = dest.connections?.find((k) => k.dir === back && k.to === m.id);
          expect(ret, `${c.to} connects back to ${m.id}`).toBeDefined();
          expect(ret!.offset).toBe(-c.offset);
        }
      });

      it('places people and items on walkable tiles', () => {
        for (const n of m.npcs ?? []) {
          expect(walkable(m, n.x, n.y), `npc ${n.id} at (${n.x},${n.y})`).toBe(true);
          expect(LOOKS[n.look], `look ${n.look}`).toBeDefined();
          if (n.script) expect(scriptExists(n.script), `script ${n.script}`).toBe(true);
          for (const [sp, lv] of n.trainer?.party ?? []) {
            expect(SPECIES[sp], sp).toBeDefined();
            expect(lv).toBeGreaterThan(0);
          }
        }
        for (const it of m.items ?? []) {
          expect(walkable(m, it.x, it.y), `item ${it.flag} at (${it.x},${it.y})`).toBe(true);
          expect(ITEMS[it.item], it.item).toBeDefined();
        }
        const flags = (m.items ?? []).map((i) => i.flag);
        expect(new Set(flags).size).toBe(flags.length);
      });

      it('references existing scripts and species', () => {
        for (const t of m.triggers ?? []) expect(scriptExists(t.script), `trigger ${t.script}`).toBe(true);
        if (m.onEnter) expect(scriptExists(m.onEnter), `onEnter ${m.onEnter}`).toBe(true);
        for (const e of m.encounters ?? []) {
          expect(SPECIES[e.species], e.species).toBeDefined();
          expect(e.min).toBeLessThanOrEqual(e.max);
        }
        if (m.encounters?.length) expect(m.tiles.some((r) => /["N]/.test(r)), 'has encounter grass').toBe(true);
      });
    });
  }

  it('stocks only known items', () => {
    for (const list of Object.values(STOCK)) for (const id of list) expect(ITEMS[id], id).toBeDefined();
  });

  it('starts the player on a walkable tile at home', () => {
    expect(walkable(MAPS.home, 6, 3)).toBe(true);
    expect(walkable(MAPS.home, 4, 5)).toBe(true);
  });
});
