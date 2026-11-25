/**
 * A Learner's text, split for showing: the opening, and the rest behind a
 * disclosure. A long answer is folded rather than put in a box that scrolls
 * on its own, because a scrolling box inside the page takes the wheel away
 * from the page: the site's smooth scroll stops there, and the page jerks.
 *
 * No `@/` imports: Node's test runner executes this file directly.
 */

/** Text longer than this, in lines or in characters, is folded. */
export const FOLD_AFTER_LINES = 24;
export const FOLD_AFTER_CHARS = 1800;

export interface FoldedWork {
  head: string;
  /** Empty when the whole text fits. */
  rest: string;
  /** How many lines `rest` holds. */
  restLines: number;
}

export function foldWork(text: string, lines = FOLD_AFTER_LINES, chars = FOLD_AFTER_CHARS): FoldedWork {
  const all = text.split('\n');
  // Cut at a line where there is one in reach; one very long line is cut at a space.
  let cut = all.length > lines ? all.slice(0, lines).join('\n').length : text.length;
  if (cut > chars) {
    const lineEnd = text.lastIndexOf('\n', chars);
    const space = text.lastIndexOf(' ', chars);
    cut = lineEnd > 0 ? lineEnd : space > 0 ? space : chars;
  }
  if (cut >= text.length) return { head: text, rest: '', restLines: 0 };
  const rest = text.slice(cut).replace(/^\n/, '');
  return { head: text.slice(0, cut), rest, restLines: rest.split('\n').length };
}
