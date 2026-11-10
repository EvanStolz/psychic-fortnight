import { describe, expect, it } from 'vitest';
import { classic, dozedOff, noseDown } from '@/components/LabArt';
import type { Axis, Report } from '@/lib/engine/types';
import { toCsv, toMarkdown, toTxt } from './exports';
import { axisNotes, axisSummary, compact, day, entryLine, findingTier, libraryCount, megabytes, metaLine, verdictWhy } from './format';
import type { Entry } from './list';
import { keyOf, ListFileError, parseListFile, serialise, upsert } from './list';

const entry = (over: Partial<Entry>): Entry => ({
  store: 'chrome', id: 'eimadpbcbfnmbkopoojfekhnkhdbieeh', name: 'Dark Reader', version: '4.9.135', icon: null,
  summary: 'All axes Low', date: '2026-11-09', rulesVersion: 1, publisher: 'Dark Reader Ltd', ...over,
});

describe('library file', () => {
  it('round-trips through a saved file and replaces an older copy', () => {
    const list = upsert([entry({})], entry({ version: '4.9.136' }));
    expect(list).toHaveLength(1);
    expect(parseListFile(serialise(list))).toEqual(list);
    expect(keyOf(entry({ store: null, id: 'x' }))).toBe('upload:x');
  });

  it('rejects files that are not libraries or hold bad entries', () => {
    expect(() => parseListFile('nope')).toThrow(ListFileError);
    expect(() => parseListFile('{"format":"other","entries":[]}')).toThrow(ListFileError);
    const bad = JSON.parse(serialise([entry({})])) as { entries: Record<string, unknown>[] };
    const first = bad.entries[0];
    if (first) first.icon = 'javascript:alert(1)';
    expect(() => parseListFile(JSON.stringify(bad))).toThrow('Entry 1');
  });

  it('reads version 1 files, which had decisions and no summary', () => {
    const v1 = { format: 'crx-sniffer-list', version: 1, entries: [{ ...entry({}), decision: 'approved', verdict: 'approve', reason: 'Dark mode', summary: undefined }] };
    expect(parseListFile(JSON.stringify(v1))).toEqual([entry({ summary: '' })]);
  });
});

describe('library lines', () => {
  it('counts extensions in words and builds each row from the engine summary', () => {
    expect(libraryCount(3, true)).toBe('Three extensions, kept only in this browser.');
    expect(libraryCount(1, false)).toBe('One extension, kept in this tab only.');
    expect(libraryCount(12, true)).toMatch(/^12 extensions/);
    expect(libraryCount(0, true)).toMatch(/^No extensions/);
    expect(entryLine(entry({}))).toBe('All axes Low · v4.9.135');
    expect(entryLine(entry({ summary: '' }))).toBe('v4.9.135');
  });

  it('gives each finding the tier its points would earn on its axis', () => {
    expect([5, 16, 36, 61].map((p) => findingTier(p, 'capability'))).toEqual(['low', 'medium', 'high', 'critical']);
    expect([9, 10, 25, 50].map((p) => findingTier(p, 'code'))).toEqual(['low', 'medium', 'high', 'critical']);
    expect(findingTier(0, 'reputation')).toBeNull();
  });
});

describe('library exports', () => {
  const list = [entry({}), entry({ store: 'firefox', id: 'addon@darkreader.org', name: '=HYPERLINK("x") | "quoted"', publisher: null })];

  it('writes CSV a spreadsheet opens safely', () => {
    const lines = toCsv(list).replace(/^﻿/, '').trimEnd().split('\r\n');
    expect(lines[0]).toBe('"Name","Store","ID","Version","Publisher","Summary","Added","Store link"');
    expect(lines[1]).toBe(
      '"Dark Reader","Chrome","eimadpbcbfnmbkopoojfekhnkhdbieeh","4.9.135","Dark Reader Ltd","All axes Low","2026-11-09","https://chromewebstore.google.com/detail/eimadpbcbfnmbkopoojfekhnkhdbieeh"',
    );
    expect(lines[2]).toMatch(/^"'=HYPERLINK\(""x""\) \| ""quoted""","Firefox"/);
  });

  it('writes one ID per line and a Markdown table', () => {
    expect(toTxt(list)).toBe('eimadpbcbfnmbkopoojfekhnkhdbieeh\naddon@darkreader.org\n');
    expect(toTxt([])).toBe('');
    const md = toMarkdown(list).split('\n');
    expect(md[2]).toBe('| [Dark Reader](https://chromewebstore.google.com/detail/eimadpbcbfnmbkopoojfekhnkhdbieeh) | Chrome | 4.9.135 | `eimadpbcbfnmbkopoojfekhnkhdbieeh` | All axes Low |');
    expect(md[3]).toContain('\| "quoted"');
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
