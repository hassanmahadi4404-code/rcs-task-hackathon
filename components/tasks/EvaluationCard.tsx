/**
 * What a Learner is told about one attempt's Evaluation, whatever state it
 * is in. The Mentor's word, when there is one, comes first and is named as
 * theirs; the AI's read is always labelled as a first read.
 *
 * The region is `aria-live`, so a screen reader hears the feedback arrive
 * when the page redraws after a wait.
 */

import EvaluationWatch from '@/components/tasks/EvaluationWatch';
import FeedbackList from '@/components/tasks/FeedbackList';
import { learnCopy } from '@/content/tasks';
import { fill } from '@/lib/admin-payments';
import { formatDateTime, formatRelative } from '@/lib/tasks/deadlines';
import { pendingWhy } from '@/lib/tasks/evaluation-view';
import { MAX_RUNS } from '@/lib/tasks/retry';
import type { EvaluationRow } from '@/lib/tasks/types';

const copy = learnCopy.evaluation;

function Score({ value, superseded }: { value: number; superseded?: boolean }) {
  return (
    <p className="learn-score" data-superseded={superseded || undefined}>
      <span className="sr-only">{copy.scoreLabel}: </span>
      <span className="learn-score__value">{value}</span>
      <span className="learn-score__of">{copy.outOf}</span>
    </p>
  );
}

function MentorWord({ evaluation }: { evaluation: EvaluationRow }) {
  const { override_score: score, override_note: note, ai_score: ai, overridden_at: at } = evaluation;
  let line: string = copy.mentorNoteOnly;
  if (score !== null) {
    line = ai !== null ? fill(copy.mentorScore, { score: String(score), ai: String(ai) }) : fill(copy.mentorScoreNoAi, { score: String(score) });
  }
  return (
    <div className="learn-evaluation__block">
      <p className="learn-label">{copy.mentorTitle}</p>
      {score !== null && <Score value={score} />}
      <p className="learn-text">{line}</p>
      {note && <p className="task-feedback__plain">{note}</p>}
      {at && <p className="learn-note">{fill(copy.mentorWhen, { when: formatDateTime(at) })}</p>}
    </div>
  );
}

function Pending({ evaluation, submissionId, now }: { evaluation: EvaluationRow; submissionId: string; now: number }) {
  const why = pendingWhy(evaluation, now);
  const when = formatRelative(Math.max(Date.parse(evaluation.next_attempt_at), now + 1000), now);
  const line = {
    first: copy.pendingFirst,
    retry: fill(copy.pendingRetry, { n: String(evaluation.attempts), max: String(MAX_RUNS), when }),
    quota: fill(copy.pendingQuota, { when }),
    stalled: copy.pendingStalled,
  }[why];
  return (
    <div className="learn-evaluation__block">
      <p className="learn-label">{copy.pendingTitle}</p>
      <p className="learn-text">{line}</p>
      <EvaluationWatch submissionId={submissionId} nextAttemptAt={evaluation.next_attempt_at} />
    </div>
  );
}

export default function EvaluationCard({
  evaluation,
  submissionId,
  now,
}: {
  evaluation: EvaluationRow;
  submissionId: string;
  now: number;
}) {
  const overridden = evaluation.override_score !== null || evaluation.override_note !== null;

  return (
    <div className="learn-evaluation" role="region" aria-label={copy.region} aria-live="polite">
      {overridden && <MentorWord evaluation={evaluation} />}

      {evaluation.status === 'pending' && <Pending evaluation={evaluation} submissionId={submissionId} now={now} />}

      {evaluation.status === 'failed' && !overridden && (
        <div className="learn-evaluation__block">
          <p className="learn-label">{copy.failedTitle}</p>
          <p className="learn-text">
            {evaluation.failure_reason === 'unreadable'
              ? copy.failed.unreadable
              : fill(copy.failed.default, { max: String(MAX_RUNS) })}
          </p>
        </div>
      )}

      {evaluation.status === 'done' && evaluation.ai_score !== null && evaluation.ai_feedback !== null && (
        <div className="learn-evaluation__block">
          <p className="learn-label">{copy.aiTitle}</p>
          <Score value={evaluation.ai_score} superseded={evaluation.override_score !== null} />
          <FeedbackList feedback={evaluation.ai_feedback} />
          <p className="learn-note">
            {copy.aiNote} {evaluation.model && fill(copy.model, { model: evaluation.model })}
          </p>
        </div>
      )}
    </div>
  );
}
