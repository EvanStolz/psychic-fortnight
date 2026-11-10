// Unzips a package with limits, so a hostile archive cannot exhaust memory or escape its folder.

import { unzipSync } from 'fflate';
import { PackageError } from './crx';

export const LIMITS = {
  files: 10_000,
  /** Total unpacked size. */
  bytes: 512 * 1024 * 1024,
  /** Largest single file. */
  fileBytes: 128 * 1024 * 1024,
};

export interface Unpacked {
  files: Map<string, Uint8Array>;
  /** Entries skipped because their path tried to leave the package. */
  unsafePaths: string[];
  bytes: number;
}

export function unpack(archive: Uint8Array, limits = LIMITS): Unpacked {
  let count = 0;
  let total = 0;
  const unsafePaths: string[] = [];
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(archive, {
      filter(file) {
        if (file.name.endsWith('/')) return false;
        if (++count > limits.files) throw new PackageError(`More than ${limits.files} files.`);
        if (file.originalSize > limits.fileBytes) throw new PackageError(`${file.name} is larger than the size limit.`);
        total += file.originalSize;
        if (total > limits.bytes) throw new PackageError('Unpacked size is over the limit.');
        if (!isSafePath(file.name)) {
          unsafePaths.push(file.name);
          return false;
        }
        return true;
      },
    });
  } catch (e) {
    if (e instanceof PackageError) throw e;
    throw new PackageError(`The archive could not be unzipped: ${e instanceof Error ? e.message : String(e)}`);
  }
  const files = new Map<string, Uint8Array>();
  let bytes = 0;
  for (const [name, data] of Object.entries(entries)) {
    files.set(name.replace(/\\/g, '/'), data);
    bytes += data.length;
  }
  return { files, unsafePaths, bytes };
}

export function isSafePath(name: string): boolean {
  const path = name.replace(/\\/g, '/');
  if (path.startsWith('/') || /^[a-zA-Z]:/.test(path)) return false;
  return !path.split('/').includes('..');
}

const decoder = new TextDecoder('utf-8', { fatal: false });

export function text(bytes: Uint8Array): string {
  return decoder.decode(bytes).replace(/^﻿/, '');
}
