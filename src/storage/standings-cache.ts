import { GM_getValue, GM_setValue } from 'vite-plugin-monkey/dist/client';
import type { CachedContestStandings } from '../codeforces/api';

const CACHE_KEY = 'cache.standings.v1';
const CACHE_TTL_MS = 30 * 1000;

interface StandingsCacheEntry {
  savedAt: number;
  result: CachedContestStandings;
}

type StandingsCache = Record<string, StandingsCacheEntry>;

export async function getCachedContestStandings(
  contestId: string,
  gym: boolean,
): Promise<CachedContestStandings | null> {
  const cache = await getCache();
  const entry = cache[entryKey(contestId, gym)];
  if (!entry || Date.now() - entry.savedAt > CACHE_TTL_MS) {
    await pruneCache(cache);
    return null;
  }

  return entry.result;
}

export async function setCachedContestStandings(
  contestId: string,
  gym: boolean,
  result: CachedContestStandings,
): Promise<void> {
  const cache = await getCache();
  cache[entryKey(contestId, gym)] = {
    savedAt: Date.now(),
    result,
  };
  await pruneCache(cache);
}

async function getCache(): Promise<StandingsCache> {
  return await GM_getValue(CACHE_KEY, {}) as StandingsCache;
}

async function pruneCache(cache: StandingsCache): Promise<void> {
  const now = Date.now();
  const freshCache = Object.fromEntries(
    Object.entries(cache).filter(([, entry]) => now - entry.savedAt <= CACHE_TTL_MS),
  );
  await GM_setValue(CACHE_KEY, freshCache);
}

function entryKey(contestId: string, gym: boolean): string {
  return `${gym ? 'gym' : 'contest'}.${contestId}`;
}
