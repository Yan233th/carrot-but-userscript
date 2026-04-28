import { describe, expect, test } from 'bun:test';
import { predictDeltas, predictDeltasFromRanks } from './predict';

describe('predictDeltas', () => {
  test('matches known baseline sample', () => {
    const result = predictDeltas([
      { handle: 'a', points: 3, penalty: 10, rating: 1500 },
      { handle: 'b', points: 2, penalty: 20, rating: 1500 },
      { handle: 'c', points: 1, penalty: 30, rating: null },
    ]);

    expect(result).toEqual([
      { handle: 'a', rating: 1500, delta: 100, performance: Infinity },
      { handle: 'b', rating: 1500, delta: -19, performance: 1419 },
      { handle: 'c', rating: null, delta: -82, performance: -14 },
    ]);
  });

  test('calculates performance from known ranks', () => {
    const result = predictDeltasFromRanks([
      { handle: 'a', rank: 1, rating: 1500 },
      { handle: 'b', rank: 2, rating: 1500 },
      { handle: 'c', rank: 3, rating: null },
    ]);

    expect(result).toEqual([
      { handle: 'a', rating: 1500, delta: 100, performance: Infinity },
      { handle: 'b', rating: 1500, delta: -19, performance: 1419 },
      { handle: 'c', rating: null, delta: -82, performance: -14 },
    ]);
  });

  test('uses first rank for tied standings groups', () => {
    const fromScores = predictDeltas([
      { handle: 'a', points: 3, penalty: 10, rating: 1500 },
      { handle: 'b', points: 3, penalty: 10, rating: 1500 },
      { handle: 'c', points: 1, penalty: 30, rating: 1500 },
    ]);
    const fromRanks = predictDeltasFromRanks([
      { handle: 'a', rank: 1, rating: 1500 },
      { handle: 'b', rank: 1, rating: 1500 },
      { handle: 'c', rank: 3, rating: 1500 },
    ]);

    expect(fromScores).toEqual(fromRanks);
  });
});
