/**
 * Starter kit extract: only `initialsFor`, which the dashboard's row
 * thumbnails use. The club site's version of this file holds more.
 *
 * No `@/` imports: Node's test runner executes this file directly.
 */

import { text } from './form-values.ts';

/**
 * Initials for a label, seeding the placeholder thumbnail: the first letters
 * of the first two words, or the first two letters of a one-word label.
 */
export function initialsFor(label: string): string {
  const words = text(label).split(/\s+/).filter(Boolean);
  if (words.length === 0) return '??';
  const initials = words.length > 1 ? words[0][0] + words[1][0] : words[0].slice(0, 2);
  return initials.toUpperCase();
}
