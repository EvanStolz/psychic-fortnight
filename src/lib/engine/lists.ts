// Checks an extension against the MalExt Sentry list of removed and malicious extensions.

import type { Tally } from './findings';
import { HARD_FAILS, REPUTATION_RULES } from './rules';
import type { HardFail } from './types';

/** Served with open CORS, so the browser can fetch it for uploads. */
export const MALEXT_URL = 'https://raw.githubusercontent.com/toborrm9/malicious_extension_sentry/main/malicious_extensions_detailed.csv';
export const MALEXT_SOURCE = 'MalExt Sentry';

/** Reasons that mean the extension itself is hostile. Anything else scores on Reputation. */
const HOSTILE = new Set(['malware', 'spyware']);

export interface ListEntry {
  id: string;
  name: string;
  reason: string;
  source: string;
  date: string;
  sha256: string;
}

export interface BadList {
  byId: Map<string, ListEntry>;
  bySha256: Map<string, ListEntry>;
}

export class ListError extends Error {}

export function parseMalExt(csv: string): BadList {
  const rows = parseCsv(csv.replace(/^﻿/, ''));
  const header = rows.shift();
  if (!header) throw new ListError('The malware list is empty.');
  const col = (name: string): number => {
    const i = header.indexOf(name);
    if (i < 0) throw new ListError(`The malware list has no ${name} column.`);
    return i;
  };
  const cols = { id: col('extension_id'), name: col('name'), reason: col('reason'), source: col('source'), date: col('insert_date_fmt'), sha256: col('sha256') };
  const list: BadList = { byId: new Map(), bySha256: new Map() };
  for (const row of rows) {
    const id = (row[cols.id] ?? '').trim().toLowerCase();
    if (!id) continue;
    const entry: ListEntry = {
      id,
      name: row[cols.name] ?? '',
      reason: (row[cols.reason] ?? '').trim(),
      source: (row[cols.source] ?? '').trim(),
      date: row[cols.date] ?? '',
      sha256: (row[cols.sha256] ?? '').trim().toLowerCase(),
    };
    // Keep the most serious entry when an ID is listed twice.
    const existing = list.byId.get(id);
    if (!existing || (isHostile(entry) && !isHostile(existing))) list.byId.set(id, entry);
    if (/^[0-9a-f]{64}$/.test(entry.sha256)) list.bySha256.set(entry.sha256, entry);
  }
  if (list.byId.size === 0) throw new ListError('The malware list has no entries.');
  return list;
}

function isHostile(e: ListEntry): boolean {
  return HOSTILE.has(e.reason.toLowerCase());
}

/** Looks the extension up by ID and by package hash, then adds a hard fail or reputation points. */
export function checkLists(list: BadList, id: string | null, sha256: string | null, reputation: Tally, hardFails: HardFail[]): void {
  const entry = (id && list.byId.get(id.toLowerCase())) || (sha256 && list.bySha256.get(sha256.toLowerCase())) || null;
  if (!entry) return;
  const where = `${entry.reason}${entry.date ? `, listed ${entry.date}` : ''}`;
  if (isHostile(entry)) {
    hardFails.push({ rule: 'malware', label: HARD_FAILS.malware, detail: `${MALEXT_SOURCE} lists it as ${entry.reason.toLowerCase()}.`, source: sourceUrl(entry) });
  } else if (/^in store but/i.test(entry.reason)) {
    reputation.add('listed-suspicious', REPUTATION_RULES.suspicious.points, REPUTATION_RULES.suspicious.label, where);
  } else {
    reputation.add('listed-removed', REPUTATION_RULES.removed.points, REPUTATION_RULES.removed.label, where);
  }
}

function sourceUrl(entry: ListEntry): string | undefined {
  return /^https:\/\//.test(entry.source) ? entry.source : undefined;
}

/** RFC 4180 CSV: quoted fields, doubled quotes, and line breaks inside quotes. */
export function parseCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < csv.length; i++) {
    const c = csv[i];
    if (quoted) {
      if (c === '"' && csv[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && csv[i + 1] === '\n') i++;
      row.push(field);
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  row.push(field);
  if (row.length > 1 || row[0] !== '') rows.push(row);
  return rows;
}
