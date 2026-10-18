import type { Rng } from './generator';

/** Kleine Sudokus für Kinder: 4×4 (Blöcke 2×2) und 6×6 (Blöcke 2×3). 0 = leer. */
export interface SudokuSpec {
  n: number;
  bh: number;
  bw: number;
}
export const SUDOKU_4: SudokuSpec = { n: 4, bh: 2, bw: 2 };
export const SUDOKU_6: SudokuSpec = { n: 6, bh: 2, bw: 3 };

export interface SudokuPuzzle {
  spec: SudokuSpec;
  puzzle: number[];
  solution: number[];
}

function allowed(spec: SudokuSpec, g: number[], i: number, v: number): boolean {
  const { n, bh, bw } = spec;
  const r = Math.floor(i / n), c = i % n;
  for (let k = 0; k < n; k++) {
    if (g[r * n + k] === v || g[k * n + c] === v) return false;
  }
  const r0 = r - (r % bh), c0 = c - (c % bw);
  for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) if (g[(r0 + y) * n + c0 + x] === v) return false;
  return true;
}

/** Zählt Lösungen (bricht bei `limit` ab). */
export function countSolutions(spec: SudokuSpec, grid: number[], limit = 2): number {
  const g = [...grid];
  let count = 0;
  const go = (): void => {
    if (count >= limit) return;
    // Feld mit den wenigsten Möglichkeiten zuerst
    let best = -1, bestOpts: number[] = [];
    for (let i = 0; i < g.length; i++) {
      if (g[i]) continue;
      const opts: number[] = [];
      for (let v = 1; v <= spec.n; v++) if (allowed(spec, g, i, v)) opts.push(v);
      if (!opts.length) return;
      if (best < 0 || opts.length < bestOpts.length) { best = i; bestOpts = opts; }
    }
    if (best < 0) { count++; return; }
    for (const v of bestOpts) {
      g[best] = v;
      go();
      g[best] = 0;
      if (count >= limit) return;
    }
  };
  go();
  return count;
}

function solveRandom(spec: SudokuSpec, rng: Rng): number[] {
  const g: number[] = new Array(spec.n * spec.n).fill(0);
  const go = (i: number): boolean => {
    if (i === g.length) return true;
    const order = Array.from({ length: spec.n }, (_, k) => k + 1).sort(() => rng() - 0.5);
    for (const v of order) {
      if (!allowed(spec, g, i, v)) continue;
      g[i] = v;
      if (go(i + 1)) return true;
      g[i] = 0;
    }
    return false;
  };
  go(0);
  return g;
}

/** Erzeugt ein Sudoku mit eindeutiger Lösung; `clues` = Mindestzahl vorgegebener Zahlen. */
export function makeSudoku(spec: SudokuSpec, clues: number, rng: Rng): SudokuPuzzle {
  const solution = solveRandom(spec, rng);
  const puzzle = [...solution];
  const cells = Array.from({ length: puzzle.length }, (_, i) => i).sort(() => rng() - 0.5);
  let left = puzzle.length;
  for (const i of cells) {
    if (left <= clues) break;
    const keep = puzzle[i];
    puzzle[i] = 0;
    if (countSolutions(spec, puzzle) !== 1) puzzle[i] = keep;
    else left--;
  }
  return { spec, puzzle, solution };
}

/** Schwierigkeit nach Anzahl gelöster Sudokus: erst 4×4, später 6×6 mit weniger Hinweisen. */
export function sudokuForLevel(level: number, rng: Rng): SudokuPuzzle {
  const L = Math.min(6, Math.max(1, level));
  if (L <= 3) return makeSudoku(SUDOKU_4, [11, 9, 7][L - 1], rng);
  return makeSudoku(SUDOKU_6, [22, 18, 14][L - 4], rng);
}

/** Zellen, die gegen Zeile, Spalte oder Block verstoßen. */
export function conflicts(spec: SudokuSpec, g: number[]): Set<number> {
  const bad = new Set<number>();
  const { n, bh, bw } = spec;
  for (let i = 0; i < g.length; i++) {
    const v = g[i];
    if (!v) continue;
    const r = Math.floor(i / n), c = i % n;
    for (let j = 0; j < g.length; j++) {
      if (j === i || g[j] !== v) continue;
      const r2 = Math.floor(j / n), c2 = j % n;
      if (r2 === r || c2 === c || (Math.floor(r2 / bh) === Math.floor(r / bh) && Math.floor(c2 / bw) === Math.floor(c / bw))) bad.add(i);
    }
  }
  return bad;
}
