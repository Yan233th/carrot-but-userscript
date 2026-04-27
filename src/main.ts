const STANDINGS_PATH_PATTERN = /^\/(?:contest|gym)\/(\d+)\/standings\/?$/;

function getContestId(pathname: string): string | null {
  return STANDINGS_PATH_PATTERN.exec(pathname)?.[1] ?? null;
}

function main(): void {
  const contestId = getContestId(window.location.pathname);
  if (!contestId) {
    return;
  }

  console.info('[Carrot, But Userscript] Ready on standings page:', contestId);
}

main();
