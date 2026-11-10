// Turns a report into the short strings the pages show.

import { tierFor } from '@/lib/engine/rules';
import type { Axis, Report, Store, Tier } from '@/lib/engine/types';
import type { Entry } from './list';

export const STORE_NAME: Record<Store, string> = { chrome: 'Chrome', edge: 'Edge', firefox: 'Firefox' };
export const TIER_NAME: Record<Tier, string> = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' };
export const AXIS_NAME: Record<Axis['name'], string> = { capability: 'Capability', code: 'Code', reputation: 'Reputation', change: 'Change' };

/** Background class for a tier, from the five-step scale. Used only for small marks: dots and bar segments. */
export function tierFill(tier: Tier | null): string {
  return tier === 'low' ? 'f2' : tier === 'medium' ? 'f3' : tier === 'high' ? 'f4' : tier === 'critical' ? 'f5' : 'nofill';
}

/** Text color class for a tier word. */
export function tierText(tier: Tier | null): string {
  return tier === 'low' ? 't2' : tier === 'medium' ? 't3' : tier === 'high' ? 't4' : tier === 'critical' ? 't5' : 'muted';
}

/** How many of the four bar segments a tier fills. */
export const TIER_STEPS: Record<Tier, number> = { low: 1, medium: 2, high: 3, critical: 4 };

/**
 * The tier a single finding's points would earn on its own axis. Findings carry no severity of their own, so a
 * finding's dot uses the same thresholds as the axis total. Zero or fewer points earn no tier.
 */
export function findingTier(points: number, axis: Axis['name']): Tier | null {
  return points > 0 ? tierFor(points, axis === 'capability') : null;
}

/** Tinted tag class for a verdict. */
export function verdictTone(verdict: Report['verdict']): string {
  return verdict === 'approve' ? 'k1' : verdict === 'review' ? 'k4' : 'k5';
}

export function verdictName(verdict: Report['verdict']): string {
  return verdict === 'approve' ? 'Approve' : verdict === 'review' ? 'Review' : 'Deny';
}

export function megabytes(bytes: number): string {
  const mb = bytes / 1024 / 1024;
  return `${mb < 10 ? mb.toFixed(2) : mb.toFixed(1)} MB`;
}

export function thousands(n: number): string {
  return n.toLocaleString('en-US');
}

/** "13300" as "13.3K", for rating counts. */
export function compact(n: number): string {
  if (n >= 1e6) return `${trim(n / 1e6)}M`;
  if (n >= 1e3) return `${trim(n / 1e3)}K`;
  return String(n);
}

function trim(n: number): string {
  return n >= 100 ? n.toFixed(0) : n.toFixed(1).replace(/\.0$/, '');
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-11-06" as "Nov 6, 2026"; with `short`, "Nov 6". */
export function day(iso: string, short = false): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m?.[1] || !m[2] || !m[3]) return iso;
  const month = MONTHS[Number(m[2]) - 1] ?? m[2];
  return short ? `${month} ${Number(m[3])}` : `${month} ${Number(m[3])}, ${m[1]}`;
}

/** The grey line under the title: store, version, size, files. */
export function metaLine(report: Report): string {
  const parts = [report.store ? STORE_NAME[report.store] : 'Upload'];
  if (report.package) {
    parts.push(`v${report.package.version}`, megabytes(report.package.bytes), `${thousands(report.package.files)} files`);
  }
  return parts.join(' · ');
}

/** What the verdict tag's small line says. A hard fail is explained in its own section above. */
export function verdictWhy(report: Report): string {
  if (report.hardFails.length > 0) return report.hardFails.length === 1 ? 'Hard fail' : `${report.hardFails.length} hard fails`;
  return report.reasons.join(', ');
}

/** The collapsed row's summary: the first findings, or what was checked when nothing was found. */
export function axisSummary(axis: Axis, report: Report): string {
  if (axis.status === 'first-review') return 'First review, nothing to compare yet';
  if (axis.status === 'not-analysed') return axis.gaps[0] ?? 'Not analysed';
  if (axis.findings.length > 0) {
    const labels = axis.findings.map((f) => f.label);
    const head = labels.slice(0, 2).join(', ');
    return labels.length > 2 ? `${head}, +${labels.length - 2} more` : head;
  }
  if (axis.gaps.length > 0) return axis.gaps[0] ?? '';
  if (axis.name === 'capability') return 'No permissions that reach pages or data';
  if (axis.name === 'code') return `Nothing found in ${thousands(report.package?.scripts ?? 0)} scripts`;
  return reputationClean(report);
}

function reputationClean(report: Report): string {
  const parts = ['Not on any list'];
  const p = report.listing?.publisher;
  if (p?.trader) parts.push('trader');
  if (p?.email) parts.push('own-domain email');
  if (report.listing?.hasPrivacyPolicy) parts.push('privacy policy');
  return parts.join(', ');
}

/** Evidence lines for an open row: where each finding came from, then checks that could not run. */
export function axisNotes(axis: Axis): string[] {
  const notes = axis.findings.filter((f) => f.where.length > 0).map((f) => `${f.label}: ${f.where.join(', ')}`);
  return [...notes, ...axis.gaps];
}

/** What a library row says about a decision: the engine's summary, then the reviewer's own reason if any. */
export function decisionSummary(report: Report): string {
  return report.hardFails.length > 0 ? report.hardFails.map((f) => f.label).join(', ') : report.reasons.join(', ');
}

export function entryLine(e: Entry): string {
  const summary = e.summary || `${verdictName(e.verdict)} verdict`;
  return e.reason ? `${summary} · ${e.reason}` : summary;
}

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

function word(n: number): string {
  return WORDS[n] ?? thousands(n);
}

/** "Two approved, one denied. Kept in this browser, never on our servers." */
export function libraryCount(list: Entry[]): string {
  const approved = list.filter((e) => e.decision === 'approved').length;
  const denied = list.length - approved;
  const parts = [approved > 0 ? `${word(approved)} approved` : '', denied > 0 ? `${word(denied)} denied` : ''].filter(Boolean);
  const head = parts.length > 0 ? parts.join(', ') : 'nothing saved yet';
  return `${head.charAt(0).toUpperCase()}${head.slice(1)}. Kept in this browser, never on our servers.`;
}
