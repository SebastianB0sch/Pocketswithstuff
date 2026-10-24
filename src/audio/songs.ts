/**
 * Every tune in the game, all original compositions.
 *
 * Notation (see engine.ts): melodies are `Pitch:steps` tokens on a 16th-note grid
 * (`r` is a rest, `|` marks bars for readability, a missing duration repeats the last
 * one). Chords drive the generated bass, arpeggio and drum parts.
 */
import type { Song } from './engine';

export type TrackId =
  | 'title' | 'town' | 'route' | 'route2' | 'lab' | 'center' | 'mart' | 'gym' | 'rival'
  | 'battleWild' | 'battleTrainer' | 'battleLeader' | 'victoryWild' | 'victoryTrainer' | 'evolution' | 'house';

export type JingleId = 'heal' | 'levelup' | 'caught' | 'obtain' | 'badge' | 'evolved';

export const TRACKS: Record<TrackId, Song> = {
  // Heroic, sweeping D major: the adventure is about to begin.
  title: {
    bpm: 132, bass: 'octave', drums: 'pop', arp: 'up', duty: 0.25, echo: 0.3,
    chords: 'D A Bm G Em A D A | G A F#m Bm Em G A A',
    lead: `A4:2 D5:2 F#5:4 E5:2 D5:2 E5:4 | C#5:6 A4:2 E5:8 | D5:2 F#5:2 B5:4 A5:2 F#5:2 D5:4 | E5:6 D5:2 B4:8 |
           G5:4 F#5:2 E5:2 B4:4 E5:4 | C#5:4 E5:4 A5:6 G5:2 | F#5:2 E5:2 D5:4 A5:4 F#5:4 | E5:12 r:4 |
           B5:4 A5:2 G5:2 D5:8 | C#6:4 B5:2 A5:2 E5:8 | A5:2 F#5:2 C#5:4 F#5:4 A5:4 | B5:6 A5:2 F#5:4 D5:4 |
           G5:2 F#5:2 E5:4 B5:4 G5:4 | D6:4 B5:4 G5:4 B5:4 | C#6:4 B5:2 A5:2 G5:2 F#5:2 E5:4 | A5:8 r:4 A4:2 C#5:2`,
  },
  // Gentle F major hometown theme.
  town: {
    bpm: 92, bass: 'walk', drums: 'soft', arp: 'updown', duty: 0.5, echo: 0.35,
    chords: 'F Dm Bb C F Am Bb:8 C:8 F | Bb C Am Dm Gm C F C7',
    lead: `C5:4 A4:2 C5:2 F5:6 E5:2 | D5:4 F5:4 A5:4 G5:2 F5:2 | D5:6 C5:2 Bb4:4 D5:4 | C5:12 r:4 |
           A5:4 G5:2 F5:2 C5:4 F5:4 | E5:4 C5:2 E5:2 A5:8 | G5:4 F5:4 E5:4 G5:4 | F5:12 r:4 |
           D5:2 F5:2 Bb5:4 C6:4 F5:4 | G5:4 E5:4 C5:8 | E5:2 A5:2 C6:4 A5:4 E5:4 | F5:6 E5:2 D5:8 |
           Bb4:2 D5:2 G5:4 F5:2 E5:2 D5:4 | E5:4 G5:4 C6:4 Bb5:4 | A5:6 G5:2 F5:4 C5:4 | E5:4 G5:4 Bb4:4 r:4`,
  },
  // Upbeat G major route: out into the tall grass.
  route: {
    bpm: 128, bass: 'octave', drums: 'pop', arp: 'up', duty: 0.25,
    chords: 'G D Em C G D C D | Em C G D Em C Am D',
    lead: `D5:2 G5:2 B5:2 A5:2 G5:4 D5:4 | F#5:2 A5:2 D6:4 C6:2 A5:2 F#5:4 | G5:2 B5:2 E6:4 D6:2 B5:2 G5:4 | E5:6 G5:2 E5:4 C5:4 |
           B4:2 D5:2 G5:4 A5:2 B5:2 D6:4 | C6:4 B5:2 A5:2 F#5:4 D5:4 | E5:2 G5:2 C6:2 B5:2 A5:4 G5:4 | A5:8 F#5:4 D5:4 |
           B5:6 A5:2 G5:4 E5:4 | G5:6 E5:2 C5:8 | D5:2 G5:2 B5:4 D6:4 B5:4 | A5:6 B5:2 A5:4 F#5:4 |
           E5:2 G5:2 B5:4 E6:4 D6:4 | C6:4 E6:4 G5:4 E5:4 | C6:2 B5:2 A5:2 G5:2 E5:4 A5:4 | F#5:4 A5:4 D6:4 C6:2 A5:2`,
  },
  // A minor/C major sweep for the longer second route: wistful but driving.
  route2: {
    bpm: 120, bass: 'root8', drums: 'pop', arp: 'updown', duty: 0.25, echo: 0.3,
    chords: 'Am F C G Am F G E | F G C Am F G E E',
    lead: `E5:4 A5:4 C6:2 B5:2 A5:4 | A5:2 G5:2 F5:4 C5:4 F5:4 | G5:4 E5:2 G5:2 C6:4 G5:4 | B5:6 A5:2 G5:4 D5:4 |
           E5:2 A5:2 C6:4 E6:4 C6:4 | D6:4 C6:2 A5:2 F5:8 | G5:2 A5:2 B5:4 D6:4 B5:4 | G#5:8 B5:4 E5:4 |
           A5:4 C6:4 F6:4 E6:2 D6:2 | D6:4 B5:4 G5:8 | E6:4 D6:2 C6:2 G5:4 E5:4 | A5:12 r:4 |
           F5:2 A5:2 C6:4 A5:2 C6:2 F6:4 | E6:4 D6:4 B5:4 G5:4 | G#5:4 B5:4 E6:4 D6:4 | B5:8 G#5:4 E5:4`,
  },
  // Curious, jazzy sevenths for the professor's lab.
  lab: {
    bpm: 108, bass: 'walk', drums: 'soft', arp: 'updown', duty: 0.25,
    chords: 'Cmaj7 Am7 Dm7 G7 Cmaj7 Am7 Dm7 G7 | Fmaj7 Em7 Dm7 G7 Fmaj7 Em7 Dm7:8 G7:8 C',
    lead: `E5:2 G5:2 B5:2 G5:2 E5:4 C5:4 | C5:2 E5:2 G5:2 E5:2 A5:8 | F5:2 A5:2 C6:2 A5:2 F5:4 D5:4 | B4:4 D5:4 F5:4 G5:4 |
           E5:2 G5:2 B5:4 C6:4 B5:2 G5:2 | A5:4 G5:2 E5:2 C5:8 | D5:2 F5:2 A5:4 C6:4 A5:4 | G5:12 r:4 |
           A5:4 C6:4 E6:4 C6:4 | B5:4 G5:4 E5:8 | F5:4 A5:4 D6:4 C6:4 | B5:6 A5:2 G5:4 F5:4 |
           E5:2 F5:2 A5:4 C6:8 | B5:2 G5:2 E5:4 G5:8 | F5:4 A5:4 G5:4 B5:4 | C6:12 r:4`,
  },
  // Calm, cosy D major for the Rest Stop.
  center: {
    bpm: 100, bass: 'half', drums: 'soft', arp: 'up', duty: 0.5, echo: 0.35,
    chords: 'D Bm G A D Bm Em A | G A F#m Bm G A D D',
    lead: `F#5:4 A5:4 D6:6 C#6:2 | B5:4 F#5:4 D5:8 | G5:4 B5:4 D6:4 B5:4 | A5:12 r:4 |
           F#5:2 G5:2 A5:4 F#5:4 D5:4 | D5:2 F#5:2 B5:8 A5:4 | G5:4 F#5:4 E5:4 B4:4 | C#5:8 E5:4 A5:4 |
           B5:6 A5:2 G5:8 | C#6:6 B5:2 A5:8 | A5:4 F#5:4 C#5:4 F#5:4 | D6:8 B5:8 |
           G5:2 A5:2 B5:4 D6:4 B5:4 | A5:4 E5:4 C#5:4 E5:4 | D5:4 F#5:4 A5:4 D6:4 | D6:12 r:4`,
  },
  // Bouncy shopping tune in F, with a borrowed minor chord for colour.
  mart: {
    bpm: 126, bass: 'walk', drums: 'pop', arp: 'stab', duty: 0.25, echo: 0.2,
    chords: 'F Gm C F Bb C F C7 | Dm Gm C F Bb Bbm F C',
    lead: `C5:2 F5:2 A5:2 F5:2 C6:4 A5:4 | Bb5:2 G5:2 D5:2 G5:2 Bb5:8 | G5:2 E5:2 C5:2 E5:2 G5:4 C6:4 | A5:8 r:4 C5:4 |
           D5:2 F5:2 Bb5:4 A5:2 G5:2 F5:4 | E5:2 G5:2 C6:4 Bb5:2 A5:2 G5:4 | A5:4 C6:4 F5:4 A5:4 | G5:8 E5:4 r:4 |
           F5:4 A5:4 D6:8 | D6:2 C6:2 Bb5:4 G5:8 | E5:4 G5:4 C6:4 E6:4 | F6:8 C6:8 |
           D6:4 C6:2 Bb5:2 F5:8 | Db6:4 C6:2 Bb5:2 F5:8 | C6:4 A5:4 F5:4 A5:4 | G5:4 E5:4 C5:4 r:4`,
  },
  // Tense C harmonic minor march for the gym.
  gym: {
    bpm: 140, bass: 'octave', drums: 'march', arp: 'up', duty: 0.125, echo: 0.2,
    chords: 'Cm Cm Ab Bb Cm Cm Ab G | Fm G Cm Ab Fm G Ab G',
    lead: `C5:2 C5:2 Eb5:2 G5:4 Eb5:2 C5:4 | G5:2 Ab5:2 G5:2 F5:2 Eb5:4 D5:4 | Eb5:2 Ab5:2 C6:4 Bb5:2 Ab5:2 G5:4 | F5:2 Bb5:2 D6:4 C6:2 Bb5:2 F5:4 |
           C6:4 Bb5:2 G5:2 Eb5:4 G5:4 | C6:2 D6:2 Eb6:4 D6:2 C6:2 G5:4 | Ab5:4 C6:4 Eb6:4 C6:4 | B5:8 D6:4 G5:4 |
           F5:4 Ab5:4 C6:6 Bb5:2 | B5:4 D6:4 G5:8 | Eb6:4 D6:2 C6:2 G5:4 Eb5:4 | Ab5:6 G5:2 F5:4 Eb5:4 |
           C6:2 Ab5:2 F5:4 Ab5:2 C6:2 F6:4 | D6:4 B5:4 G5:4 B5:4 | C6:4 Eb6:4 Ab5:4 C6:4 | B5:4 D6:4 G6:8`,
  },
  // Cheeky, swaggering A major for the rival.
  rival: {
    bpm: 144, bass: 'octave', drums: 'pop', arp: 'up', duty: 0.25, echo: 0.15,
    chords: 'A A D E A A F#m E | D E C#m F#m D E A E',
    lead: `E5:2 A5:2 r:2 A5:2 C#6:2 A5:2 E5:4 | A5:2 B5:2 C#6:2 E6:2 C#6:4 A5:4 | F#5:2 A5:2 r:2 A5:2 D6:2 A5:2 F#5:4 | G#5:4 B5:4 E6:4 D6:2 B5:2 |
           C#6:4 A5:2 E5:2 A5:4 C#6:4 | E6:2 D6:2 C#6:2 B5:2 A5:4 E5:4 | F#5:2 A5:2 C#6:4 B5:2 A5:2 F#5:4 | E5:4 G#5:4 B5:8 |
           A5:4 F#5:4 D6:6 C#6:2 | B5:4 G#5:4 E5:8 | C#6:2 B5:2 G#5:4 E5:4 G#5:4 | A5:8 F#5:8 |
           D6:2 C#6:2 B5:2 A5:2 F#5:4 A5:4 | B5:2 C#6:2 D6:2 E6:2 B5:8 | C#6:4 E6:4 A6:4 E6:4 | G#5:4 B5:4 E6:4 r:4`,
  },
  // Wild encounter: driving E minor with a chromatic leading tone.
  battleWild: {
    bpm: 168, bass: 'pulse16', drums: 'battle', arp: 'up', duty: 0.25, echo: 0.15,
    chords: 'Em Em C D Em Em C B | Am B Em C Am B C B',
    lead: `E5:2 B4:2 E5:2 G5:2 B5:4 A5:2 G5:2 | F#5:2 G5:2 A5:2 B5:2 E6:4 D6:4 | C6:2 B5:2 G5:2 E5:2 C6:4 E6:4 | D6:2 C6:2 A5:2 F#5:2 D6:4 F#6:4 |
           E6:4 B5:2 G5:2 E5:4 G5:4 | B5:2 A5:2 G5:2 F#5:2 G5:2 A5:2 B5:4 | C6:4 G5:2 E5:2 G5:2 C6:2 E6:4 | D#6:8 B5:4 F#5:4 |
           A5:4 C6:4 E6:4 A6:4 | F#6:4 D#6:4 B5:8 | G6:2 F#6:2 E6:2 D6:2 B5:4 G5:4 | E6:6 D6:2 C6:4 G5:4 |
           C6:2 B5:2 A5:2 E5:2 A5:4 C6:4 | B5:2 A5:2 F#5:2 D#5:2 B5:4 D#6:4 | E6:4 C6:4 G5:4 C6:4 | D#6:4 F#6:4 B6:8`,
  },
  // Trainer battle: D minor, sharper lead and 16th-note runs.
  battleTrainer: {
    bpm: 164, bass: 'pulse16', drums: 'battle', arp: 'updown', duty: 0.125, echo: 0.15,
    chords: 'Dm Bb C A Dm Bb Gm A | Bb C Dm Dm Gm A Bb A',
    lead: `D5:2 F5:2 A5:2 D6:2 C6:2 A5:2 F5:2 A5:2 | Bb5:4 F5:2 D5:2 Bb5:2 C6:2 D6:4 | E6:4 C6:2 G5:2 E5:2 G5:2 C6:4 | C#6:6 E6:2 A5:8 |
           D6:2 E6:2 F6:4 E6:2 D6:2 A5:4 | F5:2 G5:2 A5:2 Bb5:2 D6:4 Bb5:4 | G5:2 A5:2 Bb5:4 D6:4 G6:4 | E6:4 C#6:4 A5:4 E5:4 |
           F6:6 D6:2 Bb5:8 | G6:6 E6:2 C6:8 | A6:4 F6:4 D6:4 A5:4 | D6:2 C6:2 A5:2 F5:2 D5:8 |
           Bb5:4 D6:4 G6:4 F6:2 D6:2 | E6:4 C#6:4 E6:4 G6:4 | F6:4 D6:2 Bb5:2 F6:4 Bb6:4 | A6:8 E6:4 C#6:4`,
  },
  // Gym leader: epic G minor with a high, soaring B section.
  battleLeader: {
    bpm: 172, bass: 'pulse16', drums: 'battle', arp: 'up', duty: 0.25, echo: 0.2,
    chords: 'Gm Eb F D Gm Eb Cm D | Eb F Bb Gm Cm D Eb D',
    lead: `G5:4 D5:2 G5:2 Bb5:4 A5:2 G5:2 | Bb5:2 C6:2 D6:4 Eb6:4 D6:2 C6:2 | C6:4 A5:2 F5:2 A5:2 C6:2 F6:4 | F#6:8 D6:4 A5:4 |
           G6:4 F6:2 D6:2 Bb5:4 D6:4 | Eb6:2 D6:2 C6:2 Bb5:2 G5:4 Bb5:4 | C6:2 D6:2 Eb6:4 G6:4 Eb6:4 | D6:4 F#6:4 A6:4 F#6:4 |
           G6:6 F6:2 Eb6:8 | A6:6 G6:2 F6:8 | D6:2 F6:2 Bb6:4 A6:2 F6:2 D6:4 | G6:12 r:4 |
           Eb6:4 G6:4 C6:4 Eb6:4 | F#6:4 A6:4 D6:4 F#6:4 | G6:4 Bb6:4 Eb6:2 F6:2 G6:4 | F#6:8 A6:8`,
    counter: `D5:8 Bb4:8 | G4:8 Bb4:8 | A4:8 C5:8 | A4:16 | D5:8 Bb4:8 | G4:8 Eb5:8 | Eb5:8 G4:8 | F#4:16 |
              Bb4:16 | C5:16 | D5:16 | Bb4:16 | G4:16 | A4:16 | Bb4:16 | A4:16`,
  },
  // Wild victory: bright C major fanfare loop.
  victoryWild: {
    bpm: 140, bass: 'walk', drums: 'pop', arp: 'stab', duty: 0.25,
    chords: 'C F G C Am F G C',
    lead: `G5:2 G5:2 G5:2 C6:10 | A5:4 C6:4 F6:8 | D6:4 B5:4 G5:4 B5:4 | C6:12 r:4 |
           E6:4 C6:4 A5:8 | F6:4 E6:2 D6:2 C6:4 A5:4 | B5:4 D6:4 G6:4 F6:4 | E6:8 C6:8`,
  },
  // Trainer victory: a grander Bb major fanfare.
  victoryTrainer: {
    bpm: 148, bass: 'walk', drums: 'pop', arp: 'stab', duty: 0.25,
    chords: 'Bb Gm Eb F Bb Gm Eb:8 F:8 Bb',
    lead: `F5:2 Bb5:2 D6:2 F6:10 | G6:4 F6:4 D6:8 | Eb6:4 G6:4 Bb6:8 | A6:8 F6:4 C6:4 |
           D6:2 F6:2 Bb6:4 A6:2 G6:2 F6:4 | G6:4 D6:4 Bb5:8 | G6:4 Eb6:4 A6:4 F6:4 | Bb6:12 r:4`,
  },
  // Evolution: mysterious, rising A minor.
  evolution: {
    bpm: 120, bass: 'half', drums: 'tense', arp: 'up', duty: 0.5, echo: 0.4,
    chords: 'Am F Am E Am F Dm E | Am F Dm E Am F Dm E',
    lead: `A5:8 C6:8 | A5:8 F5:8 | E5:4 A5:4 C6:4 E6:4 | D6:8 B5:4 G#5:4 |
           C6:8 E6:8 | F6:8 C6:8 | D6:4 F6:4 A6:8 | G#6:8 E6:8 |
           E6:4 D6:4 C6:4 B5:4 | A5:8 C6:8 | F6:4 E6:4 D6:4 A5:4 | B5:8 E6:8 |
           A6:8 E6:8 | F6:8 A6:8 | D6:4 F6:4 A6:4 F6:4 | G#6:16`,
  },
  // Homey G major for houses.
  house: {
    bpm: 96, bass: 'half', drums: 'none', arp: 'updown', duty: 0.5, echo: 0.3,
    chords: 'G Em C D G Em Am:8 D:8 G | C D Bm Em C D G G',
    lead: `B4:4 D5:4 G5:6 F#5:2 | E5:4 G5:4 B5:8 | C6:4 B5:2 A5:2 G5:4 E5:4 | F#5:12 r:4 |
           G5:2 A5:2 B5:4 D6:4 B5:4 | A5:4 G5:4 E5:8 | C5:4 E5:4 D5:4 F#5:4 | G5:12 r:4 |
           E5:2 G5:2 C6:4 B5:4 G5:4 | F#5:2 A5:2 D6:4 C6:4 A5:4 | B5:6 A5:2 F#5:8 | G5:6 F#5:2 E5:8 |
           C6:4 E6:4 D6:4 C6:4 | B5:4 A5:4 F#5:4 D5:4 | G5:4 B5:4 D6:4 B5:4 | G5:12 r:4`,
  },
};

