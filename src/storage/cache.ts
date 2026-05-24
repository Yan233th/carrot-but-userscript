import { GM_deleteValue, GM_getValue, GM_listValues, GM_setValue } from 'vite-plugin-monkey/dist/client';

const CACHE_KEY_PREFIX = 'cache.v2.';

interface CacheEntry<T = unknown> {
  savedAt: number;
  ttlMs: number;
  value: T;
}

export function getCachedValue<T>(key: string): T | null {
  const entry = GM_getValue<CacheEntry<T> | null>(cacheKey(key), null);
  if (!entry || isExpired(entry)) {
    GM_deleteValue(cacheKey(key));
    return null;
  }

  return entry.value;
}

export function setCachedValue<T>(key: string, value: T, ttlMs: number): void {
  GM_setValue(cacheKey(key), {
    savedAt: Date.now(),
    ttlMs,
    value,
  });
}

export async function clearCachedValues(): Promise<void> {
  const keys = getStorageKeys();
  for (const key of keys) {
    GM_deleteValue(key);
  }
}

function isExpired(entry: CacheEntry): boolean {
  return !Number.isFinite(entry.savedAt) ||
    !Number.isFinite(entry.ttlMs) ||
    Date.now() - entry.savedAt > entry.ttlMs;
}

function getStorageKeys(): string[] {
  const keys = GM_listValues();
  return keys.filter((key) => key.startsWith(CACHE_KEY_PREFIX));
}

function cacheKey(key: string): string {
  return `${CACHE_KEY_PREFIX}${key}`;
}
