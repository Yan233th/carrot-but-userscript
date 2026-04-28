import { describe, expect, test } from 'bun:test';
import {
  buildContestStandingsFromStatus,
  shouldRebuildContestStandings,
  type ContestHack,
  type ContestSubmission,
} from './contest-standings-rebuild';
import type { Contest, Party } from './api';

const cfContest: Contest = {
  id: 2226,
  name: 'Codeforces Round 1095 (Div. 2)',
  type: 'CF',
  phase: 'CODING',
  frozen: false,
  durationSeconds: 7200,
  startTimeSeconds: 1,
};

const icpcContest: Contest = {
  ...cfContest,
  type: 'ICPC',
};

describe('shouldRebuildContestStandings', () => {
  test('matches transient Codeforces access failures', () => {
    expect(shouldRebuildContestStandings(new Error('You have to be authenticated to use this method'))).toBe(true);
    expect(shouldRebuildContestStandings(new Error('Cloudflare human check returned invalid json'))).toBe(true);
  });

  test('does not match unrelated API failures', () => {
    expect(shouldRebuildContestStandings(new Error('contestId: Rating changes are unavailable'))).toBe(false);
    expect(shouldRebuildContestStandings('authenticated')).toBe(false);
  });
});

describe('buildContestStandingsFromStatus', () => {
  test('rebuilds CF rows from official submissions and hacks', () => {
    const standings = buildContestStandingsFromStatus(cfContest, [
      submission('alice', 'A', 'WRONG_ANSWER', 60, 1, 1),
      submission('alice', 'A', 'COMPILATION_ERROR', 120, 2, 0),
      submission('alice', 'A', 'OK', 10, 3, 10),
      submission('bob', 'A', 'OK', 5, 4, 5),
      submission('charlie', 'B', 'OK', 20, 5, 20, 1000),
      submission('ghost', 'A', 'OK', 5, 6, 5, 500, { ghost: true }),
      submission('practice', 'A', 'OK', 5, 7, 5, 500, { participantType: 'PRACTICE' }),
      submission('late', 'A', 'OK', 121, 8, 121, 500),
    ], [
      hack('bob', 'HACK_UNSUCCESSFUL'),
      hack('charlie', 'HACK_SUCCESSFUL'),
      hack('ghost', 'HACK_SUCCESSFUL', { ghost: true }),
    ]);

    expect(standings.problems.map((problem) => problem.index)).toEqual(['A', 'B']);
    expect(standings.rows.map((row) => [row.party.members[0]?.handle, row.rank, row.points, row.penalty])).toEqual([
      ['charlie', 1, 1020, 20],
      ['bob', 2, 440, 5],
      ['alice', 3, 430, 10],
    ]);
  });

  test('uses ICPC scoring when contest type is ICPC', () => {
    const standings = buildContestStandingsFromStatus(icpcContest, [
      submission('alice', 'A', 'WRONG_ANSWER', 60, 1, 1),
      submission('alice', 'A', 'OK', 10, 2, 10),
      submission('bob', 'A', 'OK', 10, 3, 10),
    ]);

    expect(standings.rows.map((row) => [row.party.members[0]?.handle, row.rank, row.points, row.penalty])).toEqual([
      ['bob', 1, 1, 10],
      ['alice', 2, 1, 20],
    ]);
  });
});

function party(handle: string, options: Partial<Party & { ghost: boolean; participantId: number }> = {}): Party & {
  ghost?: boolean;
  participantId?: number;
} {
  return {
    participantType: 'CONTESTANT',
    members: [{ handle }],
    ...options,
  };
}

function submission(
  handle: string,
  problemIndex: string,
  verdict: string,
  relativeTimeMinutes: number,
  id: number,
  creationTimeMinutes: number,
  points = 500,
  partyOptions: Partial<Party & { ghost: boolean; participantId: number }> = {},
): ContestSubmission {
  return {
    id,
    creationTimeSeconds: creationTimeMinutes * 60,
    relativeTimeSeconds: relativeTimeMinutes * 60,
    verdict,
    passedTestCount: verdict === 'WRONG_ANSWER' ? 1 : 0,
    problem: {
      index: problemIndex,
      name: `Problem ${problemIndex}`,
      type: 'PROGRAMMING',
      points,
    },
    author: party(handle, partyOptions),
  };
}

function hack(
  handle: string,
  verdict: string,
  partyOptions: Partial<Party & { ghost: boolean; participantId: number }> = {},
): ContestHack {
  return {
    verdict,
    hacker: party(handle, partyOptions),
  };
}
