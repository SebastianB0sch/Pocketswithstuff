/**
 * Walking around: grid movement, people, trainers spotting you, doors, map
 * connections, tall-grass encounters, and the API event scripts are written in.
 */
import { audio } from '../audio/audio';
import { Rng } from '../core/rng';
import { item as itemData } from '../data/items';
import { species } from '../data/species';
import { displayName, makeCreature, restore, type Creature } from '../game/creature';
import type { Game, Scene } from '../game/game';
import { addItem, markSeen, type Facing } from '../game/state';
import { runBattle } from '../battle/scene';
import { say, yesNo, type DialogOptions } from '../ui/dialog';
import { C, outlined, panel, roundRect, text } from '../ui/draw';
import { openStartMenu } from '../ui/startmenu';
import { TouchPad } from '../ui/touchpad';
import { Wristpad } from '../ui/wristpad';
import { evolveAfterBattle } from '../ui/evolution';
import { MAPS } from './maps';
import { charAt, doorOf, mapSize, tileAt, type Encounter, type MapDef, type NpcDef, type TrainerDef } from './mapdef';
import { SCRIPTS } from './scripts';
import { timeOfDay, type Actor } from './world3d';

const DIRS: Record<Facing, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const OPPOSITE: Record<Facing, Facing> = { up: 'down', down: 'up', left: 'right', right: 'left' };
const WALK = 0.25;
const RUN = 0.13;

export class Mover {
  x = 0;
  y = 0;
  facing: Facing = 'down';
  moving = false;
  private fromX = 0;
  private fromY = 0;
  private toX = 0;
  private toY = 0;
  private t = 0;
  private dur = WALK;
  private jump = false;
  private steps = 0;
  private done: (() => void) | null = null;

  constructor(readonly actor: Actor) {}

  place(x: number, y: number, facing?: Facing): void {
    this.x = this.toX = x;
    this.y = this.toY = y;
    if (facing) this.facing = facing;
    this.moving = false;
    this.sync(0);
  }

  /** Starts a one-tile step (two for a ledge jump); resolves on arrival. */
  step(dir: Facing, dur: number, jump = false): Promise<void> {
    this.facing = dir;
    const [dx, dy] = DIRS[dir];
    const n = jump ? 2 : 1;
    this.fromX = this.x;
    this.fromY = this.y;
    this.toX = this.x + dx * n;
    this.toY = this.y + dy * n;
    this.t = 0;
    this.dur = jump ? 0.42 : dur;
    this.jump = jump;
    this.moving = true;
    this.steps++;
    return new Promise((r) => (this.done = r));
  }

  get tileX(): number {
    return this.moving ? this.toX : this.x;
  }

  get tileY(): number {
    return this.moving ? this.toY : this.y;
  }

  update(dt: number): void {
    if (!this.moving) {
      this.sync(0);
      return;
    }
    this.t += dt / this.dur;
    if (this.t >= 1) {
      this.x = this.toX;
      this.y = this.toY;
      this.moving = false;
      this.sync(0);
      const d = this.done;
      this.done = null;
      d?.();
      return;
    }
    this.sync(this.t);
  }

  private sync(p: number): void {
    const a = this.actor;
    a.x = this.moving ? this.fromX + (this.toX - this.fromX) * p : this.x;
    a.y = this.moving ? this.fromY + (this.toY - this.fromY) * p : this.y;
    a.lift = this.moving && this.jump ? Math.sin(p * Math.PI) * 0.55 : 0;
    a.facing = this.facing;
    a.frame = this.moving && p < 0.5 ? (this.steps % 2 ? 1 : 3) : this.steps % 2 ? 0 : 2;
  }
}

export interface NpcState {
  def: NpcDef;
  mover: Mover;
  homeX: number;
  homeY: number;
  timer: number;
  emote: { kind: '!' | '?' | '♪' | '…'; t: number } | null;
}

export type Script = (ow: Overworld, npc?: NpcState) => Promise<void>;

