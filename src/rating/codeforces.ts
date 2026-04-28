import type { ContestStandings, RatedUser, RatingChange } from '../codeforces/api';
import {
  type Prediction,
  type PredictionInput,
  predictDeltas,
} from './predict';

const EDUCATIONAL_RATED_THRESHOLD = 2100;
const RATING_PENDING_MAX_DAYS = 3;
const UNRATED_CONTEST_NAME_HINTS = ['unrated', 'fools', 'q#', 'kotlin', 'marathon', 'teams'];
const FAKE_RATINGS_SINCE_CONTEST = 1360;
const NEW_DEFAULT_RATING = 1400;

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

export function calculateFinalPerformanceFromCodeforces(
  standings: ContestStandings,
  ratingChanges: RatingChange[],
): Prediction[] {
  const ratings = getAdjustedOldRatings(standings.contest.id, ratingChanges);
  return predictDeltas(getFinalPredictionEntries(standings, ratings));
}

export function isPredictionEligible(standings: ContestStandings, nowMs = Date.now()): boolean {
  return getPredictionSkipReason(standings, nowMs) === null;
}

export function getPredictionSkipReason(standings: ContestStandings, nowMs = Date.now()): string | null {
  if (isUnratedByName(standings.contest.name)) {
    return 'contest-name-unrated';
  }
  if (standings.rows.some((row) => row.party.teamId !== undefined || row.party.teamName !== undefined)) {
    return 'team-contest';
  }
  if (!standings.rows.some((row) => row.party.participantType === 'CONTESTANT')) {
    return 'no-contestants';
  }
  if (isOldFinishedContest(standings, nowMs)) {
    return 'old-finished-without-rating-changes';
  }
  return null;
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

function getFinalPredictionEntries(
  standings: ContestStandings,
  ratings: Map<string, number>,
): PredictionInput[] {
  const seenHandles = new Set<string>();
  const entries = standings.rows
    .map((row) => {
      const handle = row.party.members[0]?.handle;
      if (!handle || !ratings.has(handle)) {
        return null;
      }
      seenHandles.add(handle);

      return {
        handle,
        points: row.points,
        penalty: row.penalty,
        rating: ratings.get(handle)!,
      };
    })
    .filter((entry) => entry !== null);

  for (const [handle, rating] of ratings) {
    if (!seenHandles.has(handle)) {
      entries.push({ handle, points: 0, penalty: 0, rating });
    }
  }

  return entries;
}

function getAdjustedOldRatings(contestId: number, ratingChanges: RatingChange[]): Map<string, number> {
  return new Map(
    ratingChanges.map((change) => [
      change.handle,
      contestId >= FAKE_RATINGS_SINCE_CONTEST && change.oldRating === 0
        ? NEW_DEFAULT_RATING
        : change.oldRating,
    ]),
  );
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
