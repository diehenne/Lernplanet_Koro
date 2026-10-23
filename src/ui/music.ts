/**
 * Hintergrundmusik, die zur Umgebung passt: je Welt ein eigenes Stück und ein Haus-Stück.
 * Komplett synthetisch erzeugt (Web Audio), eigene Kompositionen – keine Samples, keine fremden Melodien.
 *  - add: Dorf-Wald (Akustikgitarre + Flöte, G-Dur)
 *  - sub: Berge (Spieluhr-Glocken + weiche Flächen, a-Moll, langsam)
 *  - mul: Wüste (Oud-Zupfen, Rohrflöte, Trommel, Bordun, D phrygisch-dominant)
 *  - div: Sumpf (tiefe Marimba, Ocarina, blubbernde Töne, d-Moll)
 *  - house: gemütliches Haus (Spieluhr + Zupfbass, C-Dur)
 *  - english / german / general / sudoku / puzzle: Lernbereiche im Norden (je eigener Charakter)
 */

export type Theme = 'add' | 'sub' | 'mul' | 'div' | 'house' | 'english' | 'german' | 'general' | 'sudoku' | 'puzzle';

type NoteList = [number, number, number][];
interface ThemeDef {
  bpm: number;
  bars: number;
  play: (t: number, i: number) => void;
}

const midi = (n: number): number => 440 * 2 ** ((n - 69) / 12);

let ctx: AudioContext | null = null;
let master: GainNode;
let reverbIn: GainNode;
let noiseBuf: AudioBuffer;
let timer: number | undefined;
let nextBarTime = 0;
let bar = 0;
let beat = 60 / 84;
let current: Theme | null = null;
let wanted: Theme = 'add';
let enabled = localStorage.getItem('zl-music') !== 'off';
let ducked = false;
let duckTimer: number | undefined;

export function musicOn(): boolean {
  return enabled;
}

export function currentTheme(): Theme {
  return wanted;
}

function level(): number {
  return !enabled ? 0 : ducked ? 0.16 : 0.5;
}

function setup(): void {
  ctx = new AudioContext();
  master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);

  const len = Math.floor(ctx.sampleRate * 2.2);
  const impulse = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = impulse.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
  }
  const conv = ctx.createConvolver();
  conv.buffer = impulse;
  const wet = ctx.createGain();
  wet.gain.value = 0.35;
  reverbIn = ctx.createGain();
  reverbIn.connect(conv);
  conv.connect(wet);
  wet.connect(master);

  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const nd = noiseBuf.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
}

function send(node: AudioNode, wet = 1): void {
  node.connect(master);
  if (wet > 0) {
    const g = ctx!.createGain();
    g.gain.value = wet;
    node.connect(g);
    g.connect(reverbIn);
  }
}

interface PluckOpts {
  type?: OscillatorType;
  open?: number;
  close?: number;
  decay?: number;
}

function pluck(freq: number, t: number, vol: number, o: PluckOpts = {}): void {
  const c = ctx!;
  const out = c.createGain();
  const lp = c.createBiquadFilter();
  const decay = o.decay ?? 1.3;
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(o.open ?? 3200, t);
  lp.frequency.exponentialRampToValueAtTime(o.close ?? 500, t + 0.5);
  out.gain.setValueAtTime(0.0001, t);
  out.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  out.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  for (const [type, detune] of [[o.type ?? 'triangle', -4], ['sine', 4]] as const) {
    const osc = c.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;
    osc.connect(lp);
    osc.start(t);
    osc.stop(t + decay + 0.1);
  }
  lp.connect(out);
  send(out);
}

function flute(freq: number, t: number, dur: number, vol: number, o: { type?: OscillatorType; vib?: number; cut?: number } = {}): void {
  const c = ctx!;
  const osc = c.createOscillator();
  const vib = c.createOscillator();
  const vibGain = c.createGain();
  const g = c.createGain();
  osc.type = o.type ?? 'sine';
  osc.frequency.value = freq;
  vib.frequency.value = 5;
  vibGain.gain.value = freq * (o.vib ?? 0.004);
  vib.connect(vibGain);
  vibGain.connect(osc.frequency);
  const len = dur * beat;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.07);
  g.gain.setValueAtTime(vol, t + Math.max(len - 0.12, 0.08));
  g.gain.linearRampToValueAtTime(0.0001, t + len + 0.25);
  let node: AudioNode = osc;
  if (o.cut) {
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = o.cut;
    osc.connect(lp);
    node = lp;
  }
  node.connect(g);
  send(g);
  osc.start(t);
  vib.start(t);
  osc.stop(t + len + 0.3);
  vib.stop(t + len + 0.3);
}

