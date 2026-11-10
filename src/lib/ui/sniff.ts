'use client';

import { useSyncExternalStore } from 'react';

// Whether the header dog has its nose down: while a check runs and while a report is on screen.

let sniffing = false;
const listeners = new Set<() => void>();

export function setSniffing(on: boolean): void {
  if (on === sniffing) return;
  sniffing = on;
  for (const l of listeners) l();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSniffing(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => sniffing,
    () => false,
  );
}
