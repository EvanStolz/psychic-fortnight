import { describe, expect, it } from 'vitest';
import { Tally } from './findings';
import type { VerdictInput } from './verdict';
import { decide } from './verdict';

function tally(points: number[]) {
  const t = new Tally();
  points.forEach((p, i) => t.add(`r${i}`, p, `Rule ${i}`));
  return t;
}

const clean = (): VerdictInput => ({
  capability: { tally: tally([30, 15]), gaps: [] },
  code: { tally: tally([5]), gaps: [] },
  reputation: { tally: tally([]), gaps: [] },
  hardFails: [],
  unknown: [],
});

describe('verdict', () => {
  it('approves High capability when everything else is Low', () => {
    const r = decide(clean());
    expect(r.verdict).toBe('approve');
    expect(r.reasons).toEqual(['Capability High, all else Low']);
    expect(r.axes.capability).toMatchObject({ points: 45, tier: 'high', status: 'scored' });
    expect(r.axes.change).toMatchObject({ status: 'first-review', tier: null });
  });

  it('sends Critical capability or a Medium axis to review', () => {
    expect(decide({ ...clean(), capability: { tally: tally([61]), gaps: [] } }).reasons).toEqual(['Capability Critical']);
    expect(decide({ ...clean(), code: { tally: tally([10]), gaps: [] } }).reasons).toEqual(['Code Medium']);
  });

  it('denies a Critical code or reputation axis and any hard fail', () => {
    expect(decide({ ...clean(), reputation: { tally: tally([60]), gaps: [] } }).verdict).toBe('deny');
    const r = decide({ ...clean(), hardFails: [{ rule: 'remote-code', label: 'Runs code it downloads', detail: '' }] });
    expect(r).toMatchObject({ verdict: 'deny', reasons: ['Runs code it downloads'] });
  });

  it('never scores a check that did not run as zero: it goes to review', () => {
    const r = decide({ ...clean(), reputation: { tally: tally([]), gaps: ['Malware list did not load'], none: true } });
    expect(r.verdict).toBe('review');
    expect(r.axes.reputation).toMatchObject({ status: 'not-analysed', tier: null });
    expect(r.reasons).toEqual(['Reputation not analysed']);
    const partial = decide({ ...clean(), code: { tally: tally([]), gaps: ['1 script could not be read: a.js'] } });
    expect(partial.reasons).toEqual(['1 script could not be read: a.js']);
  });

  it('sends unknown permissions to review', () => {
    expect(decide({ ...clean(), unknown: ['newThing'] }).reasons).toEqual(['Unknown permission: newThing']);
  });
});