/** Spieluhr-Glocke: Grundton plus unharmonischer Oberton, lange Ausklingzeit. */
function bell(freq: number, t: number, vol: number): void {
  const c = ctx!;
  for (const [mult, v, dec] of [[1, 1, 2.4], [2.76, 0.35, 1.0], [5.4, 0.12, 0.5]] as const) {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq * mult;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol * v, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
    osc.connect(g);
    send(g, 1.2);
    osc.start(t);
    osc.stop(t + dec + 0.1);
  }
}

function pad(freqs: number[], t: number, dur: number, vol: number): void {
  const c = ctx!;
  const lp = c.createBiquadFilter();
  const g = c.createGain();
  lp.type = 'lowpass';
  lp.frequency.value = 900;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + dur * 0.35);
  g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.6);
  for (const f of freqs) {
    for (const d of [-6, 6]) {
      const osc = c.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = f;
      osc.detune.value = d;
      osc.connect(lp);
      osc.start(t);
      osc.stop(t + dur + 0.7);
    }
  }
  lp.connect(g);
  send(g, 0.8);
}

function marimba(freq: number, t: number, vol: number): void {
  const c = ctx!;
  for (const [mult, v, dec] of [[1, 1, 0.5], [4, 0.25, 0.12]] as const) {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq * mult;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol * v, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
    osc.connect(g);
    send(g, 0.6);
    osc.start(t);
    osc.stop(t + dec + 0.05);
  }
}

function drone(freq: number, t: number, dur: number, vol: number): void {
  const c = ctx!;
  const lp = c.createBiquadFilter();
  const g = c.createGain();
  lp.type = 'lowpass';
  lp.frequency.value = 500;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.4);
  g.gain.setValueAtTime(vol, t + dur - 0.2);
  g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.5);
  for (const [type, f] of [['sawtooth', freq], ['sine', freq / 2]] as const) {
    const osc = c.createOscillator();
    osc.type = type;
    osc.frequency.value = f;
    osc.connect(lp);
    osc.start(t);
    osc.stop(t + dur + 0.6);
  }
  lp.connect(g);
  send(g, 0.3);
}

function drum(t: number, kind: 'dum' | 'tak', vol: number): void {
  const c = ctx!;
  const g = c.createGain();
  if (kind === 'dum') {
    const osc = c.createOscillator();
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(65, t + 0.15);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    osc.connect(g);
    osc.start(t);
    osc.stop(t + 0.35);
  } else {
    const src = c.createBufferSource();
    src.buffer = noiseBuf;
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 3200;
    bp.Q.value = 1.2;
    g.gain.setValueAtTime(vol * 0.5, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    src.connect(bp);
    bp.connect(g);
    src.start(t);
    src.stop(t + 0.12);
  }
  send(g, 0.25);
}

/** Blubberndes Geräusch: kurzer, aufsteigender Ton. */
function blip(freq: number, t: number, vol: number): void {
  const c = ctx!;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, t);
  osc.frequency.exponentialRampToValueAtTime(freq * 1.9, t + 0.09);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
  osc.connect(g);
  send(g, 0.8);
  osc.start(t);
  osc.stop(t + 0.2);
}

const melody = (t: number, notes: NoteList, play: (f: number, t: number, len: number) => void) => {
  for (const [b, n, len] of notes) play(midi(n), t + b * beat, len);
};

// ---------------------------------------------------------------- add: Dorf-Wald

