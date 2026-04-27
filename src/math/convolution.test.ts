import { describe, expect, test } from 'bun:test';
import { RealConvolution } from './convolution';

describe('RealConvolution', () => {
  test('convolves real sequences', () => {
    const result = new RealConvolution(8)
      .convolve([0.125, 0.25, 0.5], [4, 3, 2, 1])
      .map((value) => Number(value.toFixed(6)));

    expect(result).toEqual([0.5, 1.375, 3, 2.125, 1.25, 0.5]);
  });
});
