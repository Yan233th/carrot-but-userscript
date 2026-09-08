import { afterEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { fetchContestStandings, type ContestStandings } from './api';
import { predictFromCodeforces } from '../rating/codeforces';

const originalFetch = globalThis.fetch;

afterEach(() => {
  mock.restore();
  globalThis.fetch = originalFetch;
});

describe('fetchContestStandings', () => {
  test('does not return or cache incomplete CF standings when hacks cannot be fetched', async () => {
    const contest = { id: 2252, name: 'Round', type: 'CF', phase: 'FINISHED', frozen: false, durationSeconds: 7200 };
    const set = mock(async () => true);
    spyOn(globalThis, 'fetch').mockImplementation((async (input) => {
      const method = new URL(String(input)).pathname;
      if (method.endsWith('/contest.standings')) {
        return Response.json({ status: 'FAILED', comment: 'You have to be authenticated' }, { status: 400 });
      }
      if (method.endsWith('/contest.hacks')) {
        throw new Error('Hack request failed');
      }
      return Response.json({ status: 'OK', result: [] });
    }) as typeof fetch);
    await expect(fetchContestStandings('2252', false, {
      get: async () => null, set,
    }, contest)).rejects.toThrow('Hack request failed');
    expect(set).not.toHaveBeenCalled();
  });

  test.each(['CF', 'ICPC'])('allows an empty hack list and only requests hacks for CF (%s)', async (type) => {
    const contest = { id: 2252, name: 'Round', type, phase: 'FINISHED', frozen: false, durationSeconds: 7200 };
    const requests: string[] = [];
    spyOn(globalThis, 'fetch').mockImplementation((async (input) => {
      const method = new URL(String(input)).pathname;
      requests.push(method);
      return method.endsWith('/contest.standings')
        ? Response.json({ status: 'FAILED', comment: 'You have to be authenticated' }, { status: 400 })
        : Response.json({ status: 'OK', result: [] });
    }) as typeof fetch);
    const set = mock(async () => true);
    const result = await fetchContestStandings('2252', false, { get: async () => null, set }, contest);
    expect(result.source).toBe('status-rebuild');
    expect(result.hacks).toBe(0);
    expect(result.cacheStored).toBe(true);
    expect(set).toHaveBeenCalledTimes(1);
    expect(requests.includes('/api/contest.hacks')).toBe(type === 'CF');
  });

  test('drops unused API row fields before caching without changing predictions', async () => {
    const raw = {
      contest: { id: 2252, name: 'Round', type: 'CF', phase: 'CODING', frozen: false, durationSeconds: 7200 },
      problems: [],
      rows: ['first', 'second', 'third'].map((handle, index) => ({
        party: {
          participantType: 'CONTESTANT', members: [{ handle, name: 'unused' }],
          startTimeSeconds: 1, room: 1, ghost: false,
        },
        rank: index + 1, points: 1000 - index * 100, penalty: 0,
        successfulHackCount: 0, unsuccessfulHackCount: 0,
        problemResults: [{ points: 1000, rejectedAttemptCount: 0, type: 'FINAL' }],
      })),
    };
    let stored: ContestStandings | undefined;
    spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ status: 'OK', result: raw }));
    const result = await fetchContestStandings('2252', false, {
      get: async () => null,
      set: async (_id, _gym, value) => { stored = value.standings; return true; },
    });
    expect(result.cacheStored).toBe(true);
    expect(stored).toEqual(result.standings);
    expect(result.standings.rows[0]).toEqual({
      party: { participantType: 'CONTESTANT', members: [{ handle: 'first' }], teamId: undefined, teamName: undefined },
      rank: 1, points: 1000, penalty: 0,
    });
    const users = raw.rows.map((row, index) => ({ handle: row.party.members[0]!.handle, rating: 1600 + index * 100 }));
    expect(predictFromCodeforces(result.standings, users)).toEqual(predictFromCodeforces(raw, users));
  });

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
