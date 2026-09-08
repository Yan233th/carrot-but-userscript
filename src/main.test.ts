import { afterEach, beforeEach, expect, mock, spyOn, test } from 'bun:test';
import * as api from './codeforces/api';
import * as rating from './rating/codeforces';
import * as table from './standings/table';
import * as styles from './standings/style';
import * as panel from './standings/cache-status';
import * as contestCache from './storage/contest-cache';
import * as changesCache from './storage/rating-changes-cache';
import * as usersCache from './storage/rated-users-cache';

const contest: api.Contest = {
  id: 2252, name: 'Round', type: 'CF', phase: 'FINISHED', frozen: false, durationSeconds: 7200,
};
const changes: api.RatingChange[] = [{
  contestId: 2252, handle: 'test', rank: 1, oldRating: 1500, newRating: 1600, ratingUpdateTimeSeconds: 1,
}];
const standings: api.ContestStandingsResult = {
  source: 'api', cacheStored: true, durationMs: 1,
  standings: { contest, problems: [], rows: [] },
};
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
let run = 0;
let completed = deferred<void>();

beforeEach(() => {
  completed = deferred<void>();
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { location: new URL('https://codeforces.com/contest/2252/standings') } });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: {} });
  spyOn(table, 'findStandingsTable').mockReturnValue({ table: {}, rows: [] } as unknown as table.StandingsTable);
  spyOn(table, 'clearCarrotColumns').mockImplementation(() => {});
  spyOn(table, 'addLoadingColumn').mockReturnValue({ matchedRows: 0, dataRows: 1 });
  spyOn(table, 'addFinalRatingColumns').mockReturnValue({ matchedRows: 1, dataRows: 1 });
  spyOn(table, 'updateFinalPerformanceColumn').mockImplementation(() => {});
  spyOn(table, 'addPredictedRatingColumns').mockReturnValue({ matchedRows: 1, dataRows: 1 });
  spyOn(styles, 'installStandingsStyles').mockImplementation(() => {});
  spyOn(panel, 'addCacheStatusPanel').mockReturnValue({ set: mock(() => {}) });
  spyOn(contestCache, 'getCachedContest').mockResolvedValue(contest);
  spyOn(changesCache, 'getCachedRatingChanges').mockResolvedValue(null);
  spyOn(changesCache, 'setCachedRatingChanges').mockResolvedValue(true);
  spyOn(usersCache, 'getCachedRatedUsers').mockResolvedValue([]);
  spyOn(api, 'fetchRatingChanges').mockResolvedValue(changes);
  spyOn(api, 'fetchContestStandings').mockResolvedValue(standings);
  spyOn(rating, 'calculateFinalPerformanceFromCodeforces').mockReturnValue([
    { handle: 'test', rating: 1500, delta: 100, performance: 1800 },
  ]);
  spyOn(rating, 'getPredictionSkipReason').mockReturnValue(null);
  spyOn(rating, 'predictFromCodeforces').mockReturnValue([]);
  spyOn(console, 'error').mockImplementation(() => {});
  spyOn(console, 'info').mockImplementation((message) => {
    if (message === '[Carrot, But Userscript] final-performance' || message === '[Carrot, But Userscript] prediction') {
      completed.resolve();
    }
  });
});

afterEach(() => {
  mock.restore();
  for (const [name, descriptor] of [['window', originalWindow], ['document', originalDocument]] as const) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else Reflect.deleteProperty(globalThis, name);
  }
});

test('renders official delta and rank while standings are still pending, then updates only performance', async () => {
  const pending = deferred<api.ContestStandingsResult>();
  const rendered = deferred<void>();
  spyOn(api, 'fetchContestStandings').mockReturnValue(pending.promise);
  spyOn(table, 'addFinalRatingColumns').mockImplementation((_table, results, loading) => {
    expect(results?.get('test')).toEqual({ delta: 100, oldRating: 1500, newRating: 1600 });
    expect(loading).toBe(true);
    rendered.resolve();
    return { matchedRows: 1, dataRows: 1 };
  });
  await start();
  await rendered.promise;
  expect(table.updateFinalPerformanceColumn).not.toHaveBeenCalled();
  pending.resolve(standings);
  await completed.promise;
  expect(table.addFinalRatingColumns).toHaveBeenCalledTimes(1);
  expect(table.updateFinalPerformanceColumn).toHaveBeenCalledTimes(1);
  expect(mockedPerformance()).toBe(1800);
  expect(table.addPredictedRatingColumns).not.toHaveBeenCalled();
});

test.each(['standings', 'calculation'])('keeps official results when final %s fails', async (failure) => {
  if (failure === 'standings') spyOn(api, 'fetchContestStandings').mockRejectedValue(new Error('Standings failed'));
  else spyOn(rating, 'calculateFinalPerformanceFromCodeforces').mockImplementation(() => { throw new Error('Calculation failed'); });
  await start();
  await completed.promise;
  expect(table.addFinalRatingColumns).toHaveBeenCalledTimes(1);
  expect(table.updateFinalPerformanceColumn).toHaveBeenCalledTimes(1);
  expect(mockedPerformance()).toBeUndefined();
  expect(table.addPredictedRatingColumns).not.toHaveBeenCalled();
  expect(rating.predictFromCodeforces).not.toHaveBeenCalled();
  expect(console.error).toHaveBeenCalledWith('[Carrot, But Userscript] Final performance unavailable:', expect.any(Error));
  expect(console.info).not.toHaveBeenCalledWith('[Carrot, But Userscript] Rating changes unavailable:', expect.any(Error));
});

test.each(['empty', 'failed'])('still predicts when official rating changes are %s', async (state) => {
  if (state === 'empty') spyOn(api, 'fetchRatingChanges').mockResolvedValue([]);
  else spyOn(api, 'fetchRatingChanges').mockRejectedValue(new Error('Not published'));
  await start();
  await completed.promise;
  expect(table.addPredictedRatingColumns).toHaveBeenCalledTimes(1);
  expect(table.addFinalRatingColumns).not.toHaveBeenCalled();
  expect(table.updateFinalPerformanceColumn).not.toHaveBeenCalled();
});

function mockedPerformance(): number | undefined {
  return spyOn(table, 'updateFinalPerformanceColumn').mock.calls[0]![1].get('test')?.performance;
}

async function start(): Promise<void> {
  const path = `./main.ts?flow-test-${++run}`;
  await import(path);
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
