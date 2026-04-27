const API_ROOT = 'https://codeforces.com/api/';

interface ApiResponse<T> {
  status: 'OK' | 'FAILED';
  comment?: string;
  result?: T;
}

export interface RatingChange {
  contestId: number;
  handle: string;
  rank: number;
  ratingUpdateTimeSeconds: number;
  oldRating: number;
  newRating: number;
}

export interface Contest {
  id: number;
  name: string;
  type: string;
  phase: string;
  frozen: boolean;
  durationSeconds: number;
  startTimeSeconds?: number;
}

export interface ContestProblem {
  contestId?: number;
  index: string;
  name: string;
  type: string;
  points?: number;
}

export interface PartyMember {
  handle: string;
}

export interface Party {
  participantType: string;
  teamId?: number;
  teamName?: string;
  members: PartyMember[];
}

export interface StandingsRow {
  party: Party;
  rank: number;
  points: number;
  penalty: number;
}

export interface ContestStandings {
  contest: Contest;
  problems: ContestProblem[];
  rows: StandingsRow[];
}

export interface RatedUser {
  handle: string;
  rating: number;
}

export async function fetchRatingChanges(contestId: string): Promise<RatingChange[]> {
  return await fetchApi<RatingChange[]>('contest.ratingChanges', { contestId });
}

export async function fetchContestStandings(contestId: string): Promise<ContestStandings> {
  return await fetchApi<ContestStandings>('contest.standings', {
    contestId,
    showUnofficial: 'false',
  });
}

export async function fetchRatedUsers(): Promise<RatedUser[]> {
  return await fetchApi<RatedUser[]>('user.ratedList', { activeOnly: 'false' });
}

async function fetchApi<T>(method: string, query: Record<string, string>): Promise<T> {
  const url = new URL(method, API_ROOT);
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    credentials: 'include',
    cache: 'no-store',
  });
  const payload = (await response.json()) as ApiResponse<T>;

  if (!response.ok || payload.status !== 'OK' || payload.result === undefined) {
    throw new Error(payload.comment ?? `Codeforces API request failed: ${method}`);
  }

  return payload.result;
}
