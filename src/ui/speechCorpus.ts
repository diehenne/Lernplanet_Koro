import { OPS, type Task } from '../core/types';
import { kindsFor, makeTask } from '../core/generator';
import { gapHintSteps, hintSteps } from '../core/hints';
import { de, spokenStatics } from '../i18n/de';
import { OP_WORDS, fileFor, numberWords, segmentsOf } from './speechText';

/** Liefert Dateiname → gesprochener Text für alle benötigten Audio-Bausteine. */
export function collectCorpus(): Map<string, string> {
  const corpus = new Map<string, string>();
  for (let n = 0; n <= 200; n++) corpus.set(`n${n}`, numberWords(n));
  for (const w of Object.values(OP_WORDS)) corpus.set(w.file, w.text);

  const add = (text: string) => {
    for (const seg of segmentsOf(text)) if (seg.type === 'text') corpus.set(fileFor(seg), seg.text);
  };

  spokenStatics().forEach(add);
  for (const op of OPS) {
    for (let level = 1; level <= 6; level++) {
      for (const kind of kindsFor(op, level)) {
        for (let i = 0; i < 150; i++) {
          const t: Task = makeTask(op, kind, level);
          add(de.calcQ(t.a, t.op, t.b));
          add(de.gapQ(t));
          hintSteps(t).forEach(add);
          gapHintSteps(t).forEach(add);
        }
      }
    }
  }
  return corpus;
}
