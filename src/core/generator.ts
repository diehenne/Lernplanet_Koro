import type { Op, Task } from './types';

export type Rng = () => number;

export function randInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

export function pick<T>(rng: Rng, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

/** Aufgabentypen je Operation und Stufe (alle Ergebnisse ≤ 100). */
const KINDS: Record<Op, string[][]> = {
  add: [
    ['add-20'],
    ['add-tens', 'add-20'],
    ['add-100-plain', 'add-tens'],
    ['add-100-bridge', 'add-100-plain'],
    ['add-100-bridge-hard', 'add-100-bridge'],
    ['add-100-bridge-hard'],
  ],
  sub: [
    ['sub-20'],
    ['sub-tens', 'sub-20'],
    ['sub-100-plain', 'sub-tens'],
    ['sub-100-bridge', 'sub-100-plain'],
    ['sub-100-bridge-hard', 'sub-100-bridge'],
    ['sub-100-bridge-hard', 'sub-from-100'],
  ],
  mul: [
    ['mul-2-5-10'],
    ['mul-3-4', 'mul-2-5-10'],
    ['mul-6-9', 'mul-3-4'],
    ['mul-all', 'mul-6-9'],
    ['mul-big', 'mul-all'],
    ['mul-big-hard', 'mul-hard'],
  ],
  div: [
    ['div-easy'],
    ['div-3-4', 'div-easy'],
    ['div-all'],
    ['div-big', 'div-all'],
    ['div-big', 'div-big-hard'],
    ['div-big-hard', 'div-hard'],
  ],
};

export function kindsFor(op: Op, level: number): string[] {
  return KINDS[op][Math.min(Math.max(level, 1), KINDS[op].length) - 1];
}

function two(tens: number, ones: number): number {
  return tens * 10 + ones;
}

function divTask(rng: Rng, divisors: number[], qMin: number, qMax: number): [number, number] {
  const d = pick(rng, divisors);
  const q = randInt(rng, qMin, Math.min(qMax, Math.floor(100 / d)));
  return [d * q, d];
}

export function makeTask(op: Op, kind: string, level: number, rng: Rng = Math.random): Task {
  let a = 0;
  let b = 0;
  switch (kind) {
    case 'add-20':
      a = randInt(rng, 2, 18);
      b = randInt(rng, Math.max(2, 11 - a), 20 - a);
      break;
    case 'add-tens':
      if (rng() < 0.5) {
        a = randInt(rng, 1, 8) * 10;
        b = randInt(rng, 1, (90 - a) / 10) * 10;
      } else {
        const o = randInt(rng, 1, 5);
        a = two(randInt(rng, 2, 8), o);
        b = randInt(rng, 2, 9 - o);
      }
      break;
    case 'add-100-plain': {
      const t1 = randInt(rng, 1, 8);
      const t2 = randInt(rng, 1, 9 - t1);
      const o1 = randInt(rng, 1, 8);
      a = two(t1, o1);
      b = two(t2, randInt(rng, 1, 9 - o1));
      break;
    }
    case 'add-100-bridge':
    case 'add-100-bridge-hard': {
      const hard = kind.endsWith('hard');
      const t1 = hard ? randInt(rng, 2, 6) : randInt(rng, 1, 7);
      const t2 = hard ? randInt(rng, 2, 8 - t1) : randInt(rng, 0, 8 - t1);
      const o1 = randInt(rng, 2, 9);
      a = two(t1, o1);
      b = two(t2, randInt(rng, 10 - o1, 9));
      break;
    }
    case 'sub-20': {
      const o = randInt(rng, 1, 8);
      a = 10 + o;
      b = randInt(rng, o + 1, 9);
      break;
    }
    case 'sub-tens':
      if (rng() < 0.5) {
        a = randInt(rng, 3, 10) * 10;
        b = randInt(rng, 1, a / 10 - 1) * 10;
      } else {
        const o = randInt(rng, 3, 9);
        a = two(randInt(rng, 2, 9), o);
        b = randInt(rng, 2, o - 1);
      }
      break;
    case 'sub-100-plain': {
      const t1 = randInt(rng, 3, 9);
      const o1 = randInt(rng, 1, 9);
      a = two(t1, o1);
      b = two(randInt(rng, 1, t1 - 1), randInt(rng, 1, o1));
      break;
    }
    case 'sub-100-bridge':
    case 'sub-100-bridge-hard': {
      const hard = kind.endsWith('hard');
      const t1 = hard ? randInt(rng, 5, 9) : randInt(rng, 3, 9);
      const t2 = hard ? randInt(rng, 2, t1 - 2) : randInt(rng, 0, t1 - 1);
      const o1 = randInt(rng, 0, 8);
      a = two(t1, o1);
      b = two(t2, randInt(rng, o1 + 1, 9));
      break;
    }
    case 'sub-from-100':
      a = 100;
      b = randInt(rng, 11, 99);
      break;
    case 'mul-2-5-10':
      a = pick(rng, [2, 5, 10]);
      b = randInt(rng, 2, 10);
      break;
    case 'mul-3-4':
      a = pick(rng, [3, 4]);
      b = randInt(rng, 3, 10);
      break;
    case 'mul-6-9':
      a = randInt(rng, 6, 9);
      b = randInt(rng, 3, 9);
      break;
    case 'mul-all':
      a = randInt(rng, 2, 10);
      b = randInt(rng, 2, 10);
      break;
    case 'mul-hard':
      a = randInt(rng, 6, 9);
      b = randInt(rng, 6, 9);
      break;
    case 'mul-big':
      a = randInt(rng, 2, 9);
      b = randInt(rng, 11, Math.min(25, Math.floor(100 / a)));
      break;
    case 'mul-big-hard':
      a = randInt(rng, 6, 9);
      b = randInt(rng, 11, Math.floor(100 / a));
      break;
    case 'div-easy':
      [a, b] = divTask(rng, [2, 5, 10], 2, 10);
      break;
    case 'div-3-4':
      [a, b] = divTask(rng, [3, 4], 3, 10);
      break;
    case 'div-all':
      [a, b] = divTask(rng, [2, 3, 4, 5, 6, 7, 8, 9, 10], 3, 10);
      break;
    case 'div-hard':
      [a, b] = divTask(rng, [6, 7, 8, 9], 6, 9);
      break;
    case 'div-big':
      [a, b] = divTask(rng, [2, 3, 4, 5], 11, 30);
      break;
    case 'div-big-hard':
      [a, b] = divTask(rng, [6, 7, 8, 9], 11, 16);
      break;
    default:
      throw new Error(`Unbekannter Aufgabentyp: ${kind}`);
  }

  if (op === 'div') return { op, a, b, answer: a / b, level, kind };
  const answer = op === 'add' ? a + b : op === 'sub' ? a - b : a * b;
  return { op, a, b, answer, level, kind };
}

/** Falsche Antworten, die typische Kinderfehler abbilden (±1, ±10, falsche Rechenart, Nachbarreihe). */
export function makeChoices(task: Task, count: number, rng: Rng = Math.random): number[] {
  const { a, b, answer } = task;
  const typical = [answer + 1, answer - 1, answer + 10, answer - 10, answer + 2, answer - 2];
  if (task.op === 'mul') typical.push(answer + b, answer - b, answer + a, answer - a);
  if (task.op === 'add') typical.push(Math.abs(a - b));
  if (task.op === 'sub') typical.push(a + b);
  if (task.op === 'div') typical.push(answer * 2);
  const pool = [...new Set(typical)].filter((n) => n >= 0 && n !== answer);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const set = new Set<number>([answer]);
  for (const n of pool) if (set.size < count) set.add(n);
  let guard = 0;
  while (set.size < count && guard++ < 200) set.add(answer + randInt(rng, 1, 15));
  const arr = [...set];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
