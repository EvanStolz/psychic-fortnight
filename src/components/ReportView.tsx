'use client';

import { Fragment, useState } from 'react';
import type { Axis, Report } from '@/lib/engine/types';
import { AXIS_NAME, axisNotes, axisSummary, compact, day, metaLine, thousands, TIER_NAME, tierFill, verdictFill, verdictName, verdictWhy } from '@/lib/ui/format';
import { Decide } from './Decide';

const ORDER: Axis['name'][] = ['capability', 'code', 'reputation', 'change'];

export function ReportView({ report }: { report: Report }) {
  const [open, setOpen] = useState<Partial<Record<Axis['name'], boolean>>>({});
  const [deciding, setDeciding] = useState<'approved' | 'denied' | null>(null);
  const pkg = report.package;

  return (
    <>
      {report.hardFails.length > 0 ? (
        <>
          <h2>Hard fail</h2>
          {report.hardFails.map((f) => (
            <div className="hard" key={f.rule}>
              <span className="cell f5">Deny</span>
              <span>
                {f.label}. {f.detail}{' '}
                {f.source ? (
                  <a href={f.source} rel="noopener noreferrer" target="_blank">
                    Source
                  </a>
                ) : null}
              </span>
            </div>
          ))}
        </>
      ) : null}

      <div className="top">
        {/* The icon is a data URL from the package itself; next/image adds nothing for it. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {pkg?.icon ? <img className="logo" src={pkg.icon} alt="" /> : <span className="logo blank" />}
        <div>
          <h1>{pkg?.name ?? report.listing?.name ?? report.id ?? 'Unreadable package'}</h1>
          <div className="meta">{metaLine(report)}</div>
        </div>
        <div className="vbox">
          <div className={`verdict ${verdictFill(report.verdict)}`}>{verdictName(report.verdict)}</div>
          <div className="vwhy">{verdictWhy(report)}</div>
          <Decide.Links report={report} onPick={setDeciding} />
        </div>
      </div>
      {deciding ? <Decide.Form report={report} decision={deciding} onDone={() => setDeciding(null)} /> : null}

      <div className="axes">
        {ORDER.map((name) => {
          const axis = report.axes[name];
          const notes = axisNotes(axis);
          const expandable = axis.findings.length > 0 || notes.length > 0;
          const isOpen = expandable && !!open[name];
          const fill = tierFill(axis.tier);
          return (
            <Fragment key={name}>
              <button
                type="button"
                className={!expandable ? 'ax flat' : isOpen ? 'ax open' : 'ax'}
                onClick={() => expandable && setOpen((o) => ({ ...o, [name]: !o[name] }))}
                aria-expanded={expandable ? isOpen : undefined}
              >
                <span className="name">{AXIS_NAME[name]}</span>
                <span className={`tier cell ${fill}`}>{axis.tier ? TIER_NAME[axis.tier] : '-'}</span>
                <span className={`pts cell ${fill}`}>{axis.status === 'not-analysed' || axis.status === 'first-review' ? '-' : axis.points}</span>
                <span className="sum">{axisSummary(axis, report)}</span>
                <span className="chev" aria-hidden="true">
                  {!expandable ? '' : isOpen ? '−' : '+'}
                </span>
              </button>
              {isOpen ? (
                <div className="detail">
                  {axis.findings.map((f) => (
                    <div className="li" key={f.rule}>
                      <span className="n">{f.points}</span>
                      <span className="l">{f.label}</span>
                    </div>
                  ))}
                  {axis.findings.length > 0 ? (
                    <div className="li total">
                      <span className={`n ${fill}`}>{axis.points}</span>
                      <span className="l">Total</span>
                    </div>
                  ) : null}
                  {notes.map((n) => (
                    <div className="where" key={n}>
                      {n}
                    </div>
                  ))}
                </div>
              ) : null}
            </Fragment>
          );
        })}
      </div>

      <h2>
        Store listing <span className="grey">not scored</span>
      </h2>
      {report.listing ? (
        <div className="strip">
          <Fig k="Users" v={report.listing.users === null ? '-' : thousands(report.listing.users)} />
          <Fig
            k="Rating"
            v={report.listing.rating === null ? '-' : `${report.listing.rating.toFixed(1)}${report.listing.ratingCount ? ` (${compact(report.listing.ratingCount)})` : ''}`}
          />
          <Fig k="Updated" v={report.listing.updated ? day(report.listing.updated) : '-'} />
          <Fig k="Publisher" v={report.listing.publisher.name ?? 'none listed'} />
        </div>
      ) : (
        <p className="note">{report.axes.reputation.gaps.find((g) => g.startsWith('Store listing')) ?? 'Not listed in a store.'}</p>
      )}
      {report.listing ? (
        <div className="foot">
          <a href={report.listing.url} rel="noopener noreferrer" target="_blank">
            Open listing
          </a>
          {report.listing.publisher.website ? (
            <a href={report.listing.publisher.website} rel="noopener noreferrer nofollow" target="_blank">
              Publisher website
            </a>
          ) : null}
          {report.listing.privacyPolicy ? (
            <a href={report.listing.privacyPolicy} rel="noopener noreferrer nofollow" target="_blank">
              Privacy policy
            </a>
          ) : null}
        </div>
      ) : null}

      <div className="legend">
        <span>Tier</span>
        <span className="c f2">Low</span>
        <span className="c f3">Medium</span>
        <span className="c f4">High</span>
        <span className="c f5">Critical</span>
      </div>
    </>
  );
}

function Fig({ k, v }: { k: string; v: string }) {
  return (
    <div className="fig">
      <div className="k">{k}</div>
      <div className="v" title={v}>
        {v}
      </div>
    </div>
  );
}
