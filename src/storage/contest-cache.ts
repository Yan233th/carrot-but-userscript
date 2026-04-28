import type { Contest } from '../codeforces/api';
import { getCachedValue, setCachedValue } from './cache';

const CACHE_NAMESPACE = 'cache.contest';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export async function getCachedContest(contestId: string, gym: boolean): Promise<Contest | null> {
  return await getCachedValue<Contest>(cacheKey(contestId, gym));
}

export async function setCachedContest(contestId: string, gym: boolean, contest: Contest): Promise<void> {
  await setCachedValue(cacheKey(contestId, gym), contest, CACHE_TTL_MS);
}

function cacheKey(contestId: string, gym: boolean): string {
  return `${CACHE_NAMESPACE}.${gym ? 'gym' : 'contest'}.${contestId}`;
}
