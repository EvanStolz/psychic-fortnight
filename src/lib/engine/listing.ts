// Store listing parsers. Pure functions over what the stores return, so they run anywhere and test offline.
// Listing facts are context; only the publisher's contact details and the privacy policy score.

import type { Tally } from './findings';
import { FREE_EMAIL_DOMAINS, REPUTATION_RULES } from './rules';
import type { Listing, ListingResult, Publisher, Store } from './types';

export function listingUrl(store: Store, id: string): string {
  if (store === 'chrome') return `https://chromewebstore.google.com/detail/${id}`;
  if (store === 'edge') return `https://microsoftedge.microsoft.com/addons/detail/${id}`;
  return `https://addons.mozilla.org/firefox/addon/${encodeURIComponent(id)}/`;
}

export function edgeDetailsUrl(id: string): string {
  return `https://microsoftedge.microsoft.com/addons/getproductdetailsbycrxid/${id}`;
}

export function amoDetailsUrl(id: string): string {
  return `https://addons.mozilla.org/api/v5/addons/addon/${encodeURIComponent(id)}/?lang=en-US`;
}

/** Chrome Web Store detail page HTML. Returns null when the page is not this item's listing. */
export function parseChromeListing(html: string, id: string): Listing | null {
  const canonical = /<link rel="canonical" href="([^"]+)"/.exec(html)?.[1] ?? '';
  if (!canonical.includes(id)) return null;
  const text = pageText(html);
  const developer = /\nDeveloper\n([^\n]+)/.exec(text)?.[1]?.trim() ?? null;
  const website = /<a href="(https?:\/\/[^"]+)"[^>]*>(?:\s*<svg[\s\S]*?<\/svg>)?\s*Website\s*<\/a>/.exec(html)?.[1] ?? null;
  const email = /\n\s*Email\s*\n\s*([^\s@]+@[^\s@]+\.[^\s@]+)\s*\n/.exec(text)?.[1] ?? null;
  const trader = /has not identified itself as a trader/.test(text) ? false : /has identified itself as a trader/.test(text) ? true : null;
  const privacyPolicy = /<a [^>]*href="(https?:\/\/[^"]+)"[^>]*>privacy policy<\/a>/i.exec(html)?.[1] ?? null;
  // A policy is only required when the developer says it collects data.
  const collects = /collects and uses the following/i.test(text);
  return {
    url: canonical,
    name: decode(/<meta property="og:title" content="([^"]+?)(?: - Chrome Web Store)?"/.exec(html)?.[1] ?? '') || null,
    users: count(/\n([\d,]+\+?) users?\n/.exec(text)?.[1]),
    rating: number(/aria-label="Average rating ([\d.]+) out of 5/.exec(html)?.[1]),
    ratingCount: count(/\n([\d.,]+[KM]?) ratings?\n/.exec(text)?.[1]),
    updated: isoDate(/\nUpdated\n([^\n]+)\n/.exec(text)?.[1]),
    featured: /class="OmOMFc">Featured</.test(html),
    privacyPolicy,
    hasPrivacyPolicy: privacyPolicy ? true : collects ? false : null,
    publisher: { name: developer, website, email, trader },
  };
}

/** Edge Add-ons product details JSON. */
export function parseEdgeListing(json: unknown, id: string): Listing | null {
  if (!isRecord(json) || json.crxId !== id) return null;
  const privacyData = isRecord(json.privacyData) ? json.privacyData : {};
  const privacyPolicy = str(json.privacyUrl);
  const updated = typeof json.lastUpdateDate === 'number' ? new Date(json.lastUpdateDate * 1000).toISOString().slice(0, 10) : null;
  return {
    url: listingUrl('edge', id),
    name: str(json.name),
    users: typeof json.activeInstallCount === 'number' ? json.activeInstallCount : null,
    rating: typeof json.averageRating === 'number' ? json.averageRating : null,
    ratingCount: typeof json.ratingCount === 'number' ? json.ratingCount : null,
    updated,
    featured: typeof json.isBadgedAsFeatured === 'boolean' ? json.isBadgedAsFeatured : null,
    privacyPolicy,
    hasPrivacyPolicy: privacyPolicy ? true : privacyData.privacyPolicyRequired === true ? false : null,
    publisher: { name: str(json.developer), website: str(json.publisherWebsiteUri), email: null, trader: null },
  };
}

