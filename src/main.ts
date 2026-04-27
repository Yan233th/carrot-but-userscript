import { fetchContestStandings, fetchRatedUsers, fetchRatingChanges } from './codeforces/api';
import { getStandingsPage } from './codeforces/page';
import { predictFromCodeforces } from './rating/codeforces';
import { addFinalDeltaColumn, addPredictedDeltaColumn, findStandingsTable } from './standings/table';
import { installStandingsStyles } from './standings/style';

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
  let finalDeltas: Map<string, number> | null = null;
  try {
    const ratingChanges = await fetchRatingChanges(page.contestId);
    finalDeltas = new Map(
      ratingChanges.map((change) => [change.handle, change.newRating - change.oldRating]),
    );
  } catch (error) {
    console.info(`${LOG_PREFIX} Rating changes unavailable:`, error);
    const predictions = await predictContest(page.contestId);
    addPredictedDeltaColumn(standings, predictions);
    console.info(`${LOG_PREFIX} Ready on standings page:`, page.contestId);
    return;
  }

  addFinalDeltaColumn(standings, finalDeltas);
  console.info(`${LOG_PREFIX} Ready on standings page:`, page.contestId);
}

async function predictContest(contestId: string) {
  const [standings, ratedUsers] = await Promise.all([
    fetchContestStandings(contestId),
    fetchRatedUsers(),
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

void main();
