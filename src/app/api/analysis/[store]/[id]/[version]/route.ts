// GET /api/analysis/{store}/{id}/{version}: the full report for one version, cached by the CDN.

import type { NextRequest } from 'next/server';
import { analyse } from '@/lib/engine/analyse';
import { isValidTarget, isValidVersion } from '@/lib/engine/input';
import { badList, libraryDb } from '@/lib/server/feeds';
import { analysisPath, CACHE_REPORT, CACHE_SHORT, failure, fromError, json, param, redirect } from '@/lib/server/http';
import { currentRelease, downloadPackage, fetchListing, firefoxVersion } from '@/lib/server/stores';

export const maxDuration = 60;

export async function GET(_request: NextRequest, ctx: RouteContext<'/api/analysis/[store]/[id]/[version]'>): Promise<Response> {
  const raw = await ctx.params;
  const store = raw.store;
  const id = param(raw.id);
  const version = param(raw.version);
  if (!isValidTarget(store, id) || !isValidVersion(version)) return failure('Not a valid store, extension ID or version.', 400, CACHE_SHORT);

  try {
    const lookup = await currentRelease(store, id);
    if (lookup.status === 'gone') return failure('This extension is not in the store. If you have the file, upload it instead.', 404, CACHE_SHORT);
    const release = lookup.release;
    if (release.id !== id) return redirect(analysisPath(store, release.id, version));

    let download = release.download;
    let sha256 = release.sha256;
    if (release.version !== version) {
      // Chrome and Edge only serve the current version. Firefox keeps old ones.
      if (store !== 'firefox') return redirect(analysisPath(store, id, release.version));
      const old = await firefoxVersion(id, version);
      if (!old) return failure(`Version ${version} is not on Firefox Add-ons.`, 404, CACHE_SHORT);
      ({ download, sha256 } = old);
    }

    const [bytes, libraries, list, listing] = await Promise.all([
      downloadPackage(store, download, sha256),
      libraryDb(),
      badList(),
      release.listing ? Promise.resolve(release.listing) : fetchListing(store, id),
    ]);
    const report = await analyse({ bytes, store, id, libraries, badList: list, listing });

    // Edge can list a version a moment before it serves it. Point at what was actually analysed.
    if (report.package && report.package.version !== version && store !== 'firefox') {
      return redirect(analysisPath(store, id, report.package.version));
    }
    // When a feed or the listing failed to load, cache briefly so the next lookup can complete the report.
    const transientGap = !libraries || !list || listing.status === 'error';
    return json(report, 200, transientGap ? CACHE_SHORT : CACHE_REPORT);
  } catch (e) {
    return fromError(e);
  }
}
