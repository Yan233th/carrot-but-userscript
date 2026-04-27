export class RealConvolution {
  private readonly size: number;
  private readonly reverseIndex: number[];
  private readonly rootReal: number[];
  private readonly rootImaginary: number[];

  constructor(requiredSize: number) {
    let bits = 1;
    while (2 ** bits < requiredSize) {
      bits += 1;
    }

    this.size = 2 ** bits;
    const reverseIndex = new Array<number>(this.size);
    reverseIndex[0] = 0;
    for (let index = 1; index < this.size; index += 1) {
      reverseIndex[index] = (reverseIndex[index >> 1]! >> 1) | ((index & 1) << (bits - 1));
    }
    this.reverseIndex = reverseIndex;

    const half = this.size / 2;
    const angleStep = (2 * Math.PI) / this.size;
    this.rootReal = Array.from({ length: half }, (_, index) => Math.cos(index * angleStep));
    this.rootImaginary = Array.from({ length: half }, (_, index) => Math.sin(index * angleStep));
  }

  convolve(left: number[], right: number[]): number[] {
    if (left.length === 0 || right.length === 0) {
      return [];
    }

    const resultLength = left.length + right.length - 1;
    if (resultLength > this.size) {
      throw new Error(`Convolution result length ${resultLength} exceeds FFT size ${this.size}`);
    }

    const real = new Array<number>(this.size).fill(0);
    const imaginary = new Array<number>(this.size).fill(0);
    for (let index = 0; index < left.length; index += 1) {
      real[index] = left[index]!;
    }
    for (let index = 0; index < right.length; index += 1) {
      imaginary[index] = right[index]!;
    }

    this.transform(real, imaginary);
    real[0] = 4 * real[0]! * imaginary[0]!;
    imaginary[0] = 0;

    for (let index = 1, mirror = this.size - 1; index <= mirror; index += 1, mirror -= 1) {
      const leftReal = real[index]! + real[mirror]!;
      const leftImaginary = imaginary[index]! - imaginary[mirror]!;
      const rightReal = imaginary[mirror]! + imaginary[index]!;
      const rightImaginary = real[mirror]! - real[index]!;
      real[index] = leftReal * rightReal - leftImaginary * rightImaginary;
      imaginary[index] = leftReal * rightImaginary + leftImaginary * rightReal;
      real[mirror] = real[index]!;
      imaginary[mirror] = -imaginary[index]!;
    }

    this.transform(real, imaginary);
    const result = new Array<number>(resultLength);
    result[0] = real[0]! / (4 * this.size);
    for (let index = 1, mirror = this.size - 1; index <= mirror && index < resultLength; index += 1, mirror -= 1) {
      result[index] = real[mirror]! / (4 * this.size);
      if (mirror < resultLength) {
        result[mirror] = real[index]! / (4 * this.size);
      }
    }

    return result;
  }

  private transform(real: number[], imaginary: number[]): void {
    this.applyBitReverse(real);
    this.applyBitReverse(imaginary);

    for (let block = 2; block <= this.size; block *= 2) {
      const halfBlock = block / 2;
      const step = this.size / block;
      for (let offset = 0; offset < this.size; offset += block) {
        let rootIndex = 0;
        for (let index = offset; index < offset + halfBlock; index += 1) {
          const pair = index + halfBlock;
          const rotatedReal = real[pair]! * this.rootReal[rootIndex]! - imaginary[pair]! * this.rootImaginary[rootIndex]!;
          const rotatedImaginary = real[pair]! * this.rootImaginary[rootIndex]! + imaginary[pair]! * this.rootReal[rootIndex]!;
          real[pair] = real[index]! - rotatedReal;
          imaginary[pair] = imaginary[index]! - rotatedImaginary;
          real[index] += rotatedReal;
          imaginary[index] += rotatedImaginary;
          rootIndex += step;
        }
      }
    }
  }

  private applyBitReverse(values: number[]): void {
    for (let index = 1; index < this.size; index += 1) {
      const mirror = this.reverseIndex[index]!;
      if (index < mirror) {
        const current = values[index]!;
        values[index] = values[mirror]!;
        values[mirror] = current;
      }
    }
  }
}
