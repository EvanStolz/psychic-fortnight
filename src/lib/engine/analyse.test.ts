import { describe, expect, it } from 'vitest';
import { crx, zip } from './__fixtures__/build';
import { analyse } from './analyse';
import { parseRetire } from './libs';
import { parseMalExt } from './lists';
import type { Listing } from './types';

const libraries = parseRetire({
  jquery: {
    extractors: { filecontent: ['/\\*!? jQuery v(§§version§§)'] },
    vulnerabilities: [{ below: '3.5.0', severity: 'medium', identifiers: { summary: 'XSS' } }],
  },
});
const header = 'extension_id,name,reason,source,insert_date_fmt,blocklist,store,version,sha256\n';
const listing: Listing = {
  url: 'https://x', name: 'T', users: 10, rating: 4, ratingCount: 2, updated: '2026-01-01', featured: false,
  privacyPolicy: 'https://p', hasPrivacyPolicy: true,
  publisher: { name: 'Co', website: 'https://co.example', email: 'a@co.example', trader: true },
};
const manifest = JSON.stringify({ manifest_version: 3, name: 'T', version: '1.2', permissions: ['storage'], icons: { 48: 'i.png' } });

describe('analyse', () => {
  it('approves a clean signed package from the store', async () => {
    const pkg = await crx({ 'manifest.json': manifest, 'i.png': new Uint8Array([137, 80, 78, 71]), 'bg.js': 'chrome.storage.local.get()' });
    const r = await analyse({
      bytes: pkg.bytes, store: 'chrome', id: pkg.id, libraries, badList: parseMalExt(`${header}zzzz,x,Malware,s,d,,c,1,\n`),
      listing: { status: 'ok', listing }, now: new Date(0),
    });
    expect(r).toMatchObject({
      verdict: 'approve',
      id: pkg.id,
      signature: { status: 'verified' },
      package: { name: 'T', version: '1.2', manifestVersion: 3, files: 3, icon: 'data:image/png;base64,iVBORw==' },
      analysedAt: '1970-01-01T00:00:00.000Z',
      listing,
    });
  });

  it('denies a package whose signature or ID does not match', async () => {
    const tampered = await crx({ 'manifest.json': manifest }, { tamper: true });
    const bad = await analyse({ bytes: tampered.bytes, store: 'chrome', id: tampered.id, libraries, badList: null, listing: { status: 'none' } });
    expect(bad).toMatchObject({ verdict: 'deny', package: null, reasons: ['Signature fails'] });
    const other = await crx({ 'manifest.json': manifest });
    const r = await analyse({ bytes: other.bytes, store: 'chrome', id: 'a'.repeat(32), libraries, badList: null, listing: { status: 'none' } });
    expect(r.verdict).toBe('deny');
    expect(r.signature?.detail).toContain(`not ${'a'.repeat(32)}`);
  });

  it('shows checks that could not run, and an unlisted upload, as review', async () => {
    const bytes = zip({ 'manifest.json': manifest, 'a.js': '/*! jQuery v3.4.1 */' });
    const r = await analyse({ bytes, store: null, id: null, libraries: null, badList: null, listing: { status: 'none' } });
    expect(r.signature?.status).toBe('unsigned');
    expect(r.verdict).toBe('review');
    expect(r.axes.reputation.status).toBe('not-analysed');
    expect(r.reasons).toEqual(['Library check did not run', 'Reputation not analysed']);
  });

  it('scores libraries and the malware list when they load', async () => {
    const pkg = await crx({ 'manifest.json': manifest, 'a.js': '/*! jQuery v3.4.1 */' });
    const r = await analyse({
      bytes: pkg.bytes, store: 'chrome', id: pkg.id, libraries,
      badList: parseMalExt(`${header}${pkg.id},T,Spyware,s,2026-01-01,,c,1,\n`), listing: { status: 'gone' },
    });
    expect(r.axes.code.findings[0]?.label).toBe('jquery 3.4.1');
    expect(r.axes.reputation.findings[0]?.label).toBe('Gone from the store');
    expect(r).toMatchObject({ verdict: 'deny', reasons: ['On a known-malware list'] });
  });
});