export class Overworld implements Scene {
  showWorld = true;
  map!: MapDef;
  player!: Mover;
  npcs: NpcState[] = [];
  readonly rng = new Rng();
  readonly wristpad: Wristpad;
  readonly touchpad: TouchPad;
  private busy = 0;
  private turnTimer = 0;
  private banner: { name: string; t: number } | null = null;
  private lastName = '';
  private bumpCooldown = 0;

  constructor(readonly g: Game) {
    this.wristpad = new Wristpad(g);
    this.touchpad = new TouchPad(g.input, g.view);
  }

  get save() {
    return this.g.save;
  }

  get isBusy(): boolean {
    return this.busy > 0;
  }

  /** Substitutes {PLAYER} and {RIVAL} in text. */
  fmt(s: string): string {
    return s.replaceAll('{PLAYER}', this.save.name).replaceAll('{RIVAL}', this.save.rival);
  }

  flag(name: string): boolean {
    return !!this.save.flags[name];
  }

  setFlag(name: string, v: boolean | number = true): void {
    this.save.flags[name] = v;
  }

  // -------------------------------------------------------------------------
  // Entering maps

  enter(mapId: string, x: number, y: number, facing: Facing): void {
    const map = MAPS[mapId];
    if (!map) throw new Error(`No map ${mapId}`);
    this.map = map;
    const s = this.save;
    s.map = mapId;
    s.x = x;
    s.y = y;
    s.facing = facing;
    const balls = (map.items ?? []).filter((i) => !i.hidden && !this.flag(i.flag));
    this.g.world.load(map, balls);
    this.player = new Mover(this.g.world.addActor('player'));
    this.player.place(x, y, facing);
    this.npcs = [];
    for (const def of map.npcs ?? []) this.spawnNpc(def);
    audio.playMusic(map.music);
    if (map.banner && map.name !== this.lastName) this.banner = { name: map.name, t: 0 };
    this.lastName = map.name;
    this.updateCamera();
  }

  private spawnNpc(def: NpcDef): void {
    if (def.hideIf && this.flag(def.hideIf)) return;
    if (def.showIf && !this.flag(def.showIf)) return;
    const mover = new Mover(this.g.world.addActor(def.look));
    mover.place(def.x, def.y, def.facing ?? 'down');
    this.npcs.push({ def, mover, homeX: def.x, homeY: def.y, timer: 1 + this.rng.next() * 3, emote: null });
  }

  /** Re-evaluates which people are present after flags change. */
  refreshNpcs(): void {
    for (const n of [...this.npcs]) {
      const d = n.def;
      if ((d.hideIf && this.flag(d.hideIf)) || (d.showIf && !this.flag(d.showIf))) this.removeNpc(n);
    }
    for (const def of this.map.npcs ?? []) if (!this.npcs.some((n) => n.def === def)) this.spawnNpc(def);
  }

  removeNpc(n: NpcState): void {
    this.g.world.removeActor(n.mover.actor);
    this.npcs = this.npcs.filter((m) => m !== n);
  }

  npc(id: string): NpcState {
    const n = this.npcs.find((m) => m.def.id === id);
    if (!n) throw new Error(`No npc ${id} on ${this.map.id}`);
    return n;
  }

  async warp(mapId: string, x: number, y: number, facing: Facing, sfx: 'door' | 'stairs' | null = 'door'): Promise<void> {
    this.busy++;
    try {
      if (sfx) audio.sfx(sfx);
      await this.g.fadeOut(0.22);
      this.enter(mapId, x, y, facing);
      await this.g.fadeIn(0.22);
      await this.runEnterScript();
    } finally {
      this.busy--;
    }
  }

  async runEnterScript(): Promise<void> {
    if (this.map.onEnter) await this.runScript(this.map.onEnter);
  }

  async runScript(name: string, npc?: NpcState): Promise<void> {
    const fn = SCRIPTS[name];
    if (!fn) {
      console.warn(`Missing script ${name}`);
      return;
    }
    this.busy++;
    try {
      await fn(this, npc);
    } finally {
      this.busy--;
    }
  }

