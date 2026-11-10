'use client';

import { useState } from 'react';
import { download } from '@/lib/ui/download';
import { chromiumPolicy, firefoxPolicy } from '@/lib/ui/policy';
import { useList } from '@/lib/ui/useList';
import { Foot } from './Nav';

type Browser = 'chromium' | 'firefox';

export function ExportView() {
  const { list } = useList();
  const [browser, setBrowser] = useState<Browser>('chromium');
  const [blockAll, setBlockAll] = useState(true);
  const [protect, setProtect] = useState(false);
  const [copied, setCopied] = useState(false);

  const opts = { blockAll, protect };
  const json = JSON.stringify(browser === 'chromium' ? chromiumPolicy(list, opts) : firefoxPolicy(list, opts), null, 2);
  const count = list.filter((e) => (browser === 'firefox' ? e.store === 'firefox' : e.store === 'chrome' || e.store === 'edge')).length;

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
    <div className="wrap">
      <h1>Export</h1>
      <div className="meta">Policy file for Chrome, Edge or Firefox</div>
      <div className="seg" role="group" aria-label="Browser">
        <button type="button" className={browser === 'chromium' ? 'on' : ''} aria-pressed={browser === 'chromium'} onClick={() => setBrowser('chromium')}>
          Chrome and Edge
        </button>
        <button type="button" className={browser === 'firefox' ? 'on' : ''} aria-pressed={browser === 'firefox'} onClick={() => setBrowser('firefox')}>
          Firefox
        </button>
      </div>

      <div className="grid">
        <div>
          <h2>Options</h2>
          <label className="opt">
            <input type="checkbox" checked={blockAll} onChange={() => setBlockAll((v) => !v)} />
            <span>Block everything not approved</span>
          </label>
          <label className="opt">
            <input type="checkbox" checked={protect} onChange={() => setProtect((v) => !v)} />
            <span>Keep extensions off sign-in and mail pages</span>
          </label>
          <p className="note">
            {browser === 'chromium'
              ? 'To pin a version, use the Google Admin console. This file can’t.'
              : 'Firefox applies the sign-in and mail rule to every extension.'}
          </p>
        </div>
        <div>
          <h2>
            {browser === 'chromium' ? 'ExtensionSettings' : 'policies.json'} <span className="grey">{count} from your list</span>
          </h2>
          <pre className="code">{json}</pre>
          <div className="btnrow" style={{ marginTop: 12 }}>
            <button type="button" className="btn" onClick={() => void copy()}>
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={() => download(browser === 'chromium' ? 'ExtensionSettings.json' : 'policies.json', `${json}\n`)}
            >
              Download
            </button>
          </div>
        </div>
      </div>

      <Foot spaced />
    </div>
  );
}
