import { describe, expect, it } from 'vitest';
import { EODD, ODD, OPPOSITE, makeRiddle, type RiddleKind } from './riddles';

const KINDS: RiddleKind[] = ['spell', 'gap', 'vocab', 'odd', 'opposite', 'fact', 'espell', 'esent', 'eodd', 'german', 'general', 'puzzle'];
let seed = 7;
const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

describe('Rätselinhalte', () => {
  it('Optionen sind eindeutig und die Antwort ist gültig', () => {
    for (const k of KINDS) for (let i = 0; i < 300; i++) {
      const r = makeRiddle(k, rng);
      expect(new Set(r.options).size, `${k}: ${r.prompt}`).toBe(r.options.length);
      expect(r.options[r.answer]).toBeTruthy();
      expect(r.options.length).toBeGreaterThanOrEqual(2);
    }
  });
  it('kein Wort steht in zwei Gruppen', () => {
    for (const list of [ODD, EODD]) {
      const all = list.flatMap((g) => g[1]);
      expect(new Set(all).size).toBe(all.length);
    }
  });
  it('Gegenteile sind eindeutig', () => {
    const all = OPPOSITE.flat();
    expect(new Set(all).size).toBe(all.length);
  });
  it('gleiche Frage nicht direkt hintereinander', () => {
    for (const k of ['general', 'puzzle', 'fact'] as RiddleKind[]) {
      let prev = '';
      for (let i = 0; i < 100; i++) {
        const r = makeRiddle(k, rng);
        expect(r.prompt).not.toBe(prev);
        prev = r.prompt;
      }
    }
  });
});
