import { kindsFor, makeTask, pick, type Rng } from './generator';
import { AREAS, BIOME_CENTER, CELL, GRID, GRID_Z, HALF, cellOf } from './layout';
import { COINS, addCoins, coinBreakdown } from './money';
import { MAX_LEVEL, MAX_STARS, OPS, START_LEVEL, START_STARS, type BuiltItem, type Op, type Profile, type Task } from './types';

/** Bereiche lagen früher als Kette im Norden; Spielstände werden auf die Ringanordnung umgerechnet. */
const OLD_AREAS = [{ id: 'english', z: -150 }, { id: 'german', z: -244 }, { id: 'general', z: -324 }, { id: 'sudoku', z: -404 }, { id: 'puzzle', z: -484 }];
const OLD_GRID = 31;
const OLD_GRID_Z = 148;
const OLD_Z0 = -530;

/** Entdeckte Felder: alte Karten (schmal, lang) werden auf das neue Raster übertragen. */
function migrateExplored(explored: string, areas: string[]): string {
  const full = GRID * GRID_Z;
  if (explored.length === 0 || explored.length === full) return explored;
  if (explored.length > OLD_GRID * OLD_GRID_Z || explored.length % OLD_GRID !== 0) return '';
  const old = '0'.repeat(OLD_GRID * OLD_GRID_Z - explored.length) + explored;
  const out = new Uint8Array(full);
  for (let i = 0; i < old.length; i++) {
    if (old[i] !== '1') continue;
    const x = -HALF + ((i % OLD_GRID) + 0.5) * CELL;
    const z = OLD_Z0 + (Math.floor(i / OLD_GRID) + 0.5) * CELL;
    if (z >= -HALF) out[cellOf(x, z)] = 1;
  }
  for (const a of AREAS) {
    if (!areas.includes(a.id)) continue;
    for (let dz = -24; dz <= 24; dz += CELL) for (let dx = -24; dx <= 24; dx += CELL) if (dx * dx + dz * dz <= 576) out[cellOf(a.center.x + dx, a.center.z + dz)] = 1;
  }
  return Array.from(out, (v) => (v ? '1' : '0')).join('');
}

export function newProfile(id: string, name: string, avatar: string): Profile {
  return {
    id,
    name,
    avatar,
    levels: { add: START_LEVEL, sub: START_LEVEL, mul: START_LEVEL, div: START_LEVEL },
    stats: {},
    recent: { add: [], sub: [], mul: [], div: [] },
    stars: START_STARS,
    outfit: {},
    explored: '',
    talked: {},
    coins: {},
    areas: [],
    sudoku: 0,
    areaLevels: {},
    built: [],
    inventory: {},
    chests: {},
    found: [],
    tool: null,
    nextUid: 1,
  };
}

/** Ergänzt fehlende Felder (ältere Speicherstände) und hebt Anfangsstufen an. */
export function normalizeProfile(p: Partial<Profile>): Profile {
  const base = newProfile(p.id ?? `p${Date.now()}`, p.name ?? 'Held', p.avatar ?? '🦊');
  for (const op of OPS) base.levels[op] = Math.min(MAX_LEVEL, Math.max(START_LEVEL, p.levels?.[op] ?? START_LEVEL));
  base.stats = p.stats ?? {};
  base.stars = Math.min(MAX_STARS, Math.max(1, p.stars ?? START_STARS));
  base.outfit = p.outfit ?? {};
  base.explored = p.explored ?? '';
  base.sudoku = p.sudoku ?? 0;
  base.areaLevels = p.areaLevels ?? {};
  base.talked = p.talked ?? {};
  base.coins = {};
  for (const c of COINS) if (p.coins?.[c]) base.coins[c] = p.coins[c];
  // Ältere Stände hatten nur eine Summe
  const legacy = (p as { rupees?: number }).rupees;
  if (legacy && !p.coins) addCoins(base.coins, coinBreakdown(legacy));
  base.areas = p.areas ?? [];
  base.explored = migrateExplored(base.explored, base.areas);
  base.inventory = p.inventory ?? {};
  base.chests = p.chests ?? {};
  base.found = p.found ?? [];
  base.tool = p.tool ?? null;
  base.nextUid = p.nextUid ?? 1;
  // Ältere Stände: Stücke hatten Koordinaten relativ zur Region
  for (const b of (p.built ?? []) as (Partial<BuiltItem> & { region?: Op })[]) {
    const c = b.region ? BIOME_CENTER[b.region] : { x: 0, z: 0 };
    const legacy = b.uid === undefined;
    base.built.push({
      uid: legacy ? base.nextUid++ : b.uid!,
      item: b.item ?? 'flower',
      x: (b.x ?? 0) + (legacy ? c.x : 0),
      z: (b.z ?? 0) + (legacy ? c.z : 0),
      ry: b.ry ?? 0,
    });
    base.nextUid = Math.max(base.nextUid, base.built[base.built.length - 1].uid + 1);
  }
  if (!p.layoutV2) {
    for (const b of base.built) {
      if (b.z >= -62) continue;
      const old = OLD_AREAS.reduce((best, a) => (Math.abs(a.z - b.z) < Math.abs(best.z - b.z) ? a : best));
      const to = AREAS.find((a) => a.id === old.id);
      if (to && Math.abs(old.z - b.z) < 60) { b.x += to.center.x; b.z += to.center.z - old.z; }
    }
  }
  base.layoutV2 = true;
  return base;
}

