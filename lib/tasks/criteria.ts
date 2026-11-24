/**
 * Grading criteria, read as the Mentor wrote them.
 *
 * A Mentor writes criteria as prose with points, the way the seed does:
 * "All three actions work: 40. Survives a reload: 30." This turns that into
 * a list both evaluators mark against, one criterion at a time, so the total
 * is added up here and never taken from a model. Criteria with no points in
 * them are one criterion worth everything.
 *
 * No `@/` imports: Node's test runner executes this file directly.
 */

export interface Criterion {
  label: string;
  /** The most this criterion can earn; whole and above zero. */
  points: number;
}

/** `: 40`, `: 40 points`, `: 40%`, ending a criterion. */
const POINTS = /:\s*(\d{1,3})\s*(?:points?|pts?|marks?|%)?\s*(?=[.;,\n]|$)/gi;

const MAX_LABEL = 200;

function label(raw: string): string {
  return raw
    .replace(/^[\s.;,]+/, '')
    .replace(/^(?:[-–•*]|\d+[.)])\s+/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_LABEL);
}

/** The criteria that carry points, in the order written; empty when none do. */
export function parseCriteria(text: string): Criterion[] {
  const found: Criterion[] = [];
  let from = 0;
  for (const match of text.matchAll(POINTS)) {
    const name = label(text.slice(from, match.index));
    const points = Number(match[1]);
    from = match.index + match[0].length;
    if (name && points > 0) found.push({ label: name, points });
  }
  return found;
}

/** What an evaluator marks against: the parsed criteria, or the whole text as one. */
export function criteriaToMark(text: string): Criterion[] {
  const parsed = parseCriteria(text);
  if (parsed.length > 0) return parsed;
  return [{ label: text.replace(/\s+/g, ' ').trim().slice(0, MAX_LABEL), points: 100 }];
}

export function totalPoints(criteria: readonly Criterion[]): number {
  return criteria.reduce((sum, criterion) => sum + criterion.points, 0);
}

/**
 * A score out of 100 from points earned per criterion. Each is held to its
 * own range first, so no single number a model returns can lift the total.
 */
export function scoreFrom(criteria: readonly Criterion[], earned: readonly number[]): number {
  const total = totalPoints(criteria);
  if (total === 0) return 0;
  const sum = criteria.reduce(
    (acc, criterion, index) => acc + Math.min(criterion.points, Math.max(0, Math.round(earned[index] ?? 0))),
    0,
  );
  return Math.round((sum / total) * 100);
}