  // -------------------------------------------------------------------------
  // Collision

  blocked(x: number, y: number, self?: Mover): boolean {
    const { w, h } = mapSize(this.map);
    if (x < 0 || y < 0 || x >= w || y >= h) return true;
    if (tileAt(this.map, x, y).solid) return true;
    if (self !== this.player && this.player.tileX === x && this.player.tileY === y) return true;
    return this.npcs.some((n) => n.mover !== self && n.mover.tileX === x && n.mover.tileY === y);
  }

  private npcAt(x: number, y: number): NpcState | undefined {
    return this.npcs.find((n) => n.mover.tileX === x && n.mover.tileY === y);
  }

  // -------------------------------------------------------------------------
  // Frame

  update(dt: number): void {
    const input = this.g.input;
    this.bumpCooldown -= dt;
    this.player.update(dt);
    for (const n of this.npcs) {
      n.mover.update(dt);
      if (n.emote) {
        n.emote.t += dt;
        if (n.emote.t > 1.2) n.emote = null;
      }
    }
    if (this.banner) {
      this.banner.t += dt;
      if (this.banner.t > 3) this.banner = null;
    }
    this.updateCamera();
    this.wristpad.update(dt, !this.busy);
    this.touchpad.update(!this.busy && this.g.top === this);
    if (this.busy) return;

    this.wanderNpcs(dt);
    if (this.player.moving) return;

    if (input.pressed.start || input.pressed.x || this.wristpad.menuTapped()) {
      audio.sfx('menu');
      this.busy++;
      void openStartMenu(this.g, this).finally(() => this.busy--);
      return;
    }
    if (input.pressed.a) {
      void this.interact();
      return;
    }

    const dir = (['up', 'down', 'left', 'right'] as Facing[]).find((d) => input.held[d]);
    if (!dir) {
      this.turnTimer = 0;
      return;
    }
    if (dir !== this.player.facing && input.pressed[dir]) {
      // A tap turns on the spot; holding walks.
      this.player.facing = dir;
      this.turnTimer = 0.09;
      return;
    }
    if (this.turnTimer > 0) {
      this.turnTimer -= dt;
      if (this.turnTimer > 0) return;
    }
    void this.tryStep(dir, input.held.run && !!this.save.bag.runshoes);
  }

  private updateCamera(): void {
    const a = this.player.actor;
    this.g.world.focus.set(a.x, 0, a.y);
  }

  private wanderNpcs(dt: number): void {
    for (const n of this.npcs) {
      const mv = n.def.move ?? 'still';
      if (mv === 'still' || n.mover.moving) continue;
      n.timer -= dt;
      if (n.timer > 0) continue;
      n.timer = 1.5 + this.rng.next() * 3;
      const dirs: Facing[] = ['up', 'down', 'left', 'right'];
      const d = this.rng.pick(dirs);
      if (mv === 'look' || mv === 'spin') {
        n.mover.facing = mv === 'spin' ? dirs[(dirs.indexOf(n.mover.facing) + 1) % 4] : d;
        if (mv === 'spin') n.timer = 0.8;
        continue;
      }
      const [dx, dy] = DIRS[d];
      const tx = n.mover.x + dx;
      const ty = n.mover.y + dy;
      if (Math.abs(tx - n.homeX) > 2 || Math.abs(ty - n.homeY) > 2 || this.blocked(tx, ty, n.mover) || tileAt(this.map, tx, ty).encounter) {
        n.mover.facing = d;
        continue;
      }
      void n.mover.step(d, WALK * 1.4);
    }
  }

