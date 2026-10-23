import { pick, type Rng } from './generator';
import type { Riddle, RiddleKind } from './riddles';

/** Aufgaben für Deutsch-Dorf (Grundschule), Wissens-Wiese (Sachkunde) und Rätsel-Berg (Knobeln). */

function shuffle<T>(rng: Rng, list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

let level = 3;
/** Stufe (1–6) für die nächsten Aufgaben; steuert Schwierigkeit der Wissens- und Knobelfragen. */
export function setLessonLevel(l: number): void {
  level = Math.min(6, Math.max(1, l));
}
/** Wahrscheinlichkeit für eine schwere Frage: Stufe 1–2 nie, danach steigend. */
const hardChance = (): number => (level <= 2 ? 0 : (level - 2) * 0.22);

function mc(kind: RiddleKind, rng: Rng, prompt: string, right: string, wrong: string[], hint: string): Riddle {
  const options = shuffle(rng, [right, ...wrong.filter((w) => w !== right)]);
  return { kind, prompt, options, answer: options.indexOf(right), hint };
}

/** Falsche Zahlen in der Nähe der richtigen. */
function nearNumbers(rng: Rng, right: number, step = 1): string[] {
  const set = new Set<number>();
  let guard = 0;
  while (set.size < 2 && guard++ < 50) {
    const d = (1 + Math.floor(rng() * 3)) * step * (rng() < 0.5 ? -1 : 1);
    const v = right + d;
    if (v !== right && v >= 1) set.add(v);
  }
  return [...set].map(String);
}

// ------------------------------------------------------------------ Deutsch

/** [Nomen, Artikel] */
export const ARTICLES: [string, 'der' | 'die' | 'das'][] = [
  ['Hund', 'der'], ['Katze', 'die'], ['Haus', 'das'], ['Tisch', 'der'], ['Lampe', 'die'], ['Buch', 'das'],
  ['Baum', 'der'], ['Blume', 'die'], ['Auto', 'das'], ['Schule', 'die'], ['Apfel', 'der'], ['Fenster', 'das'],
  ['Sonne', 'die'], ['Mond', 'der'], ['Wasser', 'das'], ['Stuhl', 'der'], ['Tür', 'die'], ['Bett', 'das'],
  ['Mutter', 'die'], ['Vater', 'der'], ['Mädchen', 'das'], ['Banane', 'die'], ['Fahrrad', 'das'], ['Ball', 'der'],
  ['Uhr', 'die'], ['Kind', 'das'], ['Regen', 'der'], ['Schiff', 'das'], ['Wolke', 'die'], ['Löwe', 'der'],
];

/** [Einzahl, richtige Mehrzahl, falsch, falsch] */
export const PLURALS: [string, string, string, string][] = [
  ['Hund', 'Hunde', 'Hunds', 'Hunder'],
  ['Katze', 'Katzen', 'Katzes', 'Katzer'],
  ['Kind', 'Kinder', 'Kinden', 'Kinds'],
  ['Baum', 'Bäume', 'Baume', 'Baums'],
  ['Buch', 'Bücher', 'Buchs', 'Büche'],
  ['Apfel', 'Äpfel', 'Apfels', 'Apfeln'],
  ['Haus', 'Häuser', 'Hausen', 'Hauser'],
  ['Maus', 'Mäuse', 'Mause', 'Mausen'],
  ['Ball', 'Bälle', 'Balle', 'Balls'],
  ['Blume', 'Blumen', 'Blumes', 'Blume'],
  ['Stuhl', 'Stühle', 'Stuhle', 'Stuhls'],
  ['Vogel', 'Vögel', 'Vogeln', 'Vogels'],
  ['Hand', 'Hände', 'Hande', 'Hands'],
  ['Schuh', 'Schuhe', 'Schuhs', 'Schühe'],
  ['Auto', 'Autos', 'Autoen', 'Auten'],
];

/** [Wort, Wortart] */
export const WORD_CLASSES: [string, 'Nomen' | 'Verb' | 'Adjektiv'][] = [
  ['Tisch', 'Nomen'], ['laufen', 'Verb'], ['schnell', 'Adjektiv'], ['Hund', 'Nomen'], ['spielen', 'Verb'],
  ['groß', 'Adjektiv'], ['Freude', 'Nomen'], ['lachen', 'Verb'], ['bunt', 'Adjektiv'], ['Schule', 'Nomen'],
  ['singen', 'Verb'], ['lustig', 'Adjektiv'], ['Wolke', 'Nomen'], ['schwimmen', 'Verb'], ['kalt', 'Adjektiv'],
  ['Lehrerin', 'Nomen'], ['malen', 'Verb'], ['süß', 'Adjektiv'], ['Zeit', 'Nomen'], ['springen', 'Verb'],
];

/** [Gegenwart, richtige Vergangenheit, falsch, falsch] */
export const PAST: [string, string, string, string][] = [
  ['Ich gehe nach Hause.', 'Ich ging nach Hause.', 'Ich gehte nach Hause.', 'Ich geht nach Hause.'],
  ['Er spielt Fußball.', 'Er spielte Fußball.', 'Er spielt Fußball gestern.', 'Er spielete Fußball.'],
  ['Wir lachen laut.', 'Wir lachten laut.', 'Wir lachtet laut.', 'Wir lachen laute.'],
  ['Sie singt ein Lied.', 'Sie sang ein Lied.', 'Sie singte ein Lied.', 'Sie sung ein Lied.'],
  ['Der Hund läuft schnell.', 'Der Hund lief schnell.', 'Der Hund laufte schnell.', 'Der Hund läufte schnell.'],
  ['Ich sehe einen Vogel.', 'Ich sah einen Vogel.', 'Ich sahe einen Vogel.', 'Ich sehte einen Vogel.'],
  ['Wir essen Kuchen.', 'Wir aßen Kuchen.', 'Wir essten Kuchen.', 'Wir ässen Kuchen.'],
  ['Du malst ein Bild.', 'Du maltest ein Bild.', 'Du mahlst ein Bild.', 'Du mölst ein Bild.'],
];

/** [Wort 1, Wort 2, zusammen, falsch, falsch] */
export const COMPOUNDS: [string, string, string, string, string][] = [
  ['Haus', 'Tür', 'Haustür', 'Türhaus', 'Hausetür'],
  ['Apfel', 'Baum', 'Apfelbaum', 'Baumapfel', 'Apfelnbaum'],
  ['Schul', 'Tasche', 'Schultasche', 'Taschenschul', 'Schulentasche'],
  ['Sonne', 'Blume', 'Sonnenblume', 'Blumensonne', 'Sonneblume'],
  ['Fuß', 'Ball', 'Fußball', 'Ballfuß', 'Füßeball'],
  ['Wasser', 'Fall', 'Wasserfall', 'Fallwasser', 'Wasserfal'],
  ['Regen', 'Bogen', 'Regenbogen', 'Bogenregen', 'Regenbogenn'],
  ['Zahn', 'Bürste', 'Zahnbürste', 'Bürstezahn', 'Zähnebürste'],
  ['Schnee', 'Mann', 'Schneemann', 'Mannschnee', 'Schneeman'],
  ['Hand', 'Schuh', 'Handschuh', 'Schuhhand', 'Händeschuh'],
];

/** [richtig geschriebener Satz, falsch, falsch] */
export const SENTENCES: [string, string, string][] = [
  ['Der Hund spielt im Garten.', 'der hund spielt im garten.', 'Der hund spielt im Garten.'],
  ['Mia liest ein Buch.', 'Mia Liest ein Buch.', 'mia liest ein buch.'],
  ['Am Montag gehen wir zur Schule.', 'Am montag gehen wir zur schule.', 'am Montag gehen wir zur Schule.'],
  ['Ich esse einen roten Apfel.', 'Ich esse einen Roten apfel.', 'ich Esse einen roten Apfel.'],
  ['Die Katze trinkt Milch.', 'Die katze trinkt milch.', 'die Katze Trinkt Milch.'],
  ['Wir fahren mit dem Zug nach Berlin.', 'Wir fahren mit dem zug nach berlin.', 'wir Fahren mit dem Zug nach Berlin.'],
];

/** [Satz mit ___ , richtiges Satzzeichen] */
export const PUNCT: [string, string][] = [
  ['Wo wohnst du___', '?'], ['Ich habe einen Hund___', '.'], ['Hilfe, ein Feuer___', '!'], ['Wie heißt du___', '?'],
  ['Heute scheint die Sonne___', '.'], ['Pass auf___', '!'], ['Was machst du am Wochenende___', '?'], ['Wir gehen schwimmen___', '.'],
  ['Halt, nicht so schnell___', '!'], ['Wann kommt der Bus___', '?'],
];

/** [Wort, Silbenzahl] */
export const SYLLABLES: [string, number][] = [
  ['Haus', 1], ['Hose', 2], ['Banane', 3], ['Schmetterling', 3], ['Katze', 2], ['Elefant', 3], ['Sonne', 2], ['Schule', 2],
  ['Krokodil', 3], ['Ball', 1], ['Computer', 3], ['Schokolade', 4], ['Wolke', 2], ['Kartoffel', 3], ['Eis', 1], ['Fahrradschloss', 3],
];

/** [Wort, Reimwort, falsch, falsch] */
export const RHYMES: [string, string, string, string][] = [
  ['Haus', 'Maus', 'Hund', 'Tür'], ['Hase', 'Nase', 'Katze', 'Wiese'], ['Tisch', 'Fisch', 'Stuhl', 'Tasche'],
  ['Hand', 'Sand', 'Fuß', 'Arm'], ['Rose', 'Hose', 'Blume', 'Tasche'], ['Katze', 'Tatze', 'Hund', 'Kater'],
  ['Baum', 'Traum', 'Blatt', 'Bein'], ['Schnee', 'See', 'Eis', 'Sturm'], ['Kuh', 'Schuh', 'Pferd', 'Ziege'],
  ['Brot', 'Boot', 'Butter', 'Kuchen'], ['Ball', 'Knall', 'Spiel', 'Kugel'], ['Stern', 'gern', 'Mond', 'Nacht'],
];

/** [Wort mit Lücke, richtiger Buchstabe(n), falsch, falsch, Hinweis] */
export const SPELLING_RULES: [string, string, string, string, string][] = [
  ['Der V_gel singt.', 'o', 'a', 'u', 'Vogel schreibt man mit o.'],
  ['Ein Blatt Pap_er', 'i', 'ie', 'y', 'Papier schreibt man: P-a-p-i-e-r.'],
  ['Die Ma_s frisst Käse.', 'u', 'o', 'a', 'Maus – wie Haus.'],
  ['Ich lese ein B_ch.', 'u', 'ü', 'o', 'Buch schreibt man mit u: das Buch, die Bücher.'],
  ['Der Hund l_uft.', 'ä', 'e', 'a', 'läuft kommt von laufen: au wird äu.'],
  ['Der Fu_ tut weh.', 'ß', 'ss', 's', 'Nach langem Vokal schreibt man ß: Fuß.'],
  ['Die Ka_e miaut.', 'tz', 'z', 'ts', 'Katze mit tz.'],
  ['Der Za_n wackelt.', 'h', 'ch', 'k', 'Zahn mit Dehnungs-h.'],
  ['Wir sp_len Fußball.', 'ie', 'i', 'ii', 'spielen mit ie.'],
  ['Die Sch_le beginnt.', 'u', 'ü', 'o', 'Schule mit u.'],
  ['Der Sti_ ist spitz.', 'ft', 'f', 'pf', 'Stift mit ft.'],
  ['Ein Gl_s Milch', 'a', 'ä', 'e', 'Glas mit a.'],
];

export function makeGerman(rng: Rng): Riddle {
  const t = Math.floor(rng() * 9);
  switch (t) {
    case 0: {
      const [w, art] = pick(rng, ARTICLES);
      return mc('german', rng, `Welcher Artikel passt? ___ ${w}`, art, ['der', 'die', 'das'].filter((x) => x !== art), `Es heißt: ${art} ${w}.`);
    }
    case 1: {
      const [s, r, a, b] = pick(rng, PLURALS);
      return mc('german', rng, `Mehrzahl von „${s}“?`, r, [a, b], `Eine Mehrzahl: ${r}.`);
    }
    case 2: {
      const [w, c] = pick(rng, WORD_CLASSES);
      return mc('german', rng, `Welche Wortart ist „${w}“?`, c, ['Nomen', 'Verb', 'Adjektiv'].filter((x) => x !== c), `${w} ist ein ${c}${c === 'Nomen' ? ' (Namenwort)' : c === 'Verb' ? ' (Tunwort)' : ' (Wiewort)'}.`);
    }
    case 3: {
      const [p, r, a, b] = pick(rng, PAST);
      return mc('german', rng, `Gestern war es so: „${p}“`, r, [a, b], `Richtig: ${r}`);
    }
    case 4: {
      const [a, b, r, x, y] = pick(rng, COMPOUNDS);
      return mc('german', rng, `${a} + ${b} = ?`, r, [x, y], `${a} und ${b} ergeben: ${r}.`);
    }
    case 5: {
      const [r, a, b] = pick(rng, SENTENCES);
      return mc('german', rng, 'Welcher Satz ist richtig geschrieben?', r, [a, b], 'Satzanfang und Nomen schreibt man groß.');
    }
    case 6: {
      const [q, r] = pick(rng, PUNCT);
      return mc('german', rng, q, r, ['.', '?', '!'].filter((x) => x !== r), `Hier passt: ${r}`);
    }
    case 7: {
      const [w, n] = pick(rng, SYLLABLES);
      return mc('german', rng, `Wie viele Silben hat „${w}“? (klatsche mit!)`, String(n), nearNumbers(rng, n).filter((x) => Number(x) > 0), `${w} hat ${n} ${n === 1 ? 'Silbe' : 'Silben'}.`);
    }
    default: {
      if (rng() < 0.5) {
        const [w, r, a, b] = pick(rng, RHYMES);
        return mc('german', rng, `Was reimt sich auf „${w}“?`, r, [a, b], `${w} reimt sich auf ${r}.`);
      }
      const [w, r, a, b, h] = pick(rng, SPELLING_RULES);
      return mc('german', rng, `Was fehlt? ${w}`, r, [a, b], h);
    }
  }
}

// ------------------------------------------------------------------ Allgemeinwissen

/** [Frage, richtig, falsch, falsch, Hinweis] */
export const GENERAL: [string, string, string, string, string][] = [
  ['🌍 Wie heißt die Hauptstadt von Deutschland?', 'Berlin', 'München', 'Hamburg', 'Berlin ist die Hauptstadt.'],
  ['🇫🇷 Wie heißt die Hauptstadt von Frankreich?', 'Paris', 'Rom', 'Madrid', 'Paris liegt in Frankreich.'],
  ['🇮🇹 Wie heißt die Hauptstadt von Italien?', 'Rom', 'Paris', 'Wien', 'Rom ist die Hauptstadt von Italien.'],
  ['🌊 Wie heißt der größte Ozean?', 'Pazifik', 'Atlantik', 'Nordsee', 'Der Pazifik ist der größte Ozean.'],
  ['🌞 Wie heißt der Stern, um den die Erde kreist?', 'Sonne', 'Mond', 'Mars', 'Die Erde kreist um die Sonne.'],
  ['🌙 Wie viele Tage hat eine Woche?', '7', '5', '10', 'Eine Woche hat 7 Tage.'],
  ['📅 Wie viele Monate hat ein Jahr?', '12', '10', '11', 'Ein Jahr hat 12 Monate.'],
  ['🐝 Was machen Bienen aus Nektar?', 'Honig', 'Milch', 'Zucker', 'Bienen machen Honig.'],
  ['🐄 Was gibt uns die Kuh?', 'Milch', 'Eier', 'Wolle', 'Kühe geben Milch.'],
  ['🐑 Was gibt uns das Schaf?', 'Wolle', 'Federn', 'Eier', 'Schafe geben Wolle.'],
  ['🐔 Was legt das Huhn?', 'Eier', 'Nüsse', 'Steine', 'Hühner legen Eier.'],
  ['🦋 Woraus wird ein Schmetterling?', 'Raupe', 'Käfer', 'Wurm', 'Aus der Raupe wird ein Schmetterling.'],
  ['🐸 Was wird aus einer Kaulquappe?', 'Frosch', 'Fisch', 'Schlange', 'Aus der Kaulquappe wird ein Frosch.'],
  ['🦈 Der Hai lebt …', 'im Meer', 'im Wald', 'in der Wüste', 'Haie leben im Meer.'],
  ['🐪 Das Kamel lebt in der …', 'Wüste', 'Arktis', 'Stadt', 'Kamele leben in der Wüste.'],
  ['🐧 Wo leben Pinguine?', 'Antarktis', 'Wüste', 'Dschungel', 'Pinguine leben im kalten Süden.'],
  ['🦇 Welches Säugetier kann fliegen?', 'Fledermaus', 'Taube', 'Schmetterling', 'Die Fledermaus ist ein fliegendes Säugetier.'],
  ['🐋 Der Blauwal ist das …', 'größte Tier', 'kleinste Tier', 'schnellste Tier', 'Der Blauwal ist das größte Tier der Erde.'],
  ['🌈 Wie viele Farben hat der Regenbogen?', '7', '3', '12', 'Der Regenbogen hat 7 Farben.'],
  ['💧 Wasser wird bei 0 Grad zu …', 'Eis', 'Dampf', 'Öl', 'Bei 0 Grad gefriert Wasser.'],
  ['♨️ Wasser kocht bei …', '100 Grad', '50 Grad', '10 Grad', 'Wasser kocht bei 100 Grad.'],
  ['🌱 Was brauchen Pflanzen zum Wachsen?', 'Licht und Wasser', 'nur Sand', 'nur Eis', 'Pflanzen brauchen Licht und Wasser.'],
  ['🍂 In welcher Jahreszeit fallen die Blätter?', 'Herbst', 'Frühling', 'Sommer', 'Im Herbst fallen die Blätter.'],
  ['❄️ In welcher Jahreszeit schneit es?', 'Winter', 'Sommer', 'Herbst', 'Im Winter schneit es.'],
  ['🚦 Bei welcher Ampelfarbe darfst du gehen?', 'Grün', 'Rot', 'Gelb', 'Bei Grün darf man gehen.'],
  ['🚲 Was setzt man beim Fahrradfahren auf?', 'Helm', 'Mütze', 'Brille', 'Ein Helm schützt den Kopf.'],
  ['🦷 Wie oft sollte man Zähne putzen?', 'Zweimal am Tag', 'Einmal im Monat', 'Nie', 'Morgens und abends.'],
  ['👂 Womit hören wir?', 'Ohren', 'Nase', 'Augen', 'Wir hören mit den Ohren.'],
  ['👃 Womit riechen wir?', 'Nase', 'Mund', 'Ohr', 'Wir riechen mit der Nase.'],
  ['❤️ Was pumpt das Blut durch den Körper?', 'Herz', 'Magen', 'Lunge', 'Das Herz pumpt das Blut.'],
  ['🪐 Welcher Planet ist der rote Planet?', 'Mars', 'Venus', 'Jupiter', 'Der Mars wird der rote Planet genannt.'],
  ['🌕 Was leuchtet nachts am Himmel und kreist um die Erde?', 'Mond', 'Sonne', 'Komet', 'Der Mond kreist um die Erde.'],
  ['🏔️ Wie heißt der höchste Berg der Erde?', 'Mount Everest', 'Zugspitze', 'Mont Blanc', 'Der Mount Everest ist der höchste Berg.'],
  ['🏔️ Wie heißt der höchste Berg Deutschlands?', 'Zugspitze', 'Brocken', 'Feldberg', 'Die Zugspitze ist der höchste Berg Deutschlands.'],
  ['🌊 Welcher Fluss fließt durch Köln?', 'Rhein', 'Elbe', 'Donau', 'Köln liegt am Rhein.'],
  ['🗺️ Wie viele Kontinente gibt es?', '7', '5', '9', 'Es gibt 7 Kontinente.'],
  ['🧭 Wo geht die Sonne auf?', 'Osten', 'Westen', 'Norden', 'Im Osten geht die Sonne auf.'],
  ['🕰️ Wie viele Minuten hat eine Stunde?', '60', '100', '30', 'Eine Stunde hat 60 Minuten.'],
  ['🕒 Wie viele Stunden hat ein Tag?', '24', '12', '60', 'Ein Tag hat 24 Stunden.'],
  ['🔺 Wie viele Ecken hat ein Dreieck?', '3', '4', '5', 'Ein Dreieck hat 3 Ecken.'],
  ['🟦 Wie viele Ecken hat ein Quadrat?', '4', '3', '6', 'Ein Quadrat hat 4 Ecken.'],
  ['🕷️ Wie viele Beine hat eine Spinne?', '8', '6', '10', 'Spinnen haben 8 Beine.'],
  ['🐜 Wie viele Beine hat ein Insekt?', '6', '4', '8', 'Insekten haben 6 Beine.'],
  ['🌳 Welche Pflanze gibt uns Holz?', 'Baum', 'Blume', 'Gras', 'Holz kommt von Bäumen.'],
  ['🥕 Was wächst unter der Erde?', 'Karotte', 'Apfel', 'Kirsche', 'Karotten wachsen in der Erde.'],
  ['🍎 Was ist gesund?', 'Obst und Gemüse', 'nur Süßigkeiten', 'nur Chips', 'Obst und Gemüse sind gesund.'],
  ['⚡ Was macht aus Wind Strom?', 'Windrad', 'Staubsauger', 'Fahrrad', 'Windräder machen Strom.'],
  ['♻️ In welche Tonne kommt Altpapier?', 'Blaue Tonne', 'Gelbe Tonne', 'Biotonne', 'Altpapier kommt in die blaue Tonne.'],
  ['🌡️ Was misst ein Thermometer?', 'Temperatur', 'Zeit', 'Gewicht', 'Ein Thermometer misst die Wärme.'],
  ['🔬 Was sieht man mit einem Mikroskop?', 'Ganz kleine Dinge', 'Sterne', 'Berge', 'Ein Mikroskop macht Kleines groß.'],
  ['🎨 Gelb und Blau ergibt …', 'Grün', 'Lila', 'Orange', 'Gelb und Blau ergibt Grün.'],
  ['🎨 Rot und Gelb ergibt …', 'Orange', 'Grün', 'Braun', 'Rot und Gelb ergibt Orange.'],
  ['🧲 Was zieht ein Magnet an?', 'Eisen', 'Holz', 'Papier', 'Magnete ziehen Eisen an.'],
  ['🎵 Welches Instrument hat schwarze und weiße Tasten?', 'Klavier', 'Flöte', 'Trommel', 'Das Klavier hat Tasten.'],
];

/** Schwerere Fragen für höhere Stufen. */
export const GENERAL_HARD: [string, string, string, string, string][] = [
  ['🇪🇸 Wie heißt die Hauptstadt von Spanien?', 'Madrid', 'Barcelona', 'Lissabon', 'Madrid ist die Hauptstadt von Spanien.'],
  ['🇬🇧 Wie heißt die Hauptstadt von Großbritannien?', 'London', 'Dublin', 'Manchester', 'London ist die Hauptstadt von Großbritannien.'],
  ['🇨🇭 Wie heißt die Hauptstadt der Schweiz?', 'Bern', 'Zürich', 'Genf', 'Bern ist die Hauptstadt der Schweiz.'],
  ['🌊 Welcher Fluss fließt durch Hamburg?', 'Elbe', 'Rhein', 'Isar', 'Hamburg liegt an der Elbe.'],
  ['🌍 Auf welchem Kontinent liegt Ägypten?', 'Afrika', 'Asien', 'Europa', 'Ägypten liegt in Afrika.'],
  ['🪐 Welcher Planet ist der größte in unserem Sonnensystem?', 'Jupiter', 'Saturn', 'Erde', 'Jupiter ist der größte Planet.'],
  ['🪐 Wie viele Planeten hat unser Sonnensystem?', '8', '9', '7', 'Es gibt 8 Planeten.'],
  ['🫁 Welches Organ brauchen wir zum Atmen?', 'Die Lunge', 'Der Magen', 'Die Leber', 'Wir atmen mit der Lunge.'],
  ['🦴 Wie nennt man das Gerüst im Körper?', 'Skelett', 'Muskel', 'Haut', 'Die Knochen bilden das Skelett.'],
  ['🌿 Was nehmen Pflanzen aus der Luft auf, um zu wachsen?', 'Kohlendioxid', 'Helium', 'Wasserstoff', 'Pflanzen nehmen Kohlendioxid auf und geben Sauerstoff ab.'],
  ['🫧 Welches Gas atmen wir zum Leben ein?', 'Sauerstoff', 'Stickstoff', 'Helium', 'Wir brauchen Sauerstoff zum Atmen.'],
  ['🧊 Wie nennt man Wasser als Gas?', 'Wasserdampf', 'Eis', 'Tau', 'Wasser wird zu Wasserdampf.'],
  ['⚡ Was leitet Strom gut?', 'Kupfer', 'Gummi', 'Holz', 'Metalle wie Kupfer leiten Strom.'],
  ['🦎 Welches Tier ist ein Reptil?', 'Die Eidechse', 'Der Frosch', 'Der Delfin', 'Eidechsen sind Reptilien.'],
  ['🐸 Welches Tier ist ein Amphibium?', 'Der Frosch', 'Die Schlange', 'Die Schildkröte', 'Frösche leben an Land und im Wasser.'],
  ['🦅 Welches Tier ist ein Vogel?', 'Der Adler', 'Die Fledermaus', 'Der Schmetterling', 'Der Adler hat Federn und ist ein Vogel.'],
  ['🌋 Wie heißt es, wenn ein Berg Lava spuckt?', 'Vulkanausbruch', 'Erdbeben', 'Gewitter', 'Ein Vulkan spuckt Lava.'],
  ['🌦️ Wie nennt man Wasser, das aus Wolken fällt?', 'Niederschlag', 'Nebel', 'Tau', 'Regen, Schnee und Hagel sind Niederschlag.'],
  ['🏛️ In welchem Land stehen die Pyramiden von Gizeh?', 'Ägypten', 'Griechenland', 'Mexiko', 'Die Pyramiden von Gizeh stehen in Ägypten.'],
  ['🗼 In welcher Stadt steht der Eiffelturm?', 'Paris', 'London', 'Berlin', 'Der Eiffelturm steht in Paris.'],
  ['🇩🇪 Wie viele Bundesländer hat Deutschland?', '16', '12', '20', 'Deutschland hat 16 Bundesländer.'],
  ['🧭 In welche Richtung zeigt die Kompassnadel?', 'Norden', 'Süden', 'Osten', 'Die Nadel zeigt nach Norden.'],
  ['🕐 Wie viele Sekunden hat eine Minute?', '60', '100', '30', 'Eine Minute hat 60 Sekunden.'],
  ['📅 Wie viele Tage hat ein normales Jahr?', '365', '360', '300', 'Ein normales Jahr hat 365 Tage.'],
  ['⚖️ Wie viele Gramm sind ein Kilogramm?', '1000', '100', '10', 'Ein Kilogramm sind 1000 Gramm.'],
  ['📏 Wie viele Zentimeter sind ein Meter?', '100', '10', '1000', 'Ein Meter sind 100 Zentimeter.'],
  ['🔷 Wie viele Seiten hat ein Sechseck?', '6', '5', '8', 'Ein Sechseck hat 6 Seiten.'],
  ['🌙 Wie nennt man das Licht, das wir vom Mond sehen?', 'Reflektiertes Sonnenlicht', 'Eigenes Licht', 'Mondfeuer', 'Der Mond leuchtet nicht selbst, er spiegelt Sonnenlicht.'],
  ['🐝 Wie nennt man ein Bienenhaus?', 'Bienenstock', 'Nest', 'Höhle', 'Bienen wohnen im Bienenstock.'],
  ['🎼 Wie viele Saiten hat eine normale Geige?', '4', '6', '8', 'Eine Geige hat 4 Saiten.'],
  ['🎨 Welche Farben ergeben gemischt Lila?', 'Rot und Blau', 'Gelb und Grün', 'Rot und Gelb', 'Rot und Blau ergibt Lila.'],
];

export function makeGeneral(rng: Rng): Riddle {
  const [q, r, a, b, h] = pick(rng, rng() < hardChance() ? GENERAL_HARD : GENERAL);
  return mc('general', rng, q, r, [a, b], h);
}

// ------------------------------------------------------------------ Rätsel

/** [Rätsel, richtig, falsch, falsch, Hinweis] */
export const BRAINTEASERS: [string, string, string, string, string][] = [
  ['Was hat Zähne, aber beißt nicht?', 'Ein Kamm', 'Ein Hund', 'Ein Apfel', 'Ein Kamm hat Zähne zum Kämmen.'],
  ['Was wird nasser, je mehr es trocknet?', 'Ein Handtuch', 'Ein Stein', 'Ein Regenschirm', 'Das Handtuch nimmt das Wasser auf.'],
  ['Was hat vier Beine, kann aber nicht laufen?', 'Ein Tisch', 'Ein Hund', 'Ein Vogel', 'Ein Tisch steht auf vier Beinen.'],
  ['Was geht den ganzen Tag, kommt aber nie vom Fleck?', 'Eine Uhr', 'Ein Hund', 'Ein Auto', 'Der Zeiger geht im Kreis.'],
  ['Ich habe Städte, aber keine Häuser, Berge, aber keine Bäume. Was bin ich?', 'Eine Landkarte', 'Ein Buch', 'Ein Spiegel', 'Auf einer Landkarte ist alles nur gezeichnet.'],
  ['Was wird größer, wenn man etwas wegnimmt?', 'Ein Loch', 'Ein Berg', 'Ein Kuchen', 'Je mehr man wegnimmt, desto größer das Loch.'],
  ['Was hat einen Hals, aber keinen Kopf?', 'Eine Flasche', 'Ein Ball', 'Ein Stuhl', 'Die Flasche hat einen Flaschenhals.'],
  ['Was hat Flügel, aber fliegt nicht, und dreht sich im Wind?', 'Eine Windmühle', 'Ein Vogel', 'Ein Flugzeug', 'Die Flügel der Windmühle drehen sich.'],
  ['Was kommt einmal in der Minute vor, zweimal im Moment und nie in tausend Jahren?', 'Der Buchstabe M', 'Eine Uhr', 'Ein Stern', 'Zähle die Ms in den Wörtern!'],
  ['Was hat ein Auge, kann aber nicht sehen?', 'Eine Nadel', 'Ein Stein', 'Ein Ball', 'Das Nadelöhr heißt auch Nadelauge.'],
  ['Es hat keine Beine und läuft doch. Was ist das?', 'Die Nase', 'Der Fisch', 'Das Auto', 'Wenn man erkältet ist, läuft die Nase.'],
  ['Je mehr du davon hast, desto weniger siehst du. Was ist es?', 'Dunkelheit', 'Licht', 'Sonne', 'Bei Dunkelheit sieht man weniger.'],
  ['Was ist leichter als eine Feder, aber du kannst es nicht lange halten?', 'Den Atem', 'Einen Stein', 'Ein Buch', 'Man kann nicht lange die Luft anhalten.'],
  ['Ein Hahn legt auf dem Dach ein Ei. Auf welche Seite rollt es?', 'Keine – Hähne legen keine Eier', 'Links', 'Rechts', 'Hähne legen keine Eier.'],
  ['Welcher Monat hat 28 Tage?', 'Alle Monate', 'Nur der Februar', 'Keiner', 'Jeder Monat hat mindestens 28 Tage.'],
  ['Was kann man zerbrechen, ohne es anzufassen?', 'Ein Versprechen', 'Ein Glas', 'Einen Stock', 'Ein Versprechen kann man brechen.'],
  ['Was ist schwerer: ein Kilo Federn oder ein Kilo Steine?', 'Gleich schwer', 'Steine', 'Federn', 'Ein Kilo ist immer ein Kilo!'],
];

export const BRAINTEASERS_HARD: [string, string, string, string, string][] = [
  ['Anna ist größer als Ben, Ben ist größer als Cem. Wer ist der Kleinste?', 'Cem', 'Anna', 'Ben', 'Anna > Ben > Cem, also ist Cem am kleinsten.'],
  ['Ein Zug hat 3 Wagen. In jedem Wagen sitzen 4 Kinder. Wie viele Kinder sind im Zug?', '12', '7', '10', '3 × 4 = 12.'],
  ['Welche zwei Münzen ergeben zusammen 15 Cent?', '10 Cent und 5 Cent', '2 mal 5 Cent', '10 Cent und 2 Cent', '10 + 5 = 15.'],
  ['Was ist am Morgen vier-, am Mittag zwei- und am Abend dreibeinig?', 'Der Mensch', 'Ein Hund', 'Ein Stuhl', 'Baby krabbelt, Erwachsener geht, alter Mensch nutzt einen Stock.'],
  ['Ein Kilo Federn und ein Kilo Steine zusammen wiegen …', '2 Kilo', '1 Kilo', '3 Kilo', '1 + 1 = 2 Kilo.'],
  ['Wie viele Ecken hat ein Würfel?', '8', '6', '12', 'Ein Würfel hat 8 Ecken, 6 Flächen und 12 Kanten.'],
  ['Mama ist 30 Jahre älter als ihr Kind. Das Kind ist 6. Wie alt ist Mama?', '36', '24', '30', '6 + 30 = 36.'],
  ['Ich bin eine Zahl. Verdoppelst du mich und addierst 3, bekommst du 17. Wer bin ich?', '7', '8', '10', '7 × 2 + 3 = 17.'],
  ['Wenn gestern Freitag war, welcher Tag ist übermorgen?', 'Montag', 'Sonntag', 'Samstag', 'Heute ist Samstag, morgen Sonntag, übermorgen Montag.'],
  ['Ein Seil hat 2 Enden. Wie viele Enden hat es nach einem Schnitt in der Mitte?', '4', '2', '3', 'Aus einem Seil werden zwei, jedes hat 2 Enden.'],
  ['Wie viele Monate haben mindestens 30 Tage?', '11', '6', '12', 'Alle außer dem Februar haben mindestens 30 Tage.'],
  ['Ein Tisch hat 4 Beine. Wie viele Beine haben 3 Tische?', '12', '7', '9', '3 × 4 = 12.'],
];

/** Emoji-Muster, das weitergeführt werden soll. */
const PATTERN_SETS = [['🔴', '🔵'], ['⭐', '🌙'], ['🍎', '🍌', '🍇'], ['🐶', '🐱'], ['🔺', '🟦', '⚪']];

export function makePuzzle(rng: Rng): Riddle {
  // Stufe 1–2: Folgen, Muster, Rätsel. Höher kommen Verdoppeln, Zahlenrätsel und Emoji-Rechnung dazu.
  const types = level <= 2 ? [0, 3, 5, 5] : level <= 4 ? [0, 1, 3, 4, 5, 2] : [1, 2, 4, 0, 5, 2, 4];
  const t = types[Math.floor(rng() * types.length)];
  switch (t) {
    case 0: {
      // Zahlenfolge mit festem Schritt
      const step = level <= 2 ? 1 + Math.floor(rng() * 4) : 2 + Math.floor(rng() * (level * 3));
      const start = 1 + Math.floor(rng() * (level <= 2 ? 10 : 10 + level * 8));
      const seq = [0, 1, 2, 3].map((i) => start + i * step);
      const r = start + 4 * step;
      return mc('puzzle', rng, `Welche Zahl kommt als Nächstes? ${seq.join(', ')}, ?`, String(r), nearNumbers(rng, r, step), `Es geht immer um ${step} weiter: ${r}.`);
    }
    case 1: {
      // Verdoppeln
      const start = 1 + Math.floor(rng() * 4);
      const seq = [start, start * 2, start * 4, start * 8];
      const r = start * 16;
      return mc('puzzle', rng, `Welche Zahl kommt als Nächstes? ${seq.join(', ')}, ?`, String(r), [String(r - start * 4), String(r + start * 2)], `Die Zahl wird jedes Mal verdoppelt: ${r}.`);
    }
    case 2: {
      // Denk dir eine Zahl
      const n = 2 + Math.floor(rng() * (level >= 5 ? 20 : 12));
      const add = 1 + Math.floor(rng() * 9);
      const mult = 2 + Math.floor(rng() * (level >= 5 ? 4 : 2));
      const res = n * mult + add;
      return mc('puzzle', rng, `Ich denke mir eine Zahl. Mal ${mult}, plus ${add} ergibt ${res}. Welche Zahl ist es?`, String(n), nearNumbers(rng, n), `${n} × ${mult} + ${add} = ${res}.`);
    }
    case 3: {
      // Emoji-Muster
      const set = pick(rng, PATTERN_SETS);
      const len = 5 + Math.floor(rng() * 2);
      const line = Array.from({ length: len }, (_, i) => set[i % set.length]);
      const r = set[len % set.length];
      return mc('puzzle', rng, `Was kommt als Nächstes? ${line.join(' ')} ?`, r, set.concat(['🟢', '🟡']).filter((x) => x !== r).slice(0, 2), `Das Muster wiederholt sich: ${r}.`);
    }
    case 4: {
      // Emoji-Rechnung mit zwei Unbekannten
      const a = 2 + Math.floor(rng() * (level >= 5 ? 14 : 8)), b = 1 + Math.floor(rng() * (level >= 5 ? 14 : 8));
      const [e1, e2] = pick(rng, [['🍎', '🍌'], ['🐱', '🐶'], ['⭐', '🌙'], ['🚗', '🚲']]);
      return mc('puzzle', rng, `${e1} + ${e1} = ${a * 2}   und   ${e1} + ${e2} = ${a + b}.   Wie viel ist ${e2}?`, String(b), nearNumbers(rng, b), `${e1} = ${a}, also ${e2} = ${a + b} − ${a} = ${b}.`);
    }
    default: {
      const [q, r, a, b, h] = pick(rng, level >= 4 && rng() < 0.6 ? BRAINTEASERS_HARD : BRAINTEASERS);
      return mc('puzzle', rng, q, r, [a, b], h);
    }
  }
}

export const LESSON_KINDS = ['german', 'general', 'puzzle'] as const;
