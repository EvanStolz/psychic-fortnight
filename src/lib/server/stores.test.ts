import { describe, expect, it } from 'vitest';
import { parseUpdateCheck } from './stores';

const ID = 'eimadpbcbfnmbkopoojfekhnkhdbieeh';

describe('parseUpdateCheck', () => {
  it('reads the version, download and hash', () => {
    const xml = `<gupdate><app appid="${ID}" cohort="1::" status="ok"><updatecheck codebase="https://clients2.googleusercontent.com/crx/blobs/X/A.crx" hash_sha256="${'0b'.repeat(32)}" size="858730" status="ok" version="4.9.135"/></app></gupdate>`;
    expect(parseUpdateCheck(xml, ID)).toEqual({ version: '4.9.135', codebase: 'https://clients2.googleusercontent.com/crx/blobs/X/A.crx', sha256: '0b'.repeat(32) });
  });

  it('returns null for an unknown or removed extension', () => {
    expect(parseUpdateCheck(`<gupdate><app appid="${ID}" status="error-unknownApplication"/></gupdate>`, ID)).toBeNull();
    expect(parseUpdateCheck(`<gupdate><app appid="${ID}" status="ok"><updatecheck status="noupdate"/></app></gupdate>`, ID)).toBeNull();
  });
});
