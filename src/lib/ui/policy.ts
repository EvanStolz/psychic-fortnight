// Builds browser policy files from the list.
// Chrome and Edge: https://chromeenterprise.google/policies/#ExtensionSettings
// Firefox: https://mozilla.github.io/policy-templates/#extensionsettings

import type { Entry } from './list';

export interface PolicyOptions {
  /** Block every extension that is not approved. */
  blockAll: boolean;
  /** Keep extensions off sign-in and mail pages. */
  protect: boolean;
}

export const BLOCK_MESSAGE = 'Request extensions through IT.';

/** Sign-in and mail hosts that extensions should not run on. */
export const PROTECTED_HOSTS = ['login.microsoftonline.com', 'accounts.google.com', '*.okta.com', 'outlook.office.com', 'mail.google.com'];

type Settings = Record<string, Record<string, unknown>>;

/** One file for both browsers: Chrome and Edge IDs never collide, and each browser ignores the other's. */
export function chromiumPolicy(list: Entry[], opts: PolicyOptions): { ExtensionSettings: Settings } {
  const settings: Settings = {};
  if (opts.blockAll) settings['*'] = { installation_mode: 'blocked', blocked_install_message: BLOCK_MESSAGE };
  for (const e of sorted(list, (e) => e.store === 'chrome' || e.store === 'edge')) {
    if (e.decision === 'approved') {
      settings[e.id] = opts.protect ? { installation_mode: 'allowed', runtime_blocked_hosts: PROTECTED_HOSTS.map((h) => `*://${h}`) } : { installation_mode: 'allowed' };
    } else {
      settings[e.id] = { installation_mode: 'removed' };
    }
  }
  return { ExtensionSettings: settings };
}

/** Firefox `policies.json`. Firefox only accepts blocked sign-in domains on the default entry. */
export function firefoxPolicy(list: Entry[], opts: PolicyOptions): { policies: { ExtensionSettings: Settings } } {
  const settings: Settings = {};
  const defaults: Record<string, unknown> = {};
  if (opts.blockAll) Object.assign(defaults, { installation_mode: 'blocked', blocked_install_message: BLOCK_MESSAGE });
  if (opts.protect) defaults.restricted_domains = PROTECTED_HOSTS.map((h) => h.replace(/^\*\./, ''));
  if (Object.keys(defaults).length > 0) settings['*'] = defaults;
  for (const e of sorted(list, (e) => e.store === 'firefox')) {
    settings[e.id] = { installation_mode: e.decision === 'approved' ? 'allowed' : 'blocked' };
  }
  return { policies: { ExtensionSettings: settings } };
}

function sorted(list: Entry[], keep: (e: Entry) => boolean): Entry[] {
  return list.filter(keep).sort((a, b) => a.name.localeCompare(b.name));
}

export type PolicyBrowser = 'chromium' | 'firefox';

export function forBrowser(list: Entry[], browser: PolicyBrowser): Entry[] {
  return sorted(list, (e) => (browser === 'firefox' ? e.store === 'firefox' : e.store === 'chrome' || e.store === 'edge'));
}

/** "A, B and 3 more" */
function names(list: Entry[]): string {
  const shown = list.slice(0, list.length > 4 ? 3 : 4).map((e) => e.name);
  const rest = list.length - shown.length;
  if (rest > 0) return `${shown.join(', ')} and ${rest} more`;
  return shown.length > 1 ? `${shown.slice(0, -1).join(', ')} and ${shown.at(-1) ?? ''}` : (shown[0] ?? '');
}

/** What the policy file does, in plain words, built from the same inputs as the file itself. */
export function plainWords(list: Entry[], browser: PolicyBrowser, opts: PolicyOptions): string {
  const entries = forBrowser(list, browser);
  const allowed = entries.filter((e) => e.decision === 'approved');
  const denied = entries.filter((e) => e.decision === 'denied');
  // Chrome and Edge also uninstall a denied extension that is already installed.
  const block = browser === 'chromium' ? 'Blocks and removes' : 'Blocks';
  const out: string[] = [];
  if (allowed.length > 0) out.push(`Allows ${names(allowed)}.`);
  const message = `with the message "${BLOCK_MESSAGE}"`;
  if (opts.blockAll) {
    if (denied.length === 0) out.push(`Blocks every ${allowed.length > 0 ? 'other ' : ''}extension, ${message}`);
    else if (browser === 'chromium') out.push(`${block} ${names(denied)}, and blocks every other extension, ${message}`);
    else out.push(`Blocks ${names(denied)} and every other extension, ${message}`);
  } else if (denied.length > 0) {
    out.push(`${block} ${names(denied)}. Other extensions stay allowed.`);
  } else if (allowed.length > 0) {
    out.push('Other extensions stay allowed.');
  }
  if (opts.protect) {
    if (browser === 'firefox') out.push('Keeps every extension off sign-in and mail pages.');
    else if (allowed.length > 0) out.push(`Keeps ${allowed.length === 1 ? 'it' : 'them'} off sign-in and mail pages.`);
  }
  return out.length > 0 ? out.join(' ') : 'Changes nothing yet.';
}
