// The library as files to save: CSV for spreadsheets, TXT for pasting IDs into an admin console, JSON to back up
// and import again, Markdown for tickets and wikis. All built in the browser; nothing is uploaded.

import { listingUrl } from '@/lib/engine/listing';
import { STORE_NAME } from './format';
import type { Entry } from './list';
import { serialise } from './list';

export type ExportKind = 'csv' | 'txt' | 'json' | 'md';

export const EXPORTS: { kind: ExportKind; label: string; file: string; type: string }[] = [
  { kind: 'csv', label: 'CSV', file: 'crx-sniffer-library.csv', type: 'text/csv' },
  { kind: 'txt', label: 'TXT', file: 'crx-sniffer-ids.txt', type: 'text/plain' },
  { kind: 'json', label: 'JSON', file: 'crx-sniffer-library.json', type: 'application/json' },
  { kind: 'md', label: 'Markdown', file: 'crx-sniffer-library.md', type: 'text/markdown' },
];

const store = (e: Entry): string => (e.store ? STORE_NAME[e.store] : 'Upload');
const link = (e: Entry): string => (e.store ? listingUrl(e.store, e.id) : '');

/** One CSV field. Quoted always; a leading formula character is defused so a spreadsheet shows it as text. */
function cell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function toCsv(list: Entry[]): string {
  const head = ['Name', 'Store', 'ID', 'Version', 'Publisher', 'Summary', 'Added', 'Store link'];
  const rows = list.map((e) => [e.name, store(e), e.id, e.version, e.publisher ?? '', e.summary, e.date, link(e)]);
  // The byte order mark lets Excel read names with accents correctly.
  return `\uFEFF${[head, ...rows].map((r) => r.map(cell).join(',')).join('\r\n')}\r\n`;
}

/** One extension ID per line, ready to paste into an allow list. */
export function toTxt(list: Entry[]): string {
  return list.length > 0 ? `${list.map((e) => e.id).join('\n')}\n` : '';
}

function md(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/[\r\n]+/g, ' ');
}

export function toMarkdown(list: Entry[]): string {
  const rows = list.map((e) => {
    const name = e.store ? `[${md(e.name)}](${link(e)})` : md(e.name);
    return `| ${name} | ${store(e)} | ${md(e.version)} | \`${e.id}\` | ${md(e.summary)} |`;
  });
  return `${['| Name | Store | Version | ID | Summary |', '| --- | --- | --- | --- | --- |', ...rows].join('\n')}\n`;
}

export function exportText(kind: ExportKind, list: Entry[]): string {
  if (kind === 'csv') return toCsv(list);
  if (kind === 'txt') return toTxt(list);
  if (kind === 'md') return toMarkdown(list);
  return serialise(list);
}
