/** The party screen: six panels in two columns, as on the DS. */
import { audio } from '../audio/audio';
import { item as itemData } from '../data/items';
import { displayName, maxHp, type Creature } from '../game/creature';
import type { Game } from '../game/game';
import { itemUsable } from '../game/useitem';
import { openBag } from './bag';
import { say } from './dialog';
import { C, button, hpBar, outlined, panel, roundRect, statusBadge, text } from './draw';
import { backdrop, blitCreature, btnState, MenuScene, tappedRect, type Rect } from './list';
import { openSummary } from './summary';

export type PartyMode = 'menu' | 'battle' | 'forced' | 'select';

export interface PartyOptions {
  title?: string;
  /** Index of the creature currently in battle. */
  active?: number;
  /** When picking a target for this item, each panel shows ABLE / NOT ABLE. */
  itemId?: string;
}

/**
 * Resolves with the chosen party index, or -1 when cancelled.
 * 'menu' handles Summary / Switch / Item itself and always resolves -1.
 */
export function openParty(g: Game, mode: PartyMode, opts: PartyOptions = {}): Promise<number> {
  return new PartyScreen(g, mode, opts).open();
}

class PartyScreen extends MenuScene<number> {
  opaque = true;
  private sel = 0;
  private swapFrom: number | null = null;
  private note = '';

  constructor(
    g: Game,
    private mode: PartyMode,
    private opts: PartyOptions,
  ) {
    super(g);
    if (mode === 'forced') {
      const i = this.party.findIndex((c, k) => c.hp > 0 && k !== opts.active);
      this.sel = Math.max(0, i);
    }
  }

  private get party(): Creature[] {
    return this.g.save.party;
  }

  private get canCancel(): boolean {
    return this.mode !== 'forced';
  }

  private prompt(): string {
    if (this.note) return this.note;
    if (this.swapFrom !== null) return 'Move to where?';
    if (this.opts.title) return this.opts.title;
    switch (this.mode) {
      case 'forced': return 'Choose a Pocklet to send out.';
      case 'battle': return 'Choose a Pocklet.';
      case 'select': return this.opts.itemId ? `Use ${itemData(this.opts.itemId).name} on which Pocklet?` : 'Choose a Pocklet.';
      default: return 'Choose a Pocklet.';
    }
  }