  private async tryStep(dir: Facing, run: boolean): Promise<void> {
    const p = this.player;
    p.facing = dir;
    const [dx, dy] = DIRS[dir];
    const tx = p.x + dx;
    const ty = p.y + dy;
    const { w, h } = mapSize(this.map);

    // Map connection off the edge.
    if (tx < 0 || ty < 0 || tx >= w || ty >= h) {
      const c = this.map.connections?.find((k) => k.dir === dir);
      if (c) {
        const dest = MAPS[c.to];
        const ds = mapSize(dest);
        const nx = dir === 'left' ? ds.w - 1 : dir === 'right' ? 0 : p.x + c.offset;
        const ny = dir === 'up' ? ds.h - 1 : dir === 'down' ? 0 : p.y + c.offset;
        this.busy++;
        await this.g.fadeOut(0.15);
        this.enter(c.to, nx, ny, dir);
        await this.g.fadeIn(0.15);
        this.busy--;
        await this.runEnterScript();
        return;
      }
      return this.bump();
    }

    // Doors (solid tiles that lead somewhere) and exit mats.
    const warp = this.map.warps.find((wp) => wp.x === tx && wp.y === ty);
    if (warp && tileAt(this.map, tx, ty).solid) {
      return this.warp(warp.to, warp.tx, warp.ty, warp.facing ?? dir);
    }
    for (const b of this.map.buildings ?? []) {
      const d = doorOf(b);
      if (b.to && d.x === tx && d.y === ty) return this.warp(b.to.map, b.to.x, b.to.y, 'up');
    }
    const here = this.map.warps.find((wp) => wp.x === p.x && wp.y === p.y && !tileAt(this.map, p.x, p.y).solid);
    if (here && dir === 'down' && this.blocked(tx, ty)) {
      return this.warp(here.to, here.tx, here.ty, here.facing ?? 'down');
    }

    // Ledges: hop down over them.
    if (charAt(this.map, tx, ty) === 'v' && dir === 'down' && !this.blocked(tx, ty + 1)) {
      audio.sfx('ledge');
      this.busy++;
      await p.step('down', WALK, true);
      this.busy--;
      return this.arrived();
    }

    if (this.blocked(tx, ty)) return this.bump();
    await p.step(dir, run ? RUN : WALK);
    await this.arrived();
  }

  private bump(): void {
    if (this.bumpCooldown > 0) return;
    this.bumpCooldown = 0.35;
    audio.sfx('bump');
  }

  /** After each step: warps, triggers, trainers, grass. */
  private async arrived(): Promise<void> {
    const p = this.player;
    const s = this.save;
    s.x = p.x;
    s.y = p.y;
    s.facing = p.facing;
    s.steps++;
    if (s.repel > 0) {
      s.repel--;
      if (s.repel === 0) {
        this.busy++;
        await say(this.g, 'The Repel Spray wore off.');
        this.busy--;
      }
    }
    // Poisoned party members lose a little HP while walking, as in the old games.
    if (s.steps % 4 === 0) {
      for (const c of s.party) if (c.status === 'psn' && c.hp > 1) c.hp--;
    }
    this.wristpad.onStep();

    const warp = this.map.warps.find((w) => w.x === p.x && w.y === p.y);
    if (warp && !tileAt(this.map, p.x, p.y).solid) return this.warp(warp.to, warp.tx, warp.ty, warp.facing ?? p.facing);

    for (const t of this.map.triggers ?? []) {
      const inside = p.x >= t.x && p.x < t.x + (t.w ?? 1) && p.y >= t.y && p.y < t.y + (t.h ?? 1);
      if (!inside) continue;
      if (t.unless && this.flag(t.unless)) continue;
      if (t.when && !this.flag(t.when)) continue;
      await this.runScript(t.script);
      return;
    }

    if (await this.checkTrainers()) return;

    const tile = tileAt(this.map, p.x, p.y);
    if (tile.encounter) {
      this.g.world.rustle(p.x, p.y);
      audio.sfx('grass');
      if (s.party.some((c) => c.hp > 0) && this.rng.chance(this.map.encounterRate ?? 10)) {
        const enc = this.rollEncounter();
        if (enc) await this.wildBattle(enc.species, enc.level);
      }
    }
  }

