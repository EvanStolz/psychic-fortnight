'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { download } from '@/lib/ui/download';
import { EXPORTS, exportText } from '@/lib/ui/exports';
import { day, entryLine, libraryCount } from '@/lib/ui/format';
import type { Entry } from '@/lib/ui/list';
import { keyOf, ListFileError, parseListFile, remove } from '@/lib/ui/list';
import { useList } from '@/lib/ui/useList';
import { dozedOff, LabArt } from './LabArt';
import { Foot } from './Nav';

export function LibraryView() {
  const { list, ready, keep, setKeep, update } = useList();
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ text: string; bad: boolean } | null>(null);
  // Newest first. The sort is stable, so extensions added the same day keep the order they were added in.
  const rows = [...list].sort((a, b) => b.date.localeCompare(a.date));

  const open = async (file: File) => {
    try {
      if (file.size > 20 * 1024 * 1024) throw new ListFileError('That file is too large to be a saved library.');
      const entries = parseListFile(await file.text());
      // A file replaces the library only after the reviewer agrees, when there is something to lose.
      if (list.length > 0 && !window.confirm(`Replace your library of ${list.length} with the ${entries.length} in this file?`)) return;
      setMessage(update(entries) ? { text: `Imported ${entries.length} from ${file.name}.`, bad: false } : { text: 'This browser is blocking storage.', bad: true });
    } catch (e) {
      setMessage({ text: e instanceof ListFileError ? e.message : 'That file could not be read.', bad: true });
    }
  };

  const toggleKeep = () => {
    if (!setKeep(!keep)) setMessage({ text: 'This browser is blocking storage, so the library stays in this tab only.', bad: true });
    else setMessage(null);
  };

  return (
    <div className="wrap">
      <div className="libhead">
        <div>
          <h1>Your library</h1>
          <div className="meta">{ready ? libraryCount(list.length, keep) : ' '}</div>
        </div>
        <button type="button" className="try" onClick={() => fileRef.current?.click()}>
          Import
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

      <div className="libtools">
        <div className="saveas">
          <span className="muted">Save as</span>
          {EXPORTS.map((x) => (
            <button key={x.kind} type="button" className="try" disabled={list.length === 0} onClick={() => download(x.file, exportText(x.kind, rows), x.type)}>
              {x.label}
            </button>
          ))}
        </div>
        <label className="keep">
          <span>Remember in this browser</span>
          <input type="checkbox" role="switch" className="switch" checked={keep} onChange={toggleKeep} />
        </label>
      </div>
      {message ? (
        <p className={message.bad ? 'error' : 'note'} role="status">
          {message.text}
        </p>
      ) : null}

      <section className="card libcard" aria-label="Saved extensions">
        {ready && rows.length === 0 ? (
          <div className="empty">
            <LabArt art={dozedOff} size={3.5} />
            <p>
              Nothing here yet. <Link href="/">Check an extension</Link> to add it.
            </p>
          </div>
        ) : (
          rows.map((e) => <Row key={keyOf(e)} entry={e} onRemove={() => update(remove(list, keyOf(e)))} />)
        )}
      </section>

      <Foot spaced extra={keep ? undefined : 'Nothing is stored. Reloading the page clears the library.'} />
    </div>
  );
}

function Row({ entry: e, onRemove }: { entry: Entry; onRemove: () => void }) {
  const href = e.store ? `/?q=${encodeURIComponent(`${e.store}:${e.id}`)}` : null;
  const line = entryLine(e);
  return (
    <div className="lib">
      {/* The icon is a data URL saved with the extension; next/image adds nothing for it. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {e.icon ? <img className="ico" src={e.icon} alt="" /> : <span className="ico letter" aria-hidden="true">{e.name.charAt(0).toUpperCase()}</span>}
      <div className="who">
        <div className="nm">{href ? <Link href={href}>{e.name}</Link> : e.name}</div>
        <div className="why" title={line}>
          {line}
        </div>
      </div>
      <span className="when">{day(e.date, true)}</span>
      <button type="button" className="x" onClick={onRemove} aria-label={`Remove ${e.name}`} title="Remove">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  );
}
