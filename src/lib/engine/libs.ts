// Finds bundled libraries with known flaws, using the retire.js database. Matches on version, so a patched copy
// of a library never scores.

import type { Tally } from './findings';
import { LIBRARY_POINTS } from './rules';
import { text } from './unzip';

/** Where the database comes from. Served with open CORS, so the browser can fetch it for uploads. */
export const RETIRE_URL = 'https://raw.githubusercontent.com/RetireJS/retire.js/master/repository/jsrepository-v4.json';

const VERSION = '[0-9][0-9.a-z_\\-]+';
const SEVERITY_ORDER = ['low', 'medium', 'high', 'critical'];
/** Larger files are skipped for content matching; their file names are still checked. */
const MAX_CONTENT_BYTES = 8 * 1024 * 1024;

interface Vulnerability {
  below: string | null;
  atOrAbove: string | null;
  severity: string;
  summary: string;
  cves: string[];
}

interface Library {
  name: string;
  filename: RegExp[];
  filecontent: RegExp[];
  vulnerabilities: Vulnerability[];
}

export type LibraryDb = Library[];

export class LibraryDbError extends Error {}

/** Validates and compiles the retire.js JSON. Patterns that do not compile are skipped. */
export function parseRetire(json: unknown): LibraryDb {
  if (!isRecord(json)) throw new LibraryDbError('The library database is not an object.');
  const db: LibraryDb = [];
  for (const [name, entry] of Object.entries(json)) {
    if (!isRecord(entry) || !isRecord(entry.extractors) || !Array.isArray(entry.vulnerabilities)) continue;
    const vulnerabilities: Vulnerability[] = [];
    for (const v of entry.vulnerabilities) {
      if (!isRecord(v) || typeof v.severity !== 'string') continue;
      const ids = isRecord(v.identifiers) ? v.identifiers : {};
      vulnerabilities.push({
        below: typeof v.below === 'string' ? v.below : null,
        atOrAbove: typeof v.atOrAbove === 'string' ? v.atOrAbove : null,
        severity: v.severity,
        summary: typeof ids.summary === 'string' ? ids.summary.trim() : '',
        cves: Array.isArray(ids.CVE) ? ids.CVE.filter((c): c is string => typeof c === 'string') : [],
      });
    }
    if (vulnerabilities.length === 0) continue;
    db.push({
      name,
      filename: compile(entry.extractors.filename),
      filecontent: compile(entry.extractors.filecontent),
      vulnerabilities,
    });
  }
  if (db.length === 0) throw new LibraryDbError('The library database has no libraries.');
  return db;
}

function compile(patterns: unknown): RegExp[] {
  if (!Array.isArray(patterns)) return [];
  const out: RegExp[] = [];
  for (const p of patterns) {
    if (typeof p !== 'string') continue;
    try {
      out.push(new RegExp(p.replaceAll('§§version§§', VERSION)));
    } catch {
      // Skip patterns written for another regex engine.
    }
  }
  return out;
}

export interface LibraryHit {
  library: string;
  version: string;
  path: string;
  severity: string;
  vulnerabilities: Vulnerability[];
}

/** Every bundled library copy whose version has a known flaw of medium severity or worse. */
export function findLibraries(files: Map<string, Uint8Array>, db: LibraryDb): LibraryHit[] {
  const hits: LibraryHit[] = [];
  for (const [path, bytes] of files) {
    if (!/\.m?js$/i.test(path)) continue;
    const base = path.slice(path.lastIndexOf('/') + 1);
    const source = bytes.length <= MAX_CONTENT_BYTES ? text(bytes) : null;
    for (const lib of db) {
      const version = firstMatch(lib.filename, base) ?? (source === null ? null : firstMatch(lib.filecontent, source));
      if (!version) continue;
      const vulnerabilities = lib.vulnerabilities.filter((v) => affects(v, version));
      const worst = vulnerabilities.reduce((w, v) => (rank(v.severity) > rank(w) ? v.severity : w), 'none');
      if (!LIBRARY_POINTS[worst]) continue;
      hits.push({ library: lib.name, version, path, severity: worst, vulnerabilities });
    }
  }
  return hits;
}

/** Adds library hits to the Code axis: one line per library and version, scored by its worst flaw. */
export function scoreLibraries(hits: LibraryHit[], code: Tally): void {
  for (const hit of hits) {
    const rule = `lib:${hit.library}@${hit.version}`;
    const label = `${hit.library} ${hit.version}`;
    const points = LIBRARY_POINTS[hit.severity] ?? 0;
    if (!code.has(rule)) {
      // The worst flaw goes first, then each file holding this copy.
      const worst = [...hit.vulnerabilities].sort((a, b) => rank(b.severity) - rank(a.severity))[0];
      code.add(rule, points, label, worst ? `${worst.cves[0] ?? worst.severity}: ${worst.summary}`.slice(0, 160) : undefined);
    }
    code.add(rule, points, label, hit.path);
  }
}

function firstMatch(patterns: RegExp[], subject: string): string | null {
  for (const re of patterns) {
    const m = re.exec(subject);
    // The version pattern is greedy, so a file name like jquery-1.8.3.min.js captures "1.8.3.min".
    const version = m?.[1]?.replace(/[.-]min$/i, '').replace(/[._-]+$/, '');
    if (version) return version;
  }
  return null;
}

function affects(v: Vulnerability, version: string): boolean {
  if (v.atOrAbove !== null && compareVersions(version, v.atOrAbove) < 0) return false;
  if (v.below !== null && compareVersions(version, v.below) >= 0) return false;
  return v.below !== null || v.atOrAbove !== null;
}

function rank(severity: string): number {
  return SEVERITY_ORDER.indexOf(severity);
}

/** Compares versions the way retire.js does: numeric parts numerically, and a release above its pre-releases. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(/[.\-]/);
  const pb = b.split(/[.\-]/);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i];
    const y = pb[i];
    if (x === y) continue;
    if (x === undefined) return y !== undefined && isNumeric(y) ? -1 : 1;
    if (y === undefined) return isNumeric(x) ? 1 : -1;
    const nx = isNumeric(x);
    const ny = isNumeric(y);
    if (nx && ny) return Number(x) - Number(y) || 0;
    if (nx !== ny) return nx ? 1 : -1;
    return x < y ? -1 : 1;
  }
  return 0;
}

function isNumeric(s: string): boolean {
  return /^\d+$/.test(s);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
