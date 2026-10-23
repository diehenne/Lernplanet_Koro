import { sfx } from './sfx';
import { ENGLISH_KINDS, areaLevel, levelRiddle, makeRiddle, type RiddleKind } from '../core/riddles';
import { MAX_STARS, ROUND_LENGTH, type Profile } from '../core/types';
import { earn } from '../core/money';
import { de } from '../i18n/de';
import { pick } from '../core/generator';

/** Englische Wörter mit der Stimme des Browsers vorlesen (falls vorhanden). */
export function speakEnglish(text: string): void {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-GB';
  u.rate = 0.85;
  window.speechSynthesis.speak(u);
}

export interface EnglishSpec {
  root: HTMLElement;
  profile: Profile;
  save: () => void;
  onChange: () => void;
  onDone: (r: { right: number; earned: number; star: boolean } | null) => void;
  /** Bereichs-ID (für die Stufe). */
  area?: string;
  /** Fachgebiet der Runde (Standard: Englisch). */
  subject?: { emoji: string; title: string; kinds: RiddleKind[] };
}

/** Runde in einem Lernbereich (Englisch, Deutsch, Wissen, Rätsel): 5 Multiple-Choice-Fragen, jederzeit abbrechbar. */
export function runEnglishRound(spec: EnglishSpec): void {
  const subject = spec.subject ?? { emoji: '🇬🇧', title: 'English', kinds: ENGLISH_KINDS };
  let index = 0;
  let right = 0;
  let earned = 0;
  const areaId = spec.area ?? 'english';
  const level = areaLevel(spec.profile, areaId);

  const finish = (aborted: boolean): void => {
    let star = false;
    if (!aborted) {
      const p = spec.profile;
      if (right >= 4 && level < 6) p.areaLevels[areaId] = level + 1;
      else if (right <= 2 && level > 1) p.areaLevels[areaId] = level - 1;
    }
    if (!aborted && right === ROUND_LENGTH) {
      earned += 5;
      earn(spec.profile, 5);
      if (spec.profile.stars < MAX_STARS) {
        spec.profile.stars++;
        star = true;
      }
    }
    spec.save();
    spec.onChange();
    spec.root.innerHTML = '';
    spec.onDone(aborted ? null : { right, earned, star });
  };

  const next = (): void => {
    if (index >= ROUND_LENGTH) return finish(false);
    index++;
    const r = levelRiddle(makeRiddle(pick(Math.random, subject.kinds), Math.random, level), level, Math.random);
    spec.root.innerHTML = `<div class="panel center talk"><h2>${subject.emoji} ${subject.title} <small>${index}/${ROUND_LENGTH} · ${de.level} ${level}</small></h2>
      <p class="task-big">${r.prompt}${r.en ? ` <button class="alt say" id="say">🔊</button>` : ''}</p>
      <div class="choices">${r.options.map((o, i) => `<button data-i="${i}">${o}</button>`).join('')}</div>
      <p class="hint" id="hint">&nbsp;</p><div><button class="alt" id="abort">✖ ${de.abort}</button></div></div>`;
    document.getElementById('abort')!.addEventListener('click', () => finish(true));
    document.getElementById('say')?.addEventListener('click', () => speakEnglish(r.en!));
    const hint = document.getElementById('hint')!;
    let first = true;
    spec.root.querySelectorAll<HTMLButtonElement>('.choices button').forEach((b) =>
      b.addEventListener('click', () => {
        if (Number(b.dataset.i) !== r.answer) {
          first = false;
          b.disabled = true;
          b.classList.add('wrong');
          hint.textContent = de.tryAgainShort;
          return;
        }
        b.classList.add('right');
        spec.root.querySelectorAll<HTMLButtonElement>('.choices button').forEach((x) => (x.disabled = true));
        const gain = first ? (level >= 5 ? 4 : level >= 3 ? 3 : 2) : 0;
        if (first) right++;
        earned += gain;
        earn(spec.profile, gain);
        spec.save();
        spec.onChange();
        sfx('correct');
        if (r.en) speakEnglish(r.en);
        hint.textContent = `${de.riddle.right} ${r.hint}${gain ? ` +${gain}` : ''}`;
        setTimeout(next, 1600);
      }),
    );
  };
  next();
}
