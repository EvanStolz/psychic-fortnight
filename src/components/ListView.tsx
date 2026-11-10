'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { day, verdictFill, verdictName } from '@/lib/ui/format';
import type { Entry } from '@/lib/ui/list';
import { keyOf, ListFileError, parseListFile, remove, serialise } from '@/lib/ui/list';
import { useList } from '@/lib/ui/useList';
import { download } from '@/lib/ui/download';
import { Foot } from './Nav';

export function ListView() {
  const { list, ready, update } = useList();
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ text: string; bad: boolean } | null>(null);
  const approved = list.filter((e) => e.decision === 'approved').length;

  const open = async (file: File) => {
    try {
      if (file.size > 20 * 1024 * 1024) throw new ListFileError('That file is too large to be a saved list.');
      const entries = parseListFile(await file.text());
      // A file replaces the list only after the reviewer agrees, when there is something to lose.
      if (list.length > 0 && !window.confirm(`Replace your list of ${list.length} with the ${entries.length} in this file?`)) return;
      setMessage(update(entries) ? { text: `Opened ${entries.length} from ${file.name}.`, bad: false } : { text: 'This browser is blocking storage.', bad: true });
    } catch (e) {
      setMessage({ text: e instanceof ListFileError ? e.message : 'That file could not be read.', bad: true });
    }
  };

  return (
    <div className="wrap">
      <h1>Your list</h1>
      <div className="meta">
        {ready ? `${approved} approved · ${list.length - approved} denied · stored in this browser` : 'Stored in this browser'}
      </div>

      {ready && list.length === 0 ? (
        <p className="note">
          Nothing here yet. <Link href="/">Check an extension</Link>, then approve or deny it under the verdict.
        </p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Extension</th>
              <th style={{ textAlign: 'center' }}>Decision</th>
              <th className="hide-sm" style={{ textAlign: 'center' }}>
                Verdict
              </th>
              <th className="hide-sm">Reason</th>
              <th className="hide-sm">Date</th>
              <th className="hide-sm">
                <span className="sr">Remove</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {list.map((e) => (
              <Row key={keyOf(e)} entry={e} onRemove={() => update(remove(list, keyOf(e)))} />
            ))}
          </tbody>
        </table>
      )}

      <div className="btnrow">
        <button type="button" className="btn ghost slim" disabled={list.length === 0} onClick={() => download('crx-sniffer-list.json', serialise(list))}>
          Save list as file
        </button>
        <button type="button" className="btn ghost slim" onClick={() => fileRef.current?.click()}>
          Open list file
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) void open(file);
          }}
        />
      </div>
      {message ? (
        <p className={message.bad ? 'error' : 'note'} role="status">
          {message.text}
        </p>
      ) : null}

      <Foot spaced />
    </div>
  );
}

function Row({ entry: e, onRemove }: { entry: Entry; onRemove: () => void }) {
  const href = e.store ? `/?q=${encodeURIComponent(`${e.store}:${e.id}`)}` : null;
  return (
    <tr>
      <td style={{ maxWidth: 320 }}>
        <div className="ext">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {e.icon ? <img src={e.icon} alt="" /> : <span className="blank" />}
          <span className="nm">{href ? <Link href={href} style={{ color: 'inherit', textDecoration: 'none' }}>{e.name}</Link> : e.name}</span>
          <span className="grey small hide-sm">v{e.version}</span>
        </div>
      </td>
      <td className={`cell ${e.decision === 'approved' ? 'f1' : 'f5'}`}>{e.decision === 'approved' ? 'Approved' : 'Denied'}</td>
      <td className={`cell hide-sm ${verdictFill(e.verdict)}`}>{verdictName(e.verdict)}</td>
      <td className="hide-sm reason">{e.reason || <span className="grey">-</span>}</td>
      <td className="hide-sm grey small">{day(e.date, true)}</td>
      <td className="hide-sm" style={{ width: 1 }}>
        <button type="button" className="linkbtn small" onClick={onRemove} aria-label={`Remove ${e.name}`}>
          Remove
        </button>
      </td>
    </tr>
  );
}
