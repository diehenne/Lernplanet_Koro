import type { Task } from '../../core/types';
import { OP_SYMBOL } from '../../core/types';

const FRUITS = ['🍎', '🍐', '🍊', '🍓', '🍋'];

function basket(n: number, fruit: string, gone = 0): string {
  const shown = fruit.repeat(n - gone) + `<span class="gone">${fruit.repeat(gone)}</span>`;
  return `<div class="basket">${shown}</div>`;
}

/** Konkrete Bilder nur auf leichten Stufen und bei kleinen Zahlen (danach wird abstrakt gerechnet). */
export function calcVisual(t: Task): string {
  const f = FRUITS[t.a % FRUITS.length];
  const f2 = FRUITS[(t.b + 2) % FRUITS.length];
  if (t.level > 3) return '';
  switch (t.op) {
    case 'add':
      return t.a <= 20 && t.b <= 20 ? `<div class="fruits">${basket(t.a, f)}<span class="plus">+</span>${basket(t.b, f2)}</div>` : '';
    case 'sub':
      return t.a <= 20 ? `<div class="fruits">${basket(t.a, f, t.b)}</div>` : '';
    case 'mul': {
      if (t.a * t.b > 60 || t.b > 12) return '';
      const cell = `<span>${f}</span>`;
      return `<div class="grid" style="grid-template-columns:repeat(${t.b},1fr)">${cell.repeat(t.a * t.b)}</div>`;
    }
    case 'div': {
      if (t.a > 40) return '';
      const group = `<div class="basket">${f.repeat(t.answer)}</div>`;
      return `<div class="fruits">${group.repeat(t.b)}</div>`;
    }
  }
}

export function gapVisual(t: Task): string {
  if (t.level > 3 || t.op !== 'add' || t.answer > 20) return '';
  const planks = Array.from({ length: t.answer }, (_, i) => `<div class="plank ${i < t.a ? '' : 'gap'}"></div>`).join('');
  return `<div class="bridge"><span class="cliff">⛰️</span><div class="plank-row">${planks}</div><span class="cliff">⛰️</span></div>`;
}

export function equation(t: Task, gap: boolean): string {
  const sym = OP_SYMBOL[t.op];
  return gap ? `${t.a} ${sym} ? = ${t.answer}` : `${t.a} ${sym} ${t.b} = ?`;
}