const history: string[] = [];
const HISTORY = 10;

/** Plus und Mal sind vertauschbar: 3 + 4 und 4 + 3 gelten als dieselbe Aufgabe. */
function taskKey(t: Task): string {
  const [x, y] = t.op === 'add' || t.op === 'mul' ? [Math.min(t.a, t.b), Math.max(t.a, t.b)] : [t.a, t.b];
  return `${t.op}${x}:${y}`;
}

/** Wiederholung: gleiche Aufgabe in den letzten Runden oder gleicher Zahlenanfang direkt hintereinander. */
function repeated(t: Task, prevOps: Task | null): boolean {
  if (history.includes(taskKey(t))) return true;
  return !!prevOps && (t.a === prevOps.a || t.b === prevOps.b || t.answer === prevOps.answer);
}

let lastTask: Task | null = null;

/** Wählt den Aufgabentyp gewichtet: Typen mit hoher Fehlerquote kommen häufiger. */
export function nextTask(profile: Profile, op: Op, rng: Rng = Math.random): Task {
  const level = profile.levels[op];
  const weighted: string[] = [];
  for (const k of kindsFor(op, level)) {
    const s = profile.stats[k];
    const total = s ? s.right + s.wrong : 0;
    const errRate = total > 0 ? s.wrong / total : 0.3;
    const weight = 1 + Math.round(errRate * 4);
    for (let i = 0; i < weight; i++) weighted.push(k);
  }
  const prev = lastTask && lastTask.op === op ? lastTask : null;
  let task = makeTask(op, pick(rng, weighted), level, rng);
  for (let i = 0; i < 40 && repeated(task, prev); i++) {
    task = makeTask(op, pick(rng, weighted), level, rng);
  }
  history.push(taskKey(task));
  if (history.length > HISTORY) history.shift();
  lastTask = task;
  return task;
}

/** Trägt ein Ergebnis ein und passt die Stufe an (Fenster von 5 Aufgaben: ≥4 richtig → hoch, ≤2 → runter). */
export function recordResult(profile: Profile, task: Task, correct: boolean): 'up' | 'down' | null {
  const s = (profile.stats[task.kind] ??= { right: 0, wrong: 0 });
  if (correct) {
    s.right++;
    profile.stars = Math.min(MAX_STARS, profile.stars + 1);
  } else s.wrong++;

  const recent = (profile.recent[task.op] ??= []);
  recent.push(correct);
  if (recent.length < 5) return null;

  const right = recent.filter(Boolean).length;
  profile.recent[task.op] = [];
  const lvl = profile.levels[task.op];
  if (right >= 4 && lvl < MAX_LEVEL) {
    profile.levels[task.op] = lvl + 1;
    return 'up';
  }
  if (right <= 2 && lvl > 1) {
    profile.levels[task.op] = lvl - 1;
    return 'down';
  }
  return null;
}
