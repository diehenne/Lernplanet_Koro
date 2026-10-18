import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { kindsFor, makeChoices, makeTask } from './generator';
import { newProfile, nextTask, normalizeProfile, recordResult } from './adaptive';
import { gapHintSteps, hintSteps } from './hints';
import { biomeAt } from './layout';
import { balance, changeDue, coinBreakdown, moneyChoices, sellBatch } from './money';
import { addItem, moveItem, pickUp, place, rupeeReward } from './shop';
import { MAX_LEVEL, OPS } from './types';
import { numberWords, segmentsOf } from '../ui/speechText';
import { collectCorpus } from '../ui/speechCorpus';

describe('Aufgabengenerator', () => {
  it('liefert für alle Operationen/Stufen/Typen korrekte Aufgaben mit Zahlen bis 100', () => {
    for (const op of OPS) {
      for (let level = 1; level <= MAX_LEVEL; level++) {
        for (const kind of kindsFor(op, level)) {
          for (let i = 0; i < 400; i++) {
            const t = makeTask(op, kind, level);
            const expected = op === 'add' ? t.a + t.b : op === 'sub' ? t.a - t.b : op === 'mul' ? t.a * t.b : t.a / t.b;
            expect(t.answer).toBe(expected);
            expect(Number.isInteger(t.answer)).toBe(true);
            expect(t.answer).toBeGreaterThanOrEqual(1);
            expect(Math.max(t.a, t.answer)).toBeLessThanOrEqual(100);
            if (kind === 'add-20') expect(t.answer).toBeGreaterThan(10);
            if (kind.startsWith('add-100-bridge')) expect((t.a % 10) + (t.b % 10)).toBeGreaterThanOrEqual(10);
            if (kind.startsWith('sub-100-bridge')) expect(t.a % 10).toBeLessThan(t.b % 10);
            if (kind === 'sub-100-plain') expect(t.a % 10).toBeGreaterThanOrEqual(t.b % 10);
            if (kind === 'add-100-plain') expect((t.a % 10) + (t.b % 10)).toBeLessThanOrEqual(9);
            expect(hintSteps(t).length).toBeGreaterThan(0);
            expect(gapHintSteps(t).length).toBe(1);
          }
        }
      }
    }
  });

  it('wird mit der Stufe tatsächlich schwerer (Mittelwert der Ergebnisse steigt)', () => {
    for (const op of ['add', 'sub'] as const) {
      const avg = (level: number) => {
        let sum = 0;
        for (let i = 0; i < 500; i++) {
          const ks = kindsFor(op, level);
          sum += makeTask(op, ks[i % ks.length], level).a;
        }
        return sum / 500;
      };
      expect(avg(5)).toBeGreaterThan(avg(1) + 20);
    }
  });

  it('erzeugt eindeutige Antwortoptionen inkl. Lösung', () => {
    for (const op of OPS) {
      for (let i = 0; i < 200; i++) {
        const t = makeTask(op, kindsFor(op, 3)[0], 3);
        const c = makeChoices(t, 4);
        expect(new Set(c).size).toBe(4);
        expect(c).toContain(t.answer);
        expect(Math.min(...c)).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe('Adaptivität', () => {
  it('steigt bei 4 von 5 richtig auf und fällt bei höchstens 2 von 5 ab', () => {
    const p = newProfile('x', 'Test', '🦊');
    const t = nextTask(p, 'add');
    const start = p.levels.add;
    let r: string | null = null;
    for (let i = 0; i < 5; i++) r = recordResult(p, t, i !== 2);
    expect(r).toBe('up');
    expect(p.levels.add).toBe(start + 1);
    for (let i = 0; i < 5; i++) r = recordResult(p, t, false);
    expect(r).toBe('down');
    expect(p.levels.add).toBe(start);
  });

  it('bleibt in den Stufengrenzen', () => {
    const p = newProfile('x', 'Test', '🦊');
    const t = nextTask(p, 'mul');
    for (let i = 0; i < 100; i++) recordResult(p, t, false);
    expect(p.levels.mul).toBe(1);
    for (let i = 0; i < 100; i++) recordResult(p, t, true);
    expect(p.levels.mul).toBe(MAX_LEVEL);
  });

  it('gewichtet fehleranfällige Typen stärker', () => {
    const p = newProfile('x', 'Test', '🦊');
    p.stats['add-20'] = { right: 0, wrong: 10 };
    p.stats['add-tens'] = { right: 10, wrong: 0 };
    let n = 0;
    for (let i = 0; i < 1000; i++) if (nextTask(p, 'add').kind === 'add-20') n++;
    expect(n).toBeGreaterThan(700);
  });

  it('übernimmt alte Speicherstände', () => {
    const p = normalizeProfile({ id: 'a', name: 'Alt', avatar: '🐻', levels: { add: 1, sub: 1, mul: 3, div: 1 } });
    expect(p.levels.add).toBe(2);
    expect(p.levels.mul).toBe(3);
    expect(balance(p)).toBe(0);
    expect(p.built).toEqual([]);
  });
});

describe('Rubine und Shop', () => {
  it('belohnt schwerere Stufen stärker, Wiederholung weniger', () => {
    expect(rupeeReward(5, true)).toBeGreaterThan(rupeeReward(2, true));
    expect(rupeeReward(5, false)).toBeLessThan(rupeeReward(2, true));
  });

  it('Inventar: legen, aufnehmen, Truhe', () => {
    const p = newProfile('x', 'T', '🦊');
    addItem(p.inventory, 'tree', 2);
    const b = place(p, 'tree', 3, 4, 0)!;
    expect(p.inventory.tree).toBe(1);
    expect(p.built.length).toBe(1);
    expect(place(p, 'house', 0, 0, 0)).toBeNull();
    expect(pickUp(p, b.uid)).not.toBeNull();
    expect(p.inventory.tree).toBe(2);
    const chest = {};
    expect(moveItem(p.inventory, chest, 'tree')).toBe(true);
    expect(p.inventory.tree).toBe(1);
    expect(moveItem(chest, p.inventory, 'axe')).toBe(false);
  });

  it('Wechselgeld und Münzen', () => {
    expect(changeDue(50, 35)).toBe(15);
    expect(changeDue(20, 35)).toBe(0);
    expect(coinBreakdown(86)).toEqual([20, 20, 20, 20, 5, 1]);
    for (let price = 1; price <= 120; price++) {
      const laid = price + 1 + (price % 49);
      const ch = moneyChoices(laid - price, 'sub', laid, price);
      expect(ch).toContain(laid - price);
      expect(new Set(ch).size).toBe(4);
    }
    expect(sellBatch(40, 15)).toBe(10);
    expect(sellBatch(3, 60)).toBe(3);
  });

  it('alte Speicherstände werden übernommen', () => {
    const p = normalizeProfile({ built: [{ item: 'tree', region: 'sub', x: 1, z: 2, ry: 0, paid: 25 } as never] });
    expect(p.built[0].x).toBeCloseTo(31);
    expect(p.built[0].uid).toBeGreaterThan(0);
    expect(p.nextUid).toBeGreaterThan(p.built[0].uid);
    expect(p.inventory).toEqual({});
  });

  it('Welten liegen in Quadranten, Grenzen flackern nicht', () => {
    expect(biomeAt(-10, -10)).toBe('add');
    expect(biomeAt(10, 10)).toBe('div');
    expect(biomeAt(1, -10, 'add')).toBe('add');
    expect(biomeAt(4, -10, 'add')).toBe('sub');
  });
});

describe('Sprache', () => {
  it('liest Zahlen deutsch', () => {
    expect(numberWords(37)).toBe('siebenunddreißig');
    expect(numberWords(21)).toBe('einundzwanzig');
    expect(numberWords(100)).toBe('einhundert');
    expect(numberWords(16)).toBe('sechzehn');
  });

  it('zerlegt Rechenaufgaben in Bausteine', () => {
    const segs = segmentsOf('Wie viel ist 37 + 25?');
    expect(segs.map((s) => s.type)).toEqual(['text', 'num', 'op', 'num']);
    const gap = segmentsOf('Welche Zahl fehlt? 12 + ? = 20');
    expect(gap.map((s) => (s.type === 'op' ? s.op : s.type))).toEqual(['text', 'num', '+', '?', '=', 'num']);
    const colon = segmentsOf('Zusammen: 70 + 9 = 79.');
    expect(colon.filter((s) => s.type === 'text').length).toBe(1);
  });

  it('alle benötigten Audio-Bausteine existieren (npm run audio ausführen, falls nicht)', () => {
    const missing = [...collectCorpus().keys()].filter((f) => !existsSync(join(__dirname, '../../public/audio', `${f}.mp3`)));
    expect(missing).toEqual([]);
  });
});
