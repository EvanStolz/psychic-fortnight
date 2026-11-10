// Reads manifest.json and scores what the extension is allowed to do.

import { Tally } from './findings';
import {
  CAPABILITY_RULES,
  CODE_RULES,
  HARD_FAILS,
  MANY_SITES,
  PERMISSION_POINTS,
  STORE_UPDATE_HOSTS,
} from './rules';
import type { HardFail } from './types';
import { text } from './unzip';

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type JsonObject = { [key: string]: Json };

export interface ManifestInfo {
  name: string;
  version: string;
  manifestVersion: number;
  /** Firefox add-on ID, when declared. */
  geckoId: string | null;
  icon: { path: string; size: number } | null;
}

export interface ManifestResult {
  info: ManifestInfo;
  capability: Tally;
  code: Tally;
  hardFails: HardFail[];
  /** Permissions the rules do not know. */
  unknown: string[];
  /** Files holding declarativeNetRequest rules, to check for header stripping. */
  ruleFiles: string[];
}

export class ManifestError extends Error {}

export function parseManifest(files: Map<string, Uint8Array>): JsonObject {
  const raw = files.get('manifest.json');
  if (!raw) throw new ManifestError('The package has no manifest.json.');
  const parsed = parseLooseJson(text(raw));
  if (!isObject(parsed)) throw new ManifestError('manifest.json is not an object.');
  return parsed;
}

/** Chrome accepts comments and trailing commas in manifests, so this does too. */
export function parseLooseJson(source: string): Json {
  try {
    return JSON.parse(source) as Json;
  } catch {
    let out = '';
    let inString = false;
    for (let i = 0; i < source.length; i++) {
      const c = source[i];
      if (inString) {
        out += c;
        if (c === '\\') out += source[++i] ?? '';
        else if (c === '"') inString = false;
      } else if (c === '"') {
        inString = true;
        out += c;
      } else if (c === '/' && source[i + 1] === '/') {
        while (i < source.length && source[i] !== '\n') i++;
      } else if (c === '/' && source[i + 1] === '*') {
        i = source.indexOf('*/', i + 2);
        if (i < 0) break;
        i++;
      } else {
        out += c;
      }
    }
    try {
      return JSON.parse(out.replace(/,(\s*[}\]])/g, '$1')) as Json;
    } catch {
      throw new ManifestError('manifest.json is not valid JSON.');
    }
  }
}

