import { describe, expect, it } from 'vitest';
import { analyse } from '@/lib/engine/analyse';
import type { Store } from '@/lib/engine/types';
import { badList, libraryDb } from './feeds';
import { currentRelease, downloadPackage, fetchListing } from './stores';

// Dark Reader in each store. The verdict should stay Approve and every signature should verify.
const CASES: [Store, string][] = [
  ['chrome', 'eimadpbcbfnmbkopoojfekhnkhdbieeh'],
  ['edge', 'ifoakfbpdcdoeenechcleahebpibofpc'],
  ['firefox', 'darkreader'],
];

describe.each(CASES)('%s %s', (store, id) => {
  it('downloads, verifies and approves the current version', async () => {
    const lookup = await currentRelease(store, id);
    if (lookup.status !== 'ok') throw new Error('not in the store');
    const { release } = lookup;
    const [bytes, libraries, list, listing] = await Promise.all([
      downloadPackage(store, release.download, release.sha256),
      libraryDb(),
      badList(),
      release.listing ?? fetchListing(store, release.id),
    ]);
    expect(libraries).not.toBeNull();
    expect(list).not.toBeNull();
    expect(listing.status).toBe('ok');
    const report = await analyse({ bytes, store, id: release.id, libraries, badList: list, listing });
    expect(report.package?.version).toBe(release.version);
    expect(report.signature?.status).toBe(store === 'firefox' ? 'store-delivered' : 'verified');
    expect(report.verdict).toBe('approve');
  });
});

it('reports an unknown Chrome ID as gone', async () => {
  expect(await currentRelease('chrome', 'a'.repeat(32))).toEqual({ status: 'gone' });
});