  private rollEncounter(): { species: string; level: number } | null {
    const night = timeOfDay() === 'night';
    const table = (this.map.encounters ?? []).filter((e: Encounter) => !e.time || (e.time === 'night') === night);
    if (!table.length) return null;
    const total = table.reduce((a, e) => a + e.weight, 0);
    let r = this.rng.next() * total;
    for (const e of table) {
      r -= e.weight;
      if (r <= 0) {
        const level = this.rng.int(e.min, e.max);
        const lead = this.save.party.find((c) => c.hp > 0);
        if (this.save.repel > 0 && lead && level < lead.level) return null;
        return { species: e.species, level };
      }
    }
    return null;
  }

  private async checkTrainers(): Promise<boolean> {
    const p = this.player;
    for (const n of this.npcs) {
      const t = n.def.trainer;
      if (!t || this.flag(this.trainerFlag(n))) continue;
      const [dx, dy] = DIRS[n.mover.facing];
      for (let i = 1; i <= t.sight; i++) {
        const x = n.mover.x + dx * i;
        const y = n.mover.y + dy * i;
        if (x === p.x && y === p.y) {
          await this.trainerSpotted(n, i - 1);
          return true;
        }
        if (tileAt(this.map, x, y).solid || this.npcAt(x, y)) break;
      }
    }
    return false;
  }

  trainerFlag(n: NpcState): string {
    return `trainer:${this.map.id}:${n.def.id}`;
  }

  private async trainerSpotted(n: NpcState, gap: number): Promise<void> {
    this.busy++;
    try {
      audio.sfx('exclaim');
      n.emote = { kind: '!', t: 0 };
      await this.g.wait(0.7);
      for (let i = 0; i < gap; i++) await n.mover.step(n.mover.facing, WALK);
      this.player.facing = OPPOSITE[n.mover.facing];
      await this.trainerBattle(n);
    } finally {
      this.busy--;
    }
  }

  /** Talks to and battles a trainer NPC; returns true on a win. */
  async trainerBattle(n: NpcState, def: TrainerDef = n.def.trainer!): Promise<boolean> {
    audio.playMusic(def.leader ? 'gym' : 'rival');
    await this.say(def.intro, { speaker: def.name });
    const party = def.party.map(([sp, lv]) => makeCreature(sp, lv, this.rng));
    const won = await this.battle(party, { trainer: def, look: n.def.look });
    if (won) {
      this.setFlag(this.trainerFlag(n));
    }
    return won;
  }

  // -------------------------------------------------------------------------
  // Battles

  async wildBattle(speciesId: string, level: number): Promise<boolean> {
    const foe = makeCreature(speciesId, level, this.rng, this.map.name);
    return this.battle([foe], {});
  }

  /** Runs a battle and handles its aftermath (money, blackout, evolution). */
  async battle(foe: Creature[], o: { trainer?: TrainerDef; look?: string; canLose?: boolean }): Promise<boolean> {
    this.busy++;
    try {
      for (const c of foe) markSeen(this.save, c.species);
      const result = await runBattle(this.g, foe, {
        trainer: o.trainer,
        look: o.look,
        mapName: this.map.name,
        outdoor: this.map.outdoor,
      });
      // The battle screen fades to black on its way out; each path below fades back in.
      if (result.outcome === 'lose') {
        if (o.canLose) {
          for (const c of this.save.party) restore(c);
          audio.playMusic(this.map.music);
          await this.g.fadeIn(0.3);
          return false;
        }
        await this.blackout();
        return false;
      }
      audio.playMusic(this.map.music);
      await evolveAfterBattle(this.g, result.leveled);
      await this.g.fadeIn(0.3);
      if (o.trainer && result.outcome === 'win') {
        await this.say(o.trainer.after, { speaker: o.trainer.name });
      }
      return result.outcome === 'win' || result.outcome === 'caught';
    } finally {
      this.busy--;
    }
  }

  private async blackout(): Promise<void> {
    const s = this.save;
    const lost = Math.floor(s.money / 2);
    s.money -= lost;
    await this.g.fadeIn(0.3);
    await say(this.g, `You panicked and dropped $${lost}...`);
    await this.g.fadeOut(0.6);
    for (const c of s.party) restore(c);
    this.enter(s.respawn.map, s.respawn.x, s.respawn.y, 'up');
    await this.g.fadeIn(0.6);
    await say(this.g, 'Your Pocklets were fully restored. Take better care of them!');
  }

