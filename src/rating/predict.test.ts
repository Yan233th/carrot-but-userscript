import { describe, expect, test } from 'bun:test';
import { predictDeltas } from './predict';

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

  test('matches carrot rank semantics for tied standings groups', () => {
    const result = predictDeltas([
      { handle: 'a', points: 3, penalty: 10, rating: 1500 },
      { handle: 'b', points: 3, penalty: 10, rating: 1500 },
      { handle: 'c', points: 1, penalty: 30, rating: 1500 },
    ]);

    expect(result[0]!.rating).toBe(result[1]!.rating);
    expect(result[0]!.delta).toBe(result[1]!.delta);
    expect(result[0]!.performance).toBe(result[1]!.performance);
    expect(result[2]!.delta).toBeLessThan(result[0]!.delta);
    expect(result[2]!.performance).toBeLessThan(result[0]!.performance);
  });
});
