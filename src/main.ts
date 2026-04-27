import { getStandingsPage } from './codeforces/page';
import { addPlaceholderColumn, findStandingsTable } from './standings/table';
import { installStandingsStyles } from './standings/style';

const LOG_PREFIX = '[Carrot, But Userscript]';

function main(): void {
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
  addPlaceholderColumn(standings, page.contestId);
  console.info(`${LOG_PREFIX} Ready on standings page:`, page.contestId);
}

main();
