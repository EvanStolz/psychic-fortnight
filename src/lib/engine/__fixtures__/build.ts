// Builds synthetic CRX3 and zip packages for tests, signed with keys made on the fly.

import { strToU8, zipSync } from 'fflate';
import { idFromPublicKey } from '../crx';

export type Files = Record<string, string | Uint8Array>;

export function zip(files: Files): Uint8Array {
  const entries: Record<string, Uint8Array> = {};
  for (const [name, body] of Object.entries(files)) entries[name] = typeof body === 'string' ? strToU8(body) : body;
  return zipSync(entries);
}

export interface CrxOptions {
  /** Flip a byte of the archive after signing. */
  tamper?: boolean;
  /** Declare an ID that does not belong to the key. */
  wrongId?: boolean;
  /** Add an ECDSA proof as the store does. */
  withEcdsa?: boolean;
}

export async function crx(files: Files, opts: CrxOptions = {}): Promise<{ bytes: Uint8Array; id: string }> {
  const archive = zip(files);
  const rsa = await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['sign', 'verify'],
  );
  const rsaPub = new Uint8Array(await crypto.subtle.exportKey('spki', rsa.publicKey));
  const id = await idFromPublicKey(rsaPub);
  const idBytes = new Uint8Array(16);
  const source = opts.wrongId ? 'a'.repeat(32) : id;
  for (let i = 0; i < 16; i++) idBytes[i] = ((source.charCodeAt(i * 2) - 97) << 4) | (source.charCodeAt(i * 2 + 1) - 97);
  const signedHeaderData = field(1, idBytes);

  const prefix = new TextEncoder().encode('CRX3 SignedData\x00');
  const message = new Uint8Array(prefix.length + 4 + signedHeaderData.length + archive.length);
  message.set(prefix, 0);
  new DataView(message.buffer).setUint32(prefix.length, signedHeaderData.length, true);
  message.set(signedHeaderData, prefix.length + 4);
  message.set(archive, prefix.length + 4 + signedHeaderData.length);

  const rsaSig = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', rsa.privateKey, message));
  const parts = [field(2, concat(field(1, rsaPub), field(2, rsaSig)))];
  if (opts.withEcdsa) {
    const ec = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
    const ecPub = new Uint8Array(await crypto.subtle.exportKey('spki', ec.publicKey));
    const raw = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, ec.privateKey, message));
    parts.push(field(3, concat(field(1, ecPub), field(2, rawToDer(raw)))));
  }
  parts.push(field(10000, signedHeaderData));
  const header = concat(...parts);

  const out = new Uint8Array(12 + header.length + archive.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, 0x34327243, true);
  view.setUint32(4, 3, true);
  view.setUint32(8, header.length, true);
  out.set(header, 12);
  out.set(archive, 12 + header.length);
  if (opts.tamper) out[out.length - 30] = (out[out.length - 30] ?? 0) ^ 0xff;
  return { bytes: out, id };
}

function field(num: number, bytes: Uint8Array): Uint8Array {
  return concat(varint(num * 8 + 2), varint(bytes.length), bytes);
}

function varint(n: number): Uint8Array {
  const out: number[] = [];
  while (n > 0x7f) {
    out.push((n & 0x7f) | 0x80);
    n = Math.floor(n / 128);
  }
  out.push(n);
  return new Uint8Array(out);
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let i = 0;
  for (const p of parts) {
    out.set(p, i);
    i += p.length;
  }
  return out;
}

function rawToDer(raw: Uint8Array): Uint8Array {
  const int = (b: Uint8Array): Uint8Array => {
    let start = 0;
    while (start < b.length - 1 && b[start] === 0) start++;
    let v = b.subarray(start);
    if ((v[0] ?? 0) & 0x80) v = concat(new Uint8Array([0]), v);
    return concat(new Uint8Array([0x02, v.length]), v);
  };
  const body = concat(int(raw.subarray(0, 32)), int(raw.subarray(32)));
  return concat(new Uint8Array([0x30, body.length]), body);
}
