// Reads what a reviewer pastes: a store link, an extension ID, or a Firefox add-on name.

import type { Store } from './types';

export interface Target {
  store: Store;
  id: string;
}

const CRX_ID = /^[a-p]{32}$/;
/** Firefox add-on IDs are an email-like string or a braced GUID. */
const GECKO_ID = /^(\{[0-9a-f-]{36}\}|[^\s@/]+@[^\s@/]+)$/i;
const AMO_SLUG = /^[\w.~-]{1,200}$/;

export class InputError extends Error {}

/**
 * A bare 32-letter ID is assumed to be Chrome, since Edge IDs differ; prefix with `edge:` to check Edge.
 * Firefox add-ons need a link, an add-on ID, or `firefox:<slug>`.
 */
export function parseTarget(raw: string): Target {
  const input = raw.trim();
  if (!input) throw new InputError('Paste a store link or an extension ID.');

  const prefixed = /^(chrome|edge|firefox):(.+)$/i.exec(input);
  if (prefixed?.[1] && prefixed[2]) return checked(prefixed[1].toLowerCase() as Store, prefixed[2].trim());

  if (CRX_ID.test(input)) return { store: 'chrome', id: input };
  if (GECKO_ID.test(input)) return { store: 'firefox', id: input };

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
  } catch {
    throw new InputError('That is not a store link or an extension ID.');
  }
  const host = url.hostname.toLowerCase();
  const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);

  if (host === 'chromewebstore.google.com' || host === 'chrome.google.com') {
    const id = parts.find((p) => CRX_ID.test(p));
    if (id) return { store: 'chrome', id };
  } else if (host === 'microsoftedge.microsoft.com') {
    const id = parts.find((p) => CRX_ID.test(p));
    if (id) return { store: 'edge', id };
  } else if (host === 'addons.mozilla.org') {
    const at = parts.indexOf('addon');
    const slug = at >= 0 ? parts[at + 1] : undefined;
    if (slug) return checked('firefox', slug);
  } else {
    throw new InputError('Only Chrome Web Store, Edge Add-ons and Firefox Add-ons links are supported.');
  }
  throw new InputError('That store link has no extension in it.');
}

function checked(store: Store, id: string): Target {
  if (store === 'firefox') {
    if (GECKO_ID.test(id) || AMO_SLUG.test(id)) return { store, id };
  } else if (CRX_ID.test(id)) {
    return { store, id };
  }
  throw new InputError(`"${id}" is not a valid ${store === 'firefox' ? 'Firefox add-on' : 'extension'} ID.`);
}

/** Validates route parameters, which arrive from the URL and are untrusted. */
export function isValidTarget(store: string, id: string): store is Store {
  if (store === 'chrome' || store === 'edge') return CRX_ID.test(id);
  if (store === 'firefox') return GECKO_ID.test(id) || AMO_SLUG.test(id);
  return false;
}

export function isValidVersion(version: string): boolean {
  return /^[0-9][0-9a-z.+-]{0,63}$/i.test(version);
}
