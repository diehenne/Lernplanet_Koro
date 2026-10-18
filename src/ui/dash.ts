import { sfx } from './sfx';
import { DASH_SECONDS, addScore, makeDashTask, type DashTask } from '../core/dash';
import { loadScores, saveScores } from '../core/storage';
import { earn } from '../core/money';
import type { Profile } from '../core/types';
import { de } from '../i18n/de';
import { rewardChips } from './coins';

export interface DashSpec {
  root: HTMLElement;
  profile: Profile;
  save: () => void;
  onChange: () => void;
  onClose: () => void;
}

const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

function board(rank = -1): string {
  const list = loadScores();
  if (!list.length) return `<p><small>${de.dash.empty}</small></p>`;
  return `<ol>${list.map((e, i) => `<li class="${i === rank ? 'me' : ''}">${e.avatar} ${esc(e.name)} – ${e.score}</li>`).join('')}</ol>`;
}

/** Bello der Hund: Rechen-Rennen, so viele gemischte Aufgaben bis 20 wie möglich in einer Minute. */
export function runDash(spec: DashSpec): void {
  let timer = 0;
  let onKey: ((e: KeyboardEvent) => void) | null = null;
  const stop = (): void => {
    clearInterval(timer);
    if (onKey) removeEventListener('keydown', onKey);
    onKey = null;
  };
  const close = (): void => {
    stop();
    spec.root.innerHTML = '';
    spec.onClose();
  };

  const intro = (): void => {
    spec.root.innerHTML = `<div class="panel center dash"><h2>🐶 ${de.dash.title}</h2>
      <p>${de.dash.intro}</p><h3>${de.dash.best}</h3>${board()}
      <div><button id="go">${de.dash.start}</button> <button class="alt" id="abort">✖ ${de.abort}</button></div></div>`;
    document.getElementById('go')!.addEventListener('click', play);
    document.getElementById('abort')!.addEventListener('click', close);
  };

  const play = (): void => {
    let score = 0;
    let task: DashTask = makeDashTask();
    let locked = false;
    const end = Date.now() + DASH_SECONDS * 1000;
    spec.root.innerHTML = `<div class="panel center dash"><h2>🐶 ${de.dash.title}</h2>
      <div class="timer" id="dt"><i id="di" style="width:100%"></i></div>
      <div class="score" id="ds">${de.dash.score(0)}</div>
      <div class="q" id="dq"></div><div class="choices" id="dc"></div>
      <div><button class="alt" id="abort">✖ ${de.abort}</button></div></div>`;
    const dq = document.getElementById('dq')!;
    const dc = document.getElementById('dc')!;

    const show = (): void => {
      dq.textContent = `${task.text} = ?`;
      dc.innerHTML = task.choices.map((c) => `<button data-v="${c}">${c}</button>`).join('');
      dc.querySelectorAll<HTMLButtonElement>('button').forEach((b) => b.addEventListener('click', () => answer(b)));
      locked = false;
    };
    const answer = (b: HTMLButtonElement): void => {
      if (locked) return;
      locked = true;
      if (Number(b.dataset.v) === task.answer) {
        score++;
        sfx('correct');
        b.classList.add('right');
        document.getElementById('ds')!.textContent = de.dash.score(score);
        setTimeout(() => { task = makeDashTask(); show(); }, 150);
      } else {
        sfx('nope');
        b.classList.add('wrong');
        setTimeout(() => { task = makeDashTask(); show(); }, 400);
      }
    };
    onKey = (e: KeyboardEvent): void => {
      const i = Number(e.key) - 1;
      const b = dc.querySelectorAll<HTMLButtonElement>('button')[i];
      if (b) answer(b);
    };
    addEventListener('keydown', onKey);
    document.getElementById('abort')!.addEventListener('click', close);
    show();

    timer = window.setInterval(() => {
      const left = Math.max(0, end - Date.now());
      const bar = document.getElementById('di');
      if (bar) bar.style.width = `${(left / (DASH_SECONDS * 1000)) * 100}%`;
      document.getElementById('dt')?.classList.toggle('low', left < 5000);
      if (left <= 0) finish(score);
    }, 250);
  };

  const finish = (score: number): void => {
    stop();
    const p = spec.profile;
    const list = loadScores();
    const prevBest = list[0]?.score ?? 0;
    const rank = score > 0 ? addScore(list, { name: p.name, avatar: p.avatar, score }) : -1;
    saveScores(list);
    const earned = Math.min(15, Math.floor(score / 2));
    if (earned) earn(p, earned);
    spec.save();
    spec.onChange();
    sfx(rank === 0 && score > prevBest ? 'discover' : 'correct');
    spec.root.innerHTML = `<div class="panel center dash"><h2>🐶 ${de.dash.result(score)}</h2>
      ${rank === 0 && score > prevBest ? `<p>${de.dash.record}</p>` : rank >= 0 ? `<p>${de.dash.top(rank + 1)}</p>` : ''}
      ${earned ? `<p class="chip">${rewardChips(earned)}</p>` : ''}
      <h3>${de.dash.best}</h3>${board(rank)}
      <div><button id="again">${de.dash.again}</button> <button class="alt" id="abort">✖ ${de.abort}</button></div></div>`;
    document.getElementById('again')!.addEventListener('click', play);
    document.getElementById('abort')!.addEventListener('click', close);
  };

  intro();
}
