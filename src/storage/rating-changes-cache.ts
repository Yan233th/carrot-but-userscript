import type { RatingChange } from '../codeforces/api';
import { getCachedValue, setCachedValue } from './cache';

const CACHE_NAMESPACE = 'cache.rating-changes';
const EMPTY_CACHE_TTL_MS = 30 * 1000;
const PUBLISHED_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export async function getCachedRatingChanges(contestId: string): Promise<RatingChange[] | null> {
  return await getCachedValue<RatingChange[]>(cacheKey(contestId));
}

export async function setCachedRatingChanges(contestId: string, changes: RatingChange[]): Promise<void> {
  await setCachedValue(
    cacheKey(contestId),
    changes,
    changes.length === 0 ? EMPTY_CACHE_TTL_MS : PUBLISHED_CACHE_TTL_MS,
  );
}

function cacheKey(contestId: string): string {
  return `${CACHE_NAMESPACE}.contest.${contestId}`;
}
