/**
 * The leaderboard's order. The database adds the scores up
 * (`public.leaderboard()`); this gives each Learner a place, with Learners on
 * the same points sharing one, the way a race is called: 1, 2, 2, 4.
 *
 * No `@/` imports: Node's test runner executes this file directly.
 */

export interface BoardRow {
  name: string;
  /** The scores of the Learner's latest attempt at each Task, added up. */
  points: number;
  /** How many Tasks those points come from. */
  tasks: number;
  average: number;
  /** This row is the person looking. */
  is_viewer: boolean;
}

export interface RankedRow extends BoardRow {
  rank: number;
}

export function rankRows(rows: readonly BoardRow[]): RankedRow[] {
  const ordered = [...rows].sort(
    (a, b) => b.points - a.points || b.tasks - a.tasks || a.name.localeCompare(b.name, 'en'),
  );
  const ranked: RankedRow[] = [];
  ordered.forEach((row, index) => {
    const above = ranked[index - 1];
    ranked.push({ ...row, rank: above && above.points === row.points ? above.rank : index + 1 });
  });
  return ranked;
}