  private layout(): { slots: Rect[]; cancel: Rect; msg: Rect } {
    const W = this.g.view.width;
    const H = this.g.view.height;
    const gap = 14;
    const bottomH = 76;
    const areaW = Math.min(W - 2 * gap, 1180);
    const x0 = (W - areaW) / 2;
    const areaH = Math.min(H - bottomH - 3 * gap, 3 * 160 + 2 * gap);
    const y0 = gap + Math.max(0, (H - bottomH - 2 * gap - areaH) / 2);
    const sw = (areaW - gap) / 2;
    const sh = (areaH - 2 * gap) / 3;
    const slots: Rect[] = [];
    for (let i = 0; i < 6; i++) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      // The right column sits a little lower, like the DS party screen.
      slots.push({ x: x0 + col * (sw + gap), y: y0 + row * (sh + gap) + (col ? gap * 0.6 : 0), w: sw, h: sh });
    }
    const cancelW = 170;
    const cancel = { x: x0 + areaW - cancelW, y: H - bottomH - 2, w: cancelW, h: 64 };
    const msg = { x: x0, y: H - bottomH - 4, w: areaW - (this.canCancel ? cancelW + gap : 0), h: 68 };
    return { slots, cancel, msg };
  }

  step(): void {
    const input = this.g.input;
    const n = this.party.length;
    const L = this.layout();
    const CANCEL = 6;
    const prev = this.sel;
    if (input.repeat.right || input.repeat.left) {
      if (this.sel < n) {
        const other = this.sel ^ 1;
        if (other < n) this.sel = other;
      }
    }
    if (input.repeat.down) {
      if (this.sel === CANCEL) this.sel = 0;
      else if (this.sel + 2 < n) this.sel += 2;
      else this.sel = this.canCancel ? CANCEL : this.sel;
    }
    if (input.repeat.up) {
      if (this.sel === CANCEL) this.sel = Math.max(0, n - 1);
      else if (this.sel - 2 >= 0) this.sel -= 2;
      else if (this.canCancel) this.sel = CANCEL;
    }
    if (this.sel !== prev) {
      audio.sfx('cursor');
      this.note = '';
    }

    for (let i = 0; i < n; i++) {
      if (tappedRect(this.g, L.slots[i])) {
        this.sel = i;
        void this.choose(i);
        return;
      }
    }
    if (this.canCancel && tappedRect(this.g, L.cancel)) return this.cancel();
    if (input.pressed.a) {
      if (this.sel === CANCEL) return this.cancel();
      void this.choose(this.sel);
      return;
    }
    if (input.pressed.b) {
      if (this.swapFrom !== null) {
        audio.sfx('back');
        this.swapFrom = null;
        return;
      }
      if (this.canCancel) this.cancel();
    }
  }

  private cancel(): void {
    if (this.swapFrom !== null) {
      this.swapFrom = null;
      audio.sfx('back');
      return;
    }
    audio.sfx('back');
    this.done(-1);
  }

  private async choose(i: number): Promise<void> {
    const c = this.party[i];
    if (!c) return;
    audio.sfx('select');
    this.note = '';
    if (this.swapFrom !== null) {
      const from = this.swapFrom;
      this.swapFrom = null;
      if (from !== i) {
        const p = this.party;
        [p[from], p[i]] = [p[i], p[from]];
      }
      return;
    }
    const name = displayName(c);
    if (this.mode === 'select') {
      if (this.opts.itemId && !itemUsable(this.opts.itemId, c)) {
        audio.sfx('error');
        this.note = "It won't have any effect.";
        return;
      }
      this.done(i);
      return;
    }
    if (this.mode === 'battle' || this.mode === 'forced') {
      const choices = this.mode === 'battle' ? ['Shift', 'Summary', 'Cancel'] : ['Shift', 'Summary'];
      const k = await this.sub(() => say(this.g, `Do what with ${name}?`, { choices, cancel: this.mode === 'battle' ? 2 : -1 }));
      if (k === 1) {
        await this.sub(() => openSummary(this.g, this.party, i));
        return;
      }
      if (k !== 0) return;
      if (c.hp <= 0) {
        audio.sfx('error');
        this.note = `${name} has no energy left to battle!`;
        return;
      }
      if (i === this.opts.active) {
        audio.sfx('error');
        this.note = `${name} is already in battle!`;
        return;
      }
      this.done(i);
      return;
    }
    // Field menu.
    const k = await this.sub(() => say(this.g, `Do what with ${name}?`, { choices: ['Summary', 'Switch', 'Item', 'Cancel'] }));
    if (k === 0) await this.sub(() => openSummary(this.g, this.party, i));
    else if (k === 1) this.swapFrom = i;
    else if (k === 2) await this.sub(() => openBag(this.g, 'menu', { target: i }));
  }

  draw(ctx: CanvasRenderingContext2D): void {
    backdrop(ctx, this.g, this.t, '#3f8f86', '#4a9a90');
    const L = this.layout();
    this.party.forEach((c, i) => this.drawSlot(ctx, c, i, L.slots[i]));
    for (let i = this.party.length; i < 6; i++) {
      const r = L.slots[i];
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      roundRect(ctx, r.x, r.y, r.w, r.h, 18);
      ctx.fill();
    }
    panel(ctx, L.msg.x, L.msg.y, L.msg.w, L.msg.h, { r: 10 });
    text(ctx, this.prompt(), L.msg.x + 24, L.msg.y + 44, { size: 24, maxWidth: L.msg.w - 40 });
    if (this.canCancel) {
      button(ctx, L.cancel.x, L.cancel.y, L.cancel.w, L.cancel.h, this.swapFrom !== null ? 'Back' : 'Cancel', {
        state: btnState(this.g, L.cancel, this.sel === 6),
        color: '#e06050',
        dark: '#a03028',
        size: 24,
      });
    }
  }

  private drawSlot(ctx: CanvasRenderingContext2D, c: Creature, i: number, r: Rect): void {
    const selected = i === this.sel;
    const fainted = c.hp <= 0;
    const active = i === (this.opts.active ?? 0);
    const fill = fainted ? '#f4d0c8' : active ? '#d8f0f8' : '#f4f8f0';
    const rim = selected ? '#ff8a3a' : this.swapFrom === i ? '#58b8f8' : fainted ? '#b05048' : '#2f6a62';
    const rimLight = selected ? '#ffc890' : fainted ? '#e09088' : '#7ac0b4';
    const pressed = this.g.input.touching(r.x, r.y, r.w, r.h);
    ctx.save();
    if (pressed) ctx.translate(0, 2);
    panel(ctx, r.x, r.y, r.w, r.h, { r: 18, fill, rim, rimLight });

    // Sprite on a little round pad.
    const size = Math.min(r.h * 0.95, 120);
    const cx = r.x + 16 + size / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.beginPath();
    ctx.ellipse(cx, r.y + r.h - 22, size * 0.42, size * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
    const bob = selected && !fainted ? Math.abs(Math.sin(this.t * 6)) * 6 : 0;
    ctx.globalAlpha = fainted ? 0.6 : 1;
    blitCreature(this.g, ctx, c.species, cx, r.y + r.h - 16 - bob, size, { shiny: c.shiny });
    ctx.globalAlpha = 1;

    const tx = r.x + 30 + size;
    const right = r.x + r.w - 22;
    const nameSize = Math.min(26, r.h * 0.2);
    text(ctx, displayName(c), tx, r.y + 22 + nameSize, { size: nameSize, bold: true });
    text(ctx, `Lv${c.level}`, right, r.y + 22 + nameSize, { size: nameSize * 0.85, align: 'right' });
    const barW = Math.max(60, right - tx - 34);
    const hpY = r.y + r.h * 0.52;
    hpBar(ctx, tx, hpY, barW, c.hp / maxHp(c), 11);
    text(ctx, `${c.hp}/${maxHp(c)}`, right, hpY + 40, { size: nameSize * 0.85, align: 'right' });
    if (fainted) statusBadge(ctx, 'fnt', tx, hpY + 22, 20);
    else if (c.status) statusBadge(ctx, c.status, tx, hpY + 22, 20);
    if (this.opts.itemId && this.mode === 'select') {
      const ok = itemUsable(this.opts.itemId, c);
      outlined(ctx, ok ? 'ABLE' : 'NOT ABLE', tx + (fainted || c.status ? 60 : 0), hpY + 40, { size: 18, color: ok ? '#78e088' : '#f08878' });
    }
    if (active && (this.mode === 'battle' || this.mode === 'forced')) {
      outlined(ctx, 'IN BATTLE', r.x + 22, r.y + 26, { size: 15, color: C.gold });
    }
    ctx.restore();
  }
}