export function analyseManifest(manifest: JsonObject, files: Map<string, Uint8Array>): ManifestResult {
  const mv = typeof manifest.manifest_version === 'number' ? manifest.manifest_version : 2;
  const capability = new Tally();
  const code = new Tally();
  const hardFails: HardFail[] = [];
  const unknown: string[] = [];

  // API permissions, and host patterns hiding in the MV2 permissions list.
  const required = strings(manifest.permissions);
  const optional = strings(manifest.optional_permissions);
  const hosts = [...strings(manifest.host_permissions), ...required.filter(isHostPattern)];
  const optionalHosts = [...strings(manifest.optional_host_permissions), ...optional.filter(isHostPattern)];
  const contentScripts = objects(manifest.content_scripts);
  for (const cs of contentScripts) hosts.push(...strings(cs.matches));

  for (const perm of required.filter((p) => !isHostPattern(p))) scorePermission(capability, perm, false, unknown);
  for (const perm of optional.filter((p) => !isHostPattern(p))) {
    if (!required.includes(perm)) scorePermission(capability, perm, true, unknown);
  }

  const reach = hostReach(hosts);
  const optionalReach = hostReach(optionalHosts);
  if (reach.all) capability.add('host:all', CAPABILITY_RULES.allSites.points, CAPABILITY_RULES.allSites.label);
  else if (reach.count >= MANY_SITES) capability.add('host:many', CAPABILITY_RULES.manySites.points, CAPABILITY_RULES.manySites.label, `${reach.count} sites`);
  else if (reach.count > 0) capability.add('host:some', CAPABILITY_RULES.someSites.points, CAPABILITY_RULES.someSites.label, `${reach.count} sites`);
  if (!reach.all && optionalReach.all) {
    capability.add('host:all:optional', half(CAPABILITY_RULES.allSites.points), `${CAPABILITY_RULES.allSites.label} (optional)`);
  }

  const cookies = required.includes('cookies');
  if (cookies && reach.all) capability.add('combo:cookies-all', CAPABILITY_RULES.cookiesAllSites.points, CAPABILITY_RULES.cookiesAllSites.label);

  for (const cs of contentScripts) {
    if (cs.world === 'MAIN' && cs.run_at === 'document_start' && hostReach(strings(cs.matches)).all) {
      capability.add('early-page-script', CAPABILITY_RULES.earlyPageScript.points, CAPABILITY_RULES.earlyPageScript.label, strings(cs.js).join(', '));
    }
  }

  const ext = manifest.externally_connectable;
  if (isObject(ext) && (strings(ext.ids).includes('*') || hostReach(strings(ext.matches)).all)) {
    capability.add('external-any', CAPABILITY_RULES.externalAny.points, CAPABILITY_RULES.externalAny.label);
  }

  if (mv < 3) capability.add('mv2', CAPABILITY_RULES.mv2.points, CAPABILITY_RULES.mv2.label);

  // Updates served from anywhere but the store let the publisher ship unreviewed code.
  for (const url of updateUrls(manifest)) {
    let host = '';
    try {
      host = new URL(url).hostname;
    } catch {
      host = url;
    }
    if (!STORE_UPDATE_HOSTS.has(host)) {
      hardFails.push({ rule: 'off-store-updates', label: HARD_FAILS.offStoreUpdates, detail: `Updates come from ${host}.` });
    }
  }

  const remote = remoteScriptSources(manifest.content_security_policy);
  if (remote.length > 0) code.add('csp-remote', CODE_RULES.remoteScriptsCsp.points, CODE_RULES.remoteScriptsCsp.label, `manifest.json: ${remote.join(' ')}`);

  const dnr = manifest.declarative_net_request;
  const ruleFiles = isObject(dnr) ? objects(dnr.rule_resources).flatMap((r) => (typeof r.path === 'string' ? [r.path.replace(/^\//, '')] : [])) : [];

  return {
    info: {
      name: resolveMessage(typeof manifest.name === 'string' ? manifest.name : 'Unnamed', manifest, files),
      version: typeof manifest.version === 'string' ? manifest.version : '0',
      manifestVersion: mv,
      geckoId: geckoId(manifest),
      icon: pickIcon(manifest.icons),
    },
    capability,
    code,
    hardFails,
    unknown,
    ruleFiles,
  };
}

function scorePermission(tally: Tally, perm: string, optional: boolean, unknown: string[]): void {
  const rule = PERMISSION_POINTS[perm];
  if (!rule) {
    unknown.push(perm);
    return;
  }
  if (rule.points === 0) return;
  tally.add(
    `perm:${perm}${optional ? ':optional' : ''}`,
    optional ? half(rule.points) : rule.points,
    optional ? `${rule.label} (optional)` : rule.label,
  );
}

function half(points: number): number {
  return Math.ceil(points / 2);
}

export function isHostPattern(p: string): boolean {
  return p === '<all_urls>' || p.includes('://');
}

/** How far a set of match patterns reaches: everywhere, or how many distinct hosts. */
export function hostReach(patterns: string[]): { all: boolean; count: number } {
  const hosts = new Set<string>();
  for (const p of patterns) {
    if (p === '<all_urls>') return { all: true, count: 0 };
    const m = /^([a-z*-]+):\/\/([^/]*)/i.exec(p);
    if (!m) continue;
    const host = (m[2] ?? '').toLowerCase();
    if (m[1] === 'file') continue;
    if (host === '*' || host === '') return { all: true, count: 0 };
    hosts.add(host.replace(/^\*\./, ''));
  }
  return { all: false, count: hosts.size };
}

function updateUrls(manifest: JsonObject): string[] {
  const urls: string[] = [];
  if (typeof manifest.update_url === 'string') urls.push(manifest.update_url);
  for (const key of ['browser_specific_settings', 'applications']) {
    const bss = manifest[key];
    if (isObject(bss) && isObject(bss.gecko) && typeof bss.gecko.update_url === 'string') urls.push(bss.gecko.update_url);
  }
  return urls;
}

/** Script sources in the extension's own CSP that load code from the network. */
export function remoteScriptSources(csp: Json | undefined): string[] {
  const policies = typeof csp === 'string' ? [csp] : isObject(csp) ? Object.values(csp).filter((v): v is string => typeof v === 'string') : [];
  const remote: string[] = [];
  for (const policy of policies) {
    for (const directive of policy.split(';')) {
      const [name, ...sources] = directive.trim().split(/\s+/);
      if (name !== 'script-src' && name !== 'default-src') continue;
      for (const s of sources) {
        if (/^(https?:|\*|wss?:)/i.test(s) && !/^https?:\/\/(localhost|127\.0\.0\.1)/i.test(s)) remote.push(s);
      }
    }
  }
  return remote;
}

function geckoId(manifest: JsonObject): string | null {
  for (const key of ['browser_specific_settings', 'applications']) {
    const bss = manifest[key];
    if (isObject(bss) && isObject(bss.gecko) && typeof bss.gecko.id === 'string') return bss.gecko.id;
  }
  return null;
}

function pickIcon(icons: Json | undefined): { path: string; size: number } | null {
  if (!isObject(icons)) return null;
  let best: { path: string; size: number } | null = null;
  for (const [size, path] of Object.entries(icons)) {
    const n = Number(size);
    if (typeof path !== 'string' || !Number.isFinite(n)) continue;
    const score = (s: number): number => (s >= 48 && s <= 128 ? 1000 + s : s);
    if (!best || score(n) > score(best.size)) best = { path: path.replace(/^\//, ''), size: n };
  }
  return best;
}

/** Resolves `__MSG_name__` from the default locale. */
export function resolveMessage(value: string, manifest: JsonObject, files: Map<string, Uint8Array>): string {
  const m = /^__MSG_(.+)__$/.exec(value);
  if (!m) return value;
  const locale = typeof manifest.default_locale === 'string' ? manifest.default_locale : 'en';
  const raw = files.get(`_locales/${locale}/messages.json`) ?? files.get('_locales/en/messages.json');
  if (!raw) return value;
  try {
    const messages = parseLooseJson(text(raw));
    if (!isObject(messages)) return value;
    const key = (m[1] ?? '').toLowerCase();
    for (const [k, v] of Object.entries(messages)) {
      if (k.toLowerCase() === key && isObject(v) && typeof v.message === 'string') return v.message;
    }
  } catch {
    // Fall back to the raw key.
  }
  return value;
}

export function isObject(v: Json | undefined): v is JsonObject {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function strings(v: Json | undefined): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

function objects(v: Json | undefined): JsonObject[] {
  return Array.isArray(v) ? v.filter(isObject) : [];
}
