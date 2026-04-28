import type { ContestStandings, RatedUser, RatingChange } from '../codeforces/api';
import {
  type Prediction,
  type PredictionInput,
  type RankedPredictionInput,
  predictDeltas,
  predictDeltasFromRanks,
} from './predict';

const EDUCATIONAL_RATED_THRESHOLD = 2100;

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
