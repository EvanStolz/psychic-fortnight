'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { Report } from '@/lib/engine/types';
import { Foot } from './Nav';
import { ReportView } from './ReportView';

const EXAMPLES = [
  { label: 'Dark Reader', q: 'chromewebstore.google.com/detail/eimadpbcbfnmbkopoojfekhnkhdbieeh' },
  { label: 'Grammarly', q: 'chromewebstore.google.com/detail/kbfnbcaeplbcioakkpcpgfkobkghlhen' },
  { label: 'Urban VPN', q: 'chromewebstore.google.com/detail/eppiocemhmnlbhjplcgkofciiegomcon' },
  { label: 'uBlock Origin', q: 'https://addons.mozilla.org/firefox/addon/ublock-origin/' },
];

type State = { kind: 'idle' } | { kind: 'loading'; what: string } | { kind: 'error'; message: string } | { kind: 'done'; report: Report };

function isReport(v: unknown): v is Report {
  return typeof v === 'object' && v !== null && 'verdict' in v && 'axes' in v;
}

export function Check() {
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const q = params.get('q') ?? '';
  const [input, setInput] = useState(q);
  const [state, setState] = useState<State>({ kind: 'idle' });
  const fileRef = useRef<HTMLInputElement>(null);
  const run = useRef(0);

  // The query in the address bar drives the lookup, so a result can be shared as a link.
  useEffect(() => {
    if (!q) return;
    const ticket = ++run.current;
    const controller = new AbortController();
    void (async () => {
      setState({ kind: 'loading', what: 'Checking' });
      try {
        const res = await fetch(`/api/check?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        const body: unknown = await res.json().catch(() => null);
        if (ticket !== run.current) return;
        if (res.ok && isReport(body)) setState({ kind: 'done', report: body });
        else setState({ kind: 'error', message: errorText(body, res.status) });
      } catch (e) {
        if (ticket === run.current && !(e instanceof DOMException && e.name === 'AbortError')) {
          setState({ kind: 'error', message: 'The check could not reach the server.' });
        }
      }
    })();
    return () => controller.abort();
  }, [q]);

  const submit = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setInput(trimmed);
    router.replace(`${path}?q=${encodeURIComponent(trimmed)}`, { scroll: false });
  };

  const upload = async (file: File) => {
    const ticket = ++run.current;
    router.replace(path, { scroll: false });
    setInput('');
    setState({ kind: 'loading', what: `Reading ${file.name}` });
    try {
      const { analyseUpload } = await import('@/lib/ui/upload');
      const report = await analyseUpload(file);
      if (ticket === run.current) setState({ kind: 'done', report });
    } catch (e) {
      if (ticket === run.current) setState({ kind: 'error', message: e instanceof Error ? e.message : 'That file could not be read.' });
    }
  };

  return (
    <div className="wrap">
      <form
        className="search"
        aria-label="Check an extension"
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
      >
        <label htmlFor="q" className="sr">
          Store link or extension ID
        </label>
        <input
          id="q"
          className="input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Store link or extension ID"
          autoComplete="off"
          spellCheck={false}
        />
        <button type="submit" className="btn" disabled={state.kind === 'loading'}>
          Check
        </button>
        <button type="button" className="btn ghost" onClick={() => fileRef.current?.click()}>
          Open file
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".crx,.zip,.xpi"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) void upload(file);
          }}
        />
      </form>
      <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', marginTop: 6, alignItems: 'center' }}>
        <span className="muted" style={{ fontSize: 13, marginRight: 4 }}>
          Try
        </span>
        {EXAMPLES.map((e) => (
          <button key={e.label} type="button" className={q === e.q ? 'ex on' : 'ex'} onClick={() => submit(e.q)}>
            {e.label}
          </button>
        ))}
      </div>

      {state.kind === 'loading' ? (
        <p className="note" role="status">
          {state.what}…
        </p>
      ) : null}
      {state.kind === 'error' ? (
        <p className="error" role="alert">
          {state.message}
        </p>
      ) : null}
      {state.kind === 'done' ? <ReportView key={`${state.report.id}:${state.report.package?.version}`} report={state.report} /> : null}

      <Foot spaced={state.kind !== 'done'} extra="Your list stays in this browser. Uploaded files never leave it." />
    </div>
  );
}

function errorText(body: unknown, status: number): string {
  if (typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string') return body.error;
  if (status === 429) return 'Too many checks in a short time. Try again in a minute.';
  return 'The check failed. Try again in a moment.';
}
