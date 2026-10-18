import type { Bag, BuiltItem, Profile } from './types';

export type ItemKind = 'build' | 'tool' | 'material' | 'outfit';
export type Slot = 'tunic' | 'cap' | 'acc';

export interface ItemDef {
  id: string;
  name: string;
  emoji: string;
  price: number;
  kind: ItemKind;
  /** Wird beim Händler angeboten. */
  stock: boolean;
  /** Nur Kleidung: Platz am Körper und Farbe bzw. Zubehör. */
  slot?: Slot;
  color?: number;
}

export const ITEMS: ItemDef[] = [
  { id: 'shovel', name: 'Schaufel', emoji: '⛏️', price: 23, kind: 'tool', stock: true },
  { id: 'axe', name: 'Axt', emoji: '🪓', price: 27, kind: 'tool', stock: true },
  { id: 'sword', name: 'Schwert', emoji: '🗡️', price: 43, kind: 'tool', stock: true },
  { id: 'flower', name: 'Blume', emoji: '🌼', price: 7, kind: 'build', stock: true },
  { id: 'fence', name: 'Zaun', emoji: '🚧', price: 13, kind: 'build', stock: true },
  { id: 'bush', name: 'Busch', emoji: '🌿', price: 14, kind: 'build', stock: true },
  { id: 'lantern', name: 'Laterne', emoji: '🏮', price: 19, kind: 'build', stock: true },
  { id: 'tree', name: 'Baum', emoji: '🌳', price: 24, kind: 'build', stock: true },
  { id: 'flag', name: 'Fahne', emoji: '🚩', price: 31, kind: 'build', stock: true },
  { id: 'chest', name: 'Schatztruhe', emoji: '🧰', price: 47, kind: 'build', stock: true },
  { id: 'statue', name: 'Koro-Statue', emoji: '🗿', price: 62, kind: 'build', stock: true },
  { id: 'fountain', name: 'Brunnen', emoji: '⛲', price: 78, kind: 'build', stock: true },
  { id: 'house', name: 'Haus', emoji: '🏠', price: 119, kind: 'build', stock: true },
  { id: 'tunic-blue', name: 'Blaue Jacke', emoji: '👕', price: 29, kind: 'outfit', stock: true, slot: 'tunic', color: 0x3a6fd8 },
  { id: 'tunic-red', name: 'Rote Jacke', emoji: '🧥', price: 29, kind: 'outfit', stock: true, slot: 'tunic', color: 0xd8443a },
  { id: 'tunic-purple', name: 'Lila Jacke', emoji: '👚', price: 37, kind: 'outfit', stock: true, slot: 'tunic', color: 0x8a4fd0 },
  { id: 'tunic-gold', name: 'Goldene Jacke', emoji: '🥇', price: 69, kind: 'outfit', stock: true, slot: 'tunic', color: 0xe3b72a },
  { id: 'cap-red', name: 'Rote Mütze', emoji: '🧢', price: 17, kind: 'outfit', stock: true, slot: 'cap', color: 0xd8443a },
  { id: 'cap-blue', name: 'Blaue Mütze', emoji: '🎩', price: 19, kind: 'outfit', stock: true, slot: 'cap', color: 0x3a6fd8 },
  { id: 'cap-pink', name: 'Rosa Mütze', emoji: '🎀', price: 21, kind: 'outfit', stock: true, slot: 'cap', color: 0xf07aa8 },
  { id: 'acc-crown', name: 'Krone', emoji: '👑', price: 88, kind: 'outfit', stock: true, slot: 'acc' },
  { id: 'acc-glasses', name: 'Sonnenbrille', emoji: '🕶️', price: 38, kind: 'outfit', stock: true, slot: 'acc' },
  { id: 'acc-cape', name: 'Umhang', emoji: '🦸', price: 59, kind: 'outfit', stock: true, slot: 'acc' },
  { id: 'wood', name: 'Holz', emoji: '🪵', price: 6, kind: 'material', stock: false },
  { id: 'gem', name: 'Edelstein', emoji: '💠', price: 30, kind: 'material', stock: false },
];

export const itemById = (id: string): ItemDef => ITEMS.find((i) => i.id === id) ?? ITEMS[0];

/** Der Händler kauft zum halben Preis. */
export const sellPrice = (id: string): number => Math.floor(itemById(id).price / 2);

/** Rubine: schwere Stufen und Treffer beim ersten Versuch zahlen sich aus. */
export function rupeeReward(level: number, firstTry: boolean): number {
  return firstTry ? 2 + level : 1;
}

export const PERFECT_BONUS = 10;

export function addItem(bag: Bag, id: string, n = 1): void {
  bag[id] = (bag[id] ?? 0) + n;
}

export function takeItem(bag: Bag, id: string, n = 1): boolean {
  if ((bag[id] ?? 0) < n) return false;
  bag[id] -= n;
  if (bag[id] === 0) delete bag[id];
  return true;
}

export function moveItem(from: Bag, to: Bag, id: string, n = 1): boolean {
  if (!takeItem(from, id, n)) return false;
  addItem(to, id, n);
  return true;
}

export const bagSize = (bag: Bag): number => Object.values(bag).reduce((a, b) => a + b, 0);

/** Stellt ein Stück aus dem Inventar in die Welt. */
export function place(profile: Profile, id: string, x: number, z: number, ry: number): BuiltItem | null {
  if (!takeItem(profile.inventory, id)) return null;
  const b: BuiltItem = { uid: profile.nextUid++, item: id, x, z, ry };
  profile.built.push(b);
  return b;
}

/** Nimmt ein aufgestelltes Stück zurück ins Inventar. */
export function pickUp(profile: Profile, uid: number): BuiltItem | null {
  const i = profile.built.findIndex((b) => b.uid === uid);
  if (i < 0) return null;
  const [b] = profile.built.splice(i, 1);
  addItem(profile.inventory, b.item);
  return b;
}

/** Wie viele Stücke gerade benutzt werden (Werkzeug in der Hand, getragene Kleidung) und nicht verkauft werden dürfen. */
export function inUse(p: Profile, id: string): number {
  return (p.tool === id ? 1 : 0) + (Object.values(p.outfit ?? {}).includes(id) ? 1 : 0);
}
