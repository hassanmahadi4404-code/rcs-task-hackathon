'use client';

/**
 * Keeps an eye on an Evaluation that has not finished, so a Learner is never
 * left wondering: it asks the server to look again just after the next run is
 * due, and the page redraws with whatever is true by then.
 *
 * It renders the "Check again" button as well, which is a plain form: without
 * JavaScript the button is the whole mechanism.
 */

import { useEffect, useState, useTransition } from 'react';

import { checkEvaluation, checkEvaluationForm } from '@/app/(site)/learn/actions';
import { learnCopy } from '@/content/tasks';
import { pollDelay } from '@/lib/tasks/evaluation-view';

/** After this many looks it stops asking on its own; the button still works. */
const MAX_LOOKS = 40;

export default function EvaluationWatch({ submissionId, nextAttemptAt }: { submissionId: string; nextAttemptAt: string }) {
  const [looks, setLooks] = useState(0);
  const [checking, startCheck] = useTransition();

  useEffect(() => {
    if (looks >= MAX_LOOKS) return;
    const timer = setTimeout(
      () =>
        startCheck(async () => {
          await checkEvaluation(submissionId);
          setLooks((count) => count + 1);
        }),
      pollDelay(nextAttemptAt, Date.now()),
    );
    return () => clearTimeout(timer);
  }, [submissionId, nextAttemptAt, looks]);

  return (
    <form action={checkEvaluationForm} className="learn-actions">
      <input type="hidden" name="submission_id" value={submissionId} />
      <button type="submit" className="learn-button learn-button--quiet" aria-busy={checking || undefined}>
        {checking ? learnCopy.evaluation.checking : learnCopy.evaluation.check}
      </button>
    </form>
  );
}
