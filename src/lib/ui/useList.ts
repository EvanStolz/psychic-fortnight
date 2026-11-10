'use client';

import { useCallback, useSyncExternalStore } from 'react';
import type { Entry } from './list';
import { load, save, STORAGE_KEY } from './list';

// One shared copy of the list per tab, kept in step with other tabs through the storage event.
const listeners = new Set<() => void>();
let snapshot: Entry[] | null = null;
const EMPTY: Entry[] = [];

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      snapshot = null;
      listener();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

function getSnapshot(): Entry[] {
  snapshot ??= load();
  return snapshot;
}

export function useList(): { list: Entry[]; ready: boolean; update: (next: Entry[]) => boolean } {
  const list = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  const update = useCallback((next: Entry[]) => {
    const ok = save(next);
    snapshot = next;
    for (const l of listeners) l();
    return ok;
  }, []);
  return { list, ready, update };
}
