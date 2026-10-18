import { sfx } from '../../ui/sfx';
import { nextTask, recordResult } from '../../core/adaptive';
import { makeChoices } from '../../core/generator';
import { gapHintSteps, hintSteps } from '../../core/hints';
import { earn } from '../../core/money';
import { PERFECT_BONUS, rupeeReward } from '../../core/shop';
import { ROUND_LENGTH, type Op, type Profile } from '../../core/types';
import { rewardChips } from '../../ui/coins';
import { de } from '../../i18n/de';
import { speak } from '../../ui/speech';
import { calcVisual, equation, gapVisual } from './visuals';

export type Variant = 'calc' | 'gap';

export interface RoundResult {
  stars: number;
  earned: number;
  perfect: boolean;
}

export interface RoundSpec {
  root: HTMLElement;
  profile: Profile;
  op: Op;
  variant: Variant;
  save: () => void;
  onChange: () => void;
  onDone: (r: RoundResult) => void;
  onAbort: () => void;
}

const KEYPAD_FROM_LEVEL = 3;

/**
 * 5 Aufgaben pro Runde. Leichte Stufen: Auswahl aus 4 Zahlen; ab Stufe 3 tippt das Kind die Antwort
 * selbst ein. Fehler werden nie bestraft: der Lösungsweg wird erklärt, dann darf man es nochmal versuchen.
 */
export function runRound(spec: RoundSpec): void {
  const gap = spec.variant === 'gap';
  let index = 0;
  let stars = 0;
  let earned = 0;
  let cleanup = () => {};

  const finish = (): void => {
    cleanup();
    const perfect = stars === ROUND_LENGTH;
    if (perfect) {
      earn(spec.profile, PERFECT_BONUS);
      earned += PERFECT_BONUS;
    }
    spec.save();
    spec.onChange();
    spec.root.innerHTML = '';
    spec.onDone({ stars, earned, perfect });
  };

  const next = (): void => {
    cleanup();
    if (index >= ROUND_LENGTH) return finish();
    index++;
    const task = nextTask(spec.profile, spec.op);
    const target = gap ? task.b : task.answer;
    const useKeypad = task.level >= KEYPAD_FROM_LEVEL;
    const title = gap ? `🌉 ${de.gapTitle}` : `🧮 ${de.calcTitle}`;

    spec.root.innerHTML = '';
    const panel = document.createElement('div');
    panel.className = 'panel center';
    panel.innerHTML = `<h2>${title} <small>${de.level} ${task.level} · ${index}/${ROUND_LENGTH}</small></h2>
      <div class="area">${gap ? gapVisual(task) : calcVisual(task)}</div>
      <div class="task-big">${equation(task, gap)}</div>
      <div class="input"></div><div class="hint hidden"></div>
      <div><button class="alt" id="abort">✖ ${de.abort}</button></div>`;
    spec.root.appendChild(panel);
    panel.querySelector('#abort')!.addEventListener('click', () => {
      cleanup();
      spec.save();
      spec.onChange();
      spec.root.innerHTML = '';
      spec.onAbort();
    });
    const inputEl = panel.querySelector<HTMLElement>('.input')!;
    const hintEl = panel.querySelector<HTMLElement>('.hint')!;

    void speak(gap ? de.gapQ(task) : de.calcQ(task.a, task.op, task.b));

    let firstTry = true;
    let locked = false;

    const correct = (): void => {
      locked = true;
      sfx('correct');
      const lvl = firstTry ? recordResult(spec.profile, task, true) : null;
      if (firstTry) stars++;
      const reward = rupeeReward(task.level, firstTry);
      earned += reward;
      earn(spec.profile, reward);
      spec.save();
      spec.onChange();
      const pool = Math.random() < 0.4 ? de.greatMath : de.great;
      const praise = pool[Math.floor(Math.random() * pool.length)];
      const extra = lvl === 'up' ? ` ${de.levelUp}` : '';
      hintEl.classList.remove('hidden');
      hintEl.innerHTML = `<p>⭐ ${praise} ${rewardChips(reward)}${extra}</p>`;
      void speak(praise + extra);
      setTimeout(next, 1500);
    };

    const wrong = (): void => {
      sfx('nope');
      if (!firstTry) {
        hintEl.querySelector('.again')?.remove();
        hintEl.insertAdjacentHTML('beforeend', `<p class="again">${de.tryAgainShort}</p>`);
        return;
      }
      firstTry = false;
      const lvl = recordResult(spec.profile, task, false);
      spec.save();
      const steps = [...(gap ? gapHintSteps(task) : []), ...hintSteps(task)];
      hintEl.classList.remove('hidden');
      hintEl.innerHTML = `<p>🌱 <b>${de.tryAgain}</b></p>${steps.map((s) => `<p>${s}</p>`).join('')}${
        lvl === 'down' ? `<p>${de.levelDown}</p>` : ''
      }`;
      void speak(`${de.tryAgain} ${steps.join(' ')}`);
    };

    if (!useKeypad) {
      const wrap = document.createElement('div');
      wrap.className = 'choices';
      for (const c of makeChoices({ ...task, answer: target }, 4)) {
        const btn = document.createElement('button');
        btn.textContent = String(c);
        btn.addEventListener('click', () => {
          if (locked || btn.classList.contains('wrong')) return;
          if (c === target) {
            btn.classList.add('right');
            correct();
          } else {
            btn.classList.add('wrong');
            wrong();
          }
        });
        wrap.appendChild(btn);
      }
      inputEl.appendChild(wrap);
      return;
    }

    let typed = '';
    inputEl.innerHTML = `<div class="answer-box">&nbsp;</div><div class="keypad">${[1, 2, 3, 4, 5, 6, 7, 8, 9]
      .map((n) => `<button data-k="${n}">${n}</button>`)
      .join('')}<button class="alt" data-k="back">⌫</button><button data-k="0">0</button><button data-k="ok">✓</button></div>`;
    const box = inputEl.querySelector<HTMLElement>('.answer-box')!;
    const press = (k: string): void => {
      if (locked) return;
      if (k === 'back') typed = typed.slice(0, -1);
      else if (k === 'ok') {
        if (!typed) return;
        if (typed === String(target)) {
          box.classList.add('ok');
          correct();
        } else {
          box.classList.add('no');
          setTimeout(() => box.classList.remove('no'), 400);
          typed = '';
          wrong();
        }
      } else if (typed.length < 3 && typed !== '0') typed += k;
      box.textContent = typed || '\u00a0';
    };
    inputEl.querySelectorAll<HTMLElement>('button').forEach((b) => {
      // kein Fokus auf den Tasten, sonst löst Enter/Leertaste sie zusätzlich aus
      b.addEventListener('mousedown', (e) => e.preventDefault());
      b.addEventListener('click', () => press(b.dataset.k!));
    });
    const onKey = (e: KeyboardEvent): void => {
      if (e.repeat) return;
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') press('back');
      else if (e.key === 'Enter') press('ok');
    };
    window.addEventListener('keydown', onKey);
    cleanup = () => window.removeEventListener('keydown', onKey);
  };
  next();
}
