import { describe, expect, it } from 'vitest';
import { conflicts, countSolutions, makeSudoku, sudokuForLevel, SUDOKU_4, SUDOKU_6 } from './sudoku';
import { makeRiddle } from './riddles';
import { AREAS, areaStations, GRID, GRID_Z, Z0, X0, X1, cellOf } from './layout';
import { normalizeProfile } from './adaptive';

const rng = (() => {
  let s = 7;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
})();

describe('Sudoku', () => {
  it('4x4 und 6x6 haben genau eine Lösung', () => {
    for (const [spec, clues] of [[SUDOKU_4, 8], [SUDOKU_6, 18]] as const) {
      for (let i = 0; i < 5; i++) {
        const s = makeSudoku(spec, clues, rng);
        expect(countSolutions(spec, s.puzzle)).toBe(1);
        expect(conflicts(spec, s.solution).size).toBe(0);
        expect(s.puzzle.filter(Boolean).length).toBeGreaterThanOrEqual(clues);
        s.puzzle.forEach((v, k) => v && expect(v).toBe(s.solution[k]));
      }
    }
  });
  it('Stufe steigert die Größe', () => {
    expect(sudokuForLevel(1, rng).spec.n).toBe(4);
    expect(sudokuForLevel(5, rng).spec.n).toBe(6);
    expect(sudokuForLevel(6, rng).spec.n).toBe(9);
  });
  it('erkennt Konflikte', () => {
    const g = [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    expect([...conflicts(SUDOKU_4, g)].sort()).toEqual([0, 1]);
  });
});

describe('Lernaufgaben', () => {
  it('liefern gültige Mehrfachauswahl', () => {
    for (const kind of ['german', 'general', 'puzzle'] as const) {
      for (let i = 0; i < 300; i++) {
        const r = makeRiddle(kind, rng);
        expect(r.options.length).toBeGreaterThanOrEqual(2);
        expect(new Set(r.options).size).toBe(r.options.length);
        expect(r.options[r.answer]).toBeTruthy();
        expect(r.prompt.length).toBeGreaterThan(3);
      }
    }
  });
});

describe('Bereiche', () => {
  it('liegen rund um den Marktplatz im Kartenbereich', () => {
    for (const a of AREAS) {
      expect(areaStations(a)).toHaveLength(5);
      expect(a.center.z - a.radius).toBeGreaterThan(Z0);
      expect(a.center.x - a.radius).toBeGreaterThan(X0);
      expect(a.center.x + a.radius).toBeLessThan(X1);
      expect(cellOf(a.center.x, a.center.z)).toBeLessThan(GRID * GRID_Z);
    }
    const ids = new Set(AREAS.map((a) => a.id));
    expect(ids.size).toBe(AREAS.length);
  });
  it('alte Karten werden auf das neue Raster übertragen', () => {
    const p = normalizeProfile({ explored: '1'.repeat(31 * 31) });
    expect(p.explored.length).toBe(GRID * GRID_Z);
    expect(p.explored[cellOf(0, 0)]).toBe('1');
    expect(p.explored[cellOf(0, -100)]).toBe('0');
  });
});

import { addScore, makeDashTask } from './dash';
describe('Rechen-Rennen', () => {
  it('Aufgaben bleiben im Zahlenraum bis 20 und haben die richtige Lösung', () => {
    for (let i = 0; i < 500; i++) {
      const t = makeDashTask();
      const [a, op, b] = t.text.split(' ');
      const x = Number(a), y = Number(b);
      const r = op === '+' ? x + y : op === '-' ? x - y : op === '×' ? x * y : x / y;
      expect(r).toBe(t.answer);
      expect(Number.isInteger(r) && r >= 0 && r <= 20 && x <= 20).toBe(true);
      expect(new Set(t.choices).size).toBe(4);
      expect(t.choices).toContain(t.answer);
    }
  });
  it('Bestenliste sortiert und kappt bei 10', () => {
    const l: { name: string; avatar: string; score: number }[] = [];
    for (let i = 0; i < 12; i++) addScore(l, { name: 'a', avatar: '🦊', score: i });
    expect(l.length).toBe(10);
    expect(l[0].score).toBe(11);
  });
});
