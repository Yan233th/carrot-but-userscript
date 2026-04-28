import type { RatedUser } from '../codeforces/api';
import { getCachedValue, setCachedValue } from './cache';

const CACHE_KEY = 'cache.rated-users';
const CACHE_TTL_MS = 60 * 60 * 1000;

export async function getCachedRatedUsers(): Promise<RatedUser[] | null> {
  return await getCachedValue<RatedUser[]>(CACHE_KEY);
}

export async function setCachedRatedUsers(users: RatedUser[]): Promise<void> {
  await setCachedValue(CACHE_KEY, users, CACHE_TTL_MS);
}
