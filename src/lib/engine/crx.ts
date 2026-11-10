// CRX3 container: protobuf header, then a zip. Verifies every signature and that the ID comes from a signing key.
// Format: https://source.chromium.org/chromium/chromium/src/+/main:components/crx_file/crx3.proto

import type { Signature } from './types';

const MAGIC = 0x34327243; // "Cr24", little-endian
const SIGNED_DATA_PREFIX = new TextEncoder().encode('CRX3 SignedData\x00');

export interface KeyProof {
  publicKey: Uint8Array;
  signature: Uint8Array;
}

export interface CrxHeader {
  version: number;
  rsa: KeyProof[];
  ecdsa: KeyProof[];
  signedHeaderData: Uint8Array | null;
  /** The 16-byte ID from the signed header, as Chrome's a-p letters. */
  declaredId: string | null;
  archive: Uint8Array;
}

export type Container =
  | { kind: 'crx3'; header: CrxHeader }
  | { kind: 'crx2' }
  | { kind: 'zip'; archive: Uint8Array };

export class PackageError extends Error {}

/** Splits a download into its header and zip archive. Plain zips (Firefox, unpacked uploads) pass through. */
export function readContainer(bytes: Uint8Array): Container {
  if (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b) return { kind: 'zip', archive: bytes };
  if (bytes.length < 12) throw new PackageError('File is too short to be an extension package.');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(0, true) !== MAGIC) throw new PackageError('Not a CRX or zip file.');
  const version = view.getUint32(4, true);
  if (version === 2) return { kind: 'crx2' };
  if (version !== 3) throw new PackageError(`Unknown CRX version ${version}.`);
  const headerSize = view.getUint32(8, true);
  if (12 + headerSize > bytes.length) throw new PackageError('CRX header runs past the end of the file.');
  const header = bytes.subarray(12, 12 + headerSize);
  const archive = bytes.subarray(12 + headerSize);

  const rsa: KeyProof[] = [];
  const ecdsa: KeyProof[] = [];
  let signedHeaderData: Uint8Array | null = null;
  for (const field of readProto(header)) {
    if (field.wire !== 2) continue;
    if (field.num === 2) rsa.push(readProof(field.bytes));
    else if (field.num === 3) ecdsa.push(readProof(field.bytes));
    else if (field.num === 10000) signedHeaderData = field.bytes;
  }
  let declaredId: string | null = null;
  if (signedHeaderData) {
    for (const field of readProto(signedHeaderData)) {
      if (field.num === 1 && field.wire === 2 && field.bytes.length === 16) declaredId = idFromBytes(field.bytes);
    }
  }
  return { kind: 'crx3', header: { version, rsa, ecdsa, signedHeaderData, declaredId, archive } };
}

/** Checks every proof in the header and that the declared ID belongs to one of the RSA keys. */
export async function verifyCrx(header: CrxHeader): Promise<Signature> {
  if (!header.signedHeaderData || !header.declaredId) {
    return { status: 'failed', detail: 'The package has no signed ID.' };
  }
  if (header.rsa.length === 0 && header.ecdsa.length === 0) {
    return { status: 'failed', detail: 'The package carries no signatures.' };
  }
  const message = signedMessage(header.signedHeaderData, header.archive);
  for (const proof of header.rsa) {
    if (!(await verifyRsa(proof, message))) return { status: 'failed', detail: 'An RSA signature does not match the contents.' };
  }
  for (const proof of header.ecdsa) {
    if (!(await verifyEcdsa(proof, message))) return { status: 'failed', detail: 'An ECDSA signature does not match the contents.' };
  }
  const keyIds = await Promise.all(header.rsa.map((p) => idFromPublicKey(p.publicKey)));
  if (!keyIds.includes(header.declaredId)) {
    return { status: 'failed', detail: 'The extension ID does not come from any signing key.' };
  }
  return { status: 'verified', detail: `${header.rsa.length + header.ecdsa.length} signatures match, ID matches its key.` };
}

/** Chrome's extension ID: the first 16 bytes of SHA-256 of the public key, as letters a-p. */
export async function idFromPublicKey(spki: Uint8Array): Promise<string> {
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', copy(spki)));
  return idFromBytes(hash.subarray(0, 16));
}

