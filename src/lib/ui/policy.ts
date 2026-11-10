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
