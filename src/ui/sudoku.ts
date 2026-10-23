import { sfx } from './sfx';
import { sudokuForLevel, conflicts } from '../core/sudoku';
import { MAX_STARS, type Profile } from '../core/types';
import { areaLevel } from '../core/riddles';
import { earn } from '../core/money';
import { de } from '../i18n/de';

export interface SudokuUiSpec {
  root: HTMLElement;
  profile: Profile;
  save: () => void;
  onChange: () => void;
  onDone: (r: { earned: number; star: boolean; mistakes: number } | null) => void;
}

/** Ein Sudoku lösen: Feld wählen, Zahl setzen. Abbrechen jederzeit möglich. */
export function runSudoku(spec: SudokuUiSpec): void {
  const p = spec.profile;
  const { spec: sp, puzzle, solution } = sudokuForLevel(areaLevel(p, 'sudoku'), Math.random);
  const n = sp.n;
  const grid = [...puzzle];
  const given = puzzle.map((v) => v !== 0);
  let sel = -1;
  let mistakes = 0;
  let done = false;

  const finish = (aborted: boolean): void => {
    done = true;
    removeEventListener('keydown', onKey);
    window.removeEventListener('padback', onBack);
    let earned = 0, star = false;
    if (!aborted) {
      p.sudoku++;
      const lv = areaLevel(p, 'sudoku');
      if (!mistakes && lv < 6) p.areaLevels.sudoku = lv + 1;
      else if (mistakes >= 4 && lv > 1) p.areaLevels.sudoku = lv - 1;
      earned = n === 4 ? 6 : 12;
      earn(p, earned);
      if (!mistakes && p.stars < MAX_STARS) { p.stars++; star = true; }
    }
    spec.save();
    spec.onChange();
    spec.root.innerHTML = '';
    spec.onDone(aborted ? null : { earned, star, mistakes });
  };

  const cls = (i: number, bad: Set<number>): string => {
    const r = Math.floor(i / n), c = i % n;
    return ['sc', given[i] ? 'given' : '', i === sel ? 'sel' : '', bad.has(i) ? 'bad' : '', c % sp.bw === sp.bw - 1 && c < n - 1 ? 'bx' : '', r % sp.bh === sp.bh - 1 && r < n - 1 ? 'by' : ''].join(' ');
  };

  const cellEls = (): HTMLElement[] => [...spec.root.querySelectorAll<HTMLElement>('.sc')];
  const refresh = (msg = ''): void => {
    const bad = conflicts(sp, grid);
    cellEls().forEach((el, i) => {
      el.className = cls(i, bad);
      el.innerHTML = grid[i] ? String(grid[i]) : '&nbsp;';
    });
    document.getElementById('shint')!.textContent = msg || de.sudoku.help;
    showRing();
  };

  /** Zahlenring um das gewählte Feld: kurze Wege, auch mit dem Controller. */
  const showRing = (): void => {
    const ring = document.getElementById('numring')!;
    const cell = cellEls()[sel];
    if (sel < 0 || !cell || given[sel] || done) { ring.innerHTML = ''; ring.style.display = 'none'; return; }
    const wrapEl = ring.parentElement!;
    const wrap = wrapEl.getBoundingClientRect();
    const r = cell.getBoundingClientRect();
    ring.style.display = 'block';
    const k = wrapEl.offsetWidth ? wrap.width / wrapEl.offsetWidth : 1;
    const reach = (n > 6 ? 105 : 90) * k;
    const panel = (wrapEl.closest('.panel') ?? wrapEl).getBoundingClientRect();
    const lo = (v: number, min: number, max: number): number => (max - min < 2 * reach ? (min + max) / 2 : Math.min(Math.max(v, min + reach), max - reach));
    const cx = lo(r.left + r.width / 2, Math.max(0, panel.left), Math.min(innerWidth, panel.right));
    const cy = lo(r.top + r.height / 2, Math.max(0, panel.top), Math.min(innerHeight, panel.bottom));
    ring.style.left = `${(cx - wrap.left) / k}px`;
    ring.style.top = `${(cy - wrap.top) / k}px`;
    const rad = n > 6 ? 82 : 66;
    const items = [...Array.from({ length: n }, (_, k) => String(k + 1)), '⌫'];
    ring.innerHTML = items.map((t, k) => {
      const a = (k / items.length) * Math.PI * 2 - Math.PI / 2;
      return `<button class="rb ${t === '⌫' ? 'alt' : ''}" data-n="${t === '⌫' ? 0 : t}" style="left:${Math.cos(a) * rad}px;top:${Math.sin(a) * rad}px">${t}</button>`;
    }).join('');
    ring.querySelectorAll<HTMLElement>('button').forEach((b) => b.addEventListener('click', () => place(Number(b.dataset.n))));
  };

  const padFocus = (el: Element | null | undefined): void => {
    if (!el) return;
    window.dispatchEvent(new CustomEvent('padfocus', { detail: el }));
    (el as HTMLElement).focus({ preventScroll: true });
  };

  const place = (v: number): void => {
    if (done || sel < 0) return;
    if (given[sel]) { sfx('nope'); refresh(de.sudoku.given); return; }
    const idx = sel;
    grid[idx] = v;
    if (v && v !== solution[idx]) {
      mistakes++;
      sfx('nope');
    } else if (v) sfx('place');
    if (grid.every((x, i) => x === solution[i])) {
      done = true;
      sfx('correct');
      refresh(de.sudoku.solved);
      setTimeout(() => finish(false), 1400);
      return;
    }
    sel = -1;
    refresh(v && v !== solution[idx] ? de.sudoku.wrong : '');
    padFocus(cellEls()[idx]);
  };

  const onKey = (e: KeyboardEvent): void => {
    if (done) return;
    if (e.key >= '1' && e.key <= String(n)) place(Number(e.key));
    else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') place(0);
  };

  const bad0 = new Set<number>();
  const cells = grid.map((v, i) => `<button class="${cls(i, bad0)}" data-i="${i}">${v || '&nbsp;'}</button>`).join('');
  spec.root.innerHTML = `<div class="panel center sudoku-panel"><h2>🔢 ${de.sudoku.title} <small>${n}×${n}</small></h2>
    <p class="hint" id="shint">${de.sudoku.help}</p>
    <div class="sudoku-wrap"><div class="sudoku" style="--n:${n};grid-template-columns:repeat(${n},var(--cs,52px));grid-template-rows:repeat(${n},var(--cs,52px))">${cells}</div><div id="numring" class="numring"></div></div>
    <div><button class="alt" id="abort">✖ ${de.abort}</button></div></div>`;
  cellEls().forEach((b) =>
    b.addEventListener('click', () => {
      sel = Number(b.dataset.i);
      refresh();
      if (!given[sel]) padFocus(document.querySelector('#numring button'));
    }),
  );
  document.getElementById('abort')!.addEventListener('click', () => finish(true));
  addEventListener('keydown', onKey);
  // ◯ auf dem Controller: Zahlenring verlassen, danach sind wieder die Felder wählbar
  const onBack = (e: Event): void => {
    if (sel < 0 || given[sel] || done) return;
    e.preventDefault();
    const keep = sel;
    sel = -1;
    refresh();
    padFocus(cellEls()[keep]);
  };
  window.addEventListener('padback', onBack);
}
