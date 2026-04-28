import { GM_getValue, GM_setValue } from 'vite-plugin-monkey/dist/client';

const CACHE_KEY = 'cache.v1';

interface CacheEntry<T = unknown> {
  savedAt: number;
  ttlMs: number;
  value: T;
}

type CacheStore = Record<string, CacheEntry>;

export async function getCachedValue<T>(key: string): Promise<T | null> {
  const cache = await getCache();
  const entry = cache[key] as CacheEntry<T> | undefined;
  if (!entry || isExpired(entry)) {
    await pruneCache(cache);
    return null;
  }

  return entry.value;
}

export async function setCachedValue<T>(key: string, value: T, ttlMs: number): Promise<void> {
  const cache = await getCache();
  cache[key] = {
    savedAt: Date.now(),
    ttlMs,
    value,
  };
  await pruneCache(cache);
}

async function getCache(): Promise<CacheStore> {
  return await GM_getValue(CACHE_KEY, {}) as CacheStore;
}

async function pruneCache(cache: CacheStore): Promise<void> {
  const freshCache = Object.fromEntries(
    Object.entries(cache).filter(([, entry]) => !isExpired(entry)),
  );
  await GM_setValue(CACHE_KEY, freshCache);
}

function isExpired(entry: CacheEntry): boolean {
  return !Number.isFinite(entry.savedAt) ||
    !Number.isFinite(entry.ttlMs) ||
    Date.now() - entry.savedAt > entry.ttlMs;
}
