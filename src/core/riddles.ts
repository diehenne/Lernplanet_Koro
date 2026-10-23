import { pick, type Rng } from './generator';
import { setLessonLevel, makeGeneral, makeGerman, makePuzzle } from './lessons';

/** Rätsel für die 2.–4. Klasse: Rechtschreibung, Englisch, Wortschatz und Sachkunde. */
export type RiddleKind = 'spell' | 'gap' | 'vocab' | 'odd' | 'opposite' | 'fact' | 'order' | 'espell' | 'esent' | 'eodd' | 'german' | 'general' | 'puzzle';

export interface Riddle {
  kind: RiddleKind;
  prompt: string;
  options: string[];
  answer: number;
  /** Wird nach einer falschen Antwort gezeigt. */
  hint: string;
  /** Englischer Text, der per Browser-Stimme vorgelesen werden kann. */
  en?: string;
}

export const SPELL: [string, string, string, string][] = [
  ['🐴', 'Pferd', 'Pfert', 'Ferd'], ['🚲', 'Fahrrad', 'Farrad', 'Fahrat'], ['🏠', 'Haus', 'Hauß', 'Hous'],
  ['🐱', 'Katze', 'Kaze', 'Katse'], ['🐶', 'Hund', 'Hunt', 'Hundt'], ['🌞', 'Sonne', 'Sone', 'Zonne'],
  ['🍎', 'Apfel', 'Apfell', 'Apvel'], ['🍌', 'Banane', 'Bannane', 'Banahne'], ['📖', 'Buch', 'Buhc', 'Bouch'],
  ['🌳', 'Baum', 'Bohm', 'Baumm'], ['🐟', 'Fisch', 'Visch', 'Fiesch'], ['🦆', 'Ente', 'Ennte', 'Enthe'],
  ['🐘', 'Elefant', 'Elefand', 'Ellefant'], ['🚂', 'Zug', 'Zuck', 'Zugg'], ['🍞', 'Brot', 'Broot', 'Brod'],
  ['🧀', 'Käse', 'Kese', 'Käße'], ['🐭', 'Maus', 'Mauss', 'Mous'], ['🌙', 'Mond', 'Mont', 'Mondd'],
  ['⭐', 'Stern', 'Schtern', 'Sterrn'], ['🦁', 'Löwe', 'Lewe', 'Löwee'], ['🐰', 'Hase', 'Hasse', 'Haase'],
  ['🐻', 'Bär', 'Ber', 'Bähr'], ['🍪', 'Keks', 'Kecks', 'Kegs'], ['🚗', 'Auto', 'Aoto', 'Autto'],
  ['🌸', 'Blume', 'Bluhme', 'Blumme'], ['🪁', 'Drachen', 'Drachn', 'Drakhen'], ['⚽', 'Fußball', 'Fusball', 'Fuhsball'],
  ['🏰', 'Schloss', 'Schlos', 'Schlozz'], ['🦋', 'Schmetterling', 'Schmeterling', 'Schmetterlink'],
  ['🐢', 'Schildkröte', 'Schildkrete', 'Shildkröte'], ['🐸', 'Frosch', 'Frossch', 'Frosck'],
];

export const GAP: [string, string, string, string][] = [
  ['Sp_gel', 'ie', 'i', 'ih'], ['Z_l', 'ie', 'i', 'ih'], ['B_ne', 'ie', 'i', 'ih'], ['K_ste', 'i', 'ie', 'a'],
  ['B_r', 'ä', 'e', 'ee'], ['M_dchen', 'ä', 'e', 'ö'], ['K_se', 'ä', 'e', 'ö'], ['W_ld', 'a', 'ä', 'o'],
  ['H_ser', 'äu', 'eu', 'au'], ['M_se', 'äu', 'eu', 'oi'], ['Fr_nd', 'eu', 'äu', 'oi'], ['B_me', 'äu', 'eu', 'ei'],
  ['Be_', 'tt', 't', 'dd'], ['Ka_e', 'tz', 'z', 'ts'], ['Mü_e', 'tz', 'z', 'ts'], ['Pla_', 'tz', 'z', 'ts'],
  ['Ja_e', 'ck', 'k', 'gg'], ['Zu_er', 'ck', 'k', 'gg'], ['Fi_', 'sch', 'ch', 's'], ['_ule', 'Sch', 'Ch', 'S'],
  ['_iff', 'Sch', 'Ch', 'Sp'], ['Fu_', 'ß', 'ss', 's'], ['Stra_e', 'ß', 'ss', 's'], ['Wa_er', 'ss', 's', 'ß'],
  ['_ogel', 'V', 'F', 'W'], ['_ater', 'V', 'F', 'W'], ['Hun_', 'd', 't', 'dt'], ['Ber_', 'g', 'k', 'ch'],
  ['Bro_', 't', 'd', 'dt'], ['Kin_', 'd', 't', 'dt'], ['Nu_', 'ss', 's', 'z'],
];

