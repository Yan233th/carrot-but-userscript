import { rebuildContestStandings, shouldRebuildContestStandings } from './contest-standings-rebuild';

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

export interface ContestStandingsResult {
  source: 'api' | 'api-cache' | 'status-rebuild' | 'status-rebuild-cache';
  standings: ContestStandings;
  durationMs: number;
  statusPages?: number;
  submissions?: number;
  officialSubmissions?: number;
  hacks?: number;
}

export type CachedContestStandings = Omit<ContestStandingsResult, 'durationMs' | 'source'> & {
  source: 'api' | 'status-rebuild';
};

export interface ContestStandingsCacheAdapter {
  get: (contestId: string, gym: boolean) => Promise<CachedContestStandings | null>;
  set: (contestId: string, gym: boolean, result: CachedContestStandings) => Promise<void>;
}

export interface RatedUser {
  handle: string;
  rating: number;
}

export async function fetchContest(contestId: string, gym: boolean): Promise<Contest> {
  const contests = await fetchApi<Contest[]>('contest.list', { gym: String(gym) });
  const contest = contests.find((entry) => String(entry.id) === contestId);
  if (!contest) {
    throw new Error(`Contest ${contestId} not found`);
  }
  return contest;
}

export async function fetchRatingChanges(contestId: string): Promise<RatingChange[]> {
  return await fetchApi<RatingChange[]>('contest.ratingChanges', { contestId });
}

export async function fetchContestStandings(
  contestId: string,
  gym: boolean,
  cache?: ContestStandingsCacheAdapter,
): Promise<ContestStandingsResult> {
  const startedAt = performance.now();
  const cached = await cache?.get(contestId, gym);
  if (cached) {
    return {
      source: cached.source === 'api' ? 'api-cache' : 'status-rebuild-cache',
      standings: cached.standings,
      durationMs: performance.now() - startedAt,
      statusPages: cached.statusPages,
      submissions: cached.submissions,
      officialSubmissions: cached.officialSubmissions,
      hacks: cached.hacks,
    };
  }

  try {
    const standings = await fetchApi<ContestStandings>('contest.standings', {
      contestId,
      showUnofficial: 'false',
    });
    await cache?.set(contestId, gym, {
      source: 'api',
      standings,
    });
    return {
      source: 'api',
      standings,
      durationMs: performance.now() - startedAt,
    };
  } catch (error) {
    if (!shouldRebuildContestStandings(error)) {
      throw error;
    }

    const rebuilt = await rebuildContestStandings(contestId, gym);
    await cache?.set(contestId, gym, {
      source: 'status-rebuild',
      ...rebuilt,
    });
    return {
      source: 'status-rebuild',
      standings: rebuilt.standings,
      durationMs: performance.now() - startedAt,
      statusPages: rebuilt.statusPages,
      submissions: rebuilt.submissions,
      officialSubmissions: rebuilt.officialSubmissions,
      hacks: rebuilt.hacks,
    };
  }
}

export async function fetchRatedUsers(): Promise<RatedUser[]> {
  return await fetchApi<RatedUser[]>('user.ratedList', { activeOnly: 'false' });
}

export async function fetchApi<T>(method: string, query: Record<string, string | undefined>): Promise<T> {
  const url = new URL(method, API_ROOT);
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) {
      continue;
    }
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    credentials: 'include',
    cache: 'no-store',
  });
  const payload = await parseApiResponse<T>(response, method);

  if (!response.ok || payload.status !== 'OK' || payload.result === undefined) {
    throw new Error(payload.comment ?? `Codeforces API request failed: ${method}`);
  }

  return payload.result;
}

async function parseApiResponse<T>(response: Response, method: string): Promise<ApiResponse<T>> {
  try {
    return await response.json() as ApiResponse<T>;
  } catch (error) {
    throw new Error(`Invalid JSON from Codeforces API: ${method}`, { cause: error });
  }
}
