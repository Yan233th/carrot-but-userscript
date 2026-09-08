const DATABASE_NAME = 'carrot-but-userscript-cache';
const STORE_NAME = 'entries';

interface CacheEntry<T = unknown> {
  expiresAt: number;
  value: T;
}

let database: Promise<IDBDatabase> | undefined;
let warned = false;

export async function getCachedValue<T>(key: string): Promise<T | null> {
  try {
    const entry = await transact<CacheEntry<T> | undefined>((store) => store.get(key));
    return entry && entry.expiresAt > Date.now() ? entry.value : null;
  } catch (error) {
    warnCacheUnavailable(error);
    return null;
  }
}

export async function setCachedValue<T>(key: string, value: T, ttlMs: number): Promise<boolean> {
  try {
    if (!Number.isFinite(ttlMs) || ttlMs <= 0) {
      throw new Error('Invalid cache TTL');
    }
    await transact((store) => store.put({ expiresAt: Date.now() + ttlMs, value }, key));
    return true;
  } catch (error) {
    warnCacheUnavailable(error);
    return false;
  }
}

export async function clearCachedValues(): Promise<void> {
  await transact((store) => store.clear());
}

function openDatabase(): Promise<IDBDatabase> {
  database ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    let blocked = false;
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore(STORE_NAME);
      store.createIndex('expiresAt', 'expiresAt');
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => {
      blocked = true;
      reject(new Error('Cache database is blocked by another tab'));
    };
    request.onsuccess = () => {
      const db = request.result;
      if (blocked) {
        db.close();
        return;
      }
      db.onversionchange = () => {
        db.close();
        database = undefined;
      };
      resolve(db);
    };
  });
  return database;
}

async function transact<T>(operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    transaction.onabort = () => reject(transaction.error ?? new Error('Cache transaction aborted'));

    // Sweep expired keys across all contests without reading their large values.
    const expired = store.index('expiresAt').openKeyCursor(IDBKeyRange.upperBound(Date.now()));
    expired.onsuccess = () => {
      const cursor = expired.result;
      if (cursor) {
        store.delete(cursor.primaryKey);
        cursor.continue();
      } else {
        try {
          const request = operation(store);
          // A successful request can still be rolled back; only commit is success.
          transaction.oncomplete = () => resolve(request.result);
        } catch (error) {
          transaction.abort();
          reject(error);
        }
      }
    };
  });
}

function warnCacheUnavailable(error: unknown): void {
  if (warned) return;
  warned = true;
  const reason = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  console.warn(`[Carrot, But Userscript] Cache unavailable; using live data. ${reason}`);
}
