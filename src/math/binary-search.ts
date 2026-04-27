export function lowerBoundInt(start: number, end: number, matches: (value: number) => boolean): number {
  let left = start;
  let right = end;
  while (left < right) {
    const middle = Math.floor((left + right) / 2);
    if (matches(middle)) {
      right = middle;
    } else {
      left = middle + 1;
    }
  }
  return left;
}
