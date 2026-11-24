/**
 * An Evaluation's feedback: marks per criterion and a next step when the
 * evaluator wrote it in that form (`lib/tasks/feedback.ts`), or the paragraph
 * it is when it did not. Shared by the Learner and Mentor areas.
 */

import { learnCopy } from '@/content/tasks';
import { readFeedback } from '@/lib/tasks/feedback';

export default function FeedbackList({ feedback }: { feedback: string }) {
  const { items, nextStep, plain } = readFeedback(feedback);
  if (items.length === 0) return <p className="task-feedback__plain">{plain}</p>;

  return (
    <div>
      <ul className="task-feedback">
        {items.map((item, index) => (
          <li key={index}>
            <span className="task-feedback__label">{item.label}</span>
            <span className="task-feedback__points">
              {item.points}/{item.max}
            </span>
            <p className="task-feedback__comment">{item.comment}</p>
          </li>
        ))}
      </ul>
      {nextStep && (
        <p className="task-feedback__next">
          <strong>{learnCopy.evaluation.nextStep}:</strong> {nextStep}
        </p>
      )}
    </div>
  );
}
