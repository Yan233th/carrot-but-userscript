import { fetchContestStandings, fetchRatedUsers, fetchRatingChanges } from './codeforces/api';
import { getStandingsPage } from './codeforces/page';
import { predictFromCodeforces } from './rating/codeforces';
import {
  addFinalDeltaColumn,
  addLoadingColumn,
  addPredictedDeltaColumn,
  type ColumnRenderStats,
  clearCarrotColumns,
  findStandingsTable,
} from './standings/table';
import { installStandingsStyles } from './standings/style';
import { getCachedRatedUsers, setCachedRatedUsers } from './storage/rated-users-cache';

const LOG_PREFIX = '[Carrot, But Userscript]';

async function main(): Promise<void> {
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
  let finalDeltas: Map<string, number> | null = null;
  try {
    const ratingChanges = await fetchRatingChanges(page.contestId);
    finalDeltas = new Map(
      ratingChanges.map((change) => [change.handle, change.newRating - change.oldRating]),
    );
  } catch (error) {
    console.info(`${LOG_PREFIX} Rating changes unavailable:`, error);
    const predictions = await predictContest(page.contestId).catch((predictionError: unknown) => {
      console.error(`${LOG_PREFIX} Prediction failed:`, predictionError);
      return null;
    });
    clearCarrotColumns(standings);
    logRenderStats('predicted', addPredictedDeltaColumn(standings, predictions));
    console.info(`${LOG_PREFIX} Ready on standings page:`, page.contestId);
    return;
  }

  clearCarrotColumns(standings);
  logRenderStats('final', addFinalDeltaColumn(standings, finalDeltas));
  console.info(`${LOG_PREFIX} Ready on standings page:`, page.contestId);
}

async function predictContest(contestId: string) {
  const [standings, ratedUsers] = await Promise.all([
    fetchContestStandings(contestId),
    loadRatedUsers(),
  ]);

  const predictions = predictFromCodeforces(standings, ratedUsers);
  console.info(`${LOG_PREFIX} Prediction complete:`, {
    contest: standings.contest.name,
    rows: standings.rows.length,
    ratedUsers: ratedUsers.length,
    predictions: predictions.length,
  });
  return predictions;
}

async function loadRatedUsers() {
  const cachedUsers = await getCachedRatedUsers();
  if (cachedUsers) {
    console.info(`${LOG_PREFIX} Using cached rated users:`, cachedUsers.length);
    return cachedUsers;
  }

  const users = await fetchRatedUsers();
  await setCachedRatedUsers(users);
  console.info(`${LOG_PREFIX} Cached rated users:`, users.length);
  return users;
}

function logRenderStats(mode: 'final' | 'predicted', stats: ColumnRenderStats): void {
  console.info(`${LOG_PREFIX} Rendered ${mode} delta column:`, {
    matchedRows: stats.matchedRows,
    dataRows: stats.dataRows,
  });
}

void main();
