const STANDINGS_PATH_PATTERN = /^\/(contest|gym)\/(\d+)\/standings(?:\/.*)?$/;

export interface StandingsPage {
  contestId: string;
  gym: boolean;
}

export function getStandingsPage(location: Location): StandingsPage | null {
  const match = STANDINGS_PATH_PATTERN.exec(location.pathname);
  if (!match) {
    return null;
  }
  return {
    contestId: match[2]!,
    gym: match[1] === 'gym',
  };
}
