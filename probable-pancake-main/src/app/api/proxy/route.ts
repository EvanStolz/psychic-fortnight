import { NextRequest, NextResponse } from 'next/server';

// ─── Configuration ────────────────────────────────────────────────────────────
const MAX_FILE_SIZE_BYTES   = 50 * 1024 * 1024; // 50 MB — prevent memory exhaustion
const RATE_LIMIT_WINDOW_MS  = 60_000;            // 1 minute sliding window
const RATE_LIMIT_MAX        = 20;                // requests per window per IP
const CRX_CACHE_TTL_MS      = 10 * 60_000;      // 10 minutes
const META_CACHE_TTL_MS     =  5 * 60_000;      //  5 minutes
const MAX_CRX_CACHE_ENTRIES = 20;               // max CRX entries kept in RAM
const MAX_META_CACHE_ENTRIES = 100;

// ─── Rate Limiter ────────────────────────────────────────────────────────────
// Map<ip, timestamp[]> — stores per-IP request timestamps within the window.
const rateLimitMap = new Map<string, number[]>();

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

/** Returns true when the request is allowed, false when rate-limited. */
function checkRateLimit(ip: string): boolean {
  const now        = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const timestamps  = (rateLimitMap.get(ip) ?? []).filter(t => t > windowStart);

  if (timestamps.length >= RATE_LIMIT_MAX) return false;

  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);
  return true;
}

// ─── In-memory Caches ────────────────────────────────────────────────────────
interface CacheEntry<T> { data: T; ts: number; }

const crxCache  = new Map<string, CacheEntry<ArrayBuffer>>();
const metaCache = new Map<string, CacheEntry<unknown>>();

function getFromCache<T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
  ttl: number
): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > ttl) { cache.delete(key); return null; }
  return entry.data;
}

function setInCache<T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
  data: T,
  maxEntries: number
): void {
  // Evict the oldest entry (insertion-order) when at capacity
  if (cache.size >= maxEntries) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { data, ts: Date.now() });
}

// ─── Route Handler ───────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const ip = getClientIp(request);

  // 1. Rate limiting
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment before retrying.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }

  const { searchParams } = new URL(request.url);
  const id          = searchParams.get('id');
  const store       = searchParams.get('store');
  const metadataOnly = searchParams.get('metadata') === 'true';

  if (!id || !store) {
    return NextResponse.json({ error: 'Missing id or store parameter' }, { status: 400 });
  }

  // Validate ID format (alphanumeric + hyphens, reasonable length)
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(id)) {
    return NextResponse.json({ error: 'Invalid extension ID format' }, { status: 400 });
  }

  if (metadataOnly) {
    // 2a. Metadata — check cache first
    const cacheKey = `meta:${store}:${id}`;
    const cached = getFromCache(metaCache, cacheKey, META_CACHE_TTL_MS);
    if (cached !== null) {
      return NextResponse.json(cached, { headers: { 'X-Cache': 'HIT' } });
    }

    try {
      const metadata = await fetchStoreMetadata(id, store);
      if (metadata) setInCache(metaCache, cacheKey, metadata, MAX_META_CACHE_ENTRIES);
      return NextResponse.json(metadata, { headers: { 'X-Cache': 'MISS' } });
    } catch (error) {
      console.error('Metadata fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch metadata' }, { status: 500 });
    }
  }

  // 2b. CRX download — check cache first
  const cacheKey = `crx:${store}:${id}`;
  const cachedCrx = getFromCache(crxCache, cacheKey, CRX_CACHE_TTL_MS);
  if (cachedCrx !== null) {
    return new NextResponse(cachedCrx, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${id}.crx"`,
        'X-Cache': 'HIT',
      },
    });
  }

  let downloadUrl = '';
  if (store === 'chrome') {
    downloadUrl = `https://clients2.google.com/service/update2/crx?response=redirect&prodversion=130.0&acceptformat=crx2,crx3&x=id%3D${id}%26installsource%3Dondemand%26uc`;
  } else if (store === 'edge') {
    downloadUrl = `https://edge.microsoft.com/extensionwebstorebase/v1/crx?response=redirect&prod=edgecrx&x=id%3D${id}%26installsource%3Dondemand%26uc`;
  } else {
    return NextResponse.json({ error: 'Invalid store' }, { status: 400 });
  }

  try {
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch from store: ${response.statusText}`);
    }

    // 3. File size guard — check Content-Length header first
    const contentLengthHeader = response.headers.get('content-length');
    if (contentLengthHeader) {
      const contentLength = parseInt(contentLengthHeader, 10);
      if (!isNaN(contentLength) && contentLength > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { error: `Extension is too large (${Math.round(contentLength / 1024 / 1024)} MB). Maximum allowed size is ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB.` },
          { status: 413 }
        );
      }
    }

    // Stream and measure actual size to catch cases where Content-Length is absent
    const chunks: Uint8Array[] = [];
    let totalSize = 0;
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body available');

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        totalSize += value.length;
        if (totalSize > MAX_FILE_SIZE_BYTES) {
          await reader.cancel();
          return NextResponse.json(
            { error: `Extension exceeds the ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB size limit.` },
            { status: 413 }
          );
        }
        chunks.push(value);
      }
    }

    // Reassemble buffer
    const buffer = new ArrayBuffer(totalSize);
    const view   = new Uint8Array(buffer);
    let offset   = 0;
    for (const chunk of chunks) {
      view.set(chunk, offset);
      offset += chunk.length;
    }

    // 4. Store in cache (only if reasonably sized — skip very small responses)
    if (totalSize > 100) {
      setInCache(crxCache, cacheKey, buffer, MAX_CRX_CACHE_ENTRIES);
    }

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${id}.crx"`,
        'X-Cache': 'MISS',
      },
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json({ error: 'Failed to download extension' }, { status: 500 });
  }
}

