import type { Bag } from './types';

export interface Loot {
  rupees: number;
  items: Bag;
}

function rngFor(id: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  let s = (h >>> 0) % 2147483646 + 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const CHEST_POOL = ['flower', 'bush', 'lantern', 'fence', 'wood', 'flag', 'gem'];

/** Inhalt einer Weltkiste: immer gleich für dieselbe ID. */
export function chestLoot(id: string): Loot {
  const r = rngFor(id);
  const items: Bag = {};
  const n = 1 + Math.floor(r() * 2);
  for (let i = 0; i < n; i++) {
    const it = CHEST_POOL[Math.floor(r() * CHEST_POOL.length)];
    items[it] = (items[it] ?? 0) + 1 + Math.floor(r() * 2);
  }
  return { rupees: 5 + Math.floor(r() * 11), items };
}

/** Vergrabener Schatz (glitzernde Stelle). */
export function treasureLoot(id: string): Loot {
  const r = rngFor(`t${id}`);
  return { rupees: 4 + Math.floor(r() * 8), items: r() < 0.5 ? { gem: 1 } : {} };
}
