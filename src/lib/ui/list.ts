// The reviewer's library of checked extensions. It lives only in this browser (and only if they allow it) and in
// files they save; the server never sees it.

import type { Store } from '@/lib/engine/types';

export const STORAGE_KEY = 'crx-sniffer:list:v1';
export const FILE_FORMAT = 'crx-sniffer-list';

export interface Entry {
  store: Store | null;
  id: string;
  name: string;
  version: string;
  icon: string | null;
  /** The engine's summary when the extension was added, such as "Capability High, all else Low". */
  summary: string;
  /** ISO date it was added. */
  date: string;
  rulesVersion: number;
  publisher: string | null;
}

export class ListFileError extends Error {}

const STORES = new Set(['chrome', 'edge', 'firefox']);
const MAX_ENTRIES = 5000;

/** Same store and ID means the same extension; adding it again replaces the older copy. */
export function keyOf(e: Pick<Entry, 'store' | 'id'>): string {
  return `${e.store ?? 'upload'}:${e.id}`;
}

export function upsert(list: Entry[], entry: Entry): Entry[] {
  return [entry, ...list.filter((e) => keyOf(e) !== keyOf(entry))];
}

export function remove(list: Entry[], key: string): Entry[] {
  return list.filter((e) => keyOf(e) !== key);
}

export function serialise(list: Entry[]): string {
  return `${JSON.stringify({ format: FILE_FORMAT, version: 2, entries: list }, null, 2)}\n`;
}

/**
 * Reads a saved library file. Every field is checked, since the file may come from anyone. Version 1 files also
 * carried an approve or deny decision; those fields are ignored.
 */
export function parseListFile(text: string): Entry[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ListFileError('That file is not a saved library.');
  }
  if (!isRecord(data) || data.format !== FILE_FORMAT || !Array.isArray(data.entries)) throw new ListFileError('That file is not a saved library.');
  if (data.entries.length > MAX_ENTRIES) throw new ListFileError(`A library can hold up to ${MAX_ENTRIES} extensions.`);
  return data.entries.map((raw, i) => {
    const e = readEntry(raw);
    if (!e) throw new ListFileError(`Entry ${i + 1} in the file is not valid.`);
    return e;
  });
}

function readEntry(raw: unknown): Entry | null {
  if (!isRecord(raw)) return null;
  const { store, id, name, version, icon, summary = '', date, rulesVersion, publisher } = raw;
  if (store !== null && !(typeof store === 'string' && STORES.has(store))) return null;
  if (typeof id !== 'string' || !/^[\w@.{}~-]{1,200}$/.test(id)) return null;
  if (typeof name !== 'string' || typeof version !== 'string' || typeof summary !== 'string' || typeof date !== 'string') return null;
  if (icon !== null && !(typeof icon === 'string' && /^data:image\/(png|jpeg|gif|webp);base64,[A-Za-z0-9+/=]+$/.test(icon))) return null;
  if (typeof rulesVersion !== 'number' || (publisher !== null && typeof publisher !== 'string')) return null;
  if (Number.isNaN(Date.parse(date))) return null;
  return {
    store: store as Store | null,
    id,
    name: name.slice(0, 200),
    version: version.slice(0, 64),
    icon,
    summary: summary.slice(0, 300),
    date,
    rulesVersion,
    publisher: publisher === null ? null : publisher.slice(0, 200),
  };
}

/** Loads the library from this browser. Storage can be missing or blocked, so failures read as an empty library. */
export function load(): Entry[] {
  try {
    const text = window.localStorage.getItem(STORAGE_KEY);
    return text ? parseListFile(text) : [];
  } catch {
    return [];
  }
}

export function save(list: Entry[]): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, serialise(list));
    return true;
  } catch {
    return false;
  }
}

/** Deletes the stored library. */
export function forget(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing stored, or storage is blocked; either way nothing is kept.
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
