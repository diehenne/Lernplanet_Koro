import { describe, expect, it } from 'vitest';
import { PLATEAU, heightAt, landmarksOf, villageOf } from './layout';
import { RIDDLE_KINDS, STORIES, makeRiddle } from './riddles';
import { OPS } from './types';

describe('Rätsel', () => {
  it('jede Art liefert 3 verschiedene Optionen und gültige Antwort', () => {
    for (const k of RIDDLE_KINDS) {
      for (let i = 0; i < 200; i++) {
        const r = makeRiddle(k, Math.random);
        expect(r.options.length).toBe(3);
        expect(new Set(r.options).size).toBe(3);
        expect(r.answer).toBeGreaterThanOrEqual(0);
        expect(r.answer).toBeLessThan(3);
      }
    }
  });
  it('Geschichten haben Kapitel', () => {
    for (const s of STORIES) expect(s.chapters.length).toBe(3);
  });
});

describe('Gelände', () => {
  it('Dörfer und Marktplatz sind flach, Plateau ist hoch', () => {
    expect(heightAt(0, 0)).toBeCloseTo(0, 1);
    for (const op of OPS) {
      const v = villageOf(op);
      expect(Math.abs(heightAt(v.spawn.x, v.spawn.z))).toBeLessThan(0.12);
      const l = landmarksOf(op);
      expect(heightAt(l.plateau.x, l.plateau.z)).toBeGreaterThan(PLATEAU.h - 0.3);
      expect(heightAt(l.summit.x, l.summit.z)).toBeGreaterThan(3);
    }
  });
  it('Innenräume sind eben', () => expect(heightAt(1000, 3)).toBe(0));
});

import { COINS, addCoins, balance, canExchange, coinBreakdown, earn, spendCoins } from './money';
import { normalizeProfile } from './adaptive';

describe('Münzen', () => {
  it('nur 1, 2, 5, 10, 20', () => expect(COINS).toEqual([1, 2, 5, 10, 20]));
  it('Belohnung wird als Münzen ausgezahlt', () => {
    const p = normalizeProfile({});
    earn(p, 37);
    expect(balance(p)).toBe(37);
    expect(p.coins[20]).toBe(1);
    expect(coinBreakdown(37)).toEqual([20, 10, 5, 2]);
  });
  it('bezahlen nur mit vorhandenen Münzen', () => {
    const p = normalizeProfile({});
    addCoins(p.coins, [5, 5, 2]);
    expect(spendCoins(p, [10])).toBe(false);
    expect(balance(p)).toBe(12);
    expect(spendCoins(p, [5, 2])).toBe(true);
    expect(balance(p)).toBe(5);
    expect(canExchange(p, [5])).toBe(true);
    expect(canExchange(p, [10])).toBe(false);
  });
  it('alte Spielstände mit Rubinen werden zu Münzen', () => {
    expect(balance(normalizeProfile({ rupees: 43 } as never))).toBe(43);
  });
});