/** addons.mozilla.org v5 add-on JSON, requested with `lang=en-US` so strings are plain. */
export function parseAmoListing(json: unknown): { listing: Listing; guid: string; version: string; xpi: string; size: number | null } | null {
  if (!isRecord(json) || typeof json.guid !== 'string') return null;
  const current = isRecord(json.current_version) ? json.current_version : null;
  const file = current && isRecord(current.file) ? current.file : null;
  const version = current ? str(current.version) : null;
  const xpi = file ? str(file.url) : null;
  if (!version || !xpi) return null;
  const authors = Array.isArray(json.authors) ? json.authors.filter(isRecord) : [];
  const ratings = isRecord(json.ratings) ? json.ratings : {};
  const homepage = isRecord(json.homepage) ? localized(json.homepage.url) : null;
  return {
    guid: json.guid,
    version,
    xpi,
    size: file && typeof file.size === 'number' ? file.size : null,
    listing: {
      url: localized(json.url) ?? listingUrl('firefox', typeof json.slug === 'string' ? json.slug : json.guid),
      name: localized(json.name),
      users: typeof json.average_daily_users === 'number' ? json.average_daily_users : null,
      rating: typeof ratings.average === 'number' ? Math.round(ratings.average * 10) / 10 : null,
      ratingCount: typeof ratings.count === 'number' ? ratings.count : null,
      updated: typeof json.last_updated === 'string' ? json.last_updated.slice(0, 10) : null,
      featured: Array.isArray(json.promoted) ? json.promoted.length > 0 : isRecord(json.promoted),
      privacyPolicy: null,
      // AMO does not require a policy, so a missing one says nothing.
      hasPrivacyPolicy: json.has_privacy_policy === true ? true : null,
      publisher: {
        name: authors.map((a) => str(a.name)).filter(Boolean).join(', ') || null,
        website: homepage,
        email: localized(json.support_email),
        trader: null,
      },
    },
  };
}

/** Reputation points from the listing. A gone listing scores; a listing that failed to load is a gap. */
export function scoreListing(result: ListingResult, reputation: Tally): void {
  if (result.status === 'gone') {
    reputation.add('gone', REPUTATION_RULES.gone.points, REPUTATION_RULES.gone.label);
    return;
  }
  if (result.status !== 'ok') return;
  const { listing } = result;
  const p: Publisher = listing.publisher;
  if (listing.hasPrivacyPolicy === false) reputation.add('no-privacy-policy', REPUTATION_RULES.noPrivacyPolicy.points, REPUTATION_RULES.noPrivacyPolicy.label);
  if (p.trader === false) reputation.add('not-trader', REPUTATION_RULES.notTrader.points, REPUTATION_RULES.notTrader.label);
  const domain = p.email?.split('@')[1]?.toLowerCase();
  if (domain && FREE_EMAIL_DOMAINS.has(domain)) reputation.add('free-email', REPUTATION_RULES.freeEmail.points, REPUTATION_RULES.freeEmail.label, p.email ?? undefined);
  if (!p.website) reputation.add('no-website', REPUTATION_RULES.noWebsite.points, REPUTATION_RULES.noWebsite.label);
}

/** Visible text of a page, one block per line. */
export function pageText(html: string): string {
  const stripped = html
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '\n');
  return `\n${decode(stripped).replace(/[ \t]*\n\s*/g, '\n')}\n`;
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function decode(s: string): string {
  return s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

/** "7,000,000", "10,000+", "13.3K" and "1.2M" as numbers. */
export function count(s: string | undefined): number | null {
  if (!s) return null;
  const m = /^([\d.,]+)\+?([KM])?$/i.exec(s.trim());
  if (!m?.[1]) return null;
  const n = Number(m[2] ? m[1].replace(/,/g, '') : m[1].replace(/[.,]/g, ''));
  if (!Number.isFinite(n)) return null;
  const scale = m[2]?.toUpperCase() === 'M' ? 1e6 : m[2] ? 1e3 : 1;
  return Math.round(n * scale);
}

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

/** "November 6, 2026" as "2026-11-06". */
export function isoDate(s: string | undefined): string | null {
  const m = /^([A-Za-z]+) (\d{1,2}), (\d{4})$/.exec(s?.trim() ?? '');
  if (!m?.[1] || !m[2] || !m[3]) return null;
  const month = MONTHS.indexOf(m[1].toLowerCase());
  if (month < 0) return null;
  return `${m[3]}-${String(month + 1).padStart(2, '0')}-${m[2].padStart(2, '0')}`;
}

function number(s: string | undefined): number | null {
  const n = Number(s);
  return s && Number.isFinite(n) ? n : null;
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

/** AMO fields are plain strings with `lang` set, or locale maps without it. */
function localized(v: unknown): string | null {
  if (typeof v === 'string') return str(v);
  if (!isRecord(v)) return null;
  return str(v['en-US']) ?? str(Object.values(v)[0]);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
