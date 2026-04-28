import { GM_getValue, GM_setValue } from 'vite-plugin-monkey/dist/client';
import type { RebuiltContestStandings } from '../codeforces/contest-standings-rebuild';

const CACHE_SCHEMA = 1;
const CACHE_TTL_MS = 30 * 1000;

interface RebuiltStandingsCache {
  savedAt: number;
  result: RebuiltContestStandings;
}

export async function getCachedRebuiltStandings(
  contestId: string,
  gym: boolean,
): Promise<RebuiltContestStandings | null> {
  const cache = await GM_getValue(cacheKey(contestId, gym), undefined) as RebuiltStandingsCache | undefined;
  if (!cache || Date.now() - cache.savedAt > CACHE_TTL_MS) {
    return null;
  }

  return cache.result;
}

export async function setCachedRebuiltStandings(
  contestId: string,
  gym: boolean,
  result: RebuiltContestStandings,
): Promise<void> {
  await GM_setValue(cacheKey(contestId, gym), {
    savedAt: Date.now(),
    result,
  });
}

function cacheKey(contestId: string, gym: boolean): string {
  return `cache.rebuilt-standings.v${CACHE_SCHEMA}.${gym ? 'gym' : 'contest'}.${contestId}`;
}