export const VOCAB: [string, string, string][] = [
  ['cat', 'Katze', '🐱'], ['dog', 'Hund', '🐶'], ['house', 'Haus', '🏠'], ['tree', 'Baum', '🌳'], ['sun', 'Sonne', '☀️'],
  ['moon', 'Mond', '🌙'], ['star', 'Stern', '⭐'], ['water', 'Wasser', '💧'], ['apple', 'Apfel', '🍎'], ['bread', 'Brot', '🍞'],
  ['milk', 'Milch', '🥛'], ['book', 'Buch', '📖'], ['school', 'Schule', '🏫'], ['car', 'Auto', '🚗'], ['bike', 'Fahrrad', '🚲'],
  ['ball', 'Ball', '⚽'], ['fish', 'Fisch', '🐟'], ['bird', 'Vogel', '🐦'], ['horse', 'Pferd', '🐴'], ['mouse', 'Maus', '🐭'],
  ['red', 'rot', '🔴'], ['blue', 'blau', '🔵'], ['green', 'grün', '🟢'], ['yellow', 'gelb', '🟡'], ['black', 'schwarz', '⚫'],
  ['white', 'weiß', '⚪'], ['two', 'zwei', '2️⃣'], ['three', 'drei', '3️⃣'], ['four', 'vier', '4️⃣'], ['five', 'fünf', '5️⃣'],
  ['six', 'sechs', '6️⃣'], ['seven', 'sieben', '7️⃣'], ['eight', 'acht', '8️⃣'], ['nine', 'neun', '9️⃣'], ['ten', 'zehn', '🔟'],
  ['mother', 'Mutter', '👩'], ['father', 'Vater', '👨'], ['sister', 'Schwester', '👧'], ['brother', 'Bruder', '👦'],
  ['friend', 'Freund', '🤝'], ['hello', 'Hallo', '👋'], ['goodbye', 'Tschüss', '🖐️'], ['please', 'bitte', '🙏'],
  ['thank you', 'danke', '😊'], ['yes', 'ja', '✅'], ['no', 'nein', '❌'], ['big', 'groß', '🐘'], ['small', 'klein', '🐜'],
  ['hot', 'heiß', '🔥'], ['cold', 'kalt', '🧊'], ['happy', 'glücklich', '😀'], ['sad', 'traurig', '😢'], ['hand', 'Hand', '✋'],
  ['eye', 'Auge', '👁️'], ['nose', 'Nase', '👃'], ['rain', 'Regen', '🌧️'], ['snow', 'Schnee', '❄️'], ['flower', 'Blume', '🌸'],
  ['door', 'Tür', '🚪'], ['bed', 'Bett', '🛏️'], ['cake', 'Kuchen', '🍰'], ['egg', 'Ei', '🥚'], ['cheese', 'Käse', '🧀'],
];

