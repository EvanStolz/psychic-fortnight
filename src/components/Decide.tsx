'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Report } from '@/lib/engine/types';
import { day, decisionSummary } from '@/lib/ui/format';
import type { Decision } from '@/lib/ui/list';
import { keyOf, remove, upsert } from '@/lib/ui/list';
import { useList } from '@/lib/ui/useList';

/** Compact Approve and Deny links under the verdict, or the decision already on the list. */
function Links({ report, onPick }: { report: Report; onPick: (d: Decision) => void }) {
  const { list, ready, update } = useList();
  if (!ready || !report.id || !report.package) return null;
  const key = keyOf({ store: report.store, id: report.id });
  const existing = list.find((e) => keyOf(e) === key);
  if (existing) {
    const stale = existing.version !== report.package.version;
    return (
      <div className="decide">
        <span>
          <Link href="/library">{existing.decision === 'approved' ? 'Approved' : 'Denied'}</Link> {day(existing.date, true)}
          {stale ? ` at v${existing.version}` : ''}
        </span>
        {stale ? (
          <>
            <button type="button" className="linkbtn" onClick={() => onPick('approved')}>
              Approve
            </button>
            <button type="button" className="linkbtn" onClick={() => onPick('denied')}>
              Deny
            </button>
          </>
        ) : (
          <button type="button" className="linkbtn" onClick={() => update(remove(list, key))}>
            Undo
          </button>
        )}
      </div>
    );
  }
  return (
    <div className="decide">
      <span>Add to library</span>
      <button type="button" className="linkbtn" onClick={() => onPick('approved')}>
        Approve
      </button>
      <button type="button" className="linkbtn" onClick={() => onPick('denied')}>
        Deny
      </button>
    </div>
  );
}

/** One line for the reason, then save. */
function Form({ report, decision, onDone }: { report: Report; decision: Decision; onDone: () => void }) {
  const { list, update } = useList();
  const [reason, setReason] = useState('');
  const [failed, setFailed] = useState(false);
  if (!report.id || !report.package) return null;
  const { id, package: pkg } = report;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = update(
      upsert(list, {
        store: report.store,
        id,
        name: pkg.name,
        version: pkg.version,
        icon: pkg.icon,
        decision,
        verdict: report.verdict,
        reason: reason.trim(),
        summary: decisionSummary(report),
        date: new Date().toISOString().slice(0, 10),
        rulesVersion: report.rulesVersion,
        publisher: report.listing?.publisher.name ?? null,
      }),
    );
    if (ok) onDone();
    else setFailed(true);
  };

  return (
    <form className="decide-form" onSubmit={submit}>
      <label htmlFor="reason" className="sr">
        Reason
      </label>
      <input id="reason" className="input" placeholder="Reason (optional)" value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} autoFocus />
      <button type="submit" className="btn">
        {decision === 'approved' ? 'Approve' : 'Deny'}
      </button>
      <button type="button" className="btn ghost" onClick={onDone}>
        Cancel
      </button>
      {failed ? <span className="error">This browser is blocking storage, so the library can&apos;t be saved.</span> : null}
    </form>
  );
}

export const Decide = { Links, Form };
