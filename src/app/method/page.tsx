// The rules, rendered from the same tables the engine scores with, so this page cannot drift from the code.

import type { Metadata } from 'next';
import Link from 'next/link';
import { CAPABILITY_RULES, CODE_RULES, HARD_FAILS, LIBRARY_POINTS, PERMISSION_POINTS, REPUTATION_RULES, TIERS } from '@/lib/engine/rules';
import { RULES_VERSION } from '@/lib/engine/types';

export const metadata: Metadata = { title: 'Method · CRX Sniffer' };

type Row = [points: string, text: string];

/** Groups labels that score the same, highest first. */
function byPoints(items: { points: number; label: string }[]): Row[] {
  const groups = new Map<number, string[]>();
  for (const { points, label } of items) {
    const labels = groups.get(points) ?? [];
    if (!labels.includes(label)) labels.push(label);
    groups.set(points, labels);
  }
  return [...groups.entries()].sort((a, b) => b[0] - a[0]).map(([p, labels]) => [String(p), sentence(labels)]);
}

function sentence(labels: string[]): string {
  return labels.map((l, i) => (i === 0 ? l : l.charAt(0).toLowerCase() + l.slice(1))).join(', ');
}

function Rows({ rows }: { rows: Row[] }) {
  const half = Math.ceil(rows.length / 2);
  return (
    <div className="cols">
      {[rows.slice(0, half), rows.slice(half)].map((col, i) => (
        <div key={i}>
          {col.map(([p, text]) => (
            <div className="r" key={`${p}${text}`}>
              <span className={p === '?' ? 'p f4' : 'p'}>{p}</span>
              <span>{text}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

const range = (bounds: [number, number, number]) => [`0-${bounds[0]}`, `${bounds[0] + 1}-${bounds[1]}`, `${bounds[1] + 1}-${bounds[2]}`, `${bounds[2] + 1}+`];

export default function MethodPage() {
  const capability: Row[] = [
    ...byPoints([...Object.values(PERMISSION_POINTS).filter((p) => p.points > 0), ...Object.values(CAPABILITY_RULES)]),
    ['0', 'Storage, alarms, notifications, active tab, menus and other permissions with no reach'],
    ['?', 'Unknown permission goes to Review'],
  ];
  const libs = Object.values(LIBRARY_POINTS);
  const code: Row[] = [...byPoints(Object.values(CODE_RULES)), [`${Math.min(...libs)}-${Math.max(...libs)}`, 'Library with a known flaw, by its worst flaw']];

  return (
    <div className="wrap">
      <h1>Method</h1>
      <div className="meta">Rules v{RULES_VERSION}</div>

      <h2>Verdict</h2>
      <div className="r">
        <span className="p f5">Deny</span>
        <span>Any hard fail, or Code, Reputation or Change at Critical</span>
      </div>
      <div className="r">
        <span className="p f4">Review</span>
        <span>Capability at Critical, another axis at Medium or worse, or a check that couldn&apos;t run</span>
      </div>
      <div className="r">
        <span className="p f1">Approve</span>
        <span>Everything else</span>
      </div>

      <h2>Tiers</h2>
      {(
        [
          ['Capability', range(TIERS.capability)],
          ['Other axes', range(TIERS.other)],
        ] as const
      ).map(([k, r]) => (
        <div className="tiers" key={k}>
          <span className="k">{k}</span>
          {r.map((v, i) => (
            <span key={v} className={`f${i + 2}`}>
              {v}
            </span>
          ))}
        </div>
      ))}

      <h2>Hard fails</h2>
      <div className="cols">
        {[Object.values(HARD_FAILS).slice(0, 3), Object.values(HARD_FAILS).slice(3)].map((col, i) => (
          <div key={i}>
            {col.map((label) => (
              <div className="r" key={label}>
                <span className="p f5">Deny</span>
                <span>{label}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      <h2>
        Capability <span className="grey">optional permissions count half</span>
      </h2>
      <Rows rows={capability} />

      <h2>Code</h2>
      <Rows rows={code} />

      <h2>
        Reputation <span className="grey">users, ratings and badges never score</span>
      </h2>
      <Rows rows={byPoints(Object.values(REPUTATION_RULES))} />

      <h2>
        Change <span className="grey">coming later</span>
      </h2>
      <p className="note">Each check is a first review for now. Later versions compare against the version you approved.</p>

      <div className="foot spaced">
        <Link href="/">Back to Check</Link>
        <span>
          Lists: <a href="https://github.com/toborrm9/malicious_extension_sentry">Malicious Extension Sentry</a> (CC BY 4.0)
        </span>
        <span>
          Libraries: <a href="https://github.com/RetireJS/retire.js">retire.js</a>
        </span>
      </div>
    </div>
  );
}
