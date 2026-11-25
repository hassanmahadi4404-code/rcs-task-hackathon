/**
 * The three steps of a Task, with where this Learner is: read it, submit
 * work, get feedback. A step that is behind them is ticked.
 */

import { Check } from 'lucide-react';

import { learnCopy } from '@/content/tasks';

const copy = learnCopy.task.steps;

/** `current` is 1 to 3; 4 means all three are done. */
export default function Steps({ current }: { current: number }) {
  const steps = [copy.read, copy.submit, copy.feedback];
  return (
    <ol className="learn-steps" aria-label={copy.label}>
      {steps.map((label, index) => {
        const number = index + 1;
        const state = number < current ? 'done' : number === current ? 'current' : 'todo';
        return (
          <li key={label} data-state={state} aria-current={state === 'current' ? 'step' : undefined}>
            <span className="learn-steps__mark" aria-hidden="true">
              {state === 'done' ? <Check className="learn-steps__icon" /> : number}
            </span>
            <span>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
