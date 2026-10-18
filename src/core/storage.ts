import { normalizeProfile, newProfile } from './adaptive';
import type { Profile } from './types';
import type { ScoreEntry } from './dash';

const KEY = 'zahlenland.profiles.v1';

export function loadProfiles(): Profile[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Partial<Profile>[]).map(normalizeProfile) : [];
  } catch {
    return [];
  }
}

export function saveProfiles(list: Profile[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* Speicher voll oder gesperrt: Spiel läuft trotzdem weiter */
  }
}

export function createProfile(list: Profile[], name: string, avatar: string): Profile {
  const p = newProfile(`p${Date.now()}`, name, avatar);
  list.push(p);
  saveProfiles(list);
  return p;
}

export function deleteProfile(list: Profile[], id: string): void {
  const i = list.findIndex((p) => p.id === id);
  if (i >= 0) list.splice(i, 1);
  saveProfiles(list);
}

/** Alle Spielstände als Text (Sicherungsdatei). */
export function exportProfiles(list: Profile[]): string {
  return JSON.stringify({ game: 'zahlenland', version: 1, profiles: list }, null, 1);
}

/** Liest eine Sicherung; vorhandene Spieler mit gleicher ID werden ersetzt. Gibt die Anzahl zurück. */
export function importProfiles(list: Profile[], text: string): number {
  const data = JSON.parse(text) as { game?: string; profiles?: Partial<Profile>[] };
  if (data.game !== 'zahlenland' || !Array.isArray(data.profiles)) throw new Error('bad file');
  let n = 0;
  for (const raw of data.profiles) {
    const p = normalizeProfile(raw);
    const i = list.findIndex((x) => x.id === p.id);
    if (i >= 0) list[i] = p;
    else list.push(p);
    n++;
  }
  saveProfiles(list);
  return n;
}

const SCORE_KEY = 'lernia.dash.scores.v2';

/** Bestenliste des Hundespiels, gemeinsam für alle Spieler auf diesem Gerät. */
export function loadScores(): ScoreEntry[] {
  try {
    const raw = JSON.parse(localStorage.getItem(SCORE_KEY) ?? '[]') as ScoreEntry[];
    return Array.isArray(raw) ? raw.filter((e) => typeof e.score === 'number' && typeof e.name === 'string').slice(0, 10) : [];
  } catch {
    return [];
  }
}

export function saveScores(list: ScoreEntry[]): void {
  try {
    localStorage.setItem(SCORE_KEY, JSON.stringify(list));
  } catch {
    /* ignorieren */
  }
}
