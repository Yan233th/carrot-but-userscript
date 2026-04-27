import { GM_getValue, GM_setValue } from 'vite-plugin-monkey/dist/client';
import type { RatedUser } from '../codeforces/api';

const CACHE_KEY = 'cache.rated-users';
const CACHE_TTL_MS = 60 * 60 * 1000;

interface RatedUsersCache {
  savedAt: number;
  users: RatedUser[];
}

export async function getCachedRatedUsers(): Promise<RatedUser[] | null> {
  const cache = await GM_getValue(CACHE_KEY, undefined) as RatedUsersCache | undefined;
  if (!cache || Date.now() - cache.savedAt > CACHE_TTL_MS) {
    return null;
  }

  return cache.users;
}

export async function setCachedRatedUsers(users: RatedUser[]): Promise<void> {
  await GM_setValue(CACHE_KEY, {
    savedAt: Date.now(),
    users,
  });
}
