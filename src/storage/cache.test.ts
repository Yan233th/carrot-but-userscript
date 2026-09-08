import 'fake-indexeddb/auto';
import { IDBDatabase, IDBObjectStore } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { clearCachedValues, getCachedValue, setCachedValue } from './cache';
import { getCachedContest, setCachedContest } from './contest-cache';
import { getCachedRatedUsers, setCachedRatedUsers } from './rated-users-cache';
import { getCachedRatingChanges, setCachedRatingChanges } from './rating-changes-cache';
import { getCachedContestStandings, setCachedContestStandings } from './standings-cache';
import type { CachedContestStandings } from '../codeforces/api';

const snapshot: CachedContestStandings = {
  source: 'api',
  standings: {
    contest: { id: 2252, name: 'Round', type: 'CF', phase: 'FINISHED', frozen: false, durationSeconds: 7200 },
    problems: [],
    rows: [],
  },
};

beforeEach(async () => {
  await clearCachedValues();
});

afterEach(() => {
  mock.restore();
});

describe('IndexedDB cache', () => {
  test('stores independent snapshots and overwrites the same key', async () => {
    const value = { rows: [{ handle: 'tourist' }] };
    expect(await getCachedValue('contest')).toBeNull();
    expect(await setCachedValue('contest', value, 30_000)).toBe(true);
    value.rows[0]!.handle = 'changed';
    expect(await getCachedValue<typeof value>('contest')).toEqual({ rows: [{ handle: 'tourist' }] });
    await setCachedValue('contest', { rows: [] }, 30_000);
    expect(await getCachedValue<typeof value>('contest')).toEqual({ rows: [] });
  });

  test('sweeps expired contests that are never visited again, including at exact expiry', async () => {
    const now = Date.now();
    const clock = spyOn(Date, 'now').mockReturnValue(now);
    await setCachedValue('old-contest', 'expired', 30_000);
    await setCachedValue('fresh-contest', 'fresh', 60_000);
    clock.mockReturnValue(now + 30_000);
    expect(await getCachedValue<string>('fresh-contest')).toBe('fresh');
    expect(await storedKeys()).toEqual(['fresh-contest']);
    expect(await getCachedValue('old-contest')).toBeNull();
  });

  test('sweeps on writes without deleting a replacement for an expired key', async () => {
    const now = Date.now();
    const clock = spyOn(Date, 'now').mockReturnValue(now);
    await setCachedValue('same-contest', 'old', 30_000);
    await setCachedValue('abandoned-contest', 'old', 30_000);
    clock.mockReturnValue(now + 30_000);
    await setCachedValue('same-contest', 'new', 30_000);
    expect(await storedKeys()).toEqual(['same-contest']);
    expect(await getCachedValue<string>('same-contest')).toBe('new');
  });

  test('shares data across independent script instances', async () => {
    const modulePath = `./cache.ts?second-instance`;
    const second: typeof import('./cache') = await import(modulePath);
    await Promise.all([
      setCachedValue('first', 1, 30_000),
      second.setCachedValue('second', 2, 30_000),
    ]);
    expect(await second.getCachedValue<number>('first')).toBe(1);
    expect(await getCachedValue<number>('second')).toBe(2);
    await second.clearCachedValues();
    expect(await getCachedValue('first')).toBeNull();
  });

  test('keeps published data for 24h, live standings for 30s and rated users for 1h', async () => {
    const now = Date.now();
    const clock = spyOn(Date, 'now').mockReturnValue(now);
    const contest = snapshot.standings.contest;
    await setCachedContest('2252', false, contest);
    await setCachedContestStandings('2252', false, snapshot);
    await setCachedContestStandings('2253', false, {
      ...snapshot, standings: { ...snapshot.standings, contest: { ...contest, phase: 'CODING' } },
    });
    await setCachedRatingChanges('2252', [{
      contestId: 2252, handle: 'test', rank: 1, oldRating: 1500, newRating: 1600, ratingUpdateTimeSeconds: 1,
    }]);
    await setCachedRatedUsers([{ handle: 'test', rating: 1600 }]);
    expect(await setCachedRatingChanges('pending', [])).toBe(false);
    expect(await getCachedRatingChanges('pending')).toBeNull();
    clock.mockReturnValue(now + 30_000);
    expect(await getCachedContestStandings('2253', false)).toBeNull();
    expect(await getCachedContestStandings('2252', false)).toEqual(snapshot);
    expect(await getCachedContestStandings('2252', true)).toBeNull();
    clock.mockReturnValue(now + 3_600_000);
    expect(await getCachedRatedUsers()).toBeNull();
    expect(await getCachedContest('2252', false)).toEqual(contest);
    expect(await getCachedRatingChanges('2252')).toHaveLength(1);
    clock.mockReturnValue(now + 86_400_000);
    expect(await getCachedContest('2252', false)).toBeNull();
    expect(await storedKeys()).toEqual([]);
  });

  test('Clear removes every current cache namespace but leaves other databases alone', async () => {
    await setCachedContest('2252', false, snapshot.standings.contest);
    await setCachedContestStandings('2252', false, snapshot);
    await setCachedRatedUsers([]);
    await setCachedValue('cache.rating-changes.contest.2252', ['change'], 30_000);
    const unrelated = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('unrelated-cache-test');
      request.onupgradeneeded = () => request.result.createObjectStore('other');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await clearCachedValues();
    expect(await storedKeys()).toEqual([]);
    expect(unrelated.objectStoreNames.contains('other')).toBe(true);
    unrelated.close();
  });

  test('reports write failure if a transaction aborts after its put request succeeds', async () => {
    spyOn(console, 'warn').mockImplementation(() => {});
    const put = IDBObjectStore.prototype.put;
    const intercepted = spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (this: IDBObjectStore, value, key) {
      const request = put.call(this, value, key);
      request.addEventListener('success', () => this.transaction.abort());
      return request;
    });
    expect(await setCachedValue('aborted', 'value', 30_000)).toBe(false);
    intercepted.mockRestore();
    expect(await getCachedValue('aborted')).toBeNull();
  });

  test('storage failures are cache misses and failed writes, not prediction errors', async () => {
    spyOn(console, 'warn').mockImplementation(() => {});
    spyOn(IDBDatabase.prototype, 'transaction').mockImplementation(() => {
      throw new DOMException('Storage denied', 'SecurityError');
    });
    expect(await getCachedValue('unavailable')).toBeNull();
    expect(await setCachedValue('unavailable', [], 30_000)).toBe(false);
    await expect(clearCachedValues()).rejects.toThrow('Storage denied');
  });
});

async function storedKeys(): Promise<IDBValidKey[]> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open('carrot-but-userscript-cache', 1);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const transaction = db.transaction('entries', 'readonly');
      const keys = transaction.objectStore('entries').getAllKeys();
      transaction.oncomplete = () => { db.close(); resolve(keys.result); };
      transaction.onabort = () => { db.close(); reject(transaction.error); };
    };
  });
}
