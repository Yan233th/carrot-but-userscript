import { fetchContest, fetchContestStandings, fetchRatedUsers, fetchRatingChanges, type ContestStandings, type ContestStandingsResult } from './codeforces/api';
import { getStandingsPage } from './codeforces/page';
import { calculatePerformanceFromRatingChanges, getPredictionSkipReason, predictFromCodeforces } from './rating/codeforces';
import type { Prediction } from './rating/predict';
import {
  addFinalRatingColumns,
  addLoadingColumn,
  addPredictedRatingColumns,
  type ColumnRenderStats,
  clearCarrotColumns,
  findStandingsTable,
  type FinalRatingResult,
} from './standings/table';
import { installStandingsStyles } from './standings/style';
import { getCachedRatedUsers, setCachedRatedUsers } from './storage/rated-users-cache';
import { getCachedContestStandings, setCachedContestStandings } from './storage/standings-cache';

const LOG_PREFIX = '[Carrot, But Userscript]';

interface PredictionResult {
  predictions: Prediction[] | null;
  status: 'ok' | 'skipped' | 'failed' | 'unavailable';
  reason?: string;
}

async function main(): Promise<void> {
  const startedAt = performance.now();
  const page = getStandingsPage(window.location);
  if (!page) {
    return;
  }

  const standings = findStandingsTable(document);
  if (!standings) {
    console.info(`${LOG_PREFIX} Standings table not found.`);
    return;
  }

  installStandingsStyles(document);
  clearCarrotColumns(standings);
  addLoadingColumn(standings);
  logProgress('start', startedAt, { contestId: page.contestId, page: page.gym ? 'gym' : 'contest' });
  let ratingStatus: 'published' | 'pending' | 'not-finished' | 'unknown' = 'unknown';

  const metadataStartedAt = performance.now();
  const contest = await fetchContest(page.contestId, page.gym).catch((error: unknown) => {
    console.error(`${LOG_PREFIX} Contest unavailable:`, error);
    return null;
  });
  if (contest) {
    logProgress('metadata', startedAt, {
      phase: contest.phase,
      source: 'contest.list',
      stepMs: durationMs(metadataStartedAt),
    });
    if (contest.phase !== 'FINISHED') {
      ratingStatus = 'not-finished';
    }
  }

  if (contest?.phase === 'FINISHED') {
    try {
      const finalStartedAt = performance.now();
      const ratingChanges = await fetchRatingChanges(page.contestId);
      if (ratingChanges.length === 0) {
        ratingStatus = 'pending';
        logProgress('rating', startedAt, {
          status: ratingStatus,
          source: 'contest.ratingChanges',
          changes: 0,
          stepMs: durationMs(finalStartedAt),
        });
      } else {
        const finalResults = await buildFinalResults(ratingChanges);
        ratingStatus = 'published';
        clearCarrotColumns(standings);
        const stats = addFinalRatingColumns(standings, finalResults);
        logProgress('final', startedAt, {
          source: 'contest.ratingChanges',
          changes: ratingChanges.length,
          rendered: renderRatio(stats),
          stepMs: durationMs(finalStartedAt),
        });
        return;
      }
    } catch (error) {
      ratingStatus = 'pending';
      console.info(`${LOG_PREFIX} Rating changes unavailable:`, error);
    }
  }

  const contestStandingsResult = contest
    ? await fetchContestStandings(page.contestId, page.gym, {
      get: getCachedContestStandings,
      set: setCachedContestStandings,
    }).catch((error: unknown) => {
      console.error(`${LOG_PREFIX} Standings unavailable:`, error);
      return null;
    })
    : null;
  if (contestStandingsResult) {
    logStandingsResult('standings', startedAt, contestStandingsResult);
  }

  const predictionResult = contestStandingsResult
    ? await predictContest(contestStandingsResult.standings).catch((predictionError: unknown): PredictionResult => {
      console.error(`${LOG_PREFIX} Prediction failed:`, predictionError);
      return { predictions: null, status: 'failed', reason: errorReason(predictionError) };
    })
    : { predictions: null, status: 'unavailable', reason: 'standings-unavailable' };
  clearCarrotColumns(standings);
  const stats = addPredictedRatingColumns(standings, predictionResult.predictions);
  logProgress('prediction', startedAt, {
    prediction: predictionResult.status,
    reason: predictionResult.reason,
    rating: ratingStatus,
    predictions: predictionResult.predictions?.length ?? 0,
    rendered: renderRatio(stats),
  });
}

