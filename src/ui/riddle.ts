import { sfx } from './sfx';
import { pick } from '../core/generator';
import { ENGLISH_KINDS, RIDDLE_KINDS, makeRiddle, storyFor, type Riddle } from '../core/riddles';
import { MAX_STARS, type Profile } from '../core/types';
import { earn } from '../core/money';
import { de } from '../i18n/de';
import { speakEnglish } from './english';
import { speak } from './speech';

export interface TalkSpec {
  root: HTMLElement;
  profile: Profile;
  kid: string;
  save: () => void;
  onChange: () => void;
  onClose: () => void;
}

const STORY_REWARD = 8;

/** Gespräch mit einem Korok: Geschichte in Kapiteln mit Rätseln, danach kleine Zusatzrätsel. */
export function openTalk(spec: TalkSpec): void {
  const p = spec.profile;
  const story = storyFor(spec.kid);
  const total = story.chapters.length;
  const rng = Math.random;

  const close = (): void => {
    spec.root.innerHTML = '';
    spec.onClose();
  };
  const show = (head: string, body: string): void => {
    spec.root.innerHTML = `<div class="panel center talk"><div class="speaker">${story.emoji} 🌱</div>${head}${body}
      <div><button class="alt" id="close">${de.riddle.bye}</button></div></div>`;
    document.getElementById('close')!.addEventListener('click', close);
  };
  const gain = (rupees: number, star: boolean): void => {
    earn(p, rupees);
    if (star) p.stars = Math.min(MAX_STARS, p.stars + 1);
    spec.save();
    spec.onChange();
  };

  const ask = (text: string | null, riddle: Riddle, onRight: (firstTry: boolean) => void): void => {
    let wrong = 0;
    const head = `<h2>${story.title}</h2>${text ? `<p class="story">${text}</p>` : ''}`;
    const body = `<p class="task-big">${riddle.prompt}${riddle.en ? ' <button class="alt say" id="say">🔊</button>' : ''}</p>
      <div class="choices">${riddle.options.map((o, i) => `<button data-i="${i}">${o}</button>`).join('')}</div><p class="hint" id="hint">&nbsp;</p>`;
    show(head, body);
    if (text) void speak(text);
    const hint = document.getElementById('hint')!;
    document.getElementById('say')?.addEventListener('click', () => speakEnglish(riddle.en!));
    spec.root.querySelectorAll<HTMLButtonElement>('.choices button').forEach((b) =>
      b.addEventListener('click', () => {
        if (Number(b.dataset.i) !== riddle.answer) {
          wrong++;
          sfx('nope');
          b.disabled = true;
          b.classList.add('wrong');
          hint.textContent = de.tryAgainShort;
          void speak(de.tryAgainShort);
          return;
        }
        b.classList.add('right');
        sfx('correct');
        if (riddle.en) speakEnglish(riddle.en);
        spec.root.querySelectorAll<HTMLButtonElement>('.choices button').forEach((x) => (x.disabled = true));
        hint.textContent = `${de.riddle.right} ${riddle.hint}`;
        void speak(pick(rng, de.great));
        setTimeout(() => onRight(wrong === 0), 1700);
      }),
    );
  };

  const chapter = (i: number): void => {
    if (i >= total) return finish();
    ask(story.chapters[i].text, makeRiddle(story.chapters[i].kind, rng), (first) => {
      p.talked[spec.kid] = i + 1;
      gain(first ? 1 : 0, false);
      chapter(i + 1);
    });
  };

  const finish = (): void => {
    gain(STORY_REWARD, true);
    show(
      `<h2>${de.riddle.done}</h2><p class="story">${story.ending}</p>`,
      `<p class="chip">${de.riddle.bonus(STORY_REWARD, true)}</p>`,
    );
    void speak(story.ending);
  };

  const quick = (): void => {
    ask(null, makeRiddle(pick(rng, rng() < 0.65 ? ENGLISH_KINDS : RIDDLE_KINDS), rng), (first) => {
      p.talked.quick = (p.talked.quick ?? 0) + 1;
      const star = first && p.talked.quick % 3 === 0;
      gain(first ? 1 : 0, star);
      show(`<h2>${de.riddle.right}</h2>`, `<p class="chip">${de.riddle.bonus(first ? 1 : 0, star)}</p><div><button id="again">${de.riddle.again}</button></div>`);
      document.getElementById('again')!.addEventListener('click', quick);
    });
  };

  const done = p.talked[spec.kid] ?? 0;
  if (done >= total) return quick();
  if (done === 0) {
    show(`<h2>${story.title}</h2>`, `<p class="story">${story.intro}</p><div><button id="go">${de.riddle.next}</button></div>`);
    void speak(story.intro);
    document.getElementById('go')!.addEventListener('click', () => chapter(0));
  } else chapter(done);
}
