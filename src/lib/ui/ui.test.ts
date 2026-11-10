import { describe, expect, it } from 'vitest';
import type { Axis, Report } from '@/lib/engine/types';
import { classic, dozedOff, noseDown } from '@/components/LabArt';
import { axisNotes, axisSummary, compact, day, entryLine, findingTier, libraryCount, megabytes, metaLine, verdictWhy } from './format';
import type { Entry } from './list';
import { keyOf, ListFileError, parseListFile, serialise, upsert } from './list';
import { chromiumPolicy, firefoxPolicy, plainWords } from './policy';

const entry = (over: Partial<Entry>): Entry => ({
  store: 'chrome', id: 'eimadpbcbfnmbkopoojfekhnkhdbieeh', name: 'Dark Reader', version: '4.9.135', icon: null, decision: 'approved',
  verdict: 'approve', reason: 'Dark mode', summary: 'All axes Low', date: '2026-11-09', rulesVersion: 1, publisher: 'Dark Reader Ltd', ...over,
});

describe('list', () => {
  it('round-trips through a saved file and replaces earlier decisions', () => {
    const list = upsert([entry({})], entry({ decision: 'denied', reason: 'Changed mind' }));
    expect(list).toHaveLength(1);
    expect(parseListFile(serialise(list))).toEqual(list);
    expect(keyOf(entry({ store: null, id: 'x' }))).toBe('upload:x');
  });

  it('rejects files that are not lists or hold bad entries', () => {
    expect(() => parseListFile('nope')).toThrow(ListFileError);
    expect(() => parseListFile('{"format":"other","entries":[]}')).toThrow(ListFileError);
    const bad = JSON.parse(serialise([entry({})])) as { entries: Record<string, unknown>[] };
    const first = bad.entries[0];
    if (first) first.icon = 'javascript:alert(1)';
    expect(() => parseListFile(JSON.stringify(bad))).toThrow('Entry 1');
  });

  it('reads lists saved before entries had a summary', () => {
    const old = JSON.parse(serialise([entry({})])) as { entries: Record<string, unknown>[] };
    delete old.entries[0]?.summary;
    expect(parseListFile(JSON.stringify(old))[0]?.summary).toBe('');
  });
});

describe('library lines', () => {
  it('counts decisions in words and builds each row from the engine summary', () => {
    expect(libraryCount([entry({}), entry({ id: 'b' }), entry({ id: 'c', decision: 'denied' })])).toBe(
      'Two approved, one denied. Kept in this browser, never on our servers.',
    );
    expect(libraryCount([])).toBe('Nothing saved yet. Kept in this browser, never on our servers.');
    expect(libraryCount(Array.from({ length: 12 }, (_, i) => entry({ id: String(i) })))).toMatch(/^12 approved\./);
    expect(entryLine(entry({}))).toBe('All axes Low · Dark mode');
    expect(entryLine(entry({ summary: '', reason: '', verdict: 'review' }))).toBe('Review verdict');
  });

  it('gives each finding the tier its points would earn on its axis', () => {
    expect([5, 16, 36, 61].map((p) => findingTier(p, 'capability'))).toEqual(['low', 'medium', 'high', 'critical']);
    expect([9, 10, 25, 50].map((p) => findingTier(p, 'code'))).toEqual(['low', 'medium', 'high', 'critical']);
    expect(findingTier(0, 'reputation')).toBeNull();
  });
});

describe('lab art', () => {
  it('keeps the drawings intact', () => {
    for (const [art, lines] of [[classic, 30], [noseDown, 18], [dozedOff, 20]] as const) {
      expect(art).toMatch(/^[ ░▒▓█\n]+$/);
      expect(art.split('\n')).toHaveLength(lines);
    }
  });
});

