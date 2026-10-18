import type { Op } from './types';

/** Die vier Welten liegen als Quadranten nebeneinander; in der Mitte ist der Marktplatz. */
export const HALF = 62;
export const BIOME_CENTER: Record<Op, { x: number; z: number }> = {
  add: { x: -30, z: -30 },
  sub: { x: 30, z: -30 },
  mul: { x: -30, z: 30 },
  div: { x: 30, z: 30 },
};

const MARGIN = 3;

/** Welt an einer Position; nahe der Grenze bleibt die bisherige Welt aktiv (kein Flackern). */
export function biomeAt(x: number, z: number, prev?: Op): Op {
  const east = prev ? (prev === 'sub' || prev === 'div' ? x > -MARGIN : x > MARGIN) : x > 0;
  const south = prev ? (prev === 'mul' || prev === 'div' ? z > -MARGIN : z > MARGIN) : z > 0;
  return south ? (east ? 'div' : 'mul') : east ? 'sub' : 'add';
}

export type StationId = 'calc' | 'gap' | 'shop' | 'eng' | 'ger' | 'gen' | 'sud' | 'puz' | 'portal' | 'dog' | 'wall';
/** Stellen der Lernbereiche (nicht Mathe) mit Fachgebiet. */
export const AREA_STATION: Record<string, StationId> = { english: 'eng', german: 'ger', general: 'gen', sudoku: 'sud', puzzle: 'puz' };
export interface Station {
  id: StationId;
  op: Op;
  x: number;
  z: number;
  /** Für Portale: Bereich, in dessen Mitte das Portal steht (leer = Marktplatz). */
  area?: string;
}

/** Fester Ort im Dorf jeder Welt. */
export function villageOf(op: Op) {
  const c = BIOME_CENTER[op];
  return {
    spawn: { x: c.x, z: c.z + 3 },
    stations: [
      { id: 'calc', op, x: c.x - 8, z: c.z - 2 },
      { id: 'gap', op, x: c.x + 8, z: c.z - 2 },
      { id: 'shop', op, x: c.x, z: c.z - 6.5 },
    ] as Station[],
    house: { key: `v-${op}`, x: c.x, z: c.z + 8, ry: 0 },
    chest: { id: `w-${op}-village`, x: c.x - 5.5, z: c.z + 7 },
  };
}

export const HUB_SPAWN = { x: 0, z: 4 };

type Pt = { x: number; z: number };
const sgn = (v: number) => (v < 0 ? -1 : 1);

/** Markante Geländepunkte jeder Welt: Gipfel, Hochplateau (mit Rampe) und Tal. */
export function landmarksOf(op: Op): { summit: Pt; plateau: Pt; valley: Pt; rampDir: number } {
  const c = BIOME_CENTER[op];
  const sx = sgn(c.x), sz = sgn(c.z);
  return {
    summit: { x: c.x + sx * 19, z: c.z - sz * 14 },
    plateau: { x: c.x + sx * 6, z: c.z + sz * 20 },
    valley: { x: c.x - sx * 18, z: c.z - sz * 8 },
    rampDir: -sz,
  };
}

export const PLATEAU = { hx: 6, hz: 4.5, h: 2.4 };
export const SUMMIT_H = 5.5;

