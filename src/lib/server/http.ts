// Response helpers. Reports are cached by the CDN per store, ID and version; nothing about the viewer is kept.

import { ManifestError } from '@/lib/engine/manifest';
import { PackageError } from '@/lib/engine/crx';
import { FetchError } from './fetch';

/** A version's package never changes, but the malware list and listing do, so reports refresh every few hours. */
export const CACHE_REPORT = 'public, max-age=0, s-maxage=21600, stale-while-revalidate=86400';
/** Version lookups and refusals: short, so a new release shows up within minutes. */
export const CACHE_SHORT = 'public, max-age=0, s-maxage=600';
export const NO_STORE = 'no-store';

export function json(body: unknown, status: number, cache: string): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': cache } });
}

export function failure(message: string, status: number, cache = NO_STORE): Response {
  return json({ error: message }, status, cache);
}

export function redirect(path: string, cache = CACHE_SHORT): Response {
  return new Response(null, { status: 307, headers: { Location: path, 'Cache-Control': cache } });
}

export function analysisPath(store: string, id: string, version: string): string {
  return `/api/analysis/${store}/${encodeURIComponent(id)}/${encodeURIComponent(version)}`;
}

/** Maps errors to responses. Messages never include the client's address, and logs never include the extension. */
export function fromError(e: unknown): Response {
  if (e instanceof PackageError || e instanceof ManifestError) return failure(`The package could not be read: ${e.message}`, 422, CACHE_SHORT);
  if (e instanceof FetchError) return failure(e.message, 502);
  console.error(`Unexpected error: ${e instanceof Error ? `${e.name}: ${e.message}` : 'unknown'}`);
  return failure('Something went wrong while checking this extension.', 500);
}

/** Route parameters arrive percent-encoded in some runtimes and decoded in others. */
export function param(raw: string): string {
  if (!raw.includes('%')) return raw;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}
