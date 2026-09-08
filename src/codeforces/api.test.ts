import { afterEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { fetchContestStandings, type ContestStandings } from './api';

const originalFetch = globalThis.fetch;

afterEach(() => {
  mock.restore();
  globalThis.fetch = originalFetch;
});

describe('fetchContestStandings', () => {
  test('returns usable API data when browser storage cannot save it', async () => {
    const standings: ContestStandings = {
      contest: { id: 2252, name: 'Round', type: 'CF', phase: 'FINISHED', frozen: false, durationSeconds: 7200 },
      problems: [], rows: [],
    };
    const fetch = spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ status: 'OK', result: standings }));
    const result = await fetchContestStandings('2252', false, {
      get: async () => null,
      set: async () => false,
    });
    expect(result.source).toBe('api');
    expect(result.cacheStored).toBe(false);
    expect(result.standings).toEqual(standings);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  test('requests non-gym standings with only the contestId parameter', async () => {
    let requestedUrl = '';
    const standings: ContestStandings = {
      contest: {
        id: 2248,
        name: 'Codeforces Round 1113 (Div. 2)',
        type: 'CF',
        phase: 'FINISHED',
        frozen: false,
        durationSeconds: 9000,
      },
      problems: [],
      rows: [],
    };

    globalThis.fetch = (async (input) => {
      requestedUrl = input instanceof Request ? input.url : String(input);
      return Response.json({ status: 'OK', result: standings });
    }) as typeof fetch;

    await fetchContestStandings('2248', false);

    const url = new URL(requestedUrl);
    expect(url.pathname).toBe('/api/contest.standings');
    expect(Array.from(url.searchParams.entries())).toEqual([
      ['contestId', '2248'],
    ]);
  });
});
