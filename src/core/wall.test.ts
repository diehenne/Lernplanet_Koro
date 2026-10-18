import { describe, expect, it } from 'vitest';
import { makeWall } from './wall';

describe('Zahlenmauer', () => {
  it('Summen stimmen und es fehlen Steine', () => {
    for (let lv = 1; lv <= 6; lv++) {
      for (let k = 0; k < 20; k++) {
        const w = makeWall(lv, Math.random);
        for (let r = 0; r < w.rows - 1; r++) for (let c = 0; c <= r; c++) expect(w.solution[r][c]).toBe(w.solution[r + 1][c] + w.solution[r + 1][c + 1]);
        expect(w.given.flat().filter((g) => !g).length).toBeGreaterThanOrEqual(2);
      }
    }
  });
});
