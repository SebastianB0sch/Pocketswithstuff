# Pockets with Stuff — Iridium Version

A monster-collecting RPG in the style of the DS era: a tilted 3D tile world with
billboard characters, turn-based battles with Gen-4 rules, a regional encyclopedia,
gyms and a rival. Everything is original — the 35 creatures ("Pocklets"), the
region of Norvale, the music and the story.

Nothing is drawn into a fixed low-resolution buffer. The 3D world renders at the
display's real pixel size and every 2D element (creatures, people, menus, text) is a
vector path, so the game is sharp from a phone up to **8K** (7680×4320). The
resolution can also be pinned to 720p … 8K in Options.

## Play

```bash
npm install
npm run dev      # open the printed URL
npm run build    # static build in dist/
npm test         # battle rules, data and map validation
```

| Action | Keyboard | Gamepad | Touch |
| --- | --- | --- | --- |
| Move | Arrows / WASD | D-pad / stick | On-screen d-pad |
| A (talk, confirm) | Z / Enter / Space | A | A button, or tap |
| B (back, hold to run) | X / Esc / Backspace | B | B button |
| Run | Hold Shift or B | Hold B | RUN toggle |
| Menu | Tab / M | Start | MENU on the Wristpad |
| Wristpad app | V | Y | Tap the Wristpad |

Menus and the battle screen can be driven entirely by mouse or touch as well.

## What's in it

- **Overworld** (`src/world`): ASCII-authored maps rendered as low-poly, flat-shaded
  3D (instanced trees, swaying tall grass, water, ledges, buildings with doors and
  signs, furnished interiors) through a steep, narrow perspective camera. People are
  camera-facing billboards with a shear that keeps them upright anywhere on screen.
  Real-time-of-day lighting, lamp glow at night, map connections, trainers with line
  of sight, hidden items and night-only encounters.
- **Battles** (`src/battle`): a pure, seeded engine with the Gen-4 damage formula and
  physical/special split, 17 types, stat stages, status conditions, confusion, flinch,
  multi-hit, recoil and drain moves, catching with shake checks, escape odds, shared
  experience, level-ups and move learning, plus trainer AI. The battle screen plays the
  engine's events back with animations and a DS-style command panel.
- **Content**: 35 species with evolutions, ~95 moves, 19 items, 6 outdoor areas and 13
  interiors, 13 trainers, a Gym Leader, three rival battles and a short story.
- **UI** (`src/ui`): party, summary, bag, Pocklopedia, trainer card, PC storage, shops,
  options, naming keyboard, starter briefcase, evolution, and the Wristpad — a small
  wrist-gadget widget with a clock, step counter and party view.
- **Art** (`src/gfx`): every creature and person is painted procedurally with Canvas 2D
  paths: outlined, cel-shaded parts that scale to any size.
- **Audio** (`src/audio`): a Web Audio step sequencer with 16 original looping tracks,
  6 jingles and 35 synthesized sound effects. No sample files.

`dev/art.html`, `dev/audio.html` and `dev/menus.html` (served by `npm run dev`) are
contact sheets and test benches for the art, audio and menus.

Saves are kept in the browser's local storage.
