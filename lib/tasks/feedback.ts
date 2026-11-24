/**
 * The shape of an Evaluation's feedback.
 *
 * `evaluations.ai_feedback` is one text column, and the evaluator contract
 * returns one string. Both evaluators write that string in the form below, so
 * a page can show marks per criterion; anything else (the seed's sentences, a
 * model that ignored the form) is shown as the paragraph it is.
 *
 *   [30/40] Semantic elements used correctly
 *   You used header and main. The links are still in a div.
 *
 *   Next step: move the links into a nav.
 *
 * No `@/` imports: Node's test runner executes this file directly.
 */

export interface FeedbackItem {
  label: string;
  points: number;
  max: number;
  comment: string;
}

export interface Feedback {
  items: FeedbackItem[];
  nextStep: string;
  /** The whole text, when it is not in the form above. */
  plain: string;
}

const NEXT = 'Next step: ';
const HEAD = /^\[(\d{1,3})\/(\d{1,3})\] (.+)$/;

const oneLine = (text: string) => text.replace(/\s+/g, ' ').trim();

export function writeFeedback(items: readonly FeedbackItem[], nextStep: string): string {
  const blocks = items.map(
    (item) => `[${item.points}/${item.max}] ${oneLine(item.label)}\n${oneLine(item.comment)}`,
  );
  const next = oneLine(nextStep);
  if (next) blocks.push(`${NEXT}${next}`);
  return blocks.join('\n\n');
}

export function readFeedback(text: string): Feedback {
  const items: FeedbackItem[] = [];
  let nextStep = '';
  for (const block of text.split(/\n{2,}/)) {
    const [first = '', ...rest] = block.trim().split('\n');
    const head = HEAD.exec(first);
    if (head) {
      items.push({ points: Number(head[1]), max: Number(head[2]), label: head[3], comment: rest.join(' ').trim() });
    } else if (first.startsWith(NEXT) && items.length > 0) {
      nextStep = [first.slice(NEXT.length), ...rest].join(' ').trim();
    } else if (first) {
      return { items: [], nextStep: '', plain: text.trim() };
    }
  }
  return items.length > 0 ? { items, nextStep, plain: '' } : { items: [], nextStep: '', plain: text.trim() };
}
