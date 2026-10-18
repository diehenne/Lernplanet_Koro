import type { Rng } from './generator';

/** Zahlenmauer: Jeder Stein ist die Summe der beiden Steine darunter. Reihe 0 ist der Deckstein. */
export interface Wall {
  rows: number;
  /** Lösung, Reihe für Reihe von oben (Deckstein) nach unten. */
  solution: number[][];
  /** Welche Steine schon vorgegeben sind. */
  given: boolean[][];
}

/** Stufe 1–6: Größe der Mauer und Größe der Zahlen. */
export function wallSpec(level: number): { rows: number; max: number; step: number } {
  const rows = level <= 2 ? 3 : level <= 4 ? 4 : 5;
  const max = [0, 5, 10, 10, 20, 20, 30][Math.min(6, Math.max(1, level))];
  return { rows, max, step: level >= 5 ? 5 : 1 };
}

/** Mit nur einem Wert pro Dreieck (zwei bekannte Steine ergeben den dritten) lösbar? */
function solvable(rows: number, given: boolean[][]): boolean {
  const known = given.map((r) => [...r]);
  for (let changed = true; changed; ) {
    changed = false;
    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c <= r; c++) {
        const t = known[r][c], a = known[r + 1][c], b = known[r + 1][c + 1];
        const n = Number(t) + Number(a) + Number(b);
        if (n === 2) {
          known[r][c] = known[r + 1][c] = known[r + 1][c + 1] = true;
          changed = true;
        }
      }
    }
  }
  return known.every((r) => r.every(Boolean));
}

export function makeWall(level: number, rng: Rng): Wall {
  const { rows, max, step } = wallSpec(level);
  const total = (rows * (rows + 1)) / 2;
  const hide = Math.min(total - rows, Math.max(2, Math.round(total * (0.3 + level * 0.06))));
  for (;;) {
    const base = Array.from({ length: rows }, () => (1 + Math.floor(rng() * (max / step))) * step);
    const solution: number[][] = new Array(rows);
    solution[rows - 1] = base;
    for (let r = rows - 2; r >= 0; r--) solution[r] = solution[r + 1].slice(0, -1).map((v, i) => v + solution[r + 1][i + 1]);
    const given = solution.map((r) => r.map(() => true));
    const cells = solution.flatMap((r, i) => r.map((_, j) => [i, j] as const));
    for (let k = cells.length - 1; k > 0; k--) {
      const j = Math.floor(rng() * (k + 1));
      [cells[k], cells[j]] = [cells[j], cells[k]];
    }
    let hidden = 0;
    for (const [i, j] of cells) {
      if (hidden >= hide) break;
      given[i][j] = false;
      if (solvable(rows, given)) hidden++;
      else given[i][j] = true;
    }
    if (hidden >= Math.min(hide, 2)) return { rows, solution, given };
  }
}
