import { GM_getValue, GM_setValue } from 'vite-plugin-monkey/dist/client';
import type { RebuiltContestStandings } from '../codeforces/contest-standings-rebuild';

const CACHE_KEY = 'cache.rebuilt-standings.v2';
const CACHE_TTL_MS = 30 * 1000;

interface RebuiltStandingsCacheEntry {
  savedAt: number;
  result: RebuiltContestStandings;
}

type RebuiltStandingsCache = Record<string, RebuiltStandingsCacheEntry>;

export async function getCachedRebuiltStandings(
  contestId: string,
  gym: boolean,
): Promise<RebuiltContestStandings | null> {
  const cache = await getCache();
  const entry = cache[entryKey(contestId, gym)];
  if (!entry || Date.now() - entry.savedAt > CACHE_TTL_MS) {
    await pruneCache(cache);
    return null;
  }

  return entry.result;
}

export async function setCachedRebuiltStandings(
  contestId: string,
  gym: boolean,
  result: RebuiltContestStandings,
): Promise<void> {
  const cache = await getCache();
  cache[entryKey(contestId, gym)] = {
    savedAt: Date.now(),
    result,
  };
  await pruneCache(cache);
}

async function getCache(): Promise<RebuiltStandingsCache> {
  return await GM_getValue(CACHE_KEY, {}) as RebuiltStandingsCache;
}

async function pruneCache(cache: RebuiltStandingsCache): Promise<void> {
  const now = Date.now();
  const freshCache = Object.fromEntries(
    Object.entries(cache).filter(([, entry]) => now - entry.savedAt <= CACHE_TTL_MS),
  );
  await GM_setValue(CACHE_KEY, freshCache);
}

function entryKey(contestId: string, gym: boolean): string {
  return `${gym ? 'gym' : 'contest'}.${contestId}`;
}
