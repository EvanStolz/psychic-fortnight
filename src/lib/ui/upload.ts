'use client';

// Uploaded files are analysed here in the browser and never sent anywhere. Only the extension ID goes to the server,
// to look up its store listing.

import { analyse } from '@/lib/engine/analyse';
import { readContainer } from '@/lib/engine/crx';
import { parseRetire, RETIRE_URL } from '@/lib/engine/libs';
import { MALEXT_URL, parseMalExt } from '@/lib/engine/lists';
import { parseManifest } from '@/lib/engine/manifest';
import type { ListingResult, Report, Store } from '@/lib/engine/types';
import { unpack } from '@/lib/engine/unzip';

export const MAX_UPLOAD_BYTES = 128 * 1024 * 1024;

async function feed<T>(url: string, parse: (text: string) => T): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: 'force-cache' });
    return res.ok ? parse(await res.text()) : null;
  } catch {
    return null;
  }
}

/** The ID a package claims: the signed CRX ID, or the Firefox add-on ID in its manifest. */
function peekId(bytes: Uint8Array): { store: Store; id: string } | null {
  try {
    const c = readContainer(bytes);
    if (c.kind === 'crx3') return c.header.declaredId ? { store: 'chrome', id: c.header.declaredId } : null;
    if (c.kind !== 'zip') return null;
    const manifest = parseManifest(unpack(c.archive).files);
    for (const key of ['browser_specific_settings', 'applications']) {
      const bss = manifest[key];
      if (bss && typeof bss === 'object' && !Array.isArray(bss)) {
        const gecko = bss.gecko;
        if (gecko && typeof gecko === 'object' && !Array.isArray(gecko) && typeof gecko.id === 'string') return { store: 'firefox', id: gecko.id };
      }
    }
  } catch {
    // analyse() reports the real problem.
  }
  return null;
}

async function listingFor(target: { store: Store; id: string } | null): Promise<{ store: Store | null; listing: ListingResult }> {
  const none = { store: null, listing: { status: 'none' } as const };
  if (!target) return none;
  const stores: Store[] = target.store === 'chrome' ? ['chrome', 'edge'] : [target.store];
  for (const store of stores) {
    try {
      const res = await fetch(`/api/listing/${store}/${encodeURIComponent(target.id)}`);
      if (!res.ok) continue;
      const result = (await res.json()) as ListingResult;
      if (result.status === 'ok') return { store, listing: result };
    } catch {
      // Try the next store.
    }
  }
  // An uploaded file that no store lists is simply unlisted, not removed.
  return none;
}

export async function analyseUpload(file: File): Promise<Report> {
  if (file.size > MAX_UPLOAD_BYTES) throw new Error('That file is larger than 128 MB.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const target = peekId(bytes);
  const [libraries, badList, found] = await Promise.all([
    feed(RETIRE_URL, (t) => parseRetire(JSON.parse(t))),
    feed(MALEXT_URL, parseMalExt),
    listingFor(target),
  ]);
  // Analysed as an upload (no store signature is assumed), then tagged with the store that lists it, so a decision
  // on it lands in the right policy file.
  const report = await analyse({ bytes, store: null, id: null, libraries, badList, listing: found.listing });
  return { ...report, store: found.store };
}