const ADD_CHORDS: number[][] = [
  [43, 55, 59, 62], [40, 52, 55, 59], [36, 48, 52, 55], [38, 50, 54, 57],
  [43, 55, 59, 62], [35, 47, 50, 54], [45, 48, 52, 57], [38, 50, 54, 57],
];
const ADD_MELODY: NoteList[] = [
  [[0, 74, 1], [1, 79, 1.5], [2.5, 76, 0.5], [3, 74, 1]],
  [[0, 71, 1], [1, 76, 1], [2, 74, 1], [3, 71, 1]],
  [[0, 72, 1], [1, 76, 1.5], [2.5, 74, 0.5], [3, 72, 1]],
  [[0, 74, 2], [2, 69, 1], [3, 74, 1]],
  [[0, 74, 1], [1, 79, 1.5], [2.5, 81, 0.5], [3, 79, 1]],
  [[0, 78, 1], [1, 74, 1], [2, 71, 1], [3, 74, 1]],
  [[0, 72, 1], [1, 76, 1], [2, 74, 1.5], [3.5, 72, 0.5]],
  [[0, 71, 1.5], [1.5, 69, 0.5], [2, 74, 2]],
];
const ADD_PICK = [1, 3, 2, 3, 1, 3, 2, 3];

// ---------------------------------------------------------------- sub: Berge

const SUB_CHORDS: number[][] = [
  [45, 57, 60, 64], [41, 57, 60, 65], [36, 55, 60, 64], [43, 55, 59, 62],
  [45, 57, 60, 64], [41, 57, 60, 65], [43, 55, 59, 62], [45, 57, 60, 64],
];
const SUB_MELODY: NoteList[] = [
  [[0, 81, 2], [2, 79, 1], [3, 76, 1]],
  [[0, 77, 2], [2, 76, 1], [3, 72, 1]],
  [[0, 76, 2], [2, 79, 1], [3, 84, 1]],
  [[0, 83, 1.5], [1.5, 79, 0.5], [2, 74, 2]],
  [[0, 81, 2], [2, 84, 1], [3, 81, 1]],
  [[0, 77, 1], [1, 81, 1], [2, 79, 2]],
  [[0, 74, 1], [1, 79, 1], [2, 83, 1], [3, 79, 1]],
  [[0, 81, 4]],
];

// ---------------------------------------------------------------- mul: Wüste

const MUL_OSTI: number[][] = [
  [50, 57, 62, 57, 50, 57, 63, 62],
  [50, 57, 62, 57, 50, 57, 63, 62],
  [50, 57, 62, 57, 50, 57, 63, 62],
  [51, 58, 63, 58, 51, 58, 62, 63],
  [50, 57, 62, 57, 50, 57, 63, 62],
  [50, 57, 62, 57, 50, 57, 63, 62],
  [55, 62, 67, 62, 55, 62, 63, 62],
  [50, 57, 62, 57, 50, 57, 63, 62],
];
const MUL_MELODY: NoteList[] = [
  [[0, 74, 1], [1, 75, 1], [2, 78, 1.5], [3.5, 75, 0.5]],
  [[0, 74, 2], [2, 72, 1], [3, 74, 1]],
  [[0, 75, 1], [1, 78, 1], [2, 79, 1], [3, 78, 1]],
  [[0, 75, 1], [1, 74, 1], [2, 72, 2]],
  [[0, 74, 1], [1, 78, 1], [2, 81, 1.5], [3.5, 79, 0.5]],
  [[0, 78, 1], [1, 79, 1], [2, 81, 1], [3, 82, 1]],
  [[0, 81, 1], [1, 79, 0.5], [1.5, 78, 0.5], [2, 75, 1], [3, 74, 1]],
  [[0, 74, 3]],
];

// ---------------------------------------------------------------- div: Sumpf

const DIV_CHORDS: number[][] = [
  [38, 50, 53, 57], [34, 53, 58, 62], [38, 50, 53, 57], [43, 55, 58, 62],
  [38, 50, 53, 57], [34, 53, 58, 62], [45, 57, 61, 64], [38, 50, 53, 57],
];
const DIV_MELODY: NoteList[] = [
  [[0, 69, 2], [2, 65, 1], [3, 67, 1]],
  [[0, 70, 3], [3, 69, 1]],
  [[0, 69, 1], [1, 72, 1], [2, 69, 2]],
  [[0, 67, 2], [2, 70, 1], [3, 67, 1]],
  [[0, 65, 2], [2, 69, 1], [3, 72, 1]],
  [[0, 70, 2], [2, 65, 2]],
  [[0, 69, 1], [1, 72, 1], [2, 73, 2]],
  [[0, 69, 4]],
];

