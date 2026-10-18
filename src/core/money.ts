import { makeChoices } from './generator';
import type { Bag, Profile, Task } from './types';

/** Münzen im Spiel: 1, 2, 5, 10 und 20 Rubine. */
export const COINS = [1, 2, 5, 10, 20];

export const balance = (p: Pick<Profile, 'coins'>): number => COINS.reduce((s, c) => s + c * (p.coins[c] ?? 0), 0);

export function addCoins(bag: Bag, list: number[]): void {
  for (const c of list) bag[c] = (bag[c] ?? 0) + 1;
}

/** Belohnung wird immer als Münzen ausgezahlt. */
export function earn(p: Pick<Profile, 'coins'>, amount: number): number[] {
  const coins = coinBreakdown(Math.max(0, Math.round(amount)));
  addCoins(p.coins, coins);
  return coins;
}

/** Nimmt die Münzen aus dem Beutel; false (und keine Änderung), wenn sie nicht vorhanden sind. */
export function spendCoins(p: Pick<Profile, 'coins'>, list: number[]): boolean {
  const need: Bag = {};
  addCoins(need, list);
  for (const [c, n] of Object.entries(need)) if ((p.coins[Number(c)] ?? 0) < n) return false;
  for (const [c, n] of Object.entries(need)) p.coins[Number(c)] -= n;
  return true;
}

/** Mögliche Wechsel: eine Münze gegen mehrere kleinere (und umgekehrt). */
export const EXCHANGES: { from: number; to: number[] }[] = [
  { from: 2, to: [1, 1] },
  { from: 5, to: [2, 2, 1] },
  { from: 5, to: [1, 1, 1, 1, 1] },
  { from: 10, to: [5, 5] },
  { from: 10, to: [5, 2, 2, 1] },
  { from: 10, to: [2, 2, 2, 2, 2] },
  { from: 20, to: [10, 10] },
  { from: 20, to: [10, 5, 5] },
  { from: 20, to: [5, 5, 5, 5] },
];

export function canExchange(p: Pick<Profile, 'coins'>, give: number[]): boolean {
  const need: Bag = {};
  addCoins(need, give);
  return Object.entries(need).every(([c, n]) => (p.coins[Number(c)] ?? 0) >= n);
}

export function changeDue(laid: number, price: number): number {
  return Math.max(0, laid - price);
}

/** Wenige Münzen, die den Betrag ergeben (größte zuerst). */
export function coinBreakdown(amount: number): number[] {
  const out: number[] = [];
  let rest = amount;
  for (const c of [...COINS].reverse()) {
    while (rest >= c) {
      out.push(c);
      rest -= c;
    }
  }
  return out;
}

/** Sinnvolle Auswahl für Wechselgeld bzw. Verkaufssumme. */
export function moneyChoices(answer: number, op: 'sub' | 'mul', a: number, b: number): number[] {
  const task: Task = { op, a, b, answer, level: 3, kind: 'money' };
  return makeChoices(task, 4).sort((x, y) => x - y);
}

/** Wie viele Stück auf einmal verkauft werden (Summe bleibt ≤ 200). */
export function sellBatch(have: number, unit: number): number {
  return Math.max(1, Math.min(have, 10, Math.floor(200 / Math.max(unit, 1))));
}
