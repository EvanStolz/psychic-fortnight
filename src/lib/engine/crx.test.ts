import { describe, expect, it } from 'vitest';
import { crx, zip } from './__fixtures__/build';
import { PackageError, derToRaw, idFromBytes, readContainer, verifyCrx } from './crx';

const files = { 'manifest.json': '{"manifest_version":3,"name":"T","version":"1.0"}' };

describe('readContainer', () => {
  it('passes plain zips through', () => {
    const z = zip(files);
    expect(readContainer(z)).toEqual({ kind: 'zip', archive: z });
  });

  it('rejects files that are neither CRX nor zip', () => {
    expect(() => readContainer(new TextEncoder().encode('hello world, not a package'))).toThrow(PackageError);
  });

  it('flags the retired CRX2 format', () => {
    const b = new Uint8Array(16);
    new DataView(b.buffer).setUint32(0, 0x34327243, true);
    new DataView(b.buffer).setUint32(4, 2, true);
    expect(readContainer(b).kind).toBe('crx2');
  });

  it('rejects a header that runs past the end', () => {
    const b = new Uint8Array(16);
    const v = new DataView(b.buffer);
    v.setUint32(0, 0x34327243, true);
    v.setUint32(4, 3, true);
    v.setUint32(8, 1000, true);
    expect(() => readContainer(b)).toThrow(PackageError);
  });
});

describe('verifyCrx', () => {
  it('verifies a correctly signed package and its ID', async () => {
    const { bytes, id } = await crx(files, { withEcdsa: true });
    const c = readContainer(bytes);
    if (c.kind !== 'crx3') throw new Error('expected crx3');
    expect(c.header.declaredId).toBe(id);
    expect((await verifyCrx(c.header)).status).toBe('verified');
  });

  it('fails when the archive was changed after signing', async () => {
    const { bytes } = await crx(files, { tamper: true });
    const c = readContainer(bytes);
    if (c.kind !== 'crx3') throw new Error('expected crx3');
    expect((await verifyCrx(c.header)).status).toBe('failed');
  });

  it('fails when the declared ID does not come from the key', async () => {
    const { bytes } = await crx(files, { wrongId: true });
    const c = readContainer(bytes);
    if (c.kind !== 'crx3') throw new Error('expected crx3');
    const result = await verifyCrx(c.header);
    expect(result.status).toBe('failed');
    expect(result.detail).toMatch(/ID/);
  });
});

describe('helpers', () => {
  it('maps bytes to a-p letters', () => {
    expect(idFromBytes(new Uint8Array([0x00, 0xff, 0x1a]))).toBe('aappbk');
  });

  it('converts DER signatures with leading zero padding', () => {
    const r = new Uint8Array(32).fill(0x80);
    const s = new Uint8Array(32).fill(0x01);
    const der = new Uint8Array([0x30, 69, 0x02, 33, 0x00, ...r, 0x02, 32, ...s]);
    const raw = derToRaw(der, 32);
    expect(raw?.subarray(0, 32)).toEqual(r);
    expect(raw?.subarray(32)).toEqual(s);
  });
});
