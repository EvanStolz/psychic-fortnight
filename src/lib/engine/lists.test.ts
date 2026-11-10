import { describe, expect, it } from 'vitest';
import { Tally } from './findings';
import { checkLists, ListError, parseCsv, parseMalExt } from './lists';
import type { HardFail } from './types';

const CSV =
  '﻿extension_id,name,reason,source,insert_date_fmt,blocklist,store,version,sha256\n' +
  `aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa,"Bad, Inc",Malware,https://example.org/r,2026-11-08,,Google Chrome,1,${'ab'.repeat(32)}\n` +
  'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb,Shady,In store but Suspicious,Store Monitoring,2026-01-02,false,Google Chrome,1,\n' +
  'cccccccccccccccccccccccccccccccc,Gone,Policy Violation,Store Monitoring,2026-03-04,false,Google Chrome,1,\n';

function check(id: string | null, sha?: string) {
  const reputation = new Tally();
  const hardFails: HardFail[] = [];
  checkLists(parseMalExt(CSV), id, sha ?? null, reputation, hardFails);
  return { reputation: reputation.findings(), hardFails };
}

describe('MalExt list', () => {
  it('fails malware by ID or package hash', () => {
    expect(check('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa').hardFails).toEqual([
      { rule: 'malware', label: 'On a known-malware list', detail: 'MalExt Sentry lists it as malware.', source: 'https://example.org/r' },
    ]);
    expect(check(null, 'AB'.repeat(32)).hardFails).toHaveLength(1);
  });

  it('scores suspicious and removed entries on Reputation', () => {
    expect(check('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb').reputation).toEqual([
      { rule: 'listed-suspicious', points: 40, label: 'Listed suspicious', where: ['In store but Suspicious, listed 2026-01-02'] },
    ]);
    expect(check('cccccccccccccccccccccccccccccccc').reputation[0]).toMatchObject({ points: 60, label: 'Removed from the store' });
    expect(check('dddddddddddddddddddddddddddddddd')).toEqual({ reputation: [], hardFails: [] });
  });

  it('rejects a file without the expected columns', () => {
    expect(() => parseMalExt('id,name\nx,y\n')).toThrow(ListError);
  });

  it('parses quoted CSV fields', () => {
    expect(parseCsv('a,"b ""c""","d\ne"\r\n1,2,3')).toEqual([['a', 'b "c"', 'd\ne'], ['1', '2', '3']]);
  });
});
