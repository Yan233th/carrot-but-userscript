import { fetchRatingChanges } from './codeforces/api';
import { getStandingsPage } from './codeforces/page';
import { addFinalDeltaColumn, findStandingsTable } from './standings/table';
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
  }

  addFinalDeltaColumn(standings, finalDeltas);
  console.info(`${LOG_PREFIX} Ready on standings page:`, page.contestId);
}

void main();
