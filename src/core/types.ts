export type Op = 'add' | 'sub' | 'mul' | 'div';

export interface Task {
  op: Op;
  a: number;
  b: number;
  answer: number;
  level: number;
  kind: string;
}

export interface KindStats {
  right: number;
  wrong: number;
}

export type Bag = Record<string, number>;

/** Ein vom Spieler aufgestelltes Stück; Koordinaten gelten weltweit (auch in Häusern). */
export interface BuiltItem {
  uid: number;
  item: string;
  x: number;
  z: number;
  ry: number;
}

export interface Profile {
  id: string;
  name: string;
  avatar: string;
  levels: Record<Op, number>;
  stats: Record<string, KindStats>;
  recent: Record<Op, boolean[]>;
  stars: number;
  /** Geldbeutel: Münzwert → Anzahl. */
  coins: Bag;
  /** Entdeckte Bereiche (zusätzlich zu den vier Welten). */
  areas: string[];
  /** Gelöste Sudokus (bestimmt die Schwierigkeit). */
  sudoku: number;
  /** Stufe je Lernbereich (Englisch, Deutsch, …), 1–6. */
  areaLevels: Record<string, number>;
  built: BuiltItem[];
  inventory: Bag;
  /** Inhalt aller Truhen (Schlüssel = Truhen-ID). */
  chests: Record<string, Bag>;
  /** Bereits gehobene Schätze und geleerte Weltkisten. */
  found: string[];
  tool: string | null;
  nextUid: number;
  /** Getragene Kleidung je Platz (tunic, cap, acc) → Gegenstands-ID. */
  outfit: Record<string, string>;
  /** Entdeckte Kartenfelder als Zeichenkette aus 0/1. */
  explored: string;
  /** Geschichten-Fortschritt je Korok. */
  talked: Record<string, number>;
}

export const OPS: Op[] = ['add', 'sub', 'mul', 'div'];
export const OP_SYMBOL: Record<Op, string> = { add: '+', sub: '−', mul: '×', div: ':' };
export const MAX_LEVEL = 6;
export const START_LEVEL = 2;
export const ROUND_LENGTH = 5;

/** Sterne sind die Lebensenergie. */
export const MAX_STARS = 10;
export const START_STARS = 5;
