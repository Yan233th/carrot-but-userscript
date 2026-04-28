import type { CachedContestStandings } from '../codeforces/api';
import { getCachedValue, setCachedValue } from './cache';

const CACHE_NAMESPACE = 'cache.standings';
const LIVE_CACHE_TTL_MS = 30 * 1000;
const FINISHED_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export async function getCachedContestStandings(
  contestId: string,
  gym: boolean,
): Promise<CachedContestStandings | null> {
  return await getCachedValue<CachedContestStandings>(cacheKey(contestId, gym));
}

export async function setCachedContestStandings(
  contestId: string,
  gym: boolean,
  result: CachedContestStandings,
): Promise<void> {
  await setCachedValue(cacheKey(contestId, gym), result, getCacheTtlMs(result));
}

function cacheKey(contestId: string, gym: boolean): string {
  return `${CACHE_NAMESPACE}.${gym ? 'gym' : 'contest'}.${contestId}`;
}

function getCacheTtlMs(result: CachedContestStandings): number {
  return result.standings.contest.phase === 'FINISHED'
    ? FINISHED_CACHE_TTL_MS
    : LIVE_CACHE_TTL_MS;
}