export function idFromBytes(bytes: Uint8Array): string {
  let id = '';
  for (const b of bytes) id += String.fromCharCode(97 + (b >> 4), 97 + (b & 15));
  return id;
}

function signedMessage(signedHeaderData: Uint8Array, archive: Uint8Array): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(SIGNED_DATA_PREFIX.length + 4 + signedHeaderData.length + archive.length);
  out.set(SIGNED_DATA_PREFIX, 0);
  new DataView(out.buffer).setUint32(SIGNED_DATA_PREFIX.length, signedHeaderData.length, true);
  out.set(signedHeaderData, SIGNED_DATA_PREFIX.length + 4);
  out.set(archive, SIGNED_DATA_PREFIX.length + 4 + signedHeaderData.length);
  return out;
}

async function verifyRsa(proof: KeyProof, message: Uint8Array<ArrayBuffer>): Promise<boolean> {
  try {
    const algo = { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' };
    const key = await crypto.subtle.importKey('spki', copy(proof.publicKey), algo, false, ['verify']);
    return await crypto.subtle.verify(algo, key, copy(proof.signature), message);
  } catch {
    return false;
  }
}

async function verifyEcdsa(proof: KeyProof, message: Uint8Array<ArrayBuffer>): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey('spki', copy(proof.publicKey), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    const raw = derToRaw(proof.signature, 32);
    if (!raw) return false;
    return await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, raw, message);
  } catch {
    return false;
  }
}

/** CRX stores ECDSA signatures as DER; WebCrypto wants the raw r||s pair. */
export function derToRaw(der: Uint8Array, size: number): Uint8Array<ArrayBuffer> | null {
  let i = 0;
  if (der[i++] !== 0x30) return null;
  if ((der[i] ?? 0) & 0x80) i += 1 + ((der[i] ?? 0) & 0x7f);
  else i++;
  const out = new Uint8Array(size * 2);
  for (let part = 0; part < 2; part++) {
    if (der[i++] !== 0x02) return null;
    let len = der[i++] ?? 0;
    let start = i;
    i += len;
    if (i > der.length) return null;
    while (len > size && der[start] === 0) {
      start++;
      len--;
    }
    if (len > size) return null;
    out.set(der.subarray(start, start + len), part * size + (size - len));
  }
  return out;
}

interface ProtoField {
  num: number;
  wire: number;
  bytes: Uint8Array;
}

function* readProto(buf: Uint8Array): Generator<ProtoField> {
  let i = 0;
  const varint = (): number => {
    let result = 0;
    let shift = 0;
    for (;;) {
      if (i >= buf.length) throw new PackageError('Truncated CRX header.');
      const b = buf[i++] ?? 0;
      result += (b & 0x7f) * 2 ** shift;
      if (!(b & 0x80)) return result;
      shift += 7;
      if (shift > 49) throw new PackageError('Malformed CRX header.');
    }
  };
  while (i < buf.length) {
    const key = varint();
    const num = Math.floor(key / 8);
    const wire = key & 7;
    if (wire === 0) {
      varint();
      yield { num, wire, bytes: new Uint8Array(0) };
    } else if (wire === 2) {
      const len = varint();
      if (i + len > buf.length) throw new PackageError('Truncated CRX header.');
      yield { num, wire, bytes: buf.subarray(i, i + len) };
      i += len;
    } else if (wire === 5) {
      i += 4;
    } else if (wire === 1) {
      i += 8;
    } else {
      throw new PackageError('Malformed CRX header.');
    }
  }
}

function readProof(buf: Uint8Array): KeyProof {
  let publicKey: Uint8Array = new Uint8Array(0);
  let signature: Uint8Array = new Uint8Array(0);
  for (const field of readProto(buf)) {
    if (field.wire !== 2) continue;
    if (field.num === 1) publicKey = field.bytes;
    else if (field.num === 2) signature = field.bytes;
  }
  return { publicKey, signature };
}

function copy(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(bytes.length);
  out.set(bytes);
  return out;
}
