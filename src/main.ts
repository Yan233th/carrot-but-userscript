import { fetchContest, fetchContestStandings, fetchRatedUsers, fetchRatingChanges, type ContestStandings, type ContestStandingsResult } from './codeforces/api';
import { getStandingsPage } from './codeforces/page';
import { calculatePerformanceFromRatingChanges, isPredictionEligible, predictFromCodeforces } from './rating/codeforces';
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

const LOG_PREFIX = '[Carrot, But Userscript]';

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
  }

  if (contest?.phase === 'FINISHED') {
    try {
      const finalStartedAt = performance.now();
      const ratingChanges = await fetchRatingChanges(page.contestId);
      const finalResults = await buildFinalResults(ratingChanges);
      clearCarrotColumns(standings);
      const stats = addFinalRatingColumns(standings, finalResults);
      logProgress('final', startedAt, {
        source: 'contest.ratingChanges',
        changes: ratingChanges.length,
        rendered: renderRatio(stats),
        stepMs: durationMs(finalStartedAt),
      });
      return;
    } catch (error) {
      console.info(`${LOG_PREFIX} Rating changes unavailable:`, error);
    }
  }

  const contestStandingsResult = contest
    ? await fetchContestStandings(page.contestId, page.gym).catch((error: unknown) => {
      console.error(`${LOG_PREFIX} Standings unavailable:`, error);
      return null;
    })
    : null;

  const predictions = contestStandingsResult
    ? await predictContest(contestStandingsResult.standings).catch((predictionError: unknown) => {
      console.error(`${LOG_PREFIX} Prediction failed:`, predictionError);
      return null;
    })
    : null;
  clearCarrotColumns(standings);
  const stats = addPredictedRatingColumns(standings, predictions);
  logProgress('prediction', startedAt, {
    standings: contestStandingsResult ? standingsMode(contestStandingsResult) : 'unavailable',
    source: contestStandingsResult ? standingsSource(contestStandingsResult) : 'unavailable',
    rows: contestStandingsResult?.standings.rows.length ?? 0,
    rendered: renderRatio(stats),
    stepMs: contestStandingsResult ? ms(contestStandingsResult.durationMs) : undefined,
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

async function predictContest(standings: ContestStandings) {
  if (!isPredictionEligible(standings)) {
    return null;
  }

  const ratedUsers = await loadRatedUsers();

  const predictions = predictFromCodeforces(standings, ratedUsers);
  return predictions;
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
    ...details,
    totalMs: durationMs(startedAt),
  });
}

function standingsSource(result: ContestStandingsResult): string {
  return result.source === 'api' ? 'contest.standings' : 'contest.status';
}

function standingsMode(result: ContestStandingsResult): string {
  return result.source === 'api' ? 'api' : 'fallback';
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

void main();
