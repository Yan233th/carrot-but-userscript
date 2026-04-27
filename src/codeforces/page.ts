const STANDINGS_PATH_PATTERN = /^\/(?:contest|gym)\/(\d+)\/standings(?:\/.*)?$/;

export interface StandingsPage {
  contestId: string;
}

export function getStandingsPage(location: Location): StandingsPage | null {
  const contestId = STANDINGS_PATH_PATTERN.exec(location.pathname)?.[1];
  return contestId ? { contestId } : null;
}