// ---------------------------------------------------------------- house: gemütlich

const HOUSE_CHORDS: number[][] = [
  [36, 48, 52, 55], [33, 45, 48, 52], [41, 48, 53, 57], [43, 50, 55, 59],
  [36, 48, 52, 55], [33, 45, 48, 52], [41, 48, 53, 57], [43, 50, 55, 59],
];
const HOUSE_MELODY: NoteList[] = [
  [[0, 76, 2], [2, 79, 2]],
  [[0, 81, 2], [2, 79, 1], [3, 76, 1]],
  [[0, 77, 2], [2, 81, 2]],
  [[0, 79, 1.5], [1.5, 77, 0.5], [2, 74, 2]],
  [[0, 76, 2], [2, 72, 2]],
  [[0, 81, 2], [2, 79, 1], [3, 76, 1]],
  [[0, 77, 2], [2, 84, 2]],
  [[0, 79, 1], [1, 74, 1], [2, 72, 2]],
];

const EN_CHORDS: number[][] = [
  [36, 48, 52, 55], [43, 50, 55, 59], [33, 45, 48, 52], [41, 48, 53, 57],
  [36, 48, 52, 55], [43, 50, 55, 59], [41, 48, 53, 57], [43, 50, 55, 59],
];
const EN_MELODY: NoteList[] = [
  [[0, 79, 1], [1, 76, 1], [2, 79, 1], [3, 84, 1]],
  [[0, 83, 1], [1, 79, 1], [2, 74, 2]],
  [[0, 81, 1], [1, 76, 1], [2, 72, 1], [3, 76, 1]],
  [[0, 77, 1], [1, 81, 1], [2, 84, 2]],
  [[0, 84, 1], [1, 79, 1], [2, 76, 1], [3, 79, 1]],
  [[0, 83, 1], [1, 86, 1], [2, 79, 2]],
  [[0, 84, 1], [1, 81, 1], [2, 77, 1], [3, 81, 1]],
  [[0, 79, 1], [1, 74, 1], [2, 72, 2]],
];

// ---------------------------------------------------------------- Lernbereiche

const DE_CHORDS: number[][] = [
  [38, 50, 54, 57], [43, 55, 59, 62], [38, 50, 54, 57], [45, 57, 61, 64],
  [35, 47, 50, 54], [43, 55, 59, 62], [45, 57, 61, 64], [38, 50, 54, 57],
];
const DE_MELODY: NoteList[] = [
  [[0, 74, 1], [1, 78, 1], [2, 81, 1], [3, 78, 1]],
  [[0, 79, 1], [1, 83, 1], [2, 79, 2]],
  [[0, 78, 1], [1, 74, 1], [2, 78, 1], [3, 81, 1]],
  [[0, 80, 1], [1, 81, 1], [2, 85, 2]],
  [[0, 83, 1], [1, 81, 1], [2, 78, 2]],
  [[0, 79, 1], [1, 78, 1], [2, 74, 1], [3, 79, 1]],
  [[0, 81, 1], [1, 80, 1], [2, 81, 1], [3, 85, 1]],
  [[0, 86, 2], [2, 81, 1], [3, 78, 1]],
];

const GEN_CHORDS: number[][] = [
  [36, 48, 52, 55], [41, 53, 57, 60], [43, 55, 59, 62], [45, 57, 60, 64],
  [41, 53, 57, 60], [36, 48, 52, 55], [43, 55, 59, 62], [36, 48, 52, 55],
];
const GEN_MELODY: NoteList[] = [
  [[0, 76, 2], [2, 79, 1], [3, 84, 1]],
  [[0, 81, 2], [2, 77, 2]],
  [[0, 79, 1], [1, 83, 1], [2, 86, 2]],
  [[0, 84, 2], [2, 81, 1], [3, 76, 1]],
  [[0, 77, 1], [1, 81, 1], [2, 84, 2]],
  [[0, 79, 2], [2, 76, 1], [3, 72, 1]],
  [[0, 74, 1], [1, 79, 1], [2, 83, 2]],
  [[0, 84, 4]],
];

