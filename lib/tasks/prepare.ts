/**
 * A Submission made ready for an AI: personal data out, the file sorted into
 * something a model can read, and a first look for an attempt to steer it.
 *
 * This runs before `evaluate()`, whichever evaluator is chosen, so no
 * implementation ever sees a name, a roll, an email or the file's own name.
 *
 * No `@/` imports: Node's test runner executes this file directly.
 */

import type { EvaluationInput } from '../evaluation-contract.ts';
import { extensionOf, fileKind, mediaTypeOf } from './files.ts';
import { redact } from './redact.ts';

/**
 * Text files are cut here. A longer one is almost never a Learner's own
 * writing, and every character spends free AI quota.
 */
export const MAX_FILE_CHARS = 40_000;

export interface RawSubmission {
  text: string | null;
  file: { name: string; bytes: Uint8Array } | null;
  /** The Learner's own name, roll, email and phone. */
  personalTerms: readonly string[];
}

export interface PreparedSubmission {
  submission: EvaluationInput['submission'];
  /** False when nothing is left that an AI can read. */
  readable: boolean;
  /** The Learner attached a file of a kind an AI cannot read. */
  fileSkipped: boolean;
  /** The work reads like an attempt to steer the AI; shown to the Mentor. */
  flagged: boolean;
}

/**
 * Phrases that address the reader instead of answering the Task. Bounded
 * like the patterns in `redact.ts`, for the same reason.
 */
const STEERING = [
  /\b(?:ignore|disregard|forget|override)\b[^.\n]{0,40}\b(?:instructions?|rules?|prompts?|criteria|rubric)\b/i,
  /\b(?:system|developer)\s{1,3}(?:prompt|message|instruction)/i,
  /\byou\s{1,3}are\s{1,3}(?:now|no\s{1,3}longer)\b/i,
  /\b(?:give|award|assign|grant)\b[^.\n]{0,30}\b(?:full|maximum|max|perfect|highest|100)\b/i,
  /\bscore\s{0,3}(?:of|is|=|:|should\s{1,3}be)?\s{0,3}100\b/i,
  /\b100\s{0,3}(?:\/|out\s{1,3}of)\s{0,3}100\b/i,
  /\bas\s{1,3}an?\s{1,3}(?:ai|language\s{1,3}model|grader|evaluator)\b/i,
  /\b(?:dear|hey|attention)\s{1,3}(?:ai|grader|evaluator|model|llm)\b/i,
];

export function looksLikeSteering(text: string): boolean {
  return STEERING.some((pattern) => pattern.test(text));
}

export function prepareSubmission({ text, file, personalTerms }: RawSubmission): PreparedSubmission {
  const cleanText = text?.trim() ? redact(text.trim(), personalTerms) : null;
  let prepared: EvaluationInput['submission']['file'] = null;
  let fileText = '';
  let fileSkipped = false;

  if (file) {
    const kind = fileKind(file.name);
    const extension = extensionOf(file.name);
    if (kind === 'text') {
      const decoded = new TextDecoder('utf-8').decode(file.bytes).slice(0, MAX_FILE_CHARS);
      fileText = redact(decoded, personalTerms);
      if (fileText.trim()) {
        prepared = {
          name: `submission.${extension}`,
          mediaType: mediaTypeOf(file.name),
          bytes: new TextEncoder().encode(fileText),
        };
      }
    } else if (kind === 'document' && file.bytes.length > 0) {
      prepared = { name: `submission.${extension}`, mediaType: mediaTypeOf(file.name), bytes: file.bytes };
    } else {
      fileSkipped = true;
    }
  }

  return {
    submission: { text: cleanText, file: prepared },
    readable: Boolean(cleanText) || prepared !== null,
    fileSkipped,
    flagged: looksLikeSteering(`${cleanText ?? ''}\n${fileText}`),
  };
}
