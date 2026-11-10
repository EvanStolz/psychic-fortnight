// Turns axis points into tiers and the tiers into one verdict. The worst axis wins; hard fails always deny.

import type { Tally } from './findings';
import { tierFor } from './rules';
import type { Axis, AxisName, HardFail, Tier, VerdictName } from './types';

export interface AxisInput {
  tally: Tally;
  /** Checks on this axis that could not run, in words for the reviewer. */
  gaps: string[];
  /** True when no check on this axis ran at all. */
  none?: boolean;
}

export interface VerdictInput {
  capability: AxisInput;
  code: AxisInput;
  reputation: AxisInput;
  hardFails: HardFail[];
  /** Permissions the rules do not know yet. */
  unknown: string[];
}

export interface VerdictResult {
  verdict: VerdictName;
  reasons: string[];
  axes: Record<AxisName, Axis>;
}

const TIER_RANK: Record<Tier, number> = { low: 0, medium: 1, high: 2, critical: 3 };
const TIER_LABEL: Record<Tier, string> = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' };
const AXIS_LABEL: Record<AxisName, string> = { capability: 'Capability', code: 'Code', reputation: 'Reputation', change: 'Change' };

export function buildAxis(name: AxisName, input: AxisInput): Axis {
  const points = input.tally.total();
  const status: Axis['status'] = input.none ? 'not-analysed' : input.gaps.length > 0 ? 'partial' : 'scored';
  return {
    name,
    status,
    points,
    tier: status === 'not-analysed' ? null : tierFor(points, name === 'capability'),
    findings: input.tally.findings(),
    gaps: input.gaps,
  };
}

export function decide(input: VerdictInput): VerdictResult {
  const axes: Record<AxisName, Axis> = {
    capability: buildAxis('capability', input.capability),
    code: buildAxis('code', input.code),
    reputation: buildAxis('reputation', input.reputation),
    change: { name: 'change', status: 'first-review', points: 0, tier: null, findings: [], gaps: [] },
  };

  const deny: string[] = input.hardFails.map((f) => f.label);
  const review: string[] = [];
  for (const axis of [axes.capability, axes.code, axes.reputation]) {
    const rank = axis.tier ? TIER_RANK[axis.tier] : -1;
    const line = `${AXIS_LABEL[axis.name]} ${axis.tier ? TIER_LABEL[axis.tier] : ''}`;
    if (axis.name !== 'capability' && rank === TIER_RANK.critical) deny.push(line);
    // Broad reach alone is normal for useful extensions, so Capability asks for review only at Critical.
    else if (axis.name === 'capability' ? rank === TIER_RANK.critical : rank >= TIER_RANK.medium) review.push(line);
    if (axis.status === 'not-analysed') review.push(`${AXIS_LABEL[axis.name]} not analysed`);
    else if (axis.status === 'partial') review.push(...axis.gaps);
  }
  if (input.unknown.length > 0) {
    review.push(`Unknown permission${input.unknown.length > 1 ? 's' : ''}: ${input.unknown.join(', ')}`);
  }

  if (deny.length > 0) return { verdict: 'deny', reasons: deny, axes };
  if (review.length > 0) return { verdict: 'review', reasons: review, axes };
  const raised = [axes.capability, axes.code, axes.reputation].filter((a) => a.tier && a.tier !== 'low');
  const summary = raised.map((a) => `${AXIS_LABEL[a.name]} ${a.tier ? TIER_LABEL[a.tier] : ''}`).join(', ');
  return { verdict: 'approve', reasons: [raised.length > 0 ? `${summary}, all else Low` : 'All axes Low'], axes };
}