// ─── Store Metadata Scraping ─────────────────────────────────────────────────
async function fetchStoreMetadata(id: string, store: string) {
  const url = store === 'chrome'
    ? `https://chromewebstore.google.com/detail/${id}`
    : `https://microsoftedge.microsoft.com/addons/detail/${id}`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
      },
    });

    if (!response.ok) return null;
    const html = await response.text();

    const metadata = {
      publisher: '',
      rating: 0,
      ratingCount: 0,
      userCount: '0',
      lastUpdated: '',
      isFeatured: false,
      isVerifiedPublisher: false,
    };

    if (store === 'chrome') {
      // ── Primary: JSON-LD structured data (most reliable, schema.org) ──
      const jsonLdMatch = html.match(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i);
      if (jsonLdMatch) {
        try {
          const data = JSON.parse(jsonLdMatch[1]);
          if (data.aggregateRating) {
            metadata.rating      = parseFloat(data.aggregateRating.ratingValue) || 0;
            metadata.ratingCount = parseInt(data.aggregateRating.ratingCount)   || 0;
          }
          if (data.author?.name) metadata.publisher = data.author.name;
        } catch (e) { /* malformed JSON-LD — fall through */ }
      }

      // ── Secondary: embedded __STORE_INITIAL_DATA__ or similar JSON blobs ──
      // Chrome Web Store sometimes ships a hydration payload as a data attribute
      // or inline script.  We probe for common patterns without assuming a
      // specific key, so this survives minor HTML re-structures.
      if (!metadata.rating || !metadata.ratingCount) {
        const hydrationMatch = html.match(/\\"ratingValue\\":\\"([0-9.]+)\\"/) ||
                               html.match(/"ratingValue":"([0-9.]+)"/);
        if (hydrationMatch) metadata.rating = parseFloat(hydrationMatch[1]) || metadata.rating;

        const hydrationCountMatch = html.match(/\\"ratingCount\\":\\"([0-9]+)\\"/) ||
                                    html.match(/"ratingCount":"?([0-9]+)"?/);
        if (hydrationCountMatch) metadata.ratingCount = parseInt(hydrationCountMatch[1]) || metadata.ratingCount;
      }

      // ── Tertiary: ARIA / text regex fallbacks ──
      if (!metadata.rating) {
        const ratingMatch =
          html.match(/aria-label="Rated ([0-9.]+) out of 5 stars/) ||
          html.match(/aria-label="([0-9.]+) out of 5 stars/)        ||
          html.match(/aria-label="Average rating ([0-9.]+) out of 5 stars/) ||
          html.match(/([0-9.]+) out of 5 stars/);
        if (ratingMatch) metadata.rating = parseFloat(ratingMatch[1]);
      }

      if (!metadata.ratingCount) {
        const ratingCountMatch =
          html.match(/([0-9,.]+)\s+ratings/) ||
          html.match(/([0-9,.]+)\s+reviews/);
        if (ratingCountMatch) metadata.ratingCount = parseInt(ratingCountMatch[1].replace(/,/g, ''));
      }

      const userCountMatch =
        html.match(/([0-9,.]+)\+?\s+weekly active users/i) ||
        html.match(/([0-9,.]+)\+?\s+users/i);
      if (userCountMatch) metadata.userCount = userCountMatch[1].replace(/,/g, '') + '+';

      // Date — try multiple formats (human-readable and ISO)
      const dateMatch =
        html.match(/\b(?:Updated|Last updated)\b:?\s*([A-Za-z]+ [0-9]{1,2}, [0-9]{4})/i) ||
        html.match(/\b(?:Updated|Last updated)\b:?\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/i);
      if (dateMatch) metadata.lastUpdated = dateMatch[1];

      if (!metadata.publisher) {
        const pubMatch =
          html.match(/itemprop="author"[^>]*>\s*(.*?)\s*<\/(?:a|span)>/si) ||
          html.match(/Offered by[^<]*<[^>]+>\s*(.*?)\s*<\/(?:a|div|span)>/si) ||
          html.match(/"author"\s*:\s*\{\s*"name"\s*:\s*"([^"]+)"/);
        if (pubMatch) {
          const cleaned = pubMatch[1].replace(/<[^>]+>/g, '').trim();
          if (cleaned && cleaned.length < 100 && !cleaned.includes('"')) {
            metadata.publisher = cleaned;
          }
        }
      }

      // Badge detection — string presence is imprecise but sufficient as a hint
      metadata.isFeatured          = html.includes('Follows recommended practices') ||
                                     html.includes('Featured Badge');
      metadata.isVerifiedPublisher = html.includes('Established publisher') ||
                                     html.includes('isVerifiedPublisher":true');

    } else {
      // ── Edge Add-ons ──
      const ratingMatch =
        html.match(/itemprop="ratingValue"\s+content="([0-9.]+)"/) ||
        html.match(/aria-label="Average rating ([0-9.]+) out of 5 stars/) ||
        html.match(/([0-9.]+) out of 5 stars/);
      if (ratingMatch) metadata.rating = parseFloat(ratingMatch[1]);

      const ratingCountMatch =
        html.match(/itemprop="ratingCount"\s+content="([0-9,.]+)"/) ||
        html.match(/([0-9,.]+)\s+users rated/)                       ||
        html.match(/aria-label="Average rating [0-9.]+ out of 5 stars, ([0-9,.]+) ratings/) ||
        html.match(/([0-9,.]+)\s+ratings/);
      if (ratingCountMatch) metadata.ratingCount = parseInt(ratingCountMatch[1].replace(/,/g, ''));

      const userCountMatch =
        html.match(/itemProp="userInteractionCount"\s+content="([0-9,.]+)"/) ||
        html.match(/([0-9,.]+)\+?\s+users/i);
      if (userCountMatch) {
        metadata.userCount = parseInt(userCountMatch[1].replace(/,/g, '')).toLocaleString() + '+';
      }

      const dateMatch =
        html.match(/\b(?:Updated|Last updated)\b:?\s*(?:<[^>]+>\s*)*([A-Za-z]+ \d{1,2}, \d{4})/i) ||
        html.match(/\b(?:Updated|Last updated)\b:?\s*(?:<[^>]+>\s*)*([0-9]{4}-[0-9]{2}-[0-9]{2})/i) ||
        html.match(/\bUpdated\b.*?([A-Za-z]+ [0-9]{1,2}, [0-9]{4})/s);
      if (dateMatch) metadata.lastUpdated = dateMatch[1].trim();

      const pubMatch =
        html.match(/itemprop="author"[^>]*>([\s\S]*?)<\/div>/i) ||
        html.match(/By\s+(.*?)<\/div>/)                          ||
        html.match(/Offered by\s*(.*?)<\/div>/i);
      if (pubMatch) {
        const cleaned = pubMatch[1].trim().replace(/<[^>]+>/g, '');
        if (cleaned && cleaned.length < 100) metadata.publisher = cleaned;
      }

      // Fallback: extract from page title
      if (!metadata.publisher) {
        const titleMatch = html.match(/<title>(.*?)\s*[-–|]\s*Microsoft Edge Addons<\/title>/i);
        if (titleMatch) metadata.publisher = titleMatch[1].trim();
      }

      metadata.isFeatured          = html.includes('Editors\' pick') || html.includes('Featured');
      metadata.isVerifiedPublisher = html.includes('Verified') || html.includes('Official');

      // Fallback for lastUpdated via CRX manifest HEAD request
      if (!metadata.lastUpdated) {
        try {
          const catalogUrl = `https://edge.microsoft.com/extensionwebstorebase/v1/crx?x=id%3D${id}%26v%3D0.0.0.0%26installsource%3Dondemand%26uc`;
          const catRes = await fetch(catalogUrl);
          if (catRes.ok) {
            const xml = await catRes.text();
            const codebaseMatch = xml.match(/codebase="([^"]+)"/);
            if (codebaseMatch) {
              const codebase = codebaseMatch[1].replace(/&amp;/g, '&');
              const headRes  = await fetch(codebase, { method: 'HEAD' });
              const lastMod  = headRes.headers.get('last-modified');
              if (lastMod) {
                const date = new Date(lastMod);
                if (!isNaN(date.getTime())) {
                  metadata.lastUpdated = date.toLocaleDateString('en-US', {
                    month: 'long', day: 'numeric', year: 'numeric',
                  });
                }
              }
            }
          }
        } catch (e) {
          console.error('Edge CRX date fallback error:', e);
        }
      }
    }

    return metadata;
  } catch (e) {
    console.error('Scraping error:', e);
    return null;
  }
}
