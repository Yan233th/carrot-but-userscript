import { type Contest, type ContestProblem, type ContestStandings, fetchApi, fetchContest, type Party, type StandingsRow } from './api';

const PAGE_SIZE = 10000;

export interface ContestSubmission {
  id: number;
  creationTimeSeconds: number;
  relativeTimeSeconds: number;
  problem?: ContestProblem;
  author?: Party & {
    participantId?: number;
    ghost?: boolean;
  };
  verdict?: string;
  passedTestCount?: number;
}

export interface ContestHack {
  hacker?: Party & {
    participantId?: number;
    ghost?: boolean;
  };
  verdict: string;
}

export interface RebuiltContestStandings {
  standings: ContestStandings;
  statusPages: number;
  submissions: number;
  officialSubmissions: number;
  hacks: number;
}

export function shouldRebuildContestStandings(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  return message.includes('authenticated') ||
    message.includes('cloudflare') ||
    message.includes('human check') ||
    message.includes('invalid json');
}

export async function rebuildContestStandings(contestId: string, gym: boolean): Promise<RebuiltContestStandings> {
  const contestPromise = fetchContest(contestId, gym);
  const submissionsPromise = fetchContestSubmissions(contestId);
  const contest = await contestPromise;
  const hacksPromise = contest.type === 'CF' ? fetchContestHacks(contestId) : Promise.resolve([]);
  const [status, hacks] = await Promise.all([submissionsPromise, hacksPromise]);
  const officialSubmissions = status.submissions.filter((submission) =>
    isOfficialSubmission(submission, contest.durationSeconds),
  );

  return {
    standings: buildContestStandings(contest, officialSubmissions, hacks),
    statusPages: status.pages,
    submissions: status.submissions.length,
    officialSubmissions: officialSubmissions.length,
    hacks: hacks.length,
  };
}

export function buildContestStandingsFromStatus(
  contest: Contest,
  allSubmissions: ContestSubmission[],
  hacks: ContestHack[] = [],
): ContestStandings {
  const submissions = allSubmissions.filter((submission) =>
    isOfficialSubmission(submission, contest.durationSeconds),
  );
  return buildContestStandings(contest, submissions, hacks);
}

function buildContestStandings(
  contest: Contest,
  submissions: ContestSubmission[],
  hacks: ContestHack[],
): ContestStandings {
  const rows = buildRows(submissions, contest);
  if (contest.type === 'CF') {
    applyHackScores(hacks, rows);
  }

  rows.sort(compareRows);
  assignRanks(rows);

  return {
    contest,
    problems: getProblems(submissions),
    rows,
  };
}

async function fetchContestSubmissions(contestId: string): Promise<{ submissions: ContestSubmission[]; pages: number }> {
  const submissions: ContestSubmission[] = [];
  let pages = 0;
  for (let from = 1; ; from += PAGE_SIZE) {
    const page = await fetchApi<ContestSubmission[]>('contest.status', {
      contestId,
      from: String(from),
      count: String(PAGE_SIZE),
    });
    pages += 1;
    submissions.push(...page);
    if (page.length < PAGE_SIZE) {
      return { submissions, pages };
    }
  }
}

async function fetchContestHacks(contestId: string): Promise<ContestHack[]> {
  try {
    return await fetchApi<ContestHack[]>('contest.hacks', { contestId });
  } catch {
    return [];
  }
}

function isOfficialSubmission(submission: ContestSubmission, durationSeconds: number): boolean {
  const { author, relativeTimeSeconds } = submission;
  return author?.participantType === 'CONTESTANT' &&
    author.ghost !== true &&
    Number.isInteger(relativeTimeSeconds) &&
    relativeTimeSeconds >= 0 &&
    relativeTimeSeconds <= durationSeconds;
}

function getProblems(submissions: ContestSubmission[]): ContestProblem[] {
  const problems = new Map<string, ContestProblem>();
  for (const submission of submissions) {
    if (submission.problem?.index) {
      problems.set(submission.problem.index, submission.problem);
    }
  }
  return Array.from(problems.values()).sort((left, right) => left.index.localeCompare(right.index));
}

function buildRows(submissions: ContestSubmission[], contest: Contest): StandingsRow[] {
  const submissionsByParty = new Map<string, ContestSubmission[]>();
  const parties = new Map<string, Party>();

  for (const submission of submissions) {
    const { author } = submission;
    if (!author) {
      continue;
    }

    const key = getPartyKey(author);
    parties.set(key, author);
    const partySubmissions = submissionsByParty.get(key) ?? [];
    partySubmissions.push(submission);
    submissionsByParty.set(key, partySubmissions);
  }

  return Array.from(submissionsByParty, ([key, partySubmissions]) =>
    buildRow(parties.get(key)!, partySubmissions, contest),
  );
}