  // -------------------------------------------------------------------------
  // Interaction

  private async interact(): Promise<void> {
    const p = this.player;
    const [dx, dy] = DIRS[p.facing];
    let tx = p.x + dx;
    let ty = p.y + dy;
    this.busy++;
    try {
      const item = (this.map.items ?? []).find((i) => i.x === tx && i.y === ty && !this.flag(i.flag));
      if (item) {
        this.setFlag(item.flag);
        this.g.world.setItemVisible(item.flag, false);
        await this.obtain(item.item, item.count ?? 1, true);
        return;
      }
      let npc = this.npcAt(tx, ty);
      if (!npc && tileAt(this.map, tx, ty).counter) {
        tx += dx;
        ty += dy;
        npc = this.npcAt(tx, ty);
      }
      if (npc) {
        await this.talk(npc);
        return;
      }
      const sign = (this.map.signs ?? []).find((s) => s.x === p.x + dx && s.y === p.y + dy);
      if (sign) {
        await this.say(sign.text);
        return;
      }
      const obj = tileAt(this.map, p.x + dx, p.y + dy).obj;
      if (obj === 'pc' && p.facing === 'up') {
        await this.runScript('pc');
        return;
      }
      if (obj === 'tv') await this.say('It\'s a cooking show. Someone is baking a Pouch-shaped cake.');
      else if (obj === 'shelf' || obj === 'bookcase') await this.say('It\'s crammed full of books about Pocklets.');
      else if (obj === 'stove') await this.say('Something smells delicious!');
    } finally {
      this.busy--;
    }
  }

  private async talk(n: NpcState): Promise<void> {
    if (!n.mover.moving) n.mover.facing = OPPOSITE[this.player.facing];
    const d = n.def;
    if (d.script) return this.runScript(d.script, n);
    if (d.trainer) {
      if (this.flag(this.trainerFlag(n))) await this.say(d.trainer.after, { speaker: d.trainer.name });
      else await this.trainerBattle(n);
      return;
    }
    const lines = Array.isArray(d.text) ? d.text : [d.text ?? '...'];
    for (const l of lines) await this.say(l);
  }

  // -------------------------------------------------------------------------
  // Script API

  say(msg: string, opts?: DialogOptions): Promise<number> {
    return say(this.g, this.fmt(msg), opts);
  }

  yesNo(msg: string): Promise<boolean> {
    return yesNo(this.g, this.fmt(msg));
  }

  ask(msg: string, choices: string[]): Promise<number> {
    return say(this.g, this.fmt(msg), { choices });
  }

  emote(n: NpcState | 'player', kind: '!' | '?' | '♪' | '…' = '!'): Promise<void> {
    if (n === 'player') this.playerEmote = { kind, t: 0 };
    else n.emote = { kind, t: 0 };
    if (kind === '!') audio.sfx('exclaim');
    return this.g.wait(0.75);
  }

  private playerEmote: NpcState['emote'] = null;

  async moveNpc(n: NpcState, path: Facing[], dur = WALK): Promise<void> {
    for (const d of path) await n.mover.step(d, dur);
  }

  async movePlayer(path: Facing[], dur = WALK): Promise<void> {
    for (const d of path) await this.player.step(d, dur);
    this.save.x = this.player.x;
    this.save.y = this.player.y;
  }

  face(n: NpcState, dir: Facing): void {
    n.mover.facing = dir;
  }

  facePlayer(dir: Facing): void {
    this.player.facing = dir;
  }

  /** Direction from a to b along the dominant axis. */
  dirTo(ax: number, ay: number, bx: number, by: number): Facing {
    const dx = bx - ax;
    const dy = by - ay;
    if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
    return dy > 0 ? 'down' : 'up';
  }

