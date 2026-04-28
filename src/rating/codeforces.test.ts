import { describe, expect, test } from 'bun:test';
import type { ContestStandings, RatedUser } from '../codeforces/api';
import { isPredictionEligible, predictFromCodeforces } from './codeforces';

describe('predictFromCodeforces', () => {
  test('filters high-rated users from educational rounds', () => {
    const standings = makeStandings('Educational Codeforces Round 1', [
      ['low', 3, 10],
      ['high', 2, 20],
      ['unrated', 1, 30],
    ]);
    const ratedUsers: RatedUser[] = [
      { handle: 'low', rating: 2099 },
      { handle: 'high', rating: 2100 },
    ];

    const result = predictFromCodeforces(standings, ratedUsers);

    expect(result.map((prediction) => prediction.handle).sort()).toEqual(['low', 'unrated']);
  });

  test('keeps high-rated users in regular rounds', () => {
    const standings = makeStandings('Codeforces Round 1', [
      ['low', 3, 10],
      ['high', 2, 20],
      ['unrated', 1, 30],
    ]);
    const ratedUsers: RatedUser[] = [
      { handle: 'low', rating: 2099 },
      { handle: 'high', rating: 2100 },
    ];

    const result = predictFromCodeforces(standings, ratedUsers);

    expect(result.map((prediction) => prediction.handle).sort()).toEqual(['high', 'low', 'unrated']);
  });
});

describe('isPredictionEligible', () => {
  test('rejects contests that are explicitly unrated by name', () => {
    const standings = makeStandings('Codeforces Round 1 (unrated)', [['tourist', 1, 1]]);

    expect(isPredictionEligible(standings)).toBe(false);
  });

  test('rejects team contests', () => {
    const standings = makeStandings('Codeforces Round 1', [['team', 1, 1]], { team: true });

    expect(isPredictionEligible(standings)).toBe(false);
  });

  test('rejects standings without contestants', () => {
    const standings = makeStandings('Codeforces Round 1', [], { participantType: 'PRACTICE' });

    expect(isPredictionEligible(standings)).toBe(false);
  });

  test('rejects old finished contests without final rating changes', () => {
    const standings = makeStandings('Codeforces Round 1', [['tourist', 1, 1]], {
      phase: 'FINISHED',
      startTimeSeconds: 1_000,
    });
    const fourDaysAfterEnd = (1_000 + standings.contest.durationSeconds) * 1000 + 4 * 24 * 60 * 60 * 1000;

    expect(isPredictionEligible(standings, fourDaysAfterEnd)).toBe(false);
  });

  test('allows recently finished contests while rating changes may still be pending', () => {
    const standings = makeStandings('Codeforces Round 1', [['tourist', 1, 1]], {
      phase: 'FINISHED',
      startTimeSeconds: 1_000,
    });
    const oneDayAfterEnd = (1_000 + standings.contest.durationSeconds) * 1000 + 24 * 60 * 60 * 1000;

    expect(isPredictionEligible(standings, oneDayAfterEnd)).toBe(true);
  });
});

function makeStandings(
  contestName: string,
  rows: Array<[handle: string, points: number, penalty: number]>,
  options: {
    participantType?: string;
    phase?: string;
    startTimeSeconds?: number;
    team?: boolean;
  } = {},
): ContestStandings {
  return {
    contest: {
      id: 1,
      name: contestName,
      type: 'CF',
      phase: options.phase ?? 'BEFORE',
      frozen: false,
      durationSeconds: 7200,
      startTimeSeconds: options.startTimeSeconds,
    },
    problems: [],
    rows: rows.map(([handle, points, penalty], index) => ({
      party: {
        participantType: options.participantType ?? 'CONTESTANT',
        teamId: options.team ? 1 : undefined,
        teamName: options.team ? 'team' : undefined,
        members: [{ handle }],
      },
      rank: index + 1,
      points,
      penalty,
    })),
  };
}
