import { describe, expect, test } from 'bun:test';
import { getNextRank, getRank } from './rank';

describe('rank helpers', () => {
  test('maps ratings to Codeforces ranks', () => {
    expect(getRank(null).abbr).toBe('U');
    expect(getRank(1199).abbr).toBe('N');
    expect(getRank(1200).abbr).toBe('P');
    expect(getRank(2099).abbr).toBe('CM');
    expect(getRank(2100).abbr).toBe('M');
    expect(getRank(3000).abbr).toBe('LGM');
  });

  test('finds the next rated rank', () => {
    expect(getNextRank(getRank(2099))?.abbr).toBe('M');
    expect(getNextRank(getRank(4000))).toBeNull();
  });
});
