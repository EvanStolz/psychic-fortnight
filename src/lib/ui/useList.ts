'use client';

import { useCallback, useSyncExternalStore } from 'react';
import type { Entry } from './list';
import { forget, load, save, STORAGE_KEY } from './list';

// One shared copy of the library per tab. When the reviewer lets this browser keep it, it is saved to local storage
// and kept in step with other tabs; when they don't, it lives only in this tab's memory and is gone on reload.

/** The only thing stored when keeping is off: the choice itself. */
const KEEP_KEY = 'crx-sniffer:keep';

const listeners = new Set<() => void>();
let snapshot: Entry[] | null = null;
let keepSnapshot: boolean | null = null;
const EMPTY: Entry[] = [];

function readKeep(): boolean {
  try {
    return window.localStorage.getItem(KEEP_KEY) !== 'off';
  } catch {
    return false;
  }
}

function notify(): void {
  for (const l of listeners) l();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === KEEP_KEY) {
      keepSnapshot = null;
      if (getKeep()) snapshot = null;
      listener();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

function getKeep(): boolean {
  keepSnapshot ??= readKeep();
  return keepSnapshot;
}

function getSnapshot(): Entry[] {
  snapshot ??= getKeep() ? load() : [];
  return snapshot;
}

/** Turns keeping on (saves the current library) or off (deletes the stored copy, keeps it in this tab only). */
function setKeep(on: boolean): boolean {
  const current = getSnapshot();
  let ok = true;
  try {
    if (on) {
      window.localStorage.removeItem(KEEP_KEY);
      ok = save(current);
    } else {
      window.localStorage.setItem(KEEP_KEY, 'off');
      forget();
    }
  } catch {
    ok = false;
    forget();
  }
  keepSnapshot = on && ok;
  notify();
  return ok;
}

export function useList(): {
  list: Entry[];
  ready: boolean;
  keep: boolean;
  setKeep: (on: boolean) => boolean;
  update: (next: Entry[]) => boolean;
} {
  const list = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
  const keep = useSyncExternalStore(subscribe, getKeep, () => true);
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  const update = useCallback((next: Entry[]) => {
    const ok = getKeep() ? save(next) : true;
    snapshot = next;
    notify();
    return ok;
  }, []);
  return { list, ready, keep, setKeep, update };
}
