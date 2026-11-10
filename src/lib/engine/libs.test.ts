import { strToU8 } from 'fflate';
import { describe, expect, it } from 'vitest';
import { Tally } from './findings';
import { compareVersions, findLibraries, LibraryDbError, parseRetire, scoreLibraries } from './libs';

const db = parseRetire({
  jquery: {
    extractors: { filename: ['jquery-(§§version§§)(\\.min)?\\.js'], filecontent: ['/\\*!? jQuery v(§§version§§)'] },
    vulnerabilities: [
      { below: '1.9.0', severity: 'medium', identifiers: { summary: 'Selector XSS', CVE: ['CVE-2012-6708'] } },
      { atOrAbove: '1.2.0', below: '3.5.0', severity: 'medium', identifiers: { summary: 'htmlPrefilter XSS', CVE: ['CVE-2020-11022'] } },
      { below: '1.0.0', severity: 'low', identifiers: { summary: 'Old' } },
    ],
  },
  broken: { extractors: { filecontent: ['(unclosed'] }, vulnerabilities: [{ below: '9', severity: 'high' }] },
});

const files = (entries: Record<string, string>) => new Map(Object.entries(entries).map(([k, v]) => [k, strToU8(v)]));

describe('libraries', () => {
  it('finds a vulnerable copy by content and scores its worst flaw once', () => {
    const hits = findLibraries(files({ 'lib/a.js': '/*! jQuery v3.4.1 | (c) */', 'lib/b.js': '/*! jQuery v3.4.1 */' }), db);
    expect(hits.map((h) => [h.version, h.severity])).toEqual([['3.4.1', 'medium'], ['3.4.1', 'medium']]);
    const code = new Tally();
    scoreLibraries(hits, code);
    expect(code.findings()).toEqual([
      { rule: 'lib:jquery@3.4.1', points: 5, label: 'jquery 3.4.1', where: ['CVE-2020-11022: htmlPrefilter XSS', 'lib/a.js', 'lib/b.js'] },
    ]);
  });

  it('finds a copy by file name and ignores patched versions', () => {
    expect(findLibraries(files({ 'vendor/jquery-1.8.3.min.js': '' }), db)[0]?.version).toBe('1.8.3');
    expect(findLibraries(files({ 'a.js': '/*! jQuery v3.7.1 */' }), db)).toEqual([]);
  });

  it('rejects data with no libraries', () => {
    expect(() => parseRetire({})).toThrow(LibraryDbError);
    expect(() => parseRetire([])).toThrow(LibraryDbError);
  });

  it('compares versions like retire.js', () => {
    expect(compareVersions('1.10.0', '1.9.9')).toBeGreaterThan(0);
    expect(compareVersions('3.5.0-beta1', '3.5.0')).toBeLessThan(0);
    expect(compareVersions('3.5.0', '3.5')).toBeGreaterThan(0);
    expect(compareVersions('2.0.0', '2.0.0')).toBe(0);
  });
});
