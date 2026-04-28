import { lowerBoundInt } from '../math/binary-search';
import { RealConvolution } from '../math/convolution';

const DEFAULT_RATING = 1400;
const MIN_RATING = -500;
const MAX_RATING = 6000;
const RATING_SPAN = MAX_RATING - MIN_RATING;
const RATING_INDEX_OFFSET = -MIN_RATING;
const WIN_PROBABILITY_OFFSET = RATING_SPAN;

const winProbability = Array.from(
  { length: 2 * RATING_SPAN + 1 },
  (_, index) => 1 / (1 + 10 ** ((index - WIN_PROBABILITY_OFFSET) / 400)),
);

const convolution = new RealConvolution(winProbability.length + RATING_SPAN - 1);

export interface PredictionInput {
  handle: string;
  points: number;
  penalty: number;
  rating: number | null;
}

export interface RankedPredictionInput {
  handle: string;
  rank: number;
  rating: number | null;
}

export interface Prediction {
  handle: string;
  rating: number | null;
  delta: number;
  performance: number;
}

interface MutableContestant extends PredictionInput {
  effectiveRating: number;
  rank: number;
  delta: number;
  performance: number;
}

export function predictDeltas(entries: PredictionInput[]): Prediction[] {
  const contestants = entries.map(toMutableContestant);
  const seeds = buildSeeds(contestants);

  assignRanks(contestants);
  calculate(contestants, seeds);

  return toPredictions(contestants);
}

export function predictDeltasFromRanks(entries: RankedPredictionInput[]): Prediction[] {
  const contestants = entries.map(toRankedMutableContestant);
  const seeds = buildSeeds(contestants);

  calculate(contestants, seeds);

  return toPredictions(contestants);
}

function calculate(contestants: MutableContestant[], seeds: number[]): void {
  for (const contestant of contestants) {
    contestant.delta = calculateDelta(contestant, contestant.effectiveRating, seeds);
  }

  const adjustment = adjustDeltas(contestants);
  for (const contestant of contestants) {
    contestant.performance = calculatePerformance(contestant, seeds, adjustment);
  }
}

function toPredictions(contestants: MutableContestant[]): Prediction[] {
  return contestants.map(({ handle, rating, delta, performance }) => ({
    handle,
    rating,
    delta,
    performance,
  }));
}

function toMutableContestant(entry: PredictionInput): MutableContestant {
  return {
    ...entry,
    effectiveRating: entry.rating ?? DEFAULT_RATING,
    rank: 0,
    delta: 0,
    performance: 0,
  };
}

function toRankedMutableContestant(entry: RankedPredictionInput): MutableContestant {
  return {
    handle: entry.handle,
    points: 0,
    penalty: 0,
    rating: entry.rating,
    effectiveRating: entry.rating ?? DEFAULT_RATING,
    rank: entry.rank,
    delta: 0,
    performance: 0,
  };
}

function buildSeeds(contestants: MutableContestant[]): number[] {
  const ratingCounts = new Array<number>(RATING_SPAN).fill(0);
  for (const contestant of contestants) {
    ratingCounts[contestant.effectiveRating + RATING_INDEX_OFFSET] += 1;
  }

  const seeds = convolution.convolve(winProbability, ratingCounts);
  for (let index = 0; index < seeds.length; index += 1) {
    seeds[index] = seeds[index]! + 1;
  }
  return seeds;
}

function seedForRating(rating: number, excludedRating: number, seeds: number[]): number {
  return seeds[rating + WIN_PROBABILITY_OFFSET + RATING_INDEX_OFFSET]! -
    winProbability[rating - excludedRating + WIN_PROBABILITY_OFFSET]!;
}

function assignRanks(contestants: MutableContestant[]): void {
  contestants.sort((left, right) =>
    left.points === right.points ? left.penalty - right.penalty : right.points - left.points,
  );

  let rank = 0;
  let previousPoints: number | null = null;
  let previousPenalty: number | null = null;
  for (const [index, contestant] of contestants.entries()) {
    if (contestant.points !== previousPoints || contestant.penalty !== previousPenalty) {
      rank = index + 1;
      previousPoints = contestant.points;
      previousPenalty = contestant.penalty;
    }
    contestant.rank = rank;
  }
}

function calculateDelta(contestant: MutableContestant, assumedRating: number, seeds: number[]): number {
  const seed = seedForRating(assumedRating, contestant.effectiveRating, seeds);
  const targetRank = Math.sqrt(contestant.rank * seed);
  const ratingNeeded = ratingForRank(targetRank, contestant.effectiveRating, seeds);
  return Math.trunc((ratingNeeded - assumedRating) / 2);
}

function ratingForRank(rank: number, ownRating: number, seeds: number[]): number {
  return lowerBoundInt(2, MAX_RATING, (rating) => seedForRating(rating, ownRating, seeds) < rank) - 1;
}

function adjustDeltas(contestants: MutableContestant[]): number {
  contestants.sort((left, right) => right.effectiveRating - left.effectiveRating);

  const totalDelta = contestants.reduce((sum, contestant) => sum + contestant.delta, 0);
  const primaryAdjustment = Math.trunc(-totalDelta / contestants.length) - 1;
  for (const contestant of contestants) {
    contestant.delta += primaryAdjustment;
  }

  const leaderCount = Math.min(4 * Math.round(Math.sqrt(contestants.length)), contestants.length);
  const leaderDelta = contestants.slice(0, leaderCount).reduce((sum, contestant) => sum + contestant.delta, 0);
  const leaderAdjustment = Math.min(Math.max(Math.trunc(-leaderDelta / leaderCount), -10), 0);
  for (const contestant of contestants) {
    contestant.delta += leaderAdjustment;
  }

  return primaryAdjustment + leaderAdjustment;
}

function calculatePerformance(
  contestant: MutableContestant,
  seeds: number[],
  adjustment: number,
): number {
  if (contestant.rank === 1) {
    return Infinity;
  }

  return lowerBoundInt(
    MIN_RATING,
    MAX_RATING,
    (assumedRating) => calculateDelta(contestant, assumedRating, seeds) + adjustment <= 0,
  );
}
