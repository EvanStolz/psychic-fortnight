// The two public data feeds, cached in memory per function instance. A feed that fails to load returns null, and
// the report shows that check as not run instead of passing it.

import type { LibraryDb } from '@/lib/engine/libs';
import { parseRetire, RETIRE_URL } from '@/lib/engine/libs';
import type { BadList } from '@/lib/engine/lists';
import { MALEXT_URL, parseMalExt } from '@/lib/engine/lists';
import { asJson, asText, fetchLimited } from './fetch';

const TTL_MS = 6 * 60 * 60 * 1000;
const MAX_FEED_BYTES = 32 * 1024 * 1024;

interface Entry<T> {
  value: T;
  expires: number;
}

const cache = new Map<string, Entry<unknown>>();

async function cached<T>(key: string, load: () => Promise<T>): Promise<T | null> {
  const hit = cache.get(key) as Entry<T> | undefined;
  if (hit && hit.expires > Date.now()) return hit.value;
  try {
    const value = await load();
    cache.set(key, { value, expires: Date.now() + TTL_MS });
    return value;
  } catch (e) {
    console.error(`Feed ${key} failed to load: ${e instanceof Error ? e.message : 'unknown error'}`);
    // A stale copy beats no check at all.
    return hit ? hit.value : null;
  }
}

export function libraryDb(): Promise<LibraryDb | null> {
  return cached('retire', async () => {
    const res = await fetchLimited(RETIRE_URL, MAX_FEED_BYTES);
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    return parseRetire(asJson(res));
  });
}

export function badList(): Promise<BadList | null> {
  return cached('malext', async () => {
    const res = await fetchLimited(MALEXT_URL, MAX_FEED_BYTES);
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    return parseMalExt(asText(res));
  });
}