  /** Walks an NPC next to the player (straight lines, x first then y). */
  async walkNpcTo(n: NpcState, x: number, y: number): Promise<void> {
    const path: Facing[] = [];
    let cx = n.mover.x;
    let cy = n.mover.y;
    while (cx !== x) {
      path.push(cx < x ? 'right' : 'left');
      cx += cx < x ? 1 : -1;
    }
    while (cy !== y) {
      path.push(cy < y ? 'down' : 'up');
      cy += cy < y ? 1 : -1;
    }
    await this.moveNpc(n, path);
  }

  async obtain(id: string, n = 1, found = false): Promise<void> {
    addItem(this.save, id, n);
    const it = itemData(id);
    const name = n > 1 ? `${it.name} ×${n}` : it.name;
    void audio.jingle('obtain');
    await this.say(found ? `{PLAYER} found ${name}!` : `{PLAYER} obtained ${name}!`);
    const pocket = { items: 'Items', medicine: 'Medicine', pouches: 'Pouches', key: 'Key Items' }[it.pocket];
    await this.say(`{PLAYER} put the ${it.name} in the ${pocket} pocket.`);
  }

  async healParty(): Promise<void> {
    for (const c of this.save.party) restore(c);
  }

  /** Adds a creature to the party (or the box when full). */
  async receive(c: Creature, msg?: string): Promise<void> {
    const s = this.save;
    markSeen(s, c.species);
    if (!s.caught.includes(c.species)) s.caught.push(c.species);
    if (s.party.length < 6) s.party.push(c);
    else s.box.push(c);
    void audio.jingle('caught');
    await this.say(msg ?? `{PLAYER} received ${displayName(c)}!`);
  }

  speciesName(id: string): string {
    return species(id).name;
  }

  // -------------------------------------------------------------------------

  draw(ctx: CanvasRenderingContext2D): void {
    const w = this.g.world;
    for (const n of this.npcs) if (n.emote) this.drawEmote(ctx, w.project(n.mover.actor.x, n.mover.actor.y, 1.9), n.emote);
    if (this.playerEmote) {
      this.playerEmote.t += 1 / 60;
      this.drawEmote(ctx, w.project(this.player.actor.x, this.player.actor.y, 1.9), this.playerEmote);
      if (this.playerEmote.t > 1.2) this.playerEmote = null;
    }
    if (this.banner) this.drawBanner(ctx, this.banner);
    if (this.g.top === this || !this.isBusy) {
      this.wristpad.draw(ctx);
      this.touchpad.draw(ctx);
    }
  }

  private drawEmote(ctx: CanvasRenderingContext2D, p: { x: number; y: number }, e: { kind: string; t: number }): void {
    const pop = Math.min(1, e.t / 0.12);
    const s = 34 * (0.6 + 0.4 * pop);
    const y = p.y - 8 - Math.sin(Math.min(1, e.t / 0.2) * Math.PI) * 6;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 3;
    roundRect(ctx, p.x - s / 2, y - s, s, s, 8);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(p.x - 6, y - 1.5);
    ctx.lineTo(p.x, y + 8);
    ctx.lineTo(p.x + 6, y - 1.5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.fillRect(p.x - 5, y - 4, 10, 4);
    outlined(ctx, e.kind, p.x, y - s * 0.22, { size: s * 0.72, align: 'center', color: e.kind === '!' ? '#e83838' : '#4878d8', stroke: '#ffffff' });
  }

  private drawBanner(ctx: CanvasRenderingContext2D, b: { name: string; t: number }): void {
    const slide = b.t < 0.3 ? b.t / 0.3 : b.t > 2.6 ? Math.max(0, 1 - (b.t - 2.6) / 0.4) : 1;
    const w = Math.max(260, b.name.length * 17 + 80);
    const x = 16;
    const y = -70 + slide * 86;
    panel(ctx, x, y, w, 56, { r: 8, rim: '#6a5038', rimLight: '#c8a878', fill: '#f8f0dc' });
    text(ctx, b.name, x + w / 2, y + 37, { size: 26, align: 'center', bold: true });
  }
}