describe('policy files', () => {
  const list = [
    entry({}),
    entry({ id: 'odgjppimodflifpnljdlhilfjpdemfbe', name: 'VPN Secret', decision: 'denied' }),
    entry({ store: 'firefox', id: 'addon@darkreader.org' }),
  ];

  it('builds Chrome and Edge ExtensionSettings', () => {
    expect(chromiumPolicy(list, { blockAll: true, protect: false })).toEqual({
      ExtensionSettings: {
        '*': { installation_mode: 'blocked', blocked_install_message: 'Request extensions through IT.' },
        eimadpbcbfnmbkopoojfekhnkhdbieeh: { installation_mode: 'allowed' },
        odgjppimodflifpnljdlhilfjpdemfbe: { installation_mode: 'removed' },
      },
    });
    const guarded = chromiumPolicy(list, { blockAll: false, protect: true }).ExtensionSettings;
    expect(guarded['*']).toBeUndefined();
    expect(guarded.eimadpbcbfnmbkopoojfekhnkhdbieeh?.runtime_blocked_hosts).toContain('*://*.okta.com');
  });

  it('builds Firefox policies.json with sign-in domains on the default entry only', () => {
    const p = firefoxPolicy(list, { blockAll: true, protect: true }).policies.ExtensionSettings;
    expect(p['*']).toMatchObject({ installation_mode: 'blocked', restricted_domains: expect.arrayContaining(['okta.com', 'mail.google.com']) as unknown });
    expect(p['addon@darkreader.org']).toEqual({ installation_mode: 'allowed' });
    expect(Object.keys(p)).toHaveLength(2);
  });

  it('says what the file does in plain words', () => {
    const three = [...list, entry({ id: 'kbfnbcaeplbcioakkpcpgfkobkghlhen', name: 'Grammarly' })];
    expect(plainWords(three, 'chromium', { blockAll: true, protect: false })).toBe(
      'Allows Dark Reader and Grammarly. Blocks and removes VPN Secret, and blocks every other extension, with the message "Request extensions through IT."',
    );
    expect(plainWords(list, 'firefox', { blockAll: true, protect: true })).toBe(
      'Allows Dark Reader. Blocks every other extension, with the message "Request extensions through IT." Keeps every extension off sign-in and mail pages.',
    );
    expect(plainWords(list, 'chromium', { blockAll: false, protect: true })).toBe(
      'Allows Dark Reader. Blocks and removes VPN Secret. Other extensions stay allowed. Keeps it off sign-in and mail pages.',
    );
    expect(plainWords([], 'firefox', { blockAll: false, protect: false })).toBe('Changes nothing yet.');
  });
});

describe('format', () => {
  const axis = (over: Partial<Axis>): Axis => ({ name: 'code', status: 'scored', points: 0, tier: 'low', findings: [], gaps: [], ...over });
  const report = {
    store: 'chrome', hardFails: [], reasons: ['Capability High, all else Low'],
    package: { name: 'Dark Reader', version: '4.9.135', manifestVersion: 3, bytes: 858_730, files: 90, scripts: 9, icon: null },
    listing: { publisher: { name: 'x', website: 'w', email: 'a@b.org', trader: true }, hasPrivacyPolicy: true },
  } as unknown as Report;

  it('writes the meta line, verdict reason and numbers', () => {
    expect(metaLine(report)).toBe('Chrome · v4.9.135 · 0.82 MB · 90 files');
    expect(verdictWhy(report)).toBe('Capability High, all else Low');
    expect([compact(13_300), compact(1_200_000), compact(950)]).toEqual(['13.3K', '1.2M', '950']);
    expect([day('2026-11-06'), day('2026-11-06', true)]).toEqual(['Nov 6, 2026', 'Nov 6']);
    expect(megabytes(19.04 * 1024 * 1024)).toBe('19.0 MB');
  });

  it('summarises rows with findings, clean rows and gaps', () => {
    const f = (label: string) => ({ rule: label, points: 5, label, where: [] as string[] });
    expect(axisSummary(axis({ findings: [f('A'), f('B'), f('C')] }), report)).toBe('A, B, +1 more');
    expect(axisSummary(axis({}), report)).toBe('Nothing found in 9 scripts');
    expect(axisSummary(axis({ name: 'reputation' }), report)).toBe('Not on any list, trader, own-domain email, privacy policy');
    expect(axisSummary(axis({ status: 'not-analysed', tier: null, gaps: ['Malware list did not load'] }), report)).toBe('Malware list did not load');
    expect(axisNotes(axis({ findings: [{ ...f('Sets the proxy'), where: ['a.js:1'] }], gaps: ['x'] }))).toEqual(['Sets the proxy: a.js:1', 'x']);
  });
});
