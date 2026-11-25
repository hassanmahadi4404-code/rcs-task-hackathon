/**
 * What a Learner is told about one attempt's Evaluation, whatever state it
 * is in. The Mentor's word, when there is one, comes first and is named as
 * theirs; the AI's read is always labelled as a first read.
 *
 * The region is `aria-live`, so a screen reader hears the feedback arrive
 * when the page redraws after a wait.
 */

import StatusPill from '@/components/admin/StatusPill';
import ChallengeForm from '@/components/tasks/ChallengeForm';
import EvaluationWatch from '@/components/tasks/EvaluationWatch';
import FeedbackList from '@/components/tasks/FeedbackList';
import { learnCopy } from '@/content/tasks';
import { fill } from '@/lib/admin-payments';
import { formatDateTime, formatRelative } from '@/lib/tasks/deadlines';
import { pendingWhy, pollDelay } from '@/lib/tasks/evaluation-view';
import { queuePollDelay, waitParts, type QueueEstimate } from '@/lib/tasks/queue';
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

function waitText(ms: number): string {
  const wait = waitParts(ms);
  if (wait.unit === 'moments') return copy.wait.moments;
  if (wait.unit === 'seconds') return fill(copy.wait.seconds, { n: String(wait.n) });
  if (wait.unit === 'minutes') return wait.n === 1 ? copy.wait.minute : fill(copy.wait.minutes, { n: String(wait.n) });
  return wait.n === 1 ? copy.wait.hour : fill(copy.wait.hours, { n: String(wait.n) });
}

function Pending({
  evaluation,
  submissionId,
  now,
  queue,
}: {
  evaluation: EvaluationRow;
  submissionId: string;
  now: number;
  queue?: QueueEstimate;
}) {
  const why = pendingWhy(evaluation, now);
  const when = formatRelative(Math.max(Date.parse(evaluation.next_attempt_at), now + 1000), now);
  // A run that failed says so. Otherwise the line decides what there is to say:
  // at the front the work is being read; behind it, the Learner is told their place.
  const inLine = why !== 'retry' && queue !== undefined && (queue.paused || queue.position > 1);
  let line: string = copy.pendingFirst;
  if (why === 'retry') line = fill(copy.pendingRetry, { n: String(evaluation.attempts), max: String(MAX_RUNS), when });
  else if (queue?.paused) line = fill(copy.pendingPaused, { wait: waitText(queue.waitMs) });
  else if (inLine && queue) line = fill(copy.pendingQueued, { wait: waitText(queue.waitMs) });
  else if (why === 'quota') line = fill(copy.pendingQuota, { when });
  else if (why === 'stalled') line = copy.pendingStalled;

  return (
    <div className="learn-evaluation__block">
      <p className="learn-label">{inLine ? copy.inLineTitle : copy.pendingTitle}</p>
      {inLine && queue && (
        <p className="learn-queue">
          <span className="learn-queue__place">{queue.position}</span>
          <span className="learn-label">{copy.place}</span>
        </p>
      )}
      <p className="learn-text">{line}</p>
      <EvaluationWatch
        submissionId={submissionId}
        delayMs={queue && why !== 'retry' ? queuePollDelay(queue.waitMs) : pollDelay(evaluation.next_attempt_at, now)}
      />
    </div>
  );
}

export default function EvaluationCard({
  evaluation,
  submissionId,
  now,
  queue,
  canChallenge = false,
}: {
  evaluation: EvaluationRow;
  submissionId: string;
  now: number;
  /** Where this Submission is in the line for the AI, while it waits. */
  queue?: QueueEstimate;
  /** This is the Learner's latest attempt, so its score is theirs to challenge. */
  canChallenge?: boolean;
}) {
  const superseded = evaluation.failure_reason === 'superseded';
  const overridden = evaluation.override_score !== null || evaluation.override_note !== null;

  return (
    <div className="learn-evaluation" role="region" aria-label={copy.region} aria-live="polite">
      {overridden && <MentorWord evaluation={evaluation} />}

      {evaluation.status === 'pending' && <Pending evaluation={evaluation} submissionId={submissionId} now={now} queue={queue} />}

      {evaluation.status === 'failed' && !overridden && (
        <div className="learn-evaluation__block">
          <p className="learn-label">{superseded ? copy.supersededTitle : copy.failedTitle}</p>
          <p className="learn-text">
            {superseded
              ? copy.failed.superseded
              : evaluation.failure_reason === 'unreadable'
                ? copy.failed.unreadable
                : fill(copy.failed.default, { max: String(MAX_RUNS) })}
          </p>
        </div>
      )}

      {evaluation.status === 'done' && evaluation.ai_score !== null && evaluation.ai_feedback !== null && (
        <div className="learn-evaluation__block">
          <p className="learn-label">{copy.aiTitle}</p>
          <div className="learn-score-row">
            <Score value={evaluation.ai_score} superseded={evaluation.override_score !== null} />
            {evaluation.challenged_at && !overridden && <StatusPill tone="upcoming">{copy.challenge.sentTitle}</StatusPill>}
            {canChallenge && !overridden && !evaluation.challenged_at && <ChallengeForm submissionId={submissionId} />}
          </div>
          {evaluation.challenged_at && (
            <div className="learn-notice" data-tone={overridden ? 'quiet' : undefined}>
              {!overridden && <p>{fill(copy.challenge.sent, { when: formatDateTime(evaluation.challenged_at) })}</p>}
              <p className="learn-label">{copy.challenge.yourReason}</p>
              <p className="task-feedback__plain">{evaluation.challenge_note}</p>
            </div>
          )}
          <FeedbackList feedback={evaluation.ai_feedback} />
          <p className="learn-note">
            {copy.aiNote} {evaluation.model && fill(copy.model, { model: evaluation.model })}
          </p>
        </div>
      )}
    </div>
  );
}
