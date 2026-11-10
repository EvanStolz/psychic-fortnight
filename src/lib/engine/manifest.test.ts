import { strToU8 } from 'fflate';
import { describe, expect, it } from 'vitest';
import type { Json } from './manifest';
import { analyseManifest, hostReach, parseLooseJson, parseManifest, remoteScriptSources } from './manifest';

function run(manifest: Record<string, Json>, extra: Record<string, string> = {}) {
  const files = new Map<string, Uint8Array>([['manifest.json', strToU8(JSON.stringify(manifest))]]);
  for (const [k, v] of Object.entries(extra)) files.set(k, strToU8(v));
  return analyseManifest(parseManifest(files), files);
}

const base = { manifest_version: 3, name: 'T', version: '1.0' };

describe('capability points', () => {
  it('scores Dark Reader the way the mock shows: 45 High', () => {
    const r = run({
      ...base,
      permissions: ['alarms', 'contextMenus', 'storage', 'scripting'],
      host_permissions: ['*://*/*'],
      content_scripts: [{ matches: ['<all_urls>'], js: ['inject/proxy.js'], run_at: 'document_start', world: 'MAIN' }],
    });
    expect(r.capability.total()).toBe(45);
    expect(r.capability.findings().map((f) => f.label)).toEqual(['All sites', 'Scripting', 'Early page script']);
    expect(r.unknown).toEqual([]);
  });

  it('adds the cookies and all-sites combination and halves optional permissions', () => {
    const r = run({
      ...base,
      permissions: ['cookies', 'tabs'],
      optional_permissions: ['nativeMessaging', 'clipboardRead'],
      host_permissions: ['<all_urls>'],
    });
    const byLabel = Object.fromEntries(r.capability.findings().map((f) => [f.label, f.points]));
    expect(byLabel).toEqual({
      'All sites': 30,
      Cookies: 15,
      'Cookies + all sites': 10,
      'Native app messaging (optional)': 10,
      Tabs: 5,
      'Clipboard read (optional)': 5,
    });
  });

  it('counts a single proxy permission as high reach', () => {
    expect(run({ ...base, permissions: ['proxy'] }).capability.total()).toBe(30);
  });

  it('separates some sites from many sites', () => {
    const some = run({ ...base, host_permissions: ['https://a.com/*', 'https://*.b.com/*'] });
    expect(some.capability.findings()[0]).toMatchObject({ label: 'Some sites', points: 5 });
    const many = run({ ...base, host_permissions: ['a', 'b', 'c', 'd', 'e'].map((h) => `https://${h}.com/*`) });
    expect(many.capability.findings()[0]).toMatchObject({ label: 'Many sites', points: 15 });
  });

  it('scores MV2 host patterns in permissions and the MV2 itself', () => {
    const r = run({ ...base, manifest_version: 2, permissions: ['http://*/*', 'webRequest', 'webRequestBlocking'] });
    expect(r.capability.total()).toBe(30 + 10 + 5);
  });

  it('reports permissions the rules do not know', () => {
    expect(run({ ...base, permissions: ['storage', 'somethingNew'] }).unknown).toEqual(['somethingNew']);
  });

  it('flags messaging from any extension', () => {
    const r = run({ ...base, externally_connectable: { ids: ['*'] } });
    expect(r.capability.findings()[0]?.label).toBe('Any site can message it');
  });
});

describe('hard fails and code findings', () => {
  it('fails updates from outside the store', () => {
    expect(run({ ...base, update_url: 'https://evil.example/updates.xml' }).hardFails[0]?.detail).toBe('Updates come from evil.example.');
    expect(run({ ...base, update_url: 'https://clients2.google.com/service/update2/crx' }).hardFails).toEqual([]);
    expect(run({ ...base, browser_specific_settings: { gecko: { id: 'x@y', update_url: 'https://x.example/u.json' } } }).hardFails).toHaveLength(1);
  });

  it('scores a CSP that allows remote scripts', () => {
    const r = run({ ...base, manifest_version: 2, content_security_policy: "script-src 'self' https://cdn.example.com; object-src 'self'" });
    expect(r.code.findings()[0]).toMatchObject({ label: 'Allows remote scripts', points: 15 });
  });

  it('lists declarativeNetRequest rule files', () => {
    const r = run({ ...base, declarative_net_request: { rule_resources: [{ id: 'r', enabled: true, path: '/rules.json' }] } });
    expect(r.ruleFiles).toEqual(['rules.json']);
  });
});

describe('package details', () => {
  it('resolves a localized name and picks an icon', () => {
    const r = run(
      { ...base, name: '__MSG_appName__', default_locale: 'en', icons: { '16': 'i16.png', '128': 'i128.png', '512': 'i512.png' } },
      { '_locales/en/messages.json': '{"APPNAME":{"message":"Real Name"}}' },
    );
    expect(r.info.name).toBe('Real Name');
    expect(r.info.icon).toEqual({ path: 'i128.png', size: 128 });
  });

  it('reads the Firefox add-on ID', () => {
    expect(run({ ...base, browser_specific_settings: { gecko: { id: 'addon@example.org' } } }).info.geckoId).toBe('addon@example.org');
  });
});

describe('helpers', () => {
  it('parses manifests with comments and trailing commas', () => {
    expect(parseLooseJson('{\n // note\n "a": "x//y", /* b */ "b": [1,],\n}')).toEqual({ a: 'x//y', b: [1] });
  });

  it('measures host reach', () => {
    expect(hostReach(['<all_urls>']).all).toBe(true);
    expect(hostReach(['https://*/*']).all).toBe(true);
    expect(hostReach(['https://a.com/*', 'http://a.com/x', 'file:///*'])).toEqual({ all: false, count: 1 });
  });

  it('finds remote script sources in either CSP shape', () => {
    expect(remoteScriptSources({ extension_pages: "script-src 'self' http://x.io" })).toEqual(['http://x.io']);
    expect(remoteScriptSources("script-src 'self'")).toEqual([]);
  });
});
