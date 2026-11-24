/**
 * The `mock` evaluator — BRIEF.md, rule 5: deterministic, no network, no key.
 *
 * It is a stand-in for a reader, not a reader: it marks each criterion by how
 * many of the criterion's own words the work uses, how much work there is,
 * and a number hashed from both. The same Task and Submission always earn the
 * same marks, and the feedback names the criteria and the words it looked
 * for, so the pages built on an Evaluation can be seen working without a model.
 *
 * No `@/` imports: Node's test runner executes this file directly.
 */

import { mockFeedback as copy } from '../../content/tasks.ts';
import { fill } from '../admin-payments.ts';
import type { EvaluationInput, EvaluationResult } from '../evaluation-contract.ts';
import { criteriaToMark, scoreFrom, type Criterion } from './criteria.ts';
import { writeFeedback, type FeedbackItem } from './feedback.ts';

export const MOCK_MODEL = 'mock';

/** Words too common to say anything about a criterion. */
const COMMON = new Set([
  'about', 'after', 'also', 'answer', 'before', 'clean', 'code', 'correct', 'correctly', 'does', 'each',
  'every', 'from', 'have', 'into', 'more', 'must', 'over', 'should', 'that', 'their', 'them', 'then',
  'there', 'this', 'three', 'time', 'used', 'uses', 'using', 'when', 'with', 'without', 'work', 'works',
]);

/** Words of work that count as a full answer; fewer earn less. */
const FULL_ANSWER_WORDS = 120;
const FULL_FILE_BYTES = 20_000;
/** Below this there is nothing to mark. */
const MIN_WORDS = 4;

/** FNV-1a, 32-bit: small, stable, and the same on every machine. */
function hash(seed: number, bytes: Uint8Array): number {
  let h = seed >>> 0;
  for (let i = 0; i < bytes.length; i += 1) {
    h ^= bytes[i];
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

const encoder = new TextEncoder();
const FNV_OFFSET = 2166136261;

function stem(word: string): string {
  return word.replace(/(?:ing|ed|es|s)$/, '');
}

function keywords(label: string): string[] {
  const words = label.toLowerCase().match(/[a-z][a-z0-9]{3,}/g) ?? [];
  return [...new Set(words.filter((word) => !COMMON.has(word)))].slice(0, 6);
}

function mark(criterion: Criterion, index: number, work: string, effort: number, seed: number): FeedbackItem {
  const wanted = keywords(criterion.label);
  const found = wanted.filter((word) => work.includes(stem(word)));
  const missing = wanted.filter((word) => !found.includes(word));
  const coverage = wanted.length > 0 ? found.length / wanted.length : 0.5;
  const chance = (hash(seed, encoder.encode(`${index}:${criterion.label}`)) % 1000) / 1000;
  const share = effort === 0 ? 0 : 0.1 + 0.5 * coverage + 0.25 * effort + 0.15 * chance;
  const list = (words: string[]) => words.map((word) => `"${word}"`).join(', ');

  let comment: string = copy.thin;
  if (effort > 0 && wanted.length === 0) comment = copy.general;
  else if (effort > 0 && missing.length === 0) comment = fill(copy.found, { found: list(found) });
  else if (effort > 0 && found.length === 0) comment = fill(copy.missing, { missing: list(missing) });
  else if (effort > 0) comment = fill(copy.partly, { found: list(found), missing: list(missing) });

  return {
    label: criterion.label,
    points: Math.round(criterion.points * Math.min(1, share)),
    max: criterion.points,
    comment,
  };
}

export function mockEvaluate(input: EvaluationInput): EvaluationResult {
  const { task, submission } = input;
  const criteria = criteriaToMark(task.gradingCriteria);
  const fileIsText = submission.file?.mediaType.startsWith('text/') ?? false;
  const fileText = submission.file && fileIsText ? new TextDecoder().decode(submission.file.bytes) : '';
  const work = `${submission.text ?? ''}\n${fileText}`.toLowerCase();
  const words = work.match(/[a-z0-9]+/g)?.length ?? 0;
  const binaryBytes = submission.file && !fileIsText ? submission.file.bytes.length : 0;

  const effort =
    words < MIN_WORDS && binaryBytes === 0
      ? 0
      : Math.min(1, words / FULL_ANSWER_WORDS + binaryBytes / FULL_FILE_BYTES);

  let seed = hash(FNV_OFFSET, encoder.encode(`${task.title}\n${task.instructions}\n${task.gradingCriteria}\n${work}`));
  if (submission.file) seed = hash(seed, submission.file.bytes);

  const items = criteria.map((criterion, index) => mark(criterion, index, work, effort, seed));
  const weakest = [...items].sort((a, b) => a.points / a.max - b.points / b.max)[0];
  const nextStep = effort === 0 ? copy.nextWhenThin : fill(copy.next, { label: weakest.label });

  return {
    score: scoreFrom(criteria, items.map((item) => item.points)),
    feedback: writeFeedback(items, nextStep),
    model: MOCK_MODEL,
  };
}
