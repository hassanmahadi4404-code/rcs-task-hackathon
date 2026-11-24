/**
 * One Task on `/learn`: where it is from, what it is, when it is due or was
 * handed in, and where it stands for this Learner. The title is the link and
 * covers the card.
 */

import Link from 'next/link';

import StatusPill from '@/components/admin/StatusPill';
import { learnCopy, taskPaths } from '@/content/tasks';
import { fill } from '@/lib/admin-payments';
import type { LearnerTask } from '@/lib/tasks/data';
import { closesAt, formatDateTime, formatRelative, formatSpan, lateBy } from '@/lib/tasks/deadlines';
import { effectiveScore, learnerState, summarise } from '@/lib/tasks/learner';

const { card } = learnCopy;

export default function TaskCard({ item, now }: { item: LearnerTask; now: number }) {
  const { task, session, track, submissions } = item;
  const attempts = submissions.map((submission) => summarise(submission.created_at, submission.evaluation));
  const state = learnerState(task.deadline, attempts, now);
  const status = learnCopy.state[state];
  const latest = submissions[0];
  const score = attempts[0] && attempts[0].status !== 'pending' ? effectiveScore(attempts[0]) : null;

  const due = formatDateTime(task.deadline);
  const closes = formatDateTime(closesAt(task.deadline));
  let when: string;
  if (latest) {
    const late = lateBy(latest.created_at, task.deadline);
    const handedIn = formatDateTime(latest.created_at);
    when = late > 0 ? fill(card.handedInLate, { when: handedIn, late: formatSpan(late) }) : fill(card.handedIn, { when: handedIn });
  } else if (state === 'todo') {
    when = fill(card.due, { when: due, relative: formatRelative(task.deadline, now) });
  } else {
    when = fill(state === 'todo_late' ? card.closes : card.closed, { when: due, closes });
  }

  return (
    <article className="learn-card">
      <p className="learn-card__where">{fill(card.where, { track: track.name, session: session.title })}</p>
      <h3 className="learn-card__title">
        <Link href={taskPaths.learnTask(task.id)}>{task.title}</Link>
      </h3>
      <p className="learn-card__when">{when}</p>
      <div className="learn-card__foot">
        <StatusPill tone={status.tone}>{status.label}</StatusPill>
        {score !== null && <span className="learn-card__score">{fill(card.score, { score: String(score) })}</span>}
      </div>
    </article>
  );
}
