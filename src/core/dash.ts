import { pick, randInt, type Rng } from './generator';

export interface DashTask {
  text: string;
  answer: number;
  choices: number[];
}

export const DASH_SECONDS = 20;

/** Gemischte Aufgabe im Zahlenraum bis 20, mit vier Antworten. */
export function makeDashTask(rng: Rng = Math.random): DashTask {
  const op = pick(rng, ['+', '-', '×', '÷']);
  let a: number, b: number, answer: number;
  if (op === '+') {
    a = randInt(rng, 1, 19);
    b = randInt(rng, 1, 20 - a);
    answer = a + b;
  } else if (op === '-') {
    a = randInt(rng, 2, 20);
    b = randInt(rng, 1, a);
    answer = a - b;
  } else if (op === '×') {
    a = randInt(rng, 2, 10);
    b = randInt(rng, 1, Math.floor(20 / a));
    answer = a * b;
  } else {
    b = randInt(rng, 2, 10);
    answer = randInt(rng, 1, Math.floor(20 / b));
    a = b * answer;
  }
  const set = new Set<number>([answer]);
  while (set.size < 4) {
    const d = answer + randInt(rng, -4, 4);
    if (d >= 0 && d <= 20) set.add(d);
  }
  const choices = [...set].sort(() => rng() - 0.5);
  return { text: `${a} ${op} ${b}`, answer, choices };
}

export interface ScoreEntry {
  name: string;
  avatar: string;
  score: number;
}

/** Fügt ein Ergebnis in die Bestenliste ein (höchste zuerst, maximal 10). Gibt den Rang (0-basiert) oder -1 zurück. */
export function addScore(list: ScoreEntry[], e: ScoreEntry): number {
  list.push(e);
  list.sort((x, y) => y.score - x.score);
  const rank = list.indexOf(e);
  list.length = Math.min(list.length, 10);
  return rank < 10 ? rank : -1;
}
