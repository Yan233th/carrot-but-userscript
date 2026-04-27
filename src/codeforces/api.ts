const API_ROOT = 'https://codeforces.com/api/';

interface ApiResponse<T> {
  status: 'OK' | 'FAILED';
  comment?: string;
  result?: T;
}

export interface RatingChange {
  contestId: number;
  handle: string;
  rank: number;
  ratingUpdateTimeSeconds: number;
  oldRating: number;
  newRating: number;
}

export async function fetchRatingChanges(contestId: string): Promise<RatingChange[]> {
  return await fetchApi<RatingChange[]>('contest.ratingChanges', { contestId });
}

async function fetchApi<T>(method: string, query: Record<string, string>): Promise<T> {
  const url = new URL(method, API_ROOT);
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    credentials: 'include',
    cache: 'no-store',
  });
  const payload = (await response.json()) as ApiResponse<T>;

  if (!response.ok || payload.status !== 'OK' || payload.result === undefined) {
    throw new Error(payload.comment ?? `Codeforces API request failed: ${method}`);
  }

  return payload.result;
}
