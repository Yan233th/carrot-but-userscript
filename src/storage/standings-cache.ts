import type { CachedContestStandings } from '../codeforces/api';
import { getCachedValue, setCachedValue } from './cache';

const CACHE_NAMESPACE = 'cache.standings';
const CACHE_TTL_MS = 30 * 1000;

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
  await setCachedValue(cacheKey(contestId, gym), result, CACHE_TTL_MS);
}

function cacheKey(contestId: string, gym: boolean): string {
  return `${CACHE_NAMESPACE}.${gym ? 'gym' : 'contest'}.${contestId}`;
}
