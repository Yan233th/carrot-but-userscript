import { describe, expect, test } from 'bun:test';
import type { ContestStandings, RatedUser } from '../codeforces/api';
import { predictFromCodeforces } from './codeforces';

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

function makeStandings(
  contestName: string,
  rows: Array<[handle: string, points: number, penalty: number]>,
): ContestStandings {
  return {
    contest: {
      id: 1,
      name: contestName,
      type: 'CF',
      phase: 'FINISHED',
      frozen: false,
      durationSeconds: 7200,
    },
    problems: [],
    rows: rows.map(([handle, points, penalty], index) => ({
      party: {
        participantType: 'CONTESTANT',
        members: [{ handle }],
      },
      rank: index + 1,
      points,
      penalty,
    })),
  };
}