function buildRow(party: Party, submissions: ContestSubmission[], contest: Contest): StandingsRow {
  let points = 0;
  let penalty = 0;

  for (const problemSubmissions of groupByProblem(submissions).values()) {
    const score = scoreProblem(problemSubmissions, contest);
    points += score.points;
    penalty += score.penalty;
  }

  return { party, rank: 0, points, penalty };
}

function groupByProblem(submissions: ContestSubmission[]): Map<string, ContestSubmission[]> {
  const groups = new Map<string, ContestSubmission[]>();
  for (const submission of submissions) {
    const index = submission.problem?.index;
    if (!index) {
      continue;
    }
    const group = groups.get(index) ?? [];
    group.push(submission);
    groups.set(index, group);
  }
  return groups;
}

function scoreProblem(submissions: ContestSubmission[], contest: Contest): { points: number; penalty: number } {
  submissions.sort((left, right) =>
    left.creationTimeSeconds === right.creationTimeSeconds
      ? left.id - right.id
      : left.creationTimeSeconds - right.creationTimeSeconds,
  );

  let wrongBeforeAccepted = 0;
  for (const submission of submissions) {
    if (submission.verdict === 'OK') {
      return scoreAcceptedSubmission(submission, contest, wrongBeforeAccepted);
    }
    if (countsAsWrongAttempt(submission)) {
      wrongBeforeAccepted += 1;
    }
  }

  return { points: 0, penalty: 0 };
}

function scoreAcceptedSubmission(
  submission: ContestSubmission,
  contest: Contest,
  wrongBeforeAccepted: number,
): { points: number; penalty: number } {
  const minute = Math.trunc(submission.relativeTimeSeconds / 60);
  if (contest.type === 'ICPC') {
    return { points: 1, penalty: minute + 10 * wrongBeforeAccepted };
  }

  const maxPoints = submission.problem?.points ?? 0;
  const durationMinutes = contest.durationSeconds / 60;
  const timePenalty = Math.floor(120 * maxPoints * minute / (250 * durationMinutes));
  return {
    points: Math.max(0.3 * maxPoints, maxPoints - timePenalty) - 50 * wrongBeforeAccepted,
    penalty: minute,
  };
}

function countsAsWrongAttempt(submission: ContestSubmission): boolean {
  if (
    submission.verdict === undefined ||
    submission.verdict === 'OK' ||
    submission.verdict === 'COMPILATION_ERROR'
  ) {
    return false;
  }
  if (submission.verdict === 'HACKED' || submission.verdict === 'SKIPPED') {
    return true;
  }
  return (submission.passedTestCount ?? 0) > 0;
}

function applyHackScores(hacks: ContestHack[], rows: StandingsRow[]): void {
  const rowsByParty = new Map(rows.map((row) => [getPartyKey(row.party), row]));
  for (const hack of hacks) {
    const hacker = hack.hacker;
    if (hacker?.participantType !== 'CONTESTANT' || hacker.ghost === true) {
      continue;
    }

    const key = getPartyKey(hacker);
    const row = rowsByParty.get(key) ?? addEmptyRow(rows, rowsByParty, key, hacker);
    if (hack.verdict === 'HACK_SUCCESSFUL') {
      row.points += 100;
    } else if (hack.verdict === 'HACK_UNSUCCESSFUL') {
      row.points -= 50;
    }
  }
}

function addEmptyRow(
  rows: StandingsRow[],
  rowsByParty: Map<string, StandingsRow>,
  key: string,
  party: Party,
): StandingsRow {
  const row = { party, rank: 0, points: 0, penalty: 0 };
  rows.push(row);
  rowsByParty.set(key, row);
  return row;
}

function getPartyKey(party: Party & { participantId?: number }): string {
  return party.participantId !== undefined
    ? String(party.participantId)
    : party.members.map((member) => member.handle).sort().join(',');
}

function compareRows(left: StandingsRow, right: StandingsRow): number {
  return left.points === right.points ? left.penalty - right.penalty : right.points - left.points;
}

function assignRanks(rows: StandingsRow[]): void {
  let rank = 0;
  let previousPoints: number | null = null;
  let previousPenalty: number | null = null;

  for (const [index, row] of rows.entries()) {
    if (row.points !== previousPoints || row.penalty !== previousPenalty) {
      rank = index + 1;
      previousPoints = row.points;
      previousPenalty = row.penalty;
    }
    row.rank = rank;
  }
}
