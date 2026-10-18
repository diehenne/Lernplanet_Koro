import type { Task } from './types';

/** Schrittweise Erklärung eines Lösungswegs (deutsch). Zahlen/Rechenzeichen werden vorgelesen. */
export function hintSteps(t: Task): string[] {
  const { a, b, answer } = t;
  switch (t.op) {
    case 'add': {
      if (a >= 20 || b >= 20) {
        const ta = a - (a % 10), tb = b - (b % 10);
        const oa = a % 10, ob = b % 10;
        return [
          `Erst die Zehner: ${ta} + ${tb} = ${ta + tb}.`,
          `Dann die Einer: ${oa} + ${ob} = ${oa + ob}.`,
          `Zusammen: ${ta + tb} + ${oa + ob} = ${answer}.`,
        ];
      }
      const toTen = 10 - (a % 10);
      if (a < 10 && a + b > 10 && toTen < b) {
        return [
          `Erst bis zur Zehn: ${a} + ${toTen} = 10.`,
          `Dann den Rest: 10 + ${b - toTen} = ${answer}.`,
        ];
      }
      return [`Starte bei ${a} und zähle ${b} weiter.`, `Du landest bei ${answer}.`];
    }
    case 'sub': {
      if (a >= 20) {
        const tb = b - (b % 10), ob = b % 10;
        const mid = a - tb;
        return [
          `Erst die Zehner weg: ${a} − ${tb} = ${mid}.`,
          `Dann die Einer weg: ${mid} − ${ob} = ${answer}.`,
        ];
      }
      const ones = a % 10;
      if (a > 10 && b > ones) {
        return [
          `Erst runter bis zur Zehn: ${a} − ${ones} = 10.`,
          `Dann den Rest: 10 − ${b - ones} = ${answer}.`,
        ];
      }
      return [`Starte bei ${a} und gehe ${b} Schritte zurück.`, `Du landest bei ${answer}.`];
    }
    case 'mul': {
      if (b > 10) {
        const tb = b - (b % 10), ob = b % 10;
        return [
          `Zerlege die ${b}: ${a} × ${tb} = ${a * tb}.`,
          `Dazu ${a} × ${ob} = ${a * ob}.`,
          `Zusammen: ${a * tb} + ${a * ob} = ${answer}.`,
        ];
      }
      if (b > 5) {
        return [
          `Zerlege die ${b}: ${a} × 5 = ${a * 5}.`,
          `Dazu ${a} × ${b - 5} = ${a * (b - 5)}.`,
          `Zusammen: ${a * 5} + ${a * (b - 5)} = ${answer}.`,
        ];
      }
      return [`${a} × ${b} heißt ${b} mal die ${a}.`, `${Array(b).fill(a).join(' + ')} = ${answer}.`];
    }
    case 'div': {
      if (answer > 10) {
        const q1 = answer - (answer % 10), q2 = answer % 10;
        return [
          `Teile in Stücke: ${b * q1} : ${b} = ${q1}.`,
          `Dazu ${b * q2} : ${b} = ${q2}.`,
          `Zusammen: ${q1} + ${q2} = ${answer}.`,
        ];
      }
      return [`Denke an die Malaufgabe: ${b} × ${answer} = ${a}.`, `Also ${a} : ${b} = ${answer}.`];
    }
  }
}

/** Hilfe für Lückenaufgaben (a ? b = c): Umkehraufgabe. */
export function gapHintSteps(t: Task): string[] {
  const { a, b, answer } = t;
  switch (t.op) {
    case 'add':
      return [`Rechne die Umkehraufgabe: ${answer} − ${a} = ${b}.`];
    case 'sub':
      return [`Rechne die Umkehraufgabe: ${a} − ${answer} = ${b}.`];
    case 'mul':
      return [`Rechne die Umkehraufgabe: ${answer} : ${a} = ${b}.`];
    case 'div':
      return [`Rechne die Umkehraufgabe: ${a} : ${answer} = ${b}.`];
  }
}
