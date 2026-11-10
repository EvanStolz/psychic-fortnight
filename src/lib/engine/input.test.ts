import { describe, expect, it } from 'vitest';
import { InputError, isValidTarget, isValidVersion, parseTarget } from './input';

const ID = 'eimadpbcbfnmbkopoojfekhnkhdbieeh';

describe('parseTarget', () => {
  it('reads store links from all three stores', () => {
    expect(parseTarget(`https://chromewebstore.google.com/detail/dark-reader/${ID}?hl=en`)).toEqual({ store: 'chrome', id: ID });
    expect(parseTarget(`chrome.google.com/webstore/detail/dark-reader/${ID}`)).toEqual({ store: 'chrome', id: ID });
    expect(parseTarget(`https://microsoftedge.microsoft.com/addons/detail/dark-reader/${ID}`)).toEqual({ store: 'edge', id: ID });
    expect(parseTarget('https://addons.mozilla.org/en-US/firefox/addon/darkreader/')).toEqual({ store: 'firefox', id: 'darkreader' });
  });

  it('reads bare and prefixed IDs', () => {
    expect(parseTarget(` ${ID} `)).toEqual({ store: 'chrome', id: ID });
    expect(parseTarget(`edge:${ID}`)).toEqual({ store: 'edge', id: ID });
    expect(parseTarget('addon@darkreader.org')).toEqual({ store: 'firefox', id: 'addon@darkreader.org' });
    expect(parseTarget('firefox:ublock-origin')).toEqual({ store: 'firefox', id: 'ublock-origin' });
  });

  it('rejects other sites and malformed IDs', () => {
    expect(() => parseTarget(`https://evil.example/detail/${ID}`)).toThrow(InputError);
    expect(() => parseTarget('chrome:xyz')).toThrow(InputError);
    expect(() => parseTarget('')).toThrow(InputError);
  });
});

describe('route validation', () => {
  it('accepts only well-formed stores, IDs and versions', () => {
    expect(isValidTarget('chrome', ID)).toBe(true);
    expect(isValidTarget('chrome', '../etc')).toBe(false);
    expect(isValidTarget('opera', ID)).toBe(false);
    expect(isValidVersion('4.9.135')).toBe(true);
    expect(isValidVersion('1.0/../x')).toBe(false);
  });
});
