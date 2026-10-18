/** Kleine synthetische Geräusche (Web Audio, keine Samples). */
export type Sfx =
  | 'swing' | 'hit' | 'slime' | 'chop' | 'treefall' | 'dig' | 'treasure' | 'chest' | 'jump' | 'land'
  | 'coin' | 'place' | 'pickup' | 'portal' | 'discover' | 'door' | 'buy' | 'equip' | 'nope' | 'correct';

let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;

function audio(): AudioContext | null {
  try {
    if (!ctx) {
      ctx = new AudioContext();
      noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

type Env = { a?: number; d: number; v?: number };

function tone(c: AudioContext, t: number, f0: number, f1: number, { a = 0.005, d, v = 0.25 }: Env, type: OscillatorType = 'sine'): void {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + d);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + d + 0.03);
}

function hiss(c: AudioContext, t: number, f0: number, f1: number, { a = 0.005, d, v = 0.25 }: Env, q = 1, type: BiquadFilterType = 'bandpass'): void {
  const s = c.createBufferSource();
  s.buffer = noise;
  s.loop = true;
  const f = c.createBiquadFilter();
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(f0, t);
  f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + d);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  s.connect(f).connect(g).connect(c.destination);
  s.start(t, Math.random() * 0.5);
  s.stop(t + d + 0.03);
}

export function sfx(name: Sfx): void {
  const c = audio();
  if (!c) return;
  const t = c.currentTime;
  switch (name) {
    case 'swing':
      hiss(c, t, 700, 3200, { a: 0.06, d: 0.22, v: 0.3 }, 0.8);
      break;
    case 'hit':
      tone(c, t, 220, 70, { d: 0.14, v: 0.35 }, 'square');
      hiss(c, t, 2000, 600, { d: 0.1, v: 0.3 });
      break;
    case 'slime':
      tone(c, t, 500, 120, { d: 0.3, v: 0.3 }, 'sine');
      tone(c, t + 0.07, 700, 160, { d: 0.25, v: 0.2 }, 'sine');
      break;
    case 'chop':
      tone(c, t, 160, 60, { d: 0.12, v: 0.4 }, 'triangle');
      hiss(c, t, 1800, 500, { d: 0.09, v: 0.35 }, 2);
      break;
    case 'treefall':
      hiss(c, t + 0.05, 1200, 300, { a: 0.2, d: 0.7, v: 0.2 }, 0.6);
      tone(c, t + 0.7, 90, 35, { d: 0.35, v: 0.5 }, 'triangle');
      hiss(c, t + 0.7, 400, 100, { d: 0.3, v: 0.3 }, 0.7, 'lowpass');
      break;
    case 'dig':
      hiss(c, t, 900, 250, { a: 0.02, d: 0.22, v: 0.35 }, 0.7);
      tone(c, t + 0.1, 110, 70, { d: 0.12, v: 0.25 }, 'triangle');
      break;
    case 'treasure':
      [660, 830, 990, 1320].forEach((f, i) => tone(c, t + i * 0.09, f, f, { d: 0.25, v: 0.2 }, 'triangle'));
      break;
    case 'chest':
      tone(c, t, 90, 60, { d: 0.35, v: 0.2 }, 'sawtooth');
      hiss(c, t, 300, 1500, { a: 0.1, d: 0.3, v: 0.12 }, 4);
      tone(c, t + 0.3, 880, 880, { d: 0.3, v: 0.15 }, 'triangle');
      tone(c, t + 0.4, 1320, 1320, { d: 0.35, v: 0.12 }, 'triangle');
      break;
    case 'jump':
      tone(c, t, 260, 520, { d: 0.16, v: 0.2 }, 'triangle');
      break;
    case 'land':
      hiss(c, t, 500, 150, { d: 0.1, v: 0.25 }, 0.7, 'lowpass');
      break;
    case 'coin':
      tone(c, t, 1318, 1318, { d: 0.08, v: 0.18 }, 'square');
      tone(c, t + 0.07, 1760, 1760, { d: 0.25, v: 0.18 }, 'square');
      break;
    case 'buy':
      [0, 1, 2].forEach((i) => tone(c, t + i * 0.06, 1500 + i * 250, 1500 + i * 250, { d: 0.12, v: 0.14 }, 'square'));
      tone(c, t + 0.22, 1046, 1046, { d: 0.3, v: 0.15 }, 'triangle');
      break;
    case 'place':
      tone(c, t, 140, 80, { d: 0.14, v: 0.35 }, 'triangle');
      hiss(c, t, 700, 300, { d: 0.08, v: 0.2 });
      break;
    case 'pickup':
      tone(c, t, 400, 800, { d: 0.12, v: 0.2 }, 'triangle');
      break;
    case 'portal':
      [0, 1, 2, 3, 4].forEach((i) => tone(c, t + i * 0.07, 400 * 2 ** (i / 3), 400 * 2 ** (i / 3) * 1.5, { d: 0.4, v: 0.12 }, 'sine'));
      hiss(c, t, 300, 4000, { a: 0.2, d: 0.6, v: 0.1 }, 3);
      break;
    case 'discover':
      [523, 659, 784, 1047].forEach((f, i) => tone(c, t + i * 0.12, f, f, { d: 0.5, v: 0.18 }, 'triangle'));
      break;
    case 'door':
      tone(c, t, 110, 80, { d: 0.18, v: 0.3 }, 'triangle');
      tone(c, t + 0.12, 90, 70, { d: 0.18, v: 0.25 }, 'triangle');
      break;
    case 'equip':
      hiss(c, t, 1200, 3000, { d: 0.14, v: 0.2 }, 2);
      tone(c, t + 0.05, 700, 1000, { d: 0.14, v: 0.15 }, 'triangle');
      break;
    case 'nope':
      tone(c, t, 200, 150, { d: 0.18, v: 0.25 }, 'sawtooth');
      break;
    case 'correct':
      tone(c, t, 784, 784, { d: 0.14, v: 0.16 }, 'triangle');
      tone(c, t + 0.1, 1175, 1175, { d: 0.3, v: 0.16 }, 'triangle');
      break;
  }
}