export const JINGLES: Record<JingleId, Song> = {
  heal: {
    bpm: 132, bass: 'half', drums: 'none', arp: 'pad', duty: 0.5, loop: false, echo: 0.3,
    chords: 'C G:8 C:8',
    lead: 'E5:2 G5:2 C6:4 B5:2 G5:2 E5:4 | D5:2 G5:2 B5:4 C6:8',
  },
  levelup: {
    bpm: 160, bass: 'none', drums: 'none', arp: 'pad', duty: 0.25, loop: false, echo: 0.3,
    chords: 'C',
    lead: 'C5:1 E5:1 G5:1 C6:1 r:1 G5:1 C6:6 r:4',
  },
  caught: {
    bpm: 140, bass: 'walk', drums: 'none', arp: 'pad', duty: 0.25, loop: false, echo: 0.3,
    chords: 'G D C:8 D:8 G',
    lead: 'D5:2 G5:2 B5:4 D6:8 | C6:2 B5:2 A5:4 F#5:8 | E5:4 G5:4 F#5:4 A5:4 | G5:12 r:4',
  },
  obtain: {
    bpm: 150, bass: 'walk', drums: 'none', arp: 'pad', duty: 0.25, loop: false, echo: 0.3,
    chords: 'F:8 Bb:8 C:8 F:8',
    lead: 'C5:2 F5:2 A5:4 Bb5:2 A5:2 G5:4 | E5:2 G5:2 C6:4 F6:8',
  },
  badge: {
    bpm: 132, bass: 'walk', drums: 'soft', arp: 'pad', duty: 0.25, loop: false, echo: 0.3,
    chords: 'Bb Eb:8 F:8 Gm:8 Eb:8 F:8 Bb:8',
    lead: 'F5:2 Bb5:2 D6:2 F6:10 | Eb6:4 G6:4 F6:4 A6:4 | G6:4 F6:2 D6:2 Eb6:4 Bb5:4 | C6:4 F6:4 Bb6:8',
  },
  evolved: {
    bpm: 120, bass: 'walk', drums: 'none', arp: 'pad', duty: 0.25, loop: false, echo: 0.35,
    chords: 'A D:8 E:8 A',
    lead: 'E5:2 A5:2 C#6:4 E6:8 | F#6:4 E6:4 G#6:4 B6:4 | A6:12 r:4',
  },
};