const SUD_CHORDS: number[][] = [
  [33, 45, 52, 55], [41, 53, 57, 60], [36, 48, 52, 55], [43, 55, 59, 62],
  [33, 45, 52, 55], [41, 53, 57, 60], [43, 55, 59, 62], [36, 48, 52, 59],
];
const SUD_MELODY: NoteList[] = [
  [[0, 81, 2], [3, 79, 1]],
  [[0, 77, 2], [2, 81, 2]],
  [[0, 76, 3]],
  [[1, 83, 1], [2, 79, 2]],
  [[0, 81, 2], [2, 84, 1], [3, 83, 1]],
  [[0, 77, 3]],
  [[0, 79, 2], [2, 83, 2]],
  [[0, 84, 4]],
];

const PUZ_CHORDS: number[][] = [
  [40, 52, 55, 59], [36, 48, 52, 55], [45, 57, 60, 64], [35, 47, 51, 54],
  [40, 52, 55, 59], [36, 48, 52, 55], [38, 50, 54, 57], [35, 47, 51, 54],
];
const PUZ_MELODY: NoteList[] = [
  [[0, 76, 0.5], [0.5, 79, 0.5], [1, 83, 1], [3, 79, 1]],
  [[0, 79, 0.5], [0.5, 76, 0.5], [1, 72, 1], [3, 76, 1]],
  [[0, 81, 0.5], [0.5, 84, 0.5], [1, 81, 1], [3, 76, 1]],
  [[0, 78, 1], [1, 75, 1], [2, 78, 1], [3, 83, 1]],
  [[0, 83, 0.5], [0.5, 79, 0.5], [1, 76, 1], [3, 79, 1]],
  [[0, 84, 0.5], [0.5, 79, 0.5], [1, 76, 1], [3, 72, 1]],
  [[0, 78, 1], [1, 81, 1], [2, 86, 1], [3, 81, 1]],
  [[0, 83, 1], [1, 78, 1], [2, 75, 2]],
];

