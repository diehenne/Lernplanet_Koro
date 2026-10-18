import { sfx } from './sfx';
import { makeWall } from '../core/wall';
import { MAX_STARS, type Profile } from '../core/types';
import { areaLevel } from '../core/riddles';
import { earn } from '../core/money';
import { de } from '../i18n/de';

export interface WallUiSpec {
  root: HTMLElement;
  profile: Profile;
  save: () => void;
  onChange: () => void;
  onDone: (r: { earned: number; star: boolean; mistakes: number } | null) => void;
}

/** Zahlenmauer lösen: Stein wählen, Zahl tippen. Richtige Zahlen rasten ein. */
export function runWall(spec: WallUiSpec): void {
  const p = spec.profile;
  const wall = makeWall(areaLevel(p, 'wall'), Math.random);
  const { rows, solution } = wall;
  const solved = wall.given.map((r) => [...r]);
  const typed = solution.map((r) => r.map(() => ''));
  let sel: [number, number] | null = null;
  let mistakes = 0;
  let done = false;

  const first = (): [number, number] | null => {
    for (let r = rows - 1; r >= 0; r--) for (let c = 0; c <= r; c++) if (!solved[r][c]) return [r, c];
    return null;
  };
  sel = first();

  const finish = (aborted: boolean): void => {
    done = true;
    removeEventListener('keydown', onKey);
    let earned = 0, star = false;
    if (!aborted) {
      const lv = areaLevel(p, 'wall');
      if (!mistakes && lv < 6) p.areaLevels.wall = lv + 1;
      else if (mistakes >= 4 && lv > 1) p.areaLevels.wall = lv - 1;
      earned = 4 + rows * 2;
      earn(p, earned);
      if (!mistakes && p.stars < MAX_STARS) { p.stars++; star = true; }
    }
    spec.save();
    spec.onChange();
    spec.root.innerHTML = '';
    spec.onDone(aborted ? null : { earned, star, mistakes });
  };

  const render = (msg = ''): void => {
    const html = solution.map((row, r) => {
      const bricks = row.map((v, c) => {
        const isSel = sel && sel[0] === r && sel[1] === c;
        const txt = solved[r][c] ? String(v) : typed[r][c] || '&nbsp;';
        const cls = ['brick', wall.given[r][c] ? 'given' : solved[r][c] ? 'ok' : '', isSel ? 'sel' : ''].join(' ');
        return `<button class="${cls}" data-r="${r}" data-c="${c}">${txt}</button>`;
      }).join('');
      return `<div class="brow">${bricks}</div>`;
    }).join('');
    document.getElementById('wallbox')!.innerHTML = html;
    document.getElementById('whint')!.textContent = msg || de.wall.help;
    document.querySelectorAll<HTMLElement>('.brick').forEach((b) =>
      b.addEventListener('click', () => {
        const r = Number(b.dataset.r), c = Number(b.dataset.c);
        if (solved[r][c]) return;
        sel = [r, c];
        render();
      }),
    );
  };

  const press = (k: string): void => {
    if (done || !sel) return;
    const [r, c] = sel;
    if (k === '⌫') { typed[r][c] = typed[r][c].slice(0, -1); render(); return; }
    typed[r][c] += k;
    const want = String(solution[r][c]);
    if (typed[r][c] === want) {
      solved[r][c] = true;
      typed[r][c] = '';
      sfx('place');
      sel = first();
      if (!sel) {
        done = true;
        sfx('correct');
        render(de.wall.solved);
        setTimeout(() => finish(false), 1400);
        return;
      }
      render();
    } else if (typed[r][c].length >= want.length) {
      mistakes++;
      sfx('nope');
      typed[r][c] = '';
      render(de.wall.wrong);
    } else render();
  };

  const onKey = (e: KeyboardEvent): void => {
    if (e.key >= '0' && e.key <= '9') press(e.key);
    else if (e.key === 'Backspace' || e.key === 'Delete') press('⌫');
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '⌫'];
  spec.root.innerHTML = `<div class="panel center"><h2>🧱 ${de.wall.title}</h2>
    <p class="hint" id="whint"></p>
    <div id="wallbox" class="wall"></div>
    <div class="sudoku-pad">${keys.map((k) => `<button class="${k === '⌫' ? 'alt' : ''}" data-k="${k}">${k}</button>`).join('')}</div>
    <div><button class="alt" id="abort">✖ ${de.abort}</button></div></div>`;
  spec.root.querySelectorAll<HTMLElement>('.sudoku-pad button').forEach((b) => b.addEventListener('click', () => press(b.dataset.k!)));
  document.getElementById('abort')!.addEventListener('click', () => finish(true));
  addEventListener('keydown', onKey);
  render();
}
