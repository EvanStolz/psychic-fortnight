import { describe, expect, it } from 'vitest';
import { Tally } from './findings';
import { count, isoDate, parseAmoListing, parseChromeListing, parseEdgeListing, scoreListing } from './listing';

const ID = 'eimadpbcbfnmbkopoojfekhnkhdbieeh';
// Trimmed from the real Dark Reader page, keeping the markup each field is read from.
const CWS = `<html><head><meta property="og:title" content="Dark Reader - Chrome Web Store">
<link rel="canonical" href="https://chromewebstore.google.com/detail/dark-reader/${ID}"><script>var users = "1 users";</script></head><body>
<span class="OmOMFc">Featured</span><span aria-label="Average rating 4.3 out of 5 stars."><span>4.3</span></span><span>(<span>13.3K ratings</span>)</span>
<div>7,000,000 users</div><span>see the developer&#8217;s <a class="SYhWge" href="https://darkreader.org/privacy/" rel="ugc">privacy policy</a>.</span>
<li><div class="QDHp8e">Updated</div><div>November 6, 2026</div></li>
<li><div class="QDHp8e">Developer</div><div><div class="mdSapd">Dark Reader Ltd<br>London</div><a href="https://darkreader.org/" rel="ugc nofollow"><svg><path d="M1"/></svg> Website</a>
<details><summary><svg></svg> Email <svg></svg></summary><div class="NnJuub">support@darkreader.org</div></details></div></li>
<li><div class="QDHp8e">Trader</div><div>This developer has identified itself as a trader per the definition from the European Union.</div></li></body></html>`;

describe('Chrome listing', () => {
  it('reads the listing facts and publisher', () => {
    expect(parseChromeListing(CWS, ID)).toEqual({
      url: `https://chromewebstore.google.com/detail/dark-reader/${ID}`,
      name: 'Dark Reader',
      users: 7_000_000,
      rating: 4.3,
      ratingCount: 13_300,
      updated: '2026-11-06',
      featured: true,
      privacyPolicy: 'https://darkreader.org/privacy/',
      hasPrivacyPolicy: true,
      publisher: { name: 'Dark Reader Ltd', website: 'https://darkreader.org/', email: 'support@darkreader.org', trader: true },
    });
  });

  it('returns null for a page about something else', () => {
    expect(parseChromeListing(CWS, 'a'.repeat(32))).toBeNull();
  });
});

describe('Edge and Firefox listings', () => {
  it('reads Edge product details', () => {
    const l = parseEdgeListing(
      {
        crxId: 'x', name: 'DR', developer: 'alex', activeInstallCount: 5, averageRating: 4.6, ratingCount: 9, lastUpdateDate: 1793927135.07,
        isBadgedAsFeatured: true, privacyUrl: '', publisherWebsiteUri: 'https://d.org/', privacyData: { privacyPolicyRequired: true },
      },
      'x',
    );
    expect(l).toMatchObject({ users: 5, updated: '2026-11-06', hasPrivacyPolicy: false, publisher: { name: 'alex', website: 'https://d.org/', email: null, trader: null } });
    expect(parseEdgeListing({ crxId: 'y' }, 'x')).toBeNull();
  });

  it('reads AMO details in either string shape', () => {
    const r = parseAmoListing({
      guid: 'addon@darkreader.org', slug: 'darkreader', url: 'https://addons.mozilla.org/en-US/firefox/addon/darkreader/',
      name: { 'en-US': 'Dark Reader' }, average_daily_users: 1356149, ratings: { average: 4.4828, count: 6987 },
      last_updated: '2026-11-06T09:11:18Z', promoted: [{ category: 'recommended' }], homepage: { url: 'https://darkreader.org/' },
      support_email: 'darkreaderapp@gmail.com', has_privacy_policy: false, authors: [{ name: 'Dark Reader Ltd' }],
      current_version: { version: '4.9.135', file: { url: 'https://addons.mozilla.org/x.xpi', size: 909302 } },
    });
    expect(r?.version).toBe('4.9.135');
    expect(r?.listing).toMatchObject({
      name: 'Dark Reader', rating: 4.5, featured: true, hasPrivacyPolicy: null,
      publisher: { website: 'https://darkreader.org/', email: 'darkreaderapp@gmail.com' },
    });
  });
});

describe('listing reputation', () => {
  it('scores a missing policy, non-trader, free email and no website', () => {
    const t = new Tally();
    scoreListing({
      status: 'ok',
      listing: {
        url: '', name: null, users: null, rating: null, ratingCount: null, updated: null, featured: null, privacyPolicy: null,
        hasPrivacyPolicy: false, publisher: { name: 'x', website: null, email: 'x@gmail.com', trader: false },
      },
    }, t);
    expect(t.total()).toBe(25);
  });

  it('scores a listing that is gone', () => {
    const t = new Tally();
    scoreListing({ status: 'gone' }, t);
    expect(t.findings()[0]).toMatchObject({ label: 'Gone from the store', points: 30 });
  });
});

describe('helpers', () => {
  it('reads counts and dates', () => {
    expect([count('10,000+'), count('1.2M'), count('13.3K'), count('n/a')]).toEqual([10_000, 1_200_000, 13_300, null]);
    expect([isoDate('March 1, 2025'), isoDate('Smarch 1, 2025')]).toEqual(['2025-03-01', null]);
  });
});
