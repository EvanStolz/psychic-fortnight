// Runs every check on one package and returns the report. Shared by the server route and browser uploads.

import { analyseCode } from './code';
import { PackageError, readContainer, verifyCrx } from './crx';
import { Tally } from './findings';
import type { LibraryDb } from './libs';
import { findLibraries, scoreLibraries } from './libs';
import type { BadList } from './lists';
import { checkLists } from './lists';
import { scoreListing } from './listing';
import type { ManifestResult } from './manifest';
import { analyseManifest, parseManifest } from './manifest';
import { HARD_FAILS } from './rules';
import type { HardFail, ListingResult, Report, Signature, Store } from './types';
import { RULES_VERSION } from './types';
import type { Unpacked } from './unzip';
import { unpack } from './unzip';
import { buildAxis, decide } from './verdict';

export const MAX_ICON_BYTES = 64 * 1024;

export interface AnalyseInput {
  bytes: Uint8Array;
  /** The store it came from, or null for an upload. */
  store: Store | null;
  /** The ID the store gave, checked against the package's signed ID. */
  id: string | null;
  /** Null when the database could not be loaded; the check then shows as not run. */
  libraries: LibraryDb | null;
  badList: BadList | null;
  listing: ListingResult;
  now?: Date;
}

export async function analyse(input: AnalyseInput): Promise<Report> {
  const hardFails: HardFail[] = [];
  const container = readContainer(input.bytes);
  if (container.kind === 'crx2') throw new PackageError('This is an old CRX2 package, which browsers no longer install.');

  let signature: Signature;
  let archive: Uint8Array;
  let signedId: string | null = null;
  if (container.kind === 'crx3') {
    archive = container.header.archive;
    signedId = container.header.declaredId;
    signature = await verifyCrx(container.header);
    if (signature.status === 'verified' && input.id && signedId !== input.id) {
      signature = { status: 'failed', detail: `The package is signed as ${signedId}, not ${input.id}.` };
    }
  } else {
    archive = container.archive;
    signature =
      input.store === 'firefox'
        ? { status: 'store-delivered', detail: 'Downloaded from addons.mozilla.org, which signs every listed add-on.' }
        : { status: 'unsigned', detail: 'A plain zip has no signature to check.' };
  }
  if (signature.status === 'failed') hardFails.push({ rule: 'signature', label: HARD_FAILS.signature, detail: signature.detail });

  let unpacked: Unpacked;
  let manifest: ManifestResult;
  try {
    unpacked = unpack(archive);
    manifest = analyseManifest(parseManifest(unpacked.files), unpacked.files);
  } catch (e) {
    // A package that fails its signature is denied even when its contents are unreadable.
    if (signature.status === 'failed') return unreadableReport(input, signature, hardFails, signedId);
    throw e;
  }
  hardFails.push(...manifest.hardFails);

  // Code: manifest findings, then the scripts, then bundled libraries.
  const codeGaps: string[] = [];
  const code = analyseCode(unpacked.files, manifest.ruleFiles, manifest.code);
  hardFails.push(...code.hardFails);
  if (code.unreadable.length > 0) codeGaps.push(`${plural(code.unreadable.length, 'script')} could not be read: ${code.unreadable.slice(0, 3).join(', ')}`);
  if (unpacked.unsafePaths.length > 0) codeGaps.push(`${plural(unpacked.unsafePaths.length, 'file')} with unsafe paths skipped`);
  if (input.libraries) scoreLibraries(findLibraries(unpacked.files, input.libraries), code.code);
  else codeGaps.push('Library check did not run');

  // Reputation: the bad-extension list, then the store listing.
  const id = input.id ?? signedId ?? manifest.info.geckoId;
  const reputation = new Tally();
  const reputationGaps: string[] = [];
  let checks = 0;
  if (input.badList) {
    checkLists(input.badList, id, await sha256(input.bytes), reputation, hardFails);
    checks++;
  } else {
    reputationGaps.push('Malware list did not load');
  }
  if (input.listing.status === 'ok' || input.listing.status === 'gone') {
    scoreListing(input.listing, reputation);
    checks++;
  } else {
    reputationGaps.push(input.listing.status === 'error' ? `Store listing did not load: ${input.listing.reason}` : 'Not listed in a store');
  }

  const result = decide({
    capability: { tally: manifest.capability, gaps: [] },
    code: { tally: code.code, gaps: codeGaps },
    reputation: { tally: reputation, gaps: reputationGaps, none: checks === 0 },
    hardFails: dedupe(hardFails),
    unknown: manifest.unknown,
  });

  return {
    rulesVersion: RULES_VERSION,
    store: input.store,
    id,
    package: {
      name: manifest.info.name,
      version: manifest.info.version,
      manifestVersion: manifest.info.manifestVersion,
      bytes: input.bytes.length,
      files: unpacked.files.size,
      scripts: code.scripts,
      icon: manifest.info.icon ? iconDataUrl(manifest.info.icon.path, unpacked.files) : null,
    },
    signature,
    verdict: result.verdict,
    reasons: result.reasons,
    hardFails: dedupe(hardFails),
    axes: result.axes,
    listing: input.listing.status === 'ok' ? input.listing.listing : null,
    analysedAt: (input.now ?? new Date()).toISOString(),
  };
}

function unreadableReport(input: AnalyseInput, signature: Signature, hardFails: HardFail[], signedId: string | null): Report {
  const empty = (name: 'capability' | 'code' | 'reputation') => buildAxis(name, { tally: new Tally(), gaps: ['The package could not be read'], none: true });
  return {
    rulesVersion: RULES_VERSION,
    store: input.store,
    id: input.id ?? signedId,
    package: null,
    signature,
    verdict: 'deny',
    reasons: hardFails.map((f) => f.label),
    hardFails,
    axes: { capability: empty('capability'), code: empty('code'), reputation: empty('reputation'), change: { name: 'change', status: 'first-review', points: 0, tier: null, findings: [], gaps: [] } },
    listing: input.listing.status === 'ok' ? input.listing.listing : null,
    analysedAt: (input.now ?? new Date()).toISOString(),
  };
}

const ICON_TYPES: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp' };

function iconDataUrl(path: string, files: Map<string, Uint8Array>): string | null {
  const bytes = files.get(path);
  const type = ICON_TYPES[path.slice(path.lastIndexOf('.') + 1).toLowerCase()];
  if (!bytes || !type || bytes.length > MAX_ICON_BYTES) return null;
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return `data:${type};base64,${btoa(binary)}`;
}

async function sha256(bytes: Uint8Array): Promise<string> {
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', copy));
  return Array.from(hash, (b) => b.toString(16).padStart(2, '0')).join('');
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

function dedupe(fails: HardFail[]): HardFail[] {
  const seen = new Map<string, HardFail>();
  for (const f of fails) if (!seen.has(f.rule)) seen.set(f.rule, f);
  return [...seen.values()];
}
