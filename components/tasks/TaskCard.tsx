/**
 * One Task on `/learn`. On the left: where it is from, what it is, and what
 * this Learner has done about it. On the right, the one thing to know at a
 * glance: a clock counting down while the Task is running, or a Finished
 * mark once it has closed. The title is the link and covers the card.
 */

import { CircleCheck } from 'lucide-react';
import Link from 'next/link';

import StatusPill from '@/components/admin/StatusPill';
import Countdown from '@/components/tasks/Countdown';
import { learnCopy, taskPaths } from '@/content/tasks';
import { fill } from '@/lib/admin-payments';
import type { LearnerTask } from '@/lib/tasks/data';
import { closesAt, formatDateTime, formatSpan, lateBy, taskPhase } from '@/lib/tasks/deadlines';
import { effectiveScore, learnerState, summarise } from '@/lib/tasks/learner';

const { card } = learnCopy;

export default function TaskCard({ item, now }: { item: LearnerTask; now: number }) {
  const { task, session, track, submissions } = item;
  const attempts = submissions.map((submission) => summarise(submission.created_at, submission.evaluation));
  const status = learnCopy.state[learnerState(task.deadline, attempts, now)];
  const phase = taskPhase(task.deadline, now);
  const latest = submissions[0];
  const score = attempts[0] && attempts[0].status !== 'pending' ? effectiveScore(attempts[0]) : null;

  const due = formatDateTime(task.deadline);
  const closes = formatDateTime(closesAt(task.deadline));
  let when: string = phase === 'open' ? fill(card.due, { when: due }) : phase === 'late' ? fill(card.wasDue, { when: due }) : fill(card.closed, { when: closes });
  if (latest) {
    const late = lateBy(latest.created_at, task.deadline);
    const submitted = formatDateTime(latest.created_at);
    when = late > 0 ? fill(card.submittedLate, { when: submitted, late: formatSpan(late) }) : fill(card.submitted, { when: submitted });
  }

  return (
    <article className="learn-card" data-phase={phase}>
      <div className="learn-card__main">
        <p className="learn-card__where">{fill(card.where, { track: track.name, session: session.title })}</p>
        <h3 className="learn-card__title">
          <Link href={taskPaths.learnTask(task.id)}>{task.title}</Link>
        </h3>
        <p className="learn-card__when">{when}</p>
        <div className="learn-card__foot">
          <StatusPill tone={status.tone}>{status.label}</StatusPill>
          {score !== null && <span className="learn-card__score">{fill(card.score, { score: String(score) })}</span>}
        </div>
      </div>

      {phase === 'closed' ? (
        <div className="learn-card__marker" data-kind="finished">
          <CircleCheck className="learn-card__check" aria-hidden="true" />
          <span className="learn-card__marker-label">{card.finished}</span>
        </div>
      ) : (
        <div className="learn-card__marker" data-kind="running">
          <span className="learn-card__marker-label">{phase === 'open' ? card.timeLeft : card.lateLeft}</span>
          <Countdown
            until={phase === 'open' ? task.deadline : closesAt(task.deadline)}
            renderedAt={now}
            label={phase === 'open' ? fill(card.timerLabel, { when: due }) : fill(card.lateTimerLabel, { when: closes })}
          />
        </div>
      )}
    </article>
  );
}
