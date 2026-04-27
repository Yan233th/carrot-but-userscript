import type { ContestStandings, RatedUser } from '../codeforces/api';
import { type Prediction, predictDeltas } from './predict';

export function predictFromCodeforces(
  standings: ContestStandings,
  ratedUsers: RatedUser[],
): Prediction[] {
  const ratings = new Map(ratedUsers.map((user) => [user.handle, user.rating]));
  const entries = standings.rows
    .filter((row) => row.party.participantType === 'CONTESTANT')
    .filter((row) => row.party.teamId === undefined && row.party.teamName === undefined)
    .map((row) => {
      const handle = row.party.members[0]?.handle;
      if (!handle) {
        return null;
      }

      return {
        handle,
        points: row.points,
        penalty: row.penalty,
        rating: ratings.get(handle) ?? null,
      };
    })
    .filter((entry) => entry !== null);

  return predictDeltas(entries);
}
