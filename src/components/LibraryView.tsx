'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { download } from '@/lib/ui/download';
import { day, entryLine, libraryCount } from '@/lib/ui/format';
import type { Entry } from '@/lib/ui/list';
import { keyOf, ListFileError, parseListFile, remove, serialise } from '@/lib/ui/list';
import type { PolicyBrowser } from '@/lib/ui/policy';
import { chromiumPolicy, firefoxPolicy, plainWords } from '@/lib/ui/policy';
import { useList } from '@/lib/ui/useList';
import { dozedOff, LabArt } from './LabArt';
import { Foot } from './Nav';

type Browser = 'chrome' | 'edge' | 'firefox';

const BROWSERS: { id: Browser; label: string }[] = [
  { id: 'chrome', label: 'Chrome' },
  { id: 'edge', label: 'Edge' },
  { id: 'firefox', label: 'Firefox' },
];

const DEPLOY_HELP: Record<Browser, string> = {
  chrome: 'https://chromeenterprise.google/policies/#ExtensionSettings',
  edge: 'https://learn.microsoft.com/en-us/deployedge/microsoft-edge-manage-extensions-ref-guide',
  firefox: 'https://mozilla.github.io/policy-templates/#extensionsettings',
};

export function LibraryView() {
  const { list, ready, update } = useList();
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ text: string; bad: boolean } | null>(null);
  // Newest decision first. The sort is stable, so same-day decisions keep the order they were made in.
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

  return (
    <div className="wrap wide">
      <div className="libhead">
        <div>
          <h1>Your library</h1>
          <div className="meta">{ready ? libraryCount(list) : 'Kept in this browser, never on our servers.'}</div>
        </div>
        <div className="libbtns">
          <button type="button" className="try" onClick={() => fileRef.current?.click()}>
            Import
          </button>
          <button type="button" className="try" disabled={list.length === 0} onClick={() => download('crx-sniffer-library.json', serialise(list))}>
            Back up
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
      </div>
      {message ? (
        <p className={message.bad ? 'error' : 'note'} role="status">
          {message.text}
        </p>
      ) : null}

      <div className="libcols">
        <section className="card libcard" aria-label="Saved extensions">
          {ready && rows.length === 0 ? (
            <div className="empty">
              <LabArt art={dozedOff} size={3.5} />
              <p>
                Nothing here yet. <Link href="/">Check an extension</Link> to add it.
              </p>
            </div>
          ) : (
            <>
              <div className="libbar">
                <span>
                  {rows.length} {rows.length === 1 ? 'extension' : 'extensions'}
                </span>
                <span>Newest first</span>
              </div>
              {rows.map((e) => (
                <Row key={keyOf(e)} entry={e} onRemove={() => update(remove(list, keyOf(e)))} />
              ))}
            </>
          )}
        </section>
        <PolicyCard list={list} />
      </div>

      <Foot spaced />
    </div>
  );
}

function Row({ entry: e, onRemove }: { entry: Entry; onRemove: () => void }) {
  const href = e.store ? `/?q=${encodeURIComponent(`${e.store}:${e.id}`)}` : null;
  const line = entryLine(e);
  return (
    <div className="lib">
      {/* The icon is a data URL saved with the decision; next/image adds nothing for it. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {e.icon ? <img className="ico" src={e.icon} alt="" /> : <span className="ico letter" aria-hidden="true">{e.name.charAt(0).toUpperCase()}</span>}
      <div className="who">
        <div className="nm">{href ? <Link href={href}>{e.name}</Link> : e.name}</div>
        <div className="why" title={line}>
          {line}
        </div>
      </div>
      <span className={e.decision === 'approved' ? 'tag k1' : 'tag k5'}>{e.decision === 'approved' ? 'Approved' : 'Denied'}</span>
      <span className="when hide-sm">{day(e.date, true)}</span>
      <button type="button" className="x" onClick={onRemove} aria-label={`Remove ${e.name}`} title="Remove">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  );
}

function PolicyCard({ list }: { list: Entry[] }) {
  const [browser, setBrowser] = useState<Browser>('chrome');
  const [blockAll, setBlockAll] = useState(true);
  const [protect, setProtect] = useState(false);
  const [showFile, setShowFile] = useState(false);
  const [copied, setCopied] = useState(false);

  // Chrome and Edge read the same ExtensionSettings policy, so they share one file.
  const kind: PolicyBrowser = browser === 'firefox' ? 'firefox' : 'chromium';
  const opts = { blockAll, protect };
  const json = JSON.stringify(kind === 'chromium' ? chromiumPolicy(list, opts) : firefoxPolicy(list, opts), null, 2);
  const fileName = kind === 'chromium' ? 'ExtensionSettings.json' : 'policies.json';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <aside className="card policy" aria-label="Policy file">
      <h2 className="ctitle">Policy file</h2>
      <div className="seg" role="group" aria-label="Browser">
        {BROWSERS.map((b) => (
          <button key={b.id} type="button" className={browser === b.id ? 'on' : ''} aria-pressed={browser === b.id} onClick={() => setBrowser(b.id)}>
            {b.label}
          </button>
        ))}
      </div>
      <div className="opts">
        <label className="opt">
          <span>Block everything not approved</span>
          <input type="checkbox" role="switch" className="switch" checked={blockAll} onChange={() => setBlockAll((v) => !v)} />
        </label>
        <label className="opt">
          <span>Keep extensions off sign-in and mail pages</span>
          <input type="checkbox" role="switch" className="switch" checked={protect} onChange={() => setProtect((v) => !v)} />
        </label>
      </div>
      <div className="plain">
        <div className="k">In plain words</div>
        {plainWords(list, kind, opts)}
      </div>
      <button type="button" className="btn wide" onClick={() => download(fileName, `${json}\n`)}>
        Download policy file
      </button>
      <div className="plinks">
        <button type="button" className="linkbtn" aria-expanded={showFile} onClick={() => setShowFile((v) => !v)}>
          {showFile ? 'Hide the file' : 'Show the file'}
        </button>
        <button type="button" className="linkbtn" onClick={() => void copy()}>
          {copied ? 'Copied' : 'Copy'}
        </button>
        <a href={DEPLOY_HELP[browser]} rel="noopener noreferrer" target="_blank">
          How to deploy it
        </a>
      </div>
      {showFile ? (
        <pre className="code" aria-label={fileName}>
          {json}
        </pre>
      ) : null}
    </aside>
  );
}
