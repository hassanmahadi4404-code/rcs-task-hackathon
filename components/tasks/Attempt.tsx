/**
 * One Submission as its Learner sees it: when it arrived, what was in it, and
 * its Evaluation.
 */

import StatusPill from '@/components/admin/StatusPill';
import EvaluationCard from '@/components/tasks/EvaluationCard';
import { learnCopy, taskPaths } from '@/content/tasks';
import { fill } from '@/lib/admin-payments';
import { formatDateTime, formatSpan, lateBy } from '@/lib/tasks/deadlines';
import { fileKind, fileNameOf, formatBytes } from '@/lib/tasks/files';
import type { QueueEstimate } from '@/lib/tasks/queue';
import type { SubmissionRow } from '@/lib/tasks/types';

const copy = learnCopy.attempt;

export interface AttemptProps {
  submission: SubmissionRow;
  /** 1 for the first attempt. */
  number: number;
  deadline: string;
  now: number;
  /** The heading level under the section's `h2`. */
  heading: 'h3' | 'h4';
  /** Where it is in the line for the AI, while it waits. */
  queue?: QueueEstimate;
}

export default function Attempt({ submission, number, deadline, now, heading: Heading, queue }: AttemptProps) {
  const late = lateBy(submission.created_at, deadline);
  const fileName = submission.file_path ? fileNameOf(submission.file_path) : null;

  return (
    <article className="learn-attempt">
      <div className="learn-attempt__head">
        <Heading className="learn-subtitle">{fill(copy.title, { n: String(number) })}</Heading>
        <StatusPill tone={late > 0 ? 'draft' : 'done'}>
          {late > 0 ? fill(learnCopy.receipt.late, { late: formatSpan(late) }) : learnCopy.receipt.onTime}
        </StatusPill>
        <p className="learn-attempt__when">{fill(copy.received, { when: formatDateTime(submission.created_at) })}</p>
      </div>

      {submission.body && (
        <div className="learn-attempt__part">
          <p className="learn-label">{copy.yourText}</p>
          <pre className="task-work" tabIndex={0} data-lenis-prevent>
            {submission.body}
          </pre>
        </div>
      )}

      {fileName && (
        <div className="learn-attempt__part">
          <p className="learn-label">{copy.yourFile}</p>
          <p className="learn-text">
            <a className="learn-link" href={taskPaths.learnFile(submission.id)}>
              {fill(copy.download, { name: fileName, size: formatBytes(submission.file_size ?? 0) })}
            </a>
          </p>
          {fileKind(fileName) === 'other' && <p className="learn-note">{copy.fileSkipped}</p>}
        </div>
      )}

      {submission.evaluation && (
        <EvaluationCard evaluation={submission.evaluation} submissionId={submission.id} now={now} queue={queue} />
      )}
    </article>
  );
}
