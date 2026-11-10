import { strToU8, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { PackageError } from './crx';
import { isSafePath, text, unpack } from './unzip';

describe('unpack', () => {
  it('returns files by path', () => {
    const z = zipSync({ 'manifest.json': strToU8('{}'), 'js/a.js': strToU8('1') });
    const out = unpack(z);
    expect([...out.files.keys()].sort()).toEqual(['js/a.js', 'manifest.json']);
    expect(out.bytes).toBe(3);
  });

  it('skips paths that leave the package and reports them', () => {
    const z = zipSync({ '../evil.js': strToU8('x'), 'ok.js': strToU8('y') });
    const out = unpack(z);
    expect([...out.files.keys()]).toEqual(['ok.js']);
    expect(out.unsafePaths).toEqual(['../evil.js']);
  });

  it('stops at the file count limit', () => {
    const z = zipSync({ a: strToU8('1'), b: strToU8('2'), c: strToU8('3') });
    expect(() => unpack(z, { files: 2, bytes: 1e9, fileBytes: 1e9 })).toThrow(PackageError);
  });

  it('stops at the unpacked size limit, as a zip bomb would hit', () => {
    const z = zipSync({ big: new Uint8Array(1_000_000) }, { level: 9 });
    expect(z.length).toBeLessThan(10_000);
    expect(() => unpack(z, { files: 10, bytes: 500_000, fileBytes: 1e9 })).toThrow(/limit/);
  });

  it('reports a broken archive as a package error', () => {
    expect(() => unpack(new Uint8Array([0x50, 0x4b, 3, 4, 1, 2, 3]))).toThrow(PackageError);
  });
});

describe('helpers', () => {
  it('spots unsafe paths', () => {
    expect(isSafePath('a/b.js')).toBe(true);
    expect(isSafePath('/etc/passwd')).toBe(false);
    expect(isSafePath('C:/x')).toBe(false);
    expect(isSafePath('a/../../b')).toBe(false);
  });

  it('strips a byte order mark', () => {
    expect(text(new Uint8Array([0xef, 0xbb, 0xbf, 0x7b, 0x7d]))).toBe('{}');
  });
});
