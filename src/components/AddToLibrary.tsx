'use client';

import type { Report } from '@/lib/engine/types';
import { reportSummary } from '@/lib/ui/format';
import { keyOf, remove, upsert } from '@/lib/ui/list';
import { useList } from '@/lib/ui/useList';

/** One button: add the extension to the library, update an older saved version, or take it out again. */
export function AddToLibrary({ report }: { report: Report }) {
  const { list, ready, update } = useList();
  if (!ready || !report.id || !report.package) return null;
  const { id, package: pkg } = report;
  const key = keyOf({ store: report.store, id });
  const saved = list.find((e) => keyOf(e) === key);
  const current = saved?.version === pkg.version;

  const add = () =>
    update(
      upsert(list, {
        store: report.store,
        id,
        name: pkg.name,
        version: pkg.version,
        icon: pkg.icon,
        summary: reportSummary(report),
        date: new Date().toISOString().slice(0, 10),
        rulesVersion: report.rulesVersion,
        publisher: report.listing?.publisher.name ?? null,
      }),
    );

  if (current) {
    return (
      <button type="button" className="addlib on" aria-pressed="true" title="Remove from library" onClick={() => update(remove(list, key))}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <path d="M5 12l5 5 9-10" />
        </svg>
        In library
      </button>
    );
  }
  return (
    <span className="addwrap">
      {saved ? <span className="vwhy">v{saved.version} saved</span> : null}
      <button type="button" className="addlib" onClick={add}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
        {saved ? 'Update' : 'Library'}
      </button>
    </span>
  );
}