const THEMES: Record<Theme, ThemeDef> = {
  german: {
    bpm: 104,
    bars: 8,
    play(t, i) {
      const chord = DE_CHORDS[i];
      pluck(midi(chord[0]), t, 0.18);
      pluck(midi(chord[0] + 7), t + beat * 2, 0.12);
      [1, 2, 3, 2, 1, 2, 3, 2].forEach((idx, step) => pluck(midi(chord[idx] + 12), t + (step * beat) / 2, 0.06));
      melody(t, DE_MELODY[i], (f, tt, len) => bell(f, tt, 0.08 + len * 0));
    },
  },
  general: {
    bpm: 92,
    bars: 8,
    play(t, i) {
      const chord = GEN_CHORDS[i];
      pad(chord.slice(1).map(midi), t, beat * 4, 0.03);
      pluck(midi(chord[0]), t, 0.2);
      pluck(midi(chord[0]), t + beat * 2, 0.14);
      [1, 3, 2, 3].forEach((idx, step) => pluck(midi(chord[idx] + 12), t + beat * (step + 0.5), 0.06));
      melody(t, GEN_MELODY[i], (f, tt, len) => flute(f, tt, len, 0.06, { vib: 0.008 }));
    },
  },
  sudoku: {
    bpm: 66,
    bars: 8,
    play(t, i) {
      const chord = SUD_CHORDS[i];
      pad(chord.map(midi), t, beat * 4, 0.035);
      [1, 3, 2, 3, 1, 2, 3, 2].forEach((idx, step) => {
        if (step % 2 === 1 && i % 2) return;
        bell(midi(chord[idx] + 12), t + (step * beat) / 2, 0.03);
      });
      melody(t, SUD_MELODY[i], (f, tt) => bell(f, tt, 0.08));
    },
  },
  puzzle: {
    bpm: 112,
    bars: 8,
    play(t, i) {
      const chord = PUZ_CHORDS[i];
      pluck(midi(chord[0]), t, 0.2);
      pluck(midi(chord[0]), t + beat * 1.5, 0.12);
      pluck(midi(chord[0]), t + beat * 3, 0.12);
      [1, 2, 3, 2, 3, 2, 1, 3].forEach((idx, step) => marimba(midi(chord[idx] + 12), t + (step * beat) / 2, 0.08));
      melody(t, PUZ_MELODY[i], (f, tt, len) => flute(f, tt, len, 0.045, { cut: 1600 }));
      if (i % 2) blip(midi(84 + Math.floor(Math.random() * 5)), t + Math.random() * beat * 3.5, 0.04);
    },
  },
  english: {
    bpm: 112,
    bars: 8,
    play(t, i) {
      const chord = EN_CHORDS[i];
      pluck(midi(chord[0]), t, 0.2);
      pluck(midi(chord[0]), t + beat * 2, 0.14);
      [1, 2, 3].forEach((idx, k) => {
        pluck(midi(chord[idx]), t + beat * (k + 0.5), 0.07);
      });
      melody(t, EN_MELODY[i], (f, tt, len) => bell(f, tt, 0.07 + len * 0));
    },
  },
  add: {
    bpm: 84,
    bars: 8,
    play(t, i) {
      const chord = ADD_CHORDS[i];
      pluck(midi(chord[0]), t, 0.22);
      pluck(midi(chord[0]), t + beat * 2, 0.16);
      ADD_PICK.forEach((idx, step) => pluck(midi(chord[idx] + (idx === 3 ? 12 : 0)), t + (step * beat) / 2, 0.1));
      melody(t, ADD_MELODY[i], (f, tt, len) => flute(f, tt, len, 0.07));
    },
  },
  sub: {
    bpm: 62,
    bars: 8,
    play(t, i) {
      const chord = SUB_CHORDS[i];
      pad(chord.slice(1).map(midi), t, beat * 4, 0.035);
      pluck(midi(chord[0]), t, 0.2, { decay: 2.2 });
      [1, 2, 3, 2].forEach((idx, step) => bell(midi(chord[idx] + 12), t + step * beat + beat * 0.5, 0.035));
      melody(t, SUB_MELODY[i], (f, tt) => bell(f, tt, 0.09));
    },
  },
  mul: {
    bpm: 100,
    bars: 8,
    play(t, i) {
      drone(midi(38), t, beat * 4, 0.05);
      MUL_OSTI[i].forEach((n, step) => pluck(midi(n), t + (step * beat) / 2, step % 2 ? 0.08 : 0.13, { type: 'sawtooth', open: 2600, close: 400, decay: 0.55 }));
      for (const s of [0, 3, 4]) drum(t + (s * beat) / 2, 'dum', 0.32);
      for (const s of [2, 6, 7]) drum(t + (s * beat) / 2, 'tak', 0.28);
      melody(t, MUL_MELODY[i], (f, tt, len) => flute(f, tt, len, 0.045, { type: 'sawtooth', vib: 0.006, cut: 1800 }));
    },
  },
  div: {
    bpm: 72,
    bars: 8,
    play(t, i) {
      const chord = DIV_CHORDS[i];
      pad(chord.slice(0, 3).map(midi), t, beat * 4, 0.03);
      [1, 3, 2, 3, 1, 3, 2, 1].forEach((idx, step) => {
        if (step % 4 === 3 && i % 2) return;
        marimba(midi(chord[idx]), t + (step * beat) / 2, 0.16);
      });
      melody(t, DIV_MELODY[i], (f, tt, len) => flute(f, tt, len, 0.06, { vib: 0.012, cut: 1500 }));
      for (let k = 0; k < 2; k++) blip(midi(76 + Math.floor(Math.random() * 9)), t + Math.random() * beat * 3.6, 0.05);
    },
  },
  house: {
    bpm: 76,
    bars: 8,
    play(t, i) {
      const chord = HOUSE_CHORDS[i];
      pluck(midi(chord[0] + 12), t, 0.16);
      pluck(midi(chord[0] + 12), t + beat * 2, 0.12);
      [1, 2, 3, 2, 1, 2, 3, 2].forEach((idx, step) => bell(midi(chord[idx] + 12), t + (step * beat) / 2, 0.03));
      melody(t, HOUSE_MELODY[i], (f, tt, len) => flute(f, tt, len, 0.05));
    },
  },
};

