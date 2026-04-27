import { describe, expect, test } from 'bun:test';
import { getStandingsPage } from './page';

describe('getStandingsPage', () => {
  test('matches contest standings root', () => {
    const page = getStandingsPage(new URL('https://codeforces.com/contest/2127/standings') as unknown as Location);
    expect(page).toEqual({ contestId: '2127' });
  });

  test('matches friends standings', () => {
    const page = getStandingsPage(new URL('https://codeforces.com/contest/2127/standings/friends/true') as unknown as Location);
    expect(page).toEqual({ contestId: '2127' });
  });

  test('matches gym standings', () => {
    const page = getStandingsPage(new URL('https://codeforces.com/gym/105001/standings') as unknown as Location);
    expect(page).toEqual({ contestId: '105001' });
  });

  test('ignores non-standings pages', () => {
    const page = getStandingsPage(new URL('https://codeforces.com/contest/2127/problem/A') as unknown as Location);
    expect(page).toBeNull();
  });
});
