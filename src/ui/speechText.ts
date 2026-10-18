/** Zerlegt Sätze in vorgenerierte Audio-Bausteine (Zahlen, Rechenzeichen, feste Textstücke). */

const ONES = ['null', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'zwölf', 'dreizehn', 'vierzehn', 'fünfzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn'];
const TENS = ['', '', 'zwanzig', 'dreißig', 'vierzig', 'fünfzig', 'sechzig', 'siebzig', 'achtzig', 'neunzig'];

export function numberWords(n: number): string {
  if (n < 20) return ONES[n];
  if (n < 100) {
    const o = n % 10;
    return o === 0 ? TENS[n / 10] : `${o === 1 ? 'ein' : ONES[o]}und${TENS[Math.floor(n / 10)]}`;
  }
  const h = Math.floor(n / 100);
  const rest = n % 100;
  return `${h === 1 ? 'ein' : ONES[h]}hundert${rest ? numberWords(rest) : ''}`;
}

export const OP_WORDS: Record<string, { file: string; text: string }> = {
  '+': { file: 'op_plus', text: 'plus' },
  '−': { file: 'op_minus', text: 'minus' },
  '×': { file: 'op_mal', text: 'mal' },
  ':': { file: 'op_geteilt', text: 'geteilt durch' },
  '=': { file: 'op_gleich', text: 'gleich' },
  '?': { file: 'op_was', text: 'was' },
};

export type Seg = { type: 'num'; n: number } | { type: 'op'; op: string } | { type: 'text'; text: string };

export function fnv(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function cleanFragment(s: string): string {
  return s
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/\s+/g, ' ')
    .replace(/^[\s.,;:)!?]+/, '')
    .trim();
}

const TOKEN = /\d+|(?<=\s)[+−×:=](?=\s)|(?<=\s)\?(?=\s|[.,!]|$)/g;

export function segmentsOf(text: string): Seg[] {
  const segs: Seg[] = [];
  let last = 0;
  const pushText = (raw: string) => {
    for (const sentence of raw.split(/(?<=[.!?])\s+/)) {
      const t = cleanFragment(sentence);
      if (/\p{L}/u.test(t)) segs.push({ type: 'text', text: t });
    }
  };
  for (const m of text.matchAll(TOKEN)) {
    pushText(text.slice(last, m.index));
    const tok = m[0];
    segs.push(/\d/.test(tok) ? { type: 'num', n: Number(tok) } : { type: 'op', op: tok });
    last = m.index! + tok.length;
  }
  pushText(text.slice(last));
  return segs;
}

export function fileFor(seg: Seg): string {
  if (seg.type === 'num') return `n${seg.n}`;
  if (seg.type === 'op') return OP_WORDS[seg.op].file;
  return `f_${fnv(seg.text)}`;
}