function tick(): void {
  const c = ctx!;
  // Controller-Tasten gelten nicht bei jedem Browser als Klick: immer wieder versuchen
  if (enabled && !hidden && !idlePaused && c.state !== 'running') void c.resume();
  while (nextBarTime < c.currentTime + 1.2) {
    if (wanted !== current) {
      current = wanted;
      bar = 0;
    }
    const def = THEMES[current];
    beat = 60 / def.bpm;
    def.play(nextBarTime, bar);
    nextBarTime += beat * 4;
    bar = (bar + 1) % def.bars;
  }
}

/** Wechselt am nächsten Taktende zum Stück der Umgebung; ausklingende Töne blenden automatisch über. */
export function setTheme(theme: Theme): void {
  wanted = theme;
}

/** Muss nach einer Nutzeraktion aufgerufen werden (Autoplay-Regeln der Browser). */
export function startMusic(): void {
  if (!ctx) setup();
  void ctx!.resume();
  master.gain.setTargetAtTime(level(), ctx!.currentTime, 0.4);
  if (timer === undefined) {
    nextBarTime = ctx!.currentTime + 0.2;
    timer = window.setInterval(tick, 250);
    tick();
  }
}

let hidden = false;

/** Beim Verlassen der Seite/App anhalten, beim Zurückkehren fortsetzen. */
function onVisibility(away: boolean): void {
  hidden = away;
  if (!ctx) return;
  if (away) void ctx.suspend();
  else if (enabled) void ctx.resume();
}
document.addEventListener('visibilitychange', () => onVisibility(document.visibilityState === 'hidden'));
window.addEventListener('pagehide', () => onVisibility(true));
window.addEventListener('pageshow', () => onVisibility(document.visibilityState === 'hidden'));
window.addEventListener('blur', () => onVisibility(true));
window.addEventListener('focus', () => onVisibility(false));

/** Bildschirm aus oder App im Hintergrund melden sich nicht immer: ohne Eingabe wird der Ton angehalten. */
const IDLE_MS = 45_000;
let lastInput = Date.now();
let idlePaused = false;
function activity(): void {
  lastInput = Date.now();
  if (idlePaused) {
    idlePaused = false;
    if (ctx && enabled && !hidden) void ctx.resume();
  }
}
for (const ev of ['pointerdown', 'pointermove', 'touchstart', 'keydown', 'padpress']) {
  window.addEventListener(ev, activity, { passive: true });
}
window.setInterval(() => {
  if (!ctx || idlePaused || Date.now() - lastInput < IDLE_MS) return;
  idlePaused = true;
  void ctx.suspend();
}, 5000);

export function setMusic(on: boolean): void {
  enabled = on;
  localStorage.setItem('zl-music', on ? 'on' : 'off');
  if (on) startMusic();
  else if (ctx) master.gain.setTargetAtTime(0, ctx.currentTime, 0.15);
}

/** Senkt die Musik, solange gesprochen wird. */
export function duckMusic(seconds: number): void {
  if (!ctx) return;
  ducked = true;
  master.gain.setTargetAtTime(level(), ctx.currentTime, 0.1);
  clearTimeout(duckTimer);
  duckTimer = window.setTimeout(() => {
    ducked = false;
    if (ctx) master.gain.setTargetAtTime(level(), ctx.currentTime, 0.5);
  }, seconds * 1000);
}

/** Absteigendes „Wah-wah“ als Signal, wenn man einen Stern verliert. */
export function sfxLoss(): void {
  if (!ctx || !enabled) return;
  const c = ctx;
  [440, 330, 220].forEach((f, i) => {
    const o = c.createOscillator();
    const g = c.createGain();
    const t = c.currentTime + i * 0.16;
    o.type = 'triangle';
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + 0.18);
  });
}
