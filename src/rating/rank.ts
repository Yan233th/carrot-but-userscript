export interface Rank {
  name: string;
  abbr: string;
  low: number;
  high: number;
  colorClass: string | null;
}

export const UNRATED_RANK: Rank = {
  name: 'Unrated',
  abbr: 'U',
  low: -Infinity,
  high: Infinity,
  colorClass: null,
};

export const RATED_RANKS: Rank[] = [
  { name: 'Newbie', abbr: 'N', low: -Infinity, high: 1200, colorClass: 'user-gray' },
  { name: 'Pupil', abbr: 'P', low: 1200, high: 1400, colorClass: 'user-green' },
  { name: 'Specialist', abbr: 'S', low: 1400, high: 1600, colorClass: 'user-cyan' },
  { name: 'Expert', abbr: 'E', low: 1600, high: 1900, colorClass: 'user-blue' },
  { name: 'Candidate Master', abbr: 'CM', low: 1900, high: 2100, colorClass: 'user-violet' },
  { name: 'Master', abbr: 'M', low: 2100, high: 2300, colorClass: 'user-orange' },
  { name: 'International Master', abbr: 'IM', low: 2300, high: 2400, colorClass: 'user-orange' },
  { name: 'Grandmaster', abbr: 'GM', low: 2400, high: 2600, colorClass: 'user-red' },
  { name: 'International Grandmaster', abbr: 'IGM', low: 2600, high: 3000, colorClass: 'user-red' },
  { name: 'Legendary Grandmaster', abbr: 'LGM', low: 3000, high: 4000, colorClass: 'user-legendary' },
  { name: 'Tourist', abbr: 'T', low: 4000, high: Infinity, colorClass: 'user-4000' },
];

export function getRank(rating: number | null): Rank {
  if (rating === null) {
    return UNRATED_RANK;
  }
  return RATED_RANKS.find((rank) => rating < rank.high) ?? RATED_RANKS[RATED_RANKS.length - 1]!;
}

export function getNextRank(rank: Rank): Rank | null {
  const index = RATED_RANKS.indexOf(rank);
  return index >= 0 ? RATED_RANKS[index + 1] ?? null : RATED_RANKS[0]!;
}