function logStandingsResult(stage: string, startedAt: number, result: ContestStandingsResult): void {
  logProgress(stage, startedAt, {
    cache: cacheState(result),
    standings: standingsMode(result),
    source: standingsSource(result),
    rows: result.standings.rows.length,
    statusPages: result.statusPages,
    submissions: result.submissions,
    officialSubmissions: result.officialSubmissions,
    hacks: result.hacks,
    stepMs: ms(result.durationMs),
  });
}

async function buildFinalResults(
  ratingChanges: Awaited<ReturnType<typeof fetchRatingChanges>>,
): Promise<Map<string, FinalRatingResult>> {
  const results = new Map<string, FinalRatingResult>(
    ratingChanges.map((change) => [
      change.handle,
      {
        delta: change.newRating - change.oldRating,
        oldRating: change.oldRating,
        newRating: change.newRating,
      },
    ]),
  );

  for (const prediction of calculatePerformanceFromRatingChanges(ratingChanges)) {
    const result = results.get(prediction.handle);
    if (result) {
      result.performance = prediction.performance;
    }
  }
  return results;
}

async function predictContest(standings: ContestStandings): Promise<PredictionResult> {
  const skipReason = getPredictionSkipReason(standings);
  if (skipReason) {
    return { predictions: null, status: 'skipped', reason: skipReason };
  }

  const ratedUsers = await loadRatedUsers();

  const predictions = predictFromCodeforces(standings, ratedUsers);
  return { predictions, status: 'ok' };
}

async function loadRatedUsers() {
  const cachedUsers = await getCachedRatedUsers();
  if (cachedUsers) {
    return cachedUsers;
  }

  const users = await fetchRatedUsers();
  await setCachedRatedUsers(users);
  return users;
}

function logProgress(stage: string, startedAt: number, details: Record<string, string | number | undefined>): void {
  console.info(`${LOG_PREFIX} ${stage}`, {
    ...withoutUndefined(details),
    totalMs: durationMs(startedAt),
  });
}

function withoutUndefined(details: Record<string, string | number | undefined>): Record<string, string | number> {
  return Object.fromEntries(
    Object.entries(details).filter((entry): entry is [string, string | number] => entry[1] !== undefined),
  );
}

function standingsSource(result: ContestStandingsResult): string {
  if (result.source === 'api') {
    return 'contest.standings';
  }
  if (result.source === 'api-cache') {
    return 'contest.standings-cache';
  }
  return result.source === 'status-rebuild-cache' ? 'contest.status-cache' : 'contest.status';
}

function cacheState(result: ContestStandingsResult): string {
  return result.source.endsWith('-cache') ? 'hit' : 'miss';
}

function standingsMode(result: ContestStandingsResult): string {
  if (result.source === 'api' || result.source === 'api-cache') {
    return result.source === 'api-cache' ? 'api-cache' : 'api';
  }
  return result.source === 'status-rebuild-cache' ? 'fallback-cache' : 'fallback';
}

function renderRatio(stats: ColumnRenderStats): string {
  return `${stats.matchedRows}/${stats.dataRows}`;
}

function durationMs(startedAt: number): number {
  return ms(performance.now() - startedAt);
}

function ms(duration: number): number {
  return Math.round(duration);
}

function errorReason(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

void main();
