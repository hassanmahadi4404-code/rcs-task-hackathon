/**
 * A Learner's text, as they wrote it. A long one opens with its first lines
 * and keeps the rest behind a native disclosure, so the page never holds a
 * box that scrolls on its own: the wheel always moves the page, and the
 * site's smooth scroll is never interrupted. It unfolds without JavaScript.
 */

import { learnCopy } from '@/content/tasks';
import { fill } from '@/lib/admin-payments';
import { foldWork } from '@/lib/tasks/work';

export default function WorkText({ text }: { text: string }) {
  const { head, rest, restLines } = foldWork(text);
  if (!rest) return <pre className="task-work task-work--whole">{text}</pre>;

  return (
    <details className="task-fold">
      <summary>
        <span className="task-work task-work--whole task-fold__head">{head}</span>
        <span className="task-fold__more">{fill(learnCopy.attempt.rest, { n: String(restLines) })}</span>
      </summary>
      <pre className="task-work task-work--whole task-fold__rest">{rest}</pre>
    </details>
  );
}
