// Talks to the three stores: the current version, the package download and the listing.

import { amoDetailsUrl, edgeDetailsUrl, listingUrl, parseAmoListing, parseChromeListing, parseEdgeListing } from '@/lib/engine/listing';
import type { ListingResult, Store } from '@/lib/engine/types';
import { asJson, asText, FetchError, fetchLimited } from './fetch';

export const MAX_PACKAGE_BYTES = 128 * 1024 * 1024;
const MAX_PAGE_BYTES = 8 * 1024 * 1024;
const CHROME_VERSION = '150.0.0.0';

export interface Release {
  /** Canonical ID. For Firefox this is the add-on GUID, even when a slug was given. */
  id: string;
  version: string;
  download: string;
  /** Expected hash of the download, when the store says. */
  sha256: string | null;
  /** The listing, when the version lookup already returned it. */
  listing: ListingResult | null;
}

export type Lookup = { status: 'ok'; release: Release } | { status: 'gone' };

/** The version the store serves now, and where to download it. */
export async function currentRelease(store: Store, id: string): Promise<Lookup> {
  if (store === 'chrome') {
    const res = await fetchLimited(chromeUpdateUrl(id), 1024 * 1024);
    if (res.status !== 200) throw new FetchError('The Chrome Web Store did not answer the version check.', res.status);
    const update = parseUpdateCheck(asText(res), id);
    if (!update) return { status: 'gone' };
    return { status: 'ok', release: { id, version: update.version, download: update.codebase, sha256: update.sha256, listing: null } };
  }
  if (store === 'edge') {
    const res = await fetchLimited(edgeDetailsUrl(id), MAX_PAGE_BYTES);
    if (res.status === 404) return { status: 'gone' };
    if (res.status !== 200) throw new FetchError('Edge Add-ons did not answer the version check.', res.status);
    const json = asJson(res);
    const listing = parseEdgeListing(json, id);
    const version = typeof json === 'object' && json !== null && 'version' in json && typeof json.version === 'string' ? json.version : null;
    if (!listing || !version) return { status: 'gone' };
    return { status: 'ok', release: { id, version, download: edgeDownloadUrl(id), sha256: null, listing: { status: 'ok', listing } } };
  }
  const res = await fetchLimited(amoDetailsUrl(id), MAX_PAGE_BYTES);
  if (res.status === 404 || res.status === 401 || res.status === 403) return { status: 'gone' };
  if (res.status !== 200) throw new FetchError('Firefox Add-ons did not answer the version check.', res.status);
  const amo = parseAmoListing(asJson(res));
  if (!amo) return { status: 'gone' };
  return { status: 'ok', release: { id: amo.guid, version: amo.version, download: amo.xpi, sha256: null, listing: { status: 'ok', listing: amo.listing } } };
}

/** A specific Firefox version. AMO keeps old versions; Chrome and Edge only serve the current one. */
export async function firefoxVersion(id: string, version: string): Promise<{ download: string; sha256: string | null } | null> {
  const res = await fetchLimited(`https://addons.mozilla.org/api/v5/addons/addon/${encodeURIComponent(id)}/versions/${encodeURIComponent(version)}/`, MAX_PAGE_BYTES);
  if (res.status === 404) return null;
  if (res.status !== 200) throw new FetchError('Firefox Add-ons did not answer.', res.status);
  const json = asJson(res);
  if (typeof json !== 'object' || json === null || !('file' in json)) return null;
  const file = json.file;
  if (typeof file !== 'object' || file === null || !('url' in file) || typeof file.url !== 'string') return null;
  const hash = 'hash' in file && typeof file.hash === 'string' ? /^sha256:([0-9a-f]{64})$/.exec(file.hash)?.[1] ?? null : null;
  return { download: file.url, sha256: hash };
}