export const SENT: [string, string, string, string][] = [
  ['I ___ a boy.', 'am', 'is', 'are'], ['She ___ my friend.', 'is', 'am', 'are'], ['We ___ happy.', 'are', 'is', 'am'],
  ['He ___ a dog.', 'has', 'have', 'are'], ['I ___ two cats.', 'have', 'has', 'is'], ['They ___ at school.', 'are', 'is', 'am'],
  ['It ___ a big house.', 'is', 'are', 'am'], ['You ___ my best friend.', 'are', 'is', 'am'], ['My name ___ Tom.', 'is', 'am', 'are'],
  ['I ___ apples.', 'like', 'likes', 'liking'], ['She ___ milk.', 'likes', 'like', 'liking'], ['Good ___! (am Morgen)', 'morning', 'night', 'bye'],
  ['How ___ you?', 'are', 'is', 'am'], ['What is ___ name? (dein)', 'your', 'you', 'yours'], ['This ___ my book.', 'is', 'are', 'am'],
  ['I can ___ a ball.', 'kick', 'kicks', 'kicking'], ['Can you ___ me, please?', 'help', 'helps', 'helping'], ['The sun is ___ . (gelb)', 'yellow', 'yelow', 'yello'],
];
export const EODD: [string, string[]][] = [
  ['animals', ['dog', 'cat', 'horse', 'mouse', 'bird', 'cow']], ['colours', ['red', 'blue', 'green', 'yellow', 'black', 'white']],
  ['food', ['apple', 'bread', 'milk', 'cake', 'egg', 'cheese']], ['family', ['mother', 'father', 'sister', 'brother']],
  ['numbers', ['two', 'three', 'four', 'five', 'six', 'ten']], ['body', ['hand', 'eye', 'nose', 'arm', 'leg', 'foot']],
  ['weather', ['rain', 'snow', 'sun', 'wind', 'cloud']], ['school', ['book', 'pen', 'desk', 'teacher', 'bag']],
];
const WRONG_SPELL = (w: string): string[] => {
  const out = new Set<string>();
  if (w.length > 2) out.add(w.slice(0, 1) + w.slice(2, 3) + w.slice(1, 2) + w.slice(3));
  if (w.length > 3) out.add(w.slice(0, -1));
  out.add(w + w[w.length - 1]);
  out.add(w.replace(/[aeiou]/, (v) => (v === 'e' ? 'a' : 'e')));
  out.delete(w);
  return [...out];
};

export const ODD: [string, string[]][] = [
  ['Tiere', ['Hund', 'Katze', 'Pferd', 'Kuh', 'Schaf']], ['Obst', ['Apfel', 'Birne', 'Banane', 'Kirsche', 'Erdbeere']],
  ['Gemüse', ['Möhre', 'Gurke', 'Tomate', 'Kartoffel']], ['Fahrzeuge', ['Auto', 'Bus', 'Zug', 'Fahrrad', 'Schiff']],
  ['Farben', ['rot', 'blau', 'grün', 'gelb']], ['Möbel', ['Tisch', 'Stuhl', 'Bett', 'Schrank']],
  ['Körperteile', ['Hand', 'Fuß', 'Kopf', 'Nase', 'Bein']], ['Kleidung', ['Hose', 'Jacke', 'Mütze', 'Schuh', 'Socke']],
  ['Berufe', ['Bäcker', 'Lehrer', 'Arzt', 'Pilot']], ['Wetter', ['Regen', 'Schnee', 'Sturm', 'Wind', 'Nebel']],
  ['Musikinstrumente', ['Geige', 'Flöte', 'Trommel', 'Gitarre']], ['Jahreszeiten', ['Frühling', 'Sommer', 'Herbst', 'Winter']],
  ['Schulsachen', ['Stift', 'Heft', 'Lineal', 'Radiergummi']],
];

export const OPPOSITE: [string, string][] = [
  ['groß', 'klein'], ['heiß', 'kalt'], ['hell', 'dunkel'], ['schnell', 'langsam'], ['laut', 'leise'], ['alt', 'jung'],
  ['dick', 'dünn'], ['hoch', 'tief'], ['lang', 'kurz'], ['schwer', 'leicht'], ['nass', 'trocken'], ['leer', 'voll'],
  ['früh', 'spät'], ['hart', 'weich'], ['Tag', 'Nacht'], ['oben', 'unten'], ['offen', 'geschlossen'], ['stark', 'schwach'],
  ['froh', 'traurig'], ['süß', 'sauer'],
];