/** Zusätzliche Mathe-Stellen auf Gipfel, Plateau und im Tal. */
export function extraStations(op: Op): Station[] {
  const c = BIOME_CENTER[op];
  const l = landmarksOf(op);
  return [
    { id: 'gap', op, x: l.summit.x - sgn(c.x) * 3.2, z: l.summit.z },
    { id: 'calc', op, x: l.plateau.x, z: l.plateau.z },
    { id: 'gap', op, x: l.valley.x, z: l.valley.z },
  ];
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const gauss = (dx: number, dz: number, sigma: number) => Math.exp(-(dx * dx + dz * dz) / (2 * sigma * sigma));

function segDist(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
  const vx = bx - ax, vz = bz - az;
  const t = Math.min(1, Math.max(0, ((px - ax) * vx + (pz - az) * vz) / (vx * vx + vz * vz)));
  return Math.hypot(px - ax - vx * t, pz - az - vz * t);
}

const LANDMARKS = (['add', 'sub', 'mul', 'div'] as Op[]).map((op) => ({ op, c: BIOME_CENTER[op], ...landmarksOf(op) }));

/** Englisch-Land: schließt im Norden an die Mathe-Welten an. */
export const ENGLISH = { x: 0, z: -130, r: 36 };
export const ENGLISH_SPAWN = { x: 0, z: -122 };

/** Begehbare Welt als Rechteck: der Marktplatz mit den Mathe-Welten in der Mitte, die Bereiche ringsum. */
export const SPACING = 130;
export const X0 = -184;
export const X1 = 184;
export const Z0 = -184;
export const Z1 = HALF;

/**
 * Bereiche hängen als Erweiterung an der Hauptwelt. Man entdeckt sie, indem man hineinläuft.
 * In der Mitte jedes Bereichs steht ein Weltportal zu allen entdeckten Bereichen.
 * Neue Bereiche: hier eintragen, Z0 anpassen und in world.ts bauen.
 */
export interface Area {
  id: string;
  name: string;
  emoji: string;
  center: { x: number; z: number };
  radius: number;
  spawn: { x: number; z: number };
  portal: { x: number; z: number };
  /** Bodenfarbe der Wiese (3D) und Farbe auf der Karte. */
  ground: number;
  map: [number, number, number];
}
const mkArea = (id: string, name: string, emoji: string, x: number, z: number, ground: number, map: [number, number, number]): Area => ({
  id, name, emoji, center: { x, z }, radius: 40, spawn: { x, z: z + 8 }, portal: { x, z }, ground, map,
});
/**
 * Lage rund um den Marktplatz:
 *   Deutsch-Dorf   Englisch-Land   Wissens-Wiese
 *   Sudoku-Hügel   Marktplatz      Rätsel-Berg
 */
export const AREAS: Area[] = [
  { id: 'english', name: 'Englisch-Land', emoji: '🇬🇧', center: { x: ENGLISH.x, z: ENGLISH.z }, radius: ENGLISH.r + 12, spawn: ENGLISH_SPAWN, portal: { x: ENGLISH.x, z: ENGLISH.z }, ground: 0xb6e08a, map: [127, 197, 102] },
  mkArea('german', 'Deutsch-Dorf', '📚', -SPACING, -SPACING, 0xf0d9a0, [220, 190, 120]),
  mkArea('general', 'Wissens-Wiese', '🌍', SPACING, -SPACING, 0x9fd8c0, [100, 200, 170]),
  mkArea('sudoku', 'Sudoku-Hügel', '🔢', -SPACING, 0, 0xc9b8f0, [170, 150, 225]),
  mkArea('puzzle', 'Rätsel-Berg', '🧩', SPACING, 0, 0xf0b0a0, [230, 140, 130]),
];
/** Bello, der Hund auf dem Marktplatz (Rechen-Rennen). */
export const DOG_STATION: Station = { id: 'dog', op: 'add', x: -2.2, z: -3.2 };
/** Bauarbeiter auf dem Sudoku-Hügel (Zahlenmauer). */
export const WALL_STATION: Station = { id: 'wall', op: 'add', x: -SPACING - 22, z: -18 };
export const HUB_PORTAL = { x: 0, z: -9.5 };
export const areaById = (id: string): Area | undefined => AREAS.find((a) => a.id === id);
export const areaAt = (x: number, z: number): Area | undefined => AREAS.find((a) => Math.hypot(x - a.center.x, z - a.center.z) < a.radius);
/** Weltportale: Marktplatz und Mitte jedes Bereichs. */
export const portalStations = (): Station[] => [
  { id: 'portal', op: 'add', ...HUB_PORTAL },
  ...AREAS.map((a): Station => ({ id: 'portal', op: 'add', x: a.portal.x, z: a.portal.z, area: a.id })),
];
/** Fünf Lernstellen je Bereich, rund um die Mitte. */
export function areaStations(a: Area): Station[] {
  const z = a.center.z;
  const id = AREA_STATION[a.id];
  return [[-10, -4], [10, -4], [-14, 10], [14, 10], [0, -14]].map(([dx, dz]): Station => ({ id, op: 'add', x: a.center.x + dx, z: z + dz }));
}
export const englishStations = (): Station[] => areaStations(AREAS[0]);

/** Geländehöhe: sanfte Hügel, flach um Marktplatz, Dörfer und Wege, dazu Gipfel, Plateaus und Täler. Die Bereiche außerhalb sind eben. */
export function heightAt(x: number, z: number): number {
  if (x > 500) return 0;
  let flat = smooth(10, 18, Math.hypot(x, z));
  for (const m of LANDMARKS) {
    flat = Math.min(flat, smooth(11, 19, Math.hypot(x - m.c.x, z - m.c.z)));
    flat = Math.min(flat, smooth(2.5, 6, segDist(x, z, 0, 0, m.c.x, m.c.z)));
  }
  flat *= 1 - smooth(50, 64, Math.max(Math.abs(x), Math.abs(z)));
  let h = (1.5 * Math.sin(x * 0.085 + 1.7) * Math.cos(z * 0.07 + 0.6) + 0.8 * Math.sin(x * 0.19 + z * 0.15 + 2)) * 0.6 * flat;
  for (const m of LANDMARKS) {
    h += SUMMIT_H * gauss(x - m.summit.x, z - m.summit.z, 7.5);
    h -= 2.2 * gauss(x - m.valley.x, z - m.valley.z, 6);
    const qx = Math.abs(x - m.plateau.x) - PLATEAU.hx, qz = Math.abs(z - m.plateau.z) - PLATEAU.hz;
    const d = Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0);
    const onRampSide = (z - m.plateau.z) * m.rampDir > 0;
    const w = 0.9 + (onRampSide ? 8 * Math.exp(-(((x - m.plateau.x) / 2.2) ** 2)) : 0);
    h += PLATEAU.h * (1 - smooth(0, w, d));
  }
  return h;
}

/** Entdeckungs-Raster der Karte. */
export const CELL = 4;
export const GRID = Math.ceil((X1 - X0) / CELL);
export const GRID_Z = Math.ceil((Z1 - Z0) / CELL);
export const cellOf = (x: number, z: number): number => {
  const cx = Math.min(GRID - 1, Math.max(0, Math.floor((x - X0) / CELL)));
  const cz = Math.min(GRID_Z - 1, Math.max(0, Math.floor((z - Z0) / CELL)));
  return cz * GRID + cx;
};

