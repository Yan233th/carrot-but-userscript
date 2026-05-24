import { GM } from 'vite-plugin-monkey/dist/client';

const CACHE_KEY_PREFIX = 'cache.v2.';
const LEGACY_OVERSIZED_KEYS = [
  'cache.v2.cache.rated-users',
];

interface CacheEntry<T = unknown> {
  savedAt: number;
  ttlMs: number;
  value: T;
}

export async function getCachedValue<T>(key: string): Promise<T | null> {
  const entry = await GM.getValue<CacheEntry<T> | null>(cacheKey(key), null);
  if (!entry || isExpired(entry)) {
    await GM.deleteValue(cacheKey(key));
    return null;
  }

  return entry.value;
}

export async function setCachedValue<T>(key: string, value: T, ttlMs: number): Promise<void> {
  await GM.setValue(cacheKey(key), {
    savedAt: Date.now(),
    ttlMs,
    value,
  });
}

export async function clearCachedValues(): Promise<void> {
  const keys = await getStorageKeys();
  for (const key of keys) {
    await GM.deleteValue(key);
  }
}

export async function deleteKnownLegacyOversizedCacheValues(): Promise<void> {
  for (const key of LEGACY_OVERSIZED_KEYS) {
    await GM.deleteValue(key);
  }
}

function isExpired(entry: CacheEntry): boolean {
  return !Number.isFinite(entry.savedAt) ||
    !Number.isFinite(entry.ttlMs) ||
    Date.now() - entry.savedAt > entry.ttlMs;
}

async function getStorageKeys(): Promise<string[]> {
  const keys = await GM.listValues();
  return keys.filter((key) => key.startsWith(CACHE_KEY_PREFIX));
}

function cacheKey(key: string): string {
  return `${CACHE_KEY_PREFIX}${key}`;
}