export async function downloadPackage(store: Store, url: string, sha256: string | null): Promise<Uint8Array> {
  let target = url;
  if (store === 'edge') {
    // Edge hands out a plain-http CDN link, and that CDN's https certificate does not match its name. The package is
    // accepted anyway because analyse() verifies every CRX signature and that the signed ID is the one requested, so a
    // tampered download is denied, never approved.
    const hop = await fetchLimited(url, 64 * 1024, { redirect: 'manual' });
    const location = hop.headers.get('location');
    if (hop.status === 204 || !location) throw new FetchError('Edge Add-ons has no package for this extension.', hop.status);
    target = new URL(location, url).toString();
  }
  if (!isStoreHost(store, target)) throw new FetchError('The store sent the download to an unexpected host.');
  const res = await fetchLimited(target, MAX_PACKAGE_BYTES);
  if (res.status !== 200) throw new FetchError('The package download failed.', res.status);
  if (sha256 && (await hex(res.bytes)) !== sha256.toLowerCase()) throw new FetchError('The download does not match the hash the store published.');
  return res.bytes;
}

export async function fetchListing(store: Store, id: string): Promise<ListingResult> {
  try {
    if (store === 'chrome') {
      const res = await fetchLimited(listingUrl('chrome', id), MAX_PAGE_BYTES);
      if (res.status === 404) return { status: 'gone' };
      if (res.status !== 200) return { status: 'error', reason: `the store answered ${res.status}` };
      const listing = parseChromeListing(asText(res), id);
      return listing ? { status: 'ok', listing } : { status: 'gone' };
    }
    const lookup = await currentRelease(store, id);
    if (lookup.status === 'gone') return { status: 'gone' };
    return lookup.release.listing ?? { status: 'error', reason: 'no listing data' };
  } catch (e) {
    return { status: 'error', reason: e instanceof FetchError ? e.message.replace(/\.$/, '').toLowerCase() : 'unexpected error' };
  }
}

export function chromeUpdateUrl(id: string): string {
  return `https://clients2.google.com/service/update2/crx?response=updatecheck&prodversion=${CHROME_VERSION}&acceptformat=crx3&x=id%3D${id}%26uc`;
}

function edgeDownloadUrl(id: string): string {
  return `https://edge.microsoft.com/extensionwebstorebase/v1/crx?response=redirect&prod=chromiumcrx&prodchannel=&x=id%3D${id}%26installsource%3Dondemand%26uc`;
}

/** Reads Chrome's update response. Null when the store does not know the ID or has no package. */
export function parseUpdateCheck(xml: string, id: string): { version: string; codebase: string; sha256: string | null } | null {
  const app = new RegExp(`<app appid="${id}"[^>]*status="ok"[^>]*>([\\s\\S]*?)</app>`).exec(xml)?.[1];
  const tag = app ? /<updatecheck\b([^>]*)\/?>/.exec(app)?.[1] : undefined;
  if (!tag) return null;
  const attr = (name: string): string | null => new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1] ?? null;
  const version = attr('version');
  const codebase = attr('codebase')?.replace(/&amp;/g, '&') ?? null;
  if (attr('status') !== 'ok' || !version || !codebase) return null;
  const sha256 = attr('hash_sha256');
  return { version, codebase, sha256: sha256 && /^[0-9a-f]{64}$/i.test(sha256) ? sha256 : null };
}

const DOWNLOAD_HOSTS: Record<Store, RegExp> = {
  chrome: /(^|\.)(googleusercontent\.com|google\.com|gvt1\.com)$/,
  edge: /(^|\.)(microsoft\.com|msecnd\.net|azureedge\.net)$/,
  firefox: /(^|\.)(mozilla\.org|mozilla\.net)$/,
};

const EDGE_HTTP_CDN = /\.dl\.delivery\.mp\.microsoft\.com$/;

function isStoreHost(store: Store, url: string): boolean {
  try {
    const u = new URL(url);
    const secure = u.protocol === 'https:' || (store === 'edge' && u.protocol === 'http:' && EDGE_HTTP_CDN.test(u.hostname));
    return secure && DOWNLOAD_HOSTS[store].test(u.hostname);
  } catch {
    return false;
  }
}

async function hex(bytes: Uint8Array): Promise<string> {
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', copy));
  return Array.from(hash, (b) => b.toString(16).padStart(2, '0')).join('');
}
