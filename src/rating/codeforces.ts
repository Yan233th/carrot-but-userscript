import type { ContestStandings, RatedUser, RatingChange } from '../codeforces/api';
import {
  type Prediction,
  type PredictionInput,
  type RankedPredictionInput,
  predictDeltas,
  predictDeltasFromRanks,
} from './predict';

const EDUCATIONAL_RATED_THRESHOLD = 2100;
const RATING_PENDING_MAX_DAYS = 3;
const UNRATED_CONTEST_NAME_HINTS = ['unrated', 'fools', 'q#', 'kotlin', 'marathon', 'teams'];

export function predictFromCodeforces(
  standings: ContestStandings,
  ratedUsers: RatedUser[],
): Prediction[] {
  const ratings = new Map(ratedUsers.map((user) => [user.handle, user.rating]));
  const entries = getPredictionEntries(standings, ratings, {
    includeUnrated: true,
    filterEducationalRatedUsers: true,
  });

  return predictDeltas(entries);
}

export function calculatePerformanceFromCodeforces(
  standings: ContestStandings,
  ratings: Map<string, number>,
): Prediction[] {
  return predictDeltas(getPredictionEntries(standings, ratings, { includeUnrated: false }));
}

export function calculatePerformanceFromRatingChanges(ratingChanges: RatingChange[]): Prediction[] {
  const entries: RankedPredictionInput[] = ratingChanges.map((change) => ({
    handle: change.handle,
    rank: change.rank,
    rating: change.oldRating,
  }));
  return predictDeltasFromRanks(entries);
}

export function isPredictionEligible(standings: ContestStandings, nowMs = Date.now()): boolean {
  if (isUnratedByName(standings.contest.name)) {
    return false;
  }
  if (standings.rows.some((row) => row.party.teamId !== undefined || row.party.teamName !== undefined)) {
    return false;
  }
  if (!standings.rows.some((row) => row.party.participantType === 'CONTESTANT')) {
    return false;
  }
  if (isOldFinishedContest(standings, nowMs)) {
    return false;
  }
  return true;
}

function getPredictionEntries(
  standings: ContestStandings,
  ratings: Map<string, number>,
  options: {
    includeUnrated: boolean;
    filterEducationalRatedUsers?: boolean;
  },
): PredictionInput[] {
  const isEducational = options.filterEducationalRatedUsers && isEducationalRound(standings.contest.name);

  return standings.rows
    .filter((row) => row.party.participantType === 'CONTESTANT')
    .filter((row) => row.party.teamId === undefined && row.party.teamName === undefined)
    .map((row) => {
      const handle = row.party.members[0]?.handle;
      if (!handle) {
        return null;
      }
      const rating = ratings.get(handle) ?? null;
      if (rating === null && !options.includeUnrated) {
        return null;
      }
      if (isEducational && rating !== null && rating >= EDUCATIONAL_RATED_THRESHOLD) {
        return null;
      }

      return {
        handle,
        points: row.points,
        penalty: row.penalty,
        rating,
      };
    })
    .filter((entry) => entry !== null);
}

function isEducationalRound(contestName: string): boolean {
  return contestName.toLowerCase().includes('educational');
}

function isUnratedByName(contestName: string): boolean {
  const lowerName = contestName.toLowerCase();
  return UNRATED_CONTEST_NAME_HINTS.some((hint) => lowerName.includes(hint));
}

function isOldFinishedContest(standings: ContestStandings, nowMs: number): boolean {
  const { contest } = standings;
  if (contest.phase !== 'FINISHED' || contest.startTimeSeconds === undefined) {
    return false;
  }

  const contestEndMs = (contest.startTimeSeconds + contest.durationSeconds) * 1000;
  const daysSinceEnd = (nowMs - contestEndMs) / (24 * 60 * 60 * 1000);
  return daysSinceEnd > RATING_PENDING_MAX_DAYS;
}