export const FACTS: [string, string, string, string][] = [
  ['Wie heißt die Hauptstadt von Deutschland?', 'Berlin', 'Hamburg', 'München'],
  ['Welche Farbe entsteht, wenn man Blau und Gelb mischt?', 'Grün', 'Orange', 'Lila'],
  ['Welches Tier legt Eier?', 'Das Huhn', 'Die Kuh', 'Der Hund'],
  ['Was braucht eine Pflanze zum Wachsen?', 'Licht und Wasser', 'Nur Steine', 'Schokolade'],
  ['Welches ist das größte Landtier?', 'Der Elefant', 'Das Pferd', 'Der Bär'],
  ['In welcher Jahreszeit fallen die Blätter von den Bäumen?', 'Im Herbst', 'Im Frühling', 'Im Sommer'],
  ['Wie heißt der Stern, der uns Licht und Wärme gibt?', 'Die Sonne', 'Der Mond', 'Der Mars'],
  ['Wie nennt man ein Baby vom Hund?', 'Welpe', 'Küken', 'Kalb'],
  ['Wie nennt man ein Baby von der Kuh?', 'Kalb', 'Fohlen', 'Lamm'],
  ['Wie nennt man ein Baby vom Pferd?', 'Fohlen', 'Kalb', 'Ferkel'],
  ['Wie nennt man gefrorenes Wasser?', 'Eis', 'Dampf', 'Nebel'],
  ['Wie viele Beine hat eine Spinne?', '8', '6', '10'],
  ['Wie viele Monate hat ein Jahr?', '12', '10', '11'],
  ['Welches Meer liegt im Norden von Deutschland?', 'Die Nordsee', 'Das Rote Meer', 'Das Schwarze Meer'],
  ['Woraus backt man Brot?', 'Aus Mehl', 'Aus Sand', 'Aus Seife'],
  ['Welches Organ pumpt das Blut durch den Körper?', 'Das Herz', 'Die Lunge', 'Der Magen'],
  ['Womit hört man?', 'Mit den Ohren', 'Mit der Nase', 'Mit den Augen'],
  ['Wie heißt die Hauptstadt von Frankreich?', 'Paris', 'Rom', 'Madrid'],
  ['Wie heißt die Hauptstadt von Österreich?', 'Wien', 'Bern', 'Prag'],
  ['Wie heißt der höchste Berg Deutschlands?', 'Die Zugspitze', 'Der Brocken', 'Der Feldberg'],
  ['Welches Tier ist ein Säugetier?', 'Der Delfin', 'Der Hai', 'Der Frosch'],
  ['Wie nennt man Tiere, die nur Pflanzen fressen?', 'Pflanzenfresser', 'Fleischfresser', 'Allesfresser'],
];

/** Schwerere Wissensfragen für höhere Stufen. */
export const FACTS_HARD: [string, string, string, string][] = [
  ['Wie heißt die Hauptstadt von Italien?', 'Rom', 'Mailand', 'Neapel'],
  ['Wie heißt der längste Fluss Deutschlands?', 'Der Rhein', 'Die Elbe', 'Die Spree'],
  ['Welcher Planet ist der Sonne am nächsten?', 'Merkur', 'Venus', 'Mars'],
  ['Wie nennt man Tiere, die Fleisch und Pflanzen fressen?', 'Allesfresser', 'Pflanzenfresser', 'Fleischfresser'],
  ['Wie nennt man ein Baby vom Schaf?', 'Lamm', 'Fohlen', 'Kitz'],
  ['Wie viele Wochen hat ein Jahr ungefähr?', '52', '48', '60'],
  ['Wie heißt die Hauptstadt von Polen?', 'Warschau', 'Krakau', 'Prag'],
  ['Welches Tier ist ein Insekt?', 'Die Biene', 'Die Spinne', 'Die Schnecke'],
  ['Was entsteht, wenn Wasser verdunstet und in der Luft abkühlt?', 'Wolken', 'Steine', 'Sand'],
  ['Welcher Teil der Pflanze nimmt Wasser aus dem Boden auf?', 'Die Wurzel', 'Die Blüte', 'Das Blatt'],
  ['Wie heißt der größte Kontinent der Erde?', 'Asien', 'Europa', 'Australien'],
  ['Welche Jahreszeit beginnt im März?', 'Der Frühling', 'Der Sommer', 'Der Herbst'],
  ['Was ist die Hauptstadt der Niederlande?', 'Amsterdam', 'Rotterdam', 'Brüssel'],
  ['Wie viele Zähne hat ein Erwachsener normalerweise?', '32', '20', '40'],
];

const DAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function shuffle<T>(rng: Rng, list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function build(kind: RiddleKind, rng: Rng, prompt: string, right: string, wrong: string[], hint: string): Riddle {
  const options = shuffle(rng, [right, ...wrong]);
  return { kind, prompt, options, answer: options.indexOf(right), hint };
}

/** Zwei falsche Antworten aus einer Liste, die vom richtigen Wert abweichen. */
function others(rng: Rng, all: string[], right: string, skip = ''): string[] {
  return shuffle(rng, [...new Set(all)].filter((x) => x !== right && x !== skip)).slice(0, 2);
}

/** Stufe eines Lernbereichs (1–6). */
export function areaLevel(p: { areaLevels?: Record<string, number> }, id: string): number {
  return Math.min(6, Math.max(1, p.areaLevels?.[id] ?? 2));
}

/** Leichtere Stufen zeigen weniger Antworten zur Auswahl. */
export function levelRiddle(r: Riddle, level: number, rng: Rng): Riddle {
  const keep = level <= 2 ? 2 : level <= 4 ? 3 : 4;
  if (r.options.length <= keep) return r;
  const right = r.options[r.answer];
  const wrong = shuffle(rng, r.options.filter((_, i) => i !== r.answer)).slice(0, keep - 1);
  const options = shuffle(rng, [right, ...wrong]);
  return { ...r, options, answer: options.indexOf(right) };
}

const RECENT: Partial<Record<RiddleKind, string[]>> = {};
const RECENT_MAX = 12;

/** Wie makeRiddleRaw, würfelt aber neu, wenn die Frage zuletzt schon vorkam. */
export function makeRiddle(kind: RiddleKind, rng: Rng, lvl = 3): Riddle {
  setLessonLevel(lvl);
  level = lvl;
  const seen = (RECENT[kind] ??= []);
  let r = makeRiddleRaw(kind, rng);
  for (let i = 0; i < 25 && seen.includes(r.prompt + '|' + r.options[r.answer]); i++) r = makeRiddleRaw(kind, rng);
  seen.push(r.prompt + '|' + r.options[r.answer]);
  if (seen.length > RECENT_MAX) seen.shift();
  return r;
}

const CONFLICT_GROUPS = [['hell', 'Tag', 'dunkel', 'Nacht'], ['hoch', 'oben', 'tief', 'unten']];
const ODD_CLASH = new Set(['Obst|Gemüse', 'Gemüse|Obst']);

let level = 3;

function makeRiddleRaw(kind: RiddleKind, rng: Rng): Riddle {
  switch (kind) {
    case 'spell': {
      const [emoji, w, a, b] = pick(rng, SPELL);
      return build(kind, rng, `${emoji} Wie schreibt man das richtig?`, w, [a, b], `So schreibt man es: ${w}.`);
    }
    case 'gap': {
      const [word, right, a, b] = pick(rng, GAP);
      return build(kind, rng, `Was fehlt? ${word}`, right, [a, b], `Sprich das Wort langsam: ${word.replace('_', right)}.`);
    }
    case 'vocab': {
      const [en, de, emoji] = pick(rng, VOCAB);
      if (rng() < 0.5) {
              const r = build(kind, rng, `${emoji} Was heißt „${en}“ auf Deutsch?`, de, others(rng, VOCAB.map((v) => v[1]), de), `Richtig ist: ${de}.`);
        r.en = en;
        return r;
      }
      return build(kind, rng, `${emoji} Wie sagt man „${de}“ auf Englisch?`, en, others(rng, VOCAB.map((v) => v[0]), en), `Auf Englisch: ${en}.`);
    }
    case 'odd': {
      const [name, items] = pick(rng, ODD);
      const other = pick(rng, ODD.filter((g) => g[0] !== name && !ODD_CLASH.has(`${name}|${g[0]}`)));
      const oddOne = pick(rng, other[1]);
      const two = shuffle(rng, items).slice(0, 2);
      return build(kind, rng, 'Was passt nicht dazu?', oddOne, two, `Die anderen gehören alle zu: ${name}.`);
    }
    case 'opposite': {
      const [a, b] = pick(rng, OPPOSITE);
      const flip = rng() < 0.5;
      const [word, right] = flip ? [b, a] : [a, b];
      return build(kind, rng, `Was ist das Gegenteil von „${word}“?`, right, others(rng, OPPOSITE.flat().filter((x) => !CONFLICT_GROUPS.some((g) => g.includes(x) && (g.includes(word) || g.includes(right)))), right, word), `Das Gegenteil von ${word} ist ${right}.`);
    }
    case 'espell': {
      const [en, , emoji] = pick(rng, VOCAB.filter((v) => !v[0].includes(' ')));
      const wrong = shuffle(rng, WRONG_SPELL(en)).slice(0, 2);
      if (wrong.length < 2) return makeRiddleRaw('vocab', rng);
      const r = build(kind, rng, `${emoji} How do you spell it?`, en, wrong, `Richtig geschrieben: ${en}.`);
      r.en = en;
      return r;
    }
    case 'esent': {
      const [q, r, a, b] = pick(rng, SENT);
      const res = build(kind, rng, q, r, [a, b], `Der Satz heißt: ${q.replace('___', r)}`);
      res.en = q.replace('___', r).replace(/\(.*\)/, '');
      return res;
    }
    case 'eodd': {
      const [name, items] = pick(rng, EODD);
      const other = pick(rng, EODD.filter((g) => g[0] !== name));
      const oddOne = pick(rng, other[1]);
      const two = shuffle(rng, items).slice(0, 2);
      return build(kind, rng, 'Which word does not belong?', oddOne, two, `The others are all: ${name}.`);
    }
    case 'german':
      return makeGerman(rng);
    case 'general':
      return makeGeneral(rng);
    case 'puzzle':
      return makePuzzle(rng);
    case 'fact': {
      const [q, r, a, b] = pick(rng, rng() < (level <= 2 ? 0 : (level - 2) * 0.22) ? FACTS_HARD : FACTS);
      return build(kind, rng, q, r, [a, b], `Richtig ist: ${r}.`);
    }
    case 'order': {
      const t = Math.floor(rng() * 3);
      if (t === 0) {
        const i = Math.floor(rng() * 7);
        const right = DAYS[(i + 1) % 7];
        return build(kind, rng, `Welcher Tag kommt nach ${DAYS[i]}?`, right, others(rng, DAYS, right, DAYS[i]), `Nach ${DAYS[i]} kommt ${right}.`);
      }
      if (t === 1) {
        const i = Math.floor(rng() * 12);
        const right = MONTHS[(i + 11) % 12];
        return build(kind, rng, `Welcher Monat kommt vor ${MONTHS[i]}?`, right, others(rng, MONTHS, right, MONTHS[i]), `Vor ${MONTHS[i]} kommt ${right}.`);
      }
      const i = 1 + Math.floor(rng() * 24);
      const right = ABC[i - 1];
      return build(kind, rng, `Welcher Buchstabe kommt im ABC vor ${ABC[i]}?`, right, others(rng, ABC, right, ABC[i]), `Vor ${ABC[i]} kommt ${right}.`);
    }
  }
}

export const RIDDLE_KINDS: RiddleKind[] = ['spell', 'gap', 'vocab', 'odd', 'opposite', 'fact', 'order', 'espell', 'esent', 'eodd'];
export const ENGLISH_KINDS: RiddleKind[] = ['vocab', 'vocab', 'espell', 'esent', 'eodd'];

export interface Chapter {
  text: string;
  kind: RiddleKind;
}
export interface Story {
  id: string;
  emoji: string;
  title: string;
  intro: string;
  chapters: Chapter[];
  ending: string;
}

/** Kleine Geschichten in drei Kapiteln; nach jedem Kapitel wartet ein Rätsel. */
export const STORIES: Story[] = [
  {
    id: 'cafe', emoji: '☕', title: 'Das Koro-Café',
    intro: 'Im Koro-Café sind alle Gäste aus England. Hilf mir, ihre Wünsche zu verstehen!',
    chapters: [
      { text: 'Der erste Gast zeigt auf die Speisekarte.', kind: 'vocab' },
      { text: 'Der zweite Gast muss seine Bestellung aufschreiben.', kind: 'espell' },
      { text: 'Der dritte Gast möchte sich auf Englisch unterhalten.', kind: 'esent' },
    ],
    ending: 'Alle Gäste sind satt und glücklich. Thank you, Held!',
  },
  {
    id: 'zoo', emoji: '🦁', title: 'Der englische Zoo',
    intro: 'Im Zoo sind die Schilder der Tiere durcheinander gekommen. Sie sind alle auf Englisch! Hilfst du mir?',
    chapters: [
      { text: 'Das erste Tier wartet auf sein Schild.', kind: 'vocab' },
      { text: 'Welches Tier gehört nicht in die Gruppe?', kind: 'eodd' },
      { text: 'Das letzte Schild ist falsch geschrieben!', kind: 'espell' },
    ],
    ending: 'Jetzt stimmt jedes Schild. Die Tiere freuen sich sehr!',
  },
  {
    id: 'radio', emoji: '📻', title: 'Das Wunder-Radio',
    intro: 'Mein Radio spielt nur englische Lieder, und es hört erst auf zu rauschen, wenn du die Rätsel löst.',
    chapters: [
      { text: 'Das Radio knackt und fragt nach einem Wort.', kind: 'vocab' },
      { text: 'Jetzt fehlt ein Wort im Liedtext.', kind: 'esent' },
      { text: 'Zum Schluss will das Radio noch wissen, was nicht passt.', kind: 'eodd' },
    ],
    ending: 'Das Radio spielt wieder klar und deutlich. Great job!',
  },
  {
    id: 'pilz', emoji: '🍄', title: 'Der Zauberbusch',
    intro: 'Hilfe! Mein Pilzhaus ist zugewachsen! Der Zauberbusch geht nur auf, wenn du seine Wörter richtig schreibst.',
    chapters: [
      { text: 'Der Busch flüstert dir ein Bild zu. Wie schreibt man es richtig?', kind: 'spell' },
      { text: 'Der Busch kichert: Ein Buchstabe ist einfach weggelaufen!', kind: 'gap' },
      { text: 'Jetzt will der Busch wissen, was nicht in die Reihe passt.', kind: 'odd' },
    ],
    ending: 'Der Busch verbeugt sich, und mein Pilzhaus ist frei! Danke, du Held!',
  },
  {
    id: 'england', emoji: '🇬🇧', title: 'Der Koro aus England',
    intro: 'Ein Koro aus England hat sich im Wald verlaufen. Er spricht nur Englisch. Kannst du ihm helfen?',
    chapters: [
      { text: 'Er zeigt auf etwas und sagt ein Wort.', kind: 'vocab' },
      { text: 'Er hüpft vor Freude und will noch ein Wort wissen.', kind: 'vocab' },
      { text: 'Zum Schluss möchte er sich noch richtig verabschieden.', kind: 'vocab' },
    ],
    ending: 'Thank you! Das heißt: Danke! Jetzt findet er den Weg nach Hause.',
  },
  {
    id: 'kuchen', emoji: '🎂', title: 'Der verschwundene Kuchen',
    intro: 'Heute hat Koro Mampf Geburtstag, aber sein Kuchen ist weg! Ein Schleim hat Rätselzettel hinterlassen.',
    chapters: [
      { text: 'Zettel eins: Finde das Gegenteil!', kind: 'opposite' },
      { text: 'Zettel zwei: Hier steckt eine Wissensfrage.', kind: 'fact' },
      { text: 'Zettel drei: Bring Ordnung in die Reihenfolge!', kind: 'order' },
    ],
    ending: 'Der Kuchen steht hinter dem Baum! Mampf pustet die Kerzen aus und teilt mit dir.',
  },
  {
    id: 'zeit', emoji: '🦖', title: 'Der Zeitreise-Koro',
    intro: 'Plopp! Mein Zeitreise-Blatt hat mich zu den Dinosauriern gebracht. Zurück komme ich nur mit drei richtigen Antworten.',
    chapters: [
      { text: 'Ein Dino brüllt: Welcher Buchstabe fehlt?', kind: 'gap' },
      { text: 'Ein zweiter Dino fragt dich nach einem englischen Wort.', kind: 'vocab' },
      { text: 'Der letzte Dino ist ein Schlaumeier und stellt eine Wissensfrage.', kind: 'fact' },
    ],
    ending: 'Wuuusch! Ich bin wieder zu Hause. Die Dinos winken dir noch hinterher.',
  },
  {
    id: 'zirkus', emoji: '🎪', title: 'Der Zirkus der Koros',
    intro: 'Willkommen im Zirkus! Der Zirkusdirektor ist heiser, und du sollst seine Rätsel für ihn lösen.',
    chapters: [
      { text: 'Der Jongleur wirft Wörter durch die Luft. Was passt nicht dazu?', kind: 'odd' },
      { text: 'Der Clown spricht nur in Gegenteilen!', kind: 'opposite' },
      { text: 'Die Zauberin schreibt ein Wort in die Luft. Wie geht es richtig?', kind: 'spell' },
    ],
    ending: 'Die Zuschauer klatschen, die Koros jubeln, und du bekommst die goldene Eintrittskarte.',
  },
  {
    id: 'karte', emoji: '🗺️', title: 'Die Schatzkarte',
    intro: 'Ich habe eine alte Schatzkarte gefunden! Aber auf jedem Wegpunkt steht ein Rätsel.',
    chapters: [
      { text: 'Wegpunkt eins: eine Frage für kluge Köpfe.', kind: 'fact' },
      { text: 'Wegpunkt zwei: Du musst die Reihenfolge kennen.', kind: 'order' },
      { text: 'Wegpunkt drei: Ein Pirat sagt etwas auf Englisch.', kind: 'vocab' },
    ],
    ending: 'Der Schatz ist gefunden! Es war eine Kiste voller Rubine. Wir teilen fair.',
  },
  {
    id: 'wetter', emoji: '⛈️', title: 'Der Wettermacher',
    intro: 'Oje, mein Wettermacher spielt verrückt! Es regnet im Sommer und schneit im Juli. Hilf mir, ihn zu beruhigen.',
    chapters: [
      { text: 'Der Wettermacher dreht alles um. Er braucht das Gegenteil!', kind: 'opposite' },
      { text: 'Jetzt hat er die Reihenfolge der Tage und Monate vergessen.', kind: 'order' },
      { text: 'Zum Schluss fragt er dich etwas über die Natur.', kind: 'fact' },
    ],
    ending: 'Die Sonne kommt heraus und ein Regenbogen spannt sich über den Wald. Das war toll!',
  },
  {
    id: 'schule', emoji: '🏫', title: 'Die Koro-Schule',
    intro: 'Heute ist Prüfungstag in der Koro-Schule. Ich habe solche Angst vor den Wörtern! Hilfst du mir beim Üben?',
    chapters: [
      { text: 'Erste Aufgabe: Wie schreibt man das Wort?', kind: 'spell' },
      { text: 'Zweite Aufgabe: Ein Buchstabe fehlt im Heft.', kind: 'gap' },
      { text: 'Dritte Aufgabe: Englisch ist dran.', kind: 'vocab' },
    ],
    ending: 'Eine Eins! Ich bin so stolz. Ohne dich hätte ich das nie geschafft.',
  },
  {
    id: 'rakete', emoji: '🚀', title: 'Die Raketen-Reparatur',
    intro: 'Meine Rakete ist kaputt! Sie startet nur, wenn man die Geheimwörter am Schaltpult richtig eingibt.',
    chapters: [
      { text: 'Das erste Geheimwort ist Englisch.', kind: 'vocab' },
      { text: 'Das zweite Wort ist ein Rätsel für Forscher.', kind: 'fact' },
      { text: 'Beim dritten Wort passt etwas nicht ins Schema.', kind: 'odd' },
    ],
    ending: 'Drei, zwei, eins, Start! Die Rakete saust davon, und ich winke dir aus dem Fenster zu.',
  },
];

/** Alle festen Geschichtentexte; sie werden mit der KI-Stimme vorgelesen. */
export function storyTexts(): string[] {
  return STORIES.flatMap((s) => [s.intro, ...s.chapters.map((c) => c.text), s.ending]);
}

/** Feste Zuordnung einer Geschichte zu einem Koro. */
export function storyFor(kid: string): Story {
  let h = 2166136261;
  for (const ch of kid) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return STORIES[h % STORIES.length];
}
