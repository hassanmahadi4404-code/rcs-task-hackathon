import { randomUUID } from 'node:crypto';

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import PageShell from '@/components/chrome/PageShell';
import Frame from '@/components/hud/Frame';
import Attempt from '@/components/tasks/Attempt';
import Countdown from '@/components/tasks/Countdown';
import LearnNav from '@/components/tasks/LearnNav';
import LearnOutsider from '@/components/tasks/LearnOutsider';
import SectionHeading from '@/components/tasks/SectionHeading';
import Steps from '@/components/tasks/Steps';
import SubmissionForm from '@/components/tasks/SubmissionForm';
import type { PageMeta } from '@/content/pages';
import { formatCopy, learnCopy, taskPaths } from '@/content/tasks';
import { fill } from '@/lib/admin-payments';
import { getViewer } from '@/lib/auth';
import { parseCriteria } from '@/lib/tasks/criteria';
import { learnerTaskById, mentoredSessionIds, queueFor } from '@/lib/tasks/data';
import { closesAt, formatDateTime, formatRelative, formatSpan, lateBy, taskPhase } from '@/lib/tasks/deadlines';
import { isUuid } from '@/lib/tasks/files';
import { currentStep, summarise } from '@/lib/tasks/learner';
import { MAX_ATTEMPTS } from '@/lib/tasks/rules';
import { requestNow } from '@/lib/tasks/now';
import { evaluatorPaceMs } from '@/lib/tasks/pace';
import { queueEstimate } from '@/lib/tasks/queue';
import { viewerAt } from '@/lib/tasks/viewer';

const copy = learnCopy.task;

interface Props {
  params: Promise<{ taskId: string }>;
  searchParams: Promise<{ received?: string; again?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { taskId } = await params;
  const viewer = await getViewer();
  const memberId = viewer?.memberId;
  const item = viewer && memberId && isUuid(taskId) ? await learnerTaskById({ ...viewer, memberId }, taskId) : null;
  return {
    title: fill(copy.metaTitle, { task: item?.task.title ?? learnCopy.task.back }),
    description: copy.metaDescription,
  };
}

/** One Task: what was asked, the Learner's attempts with their Evaluations, and the form to hand in. */
export default async function LearnTaskPage({ params, searchParams }: Props) {
  const [{ taskId }, { received, again }] = await Promise.all([params, searchParams]);
  const viewer = await viewerAt(taskPaths.learnTask(taskId));
  const { memberId } = viewer;
  const hasMentorArea = viewer.isOfficer || (await mentoredSessionIds(viewer.email)).length > 0;
  if (!memberId) return <LearnOutsider email={viewer.email} hasMentorArea={hasMentorArea} />;
  const item = isUuid(taskId) ? await learnerTaskById({ ...viewer, memberId }, taskId) : null;
  if (!item) notFound();

  const { task, session, track, submissions, mentored } = item;
  const now = requestNow();
  const phase = taskPhase(task.deadline, now);
  const when = formatDateTime(task.deadline);
  const closes = formatDateTime(closesAt(task.deadline));
  const acceptsText = task.formats.includes('text');
  const acceptsFile = task.formats.includes('file');
  const formats = acceptsText && acceptsFile ? formatCopy.both : acceptsText ? formatCopy.text : formatCopy.file;

  const page: PageMeta = {
    path: '/learn',
    eyebrow: fill(copy.eyebrow, { track: track.name, session: session.title }),
    title: task.title,
    lede:
      phase === 'open'
        ? fill(copy.ledeOpen, { when, relative: formatRelative(task.deadline, now), formats })
        : phase === 'late'
          ? fill(copy.ledeLate, { when, closes, formats })
          : fill(copy.ledeClosed, { when, closes }),
    caption: phase === 'open' ? copy.captionOpen : phase === 'late' ? copy.captionLate : copy.captionClosed,
    metaTitle: task.title,
    metaDescription: copy.metaDescription,
  };

  const criteria = parseCriteria(task.grading_criteria);
  const [latest, ...earlier] = submissions;
  const numberOf = (index: number) => submissions.length - index;
  const attemptsLeft = MAX_ATTEMPTS - submissions.length;
  const canHandIn = phase !== 'closed' && !mentored && attemptsLeft > 0;
  const justReceived = received && latest?.id === received ? latest : null;
  const step = currentStep(submissions.map((submission) => summarise(submission.created_at, submission.evaluation)));
  const counted = phase === 'open' ? task.deadline : closesAt(task.deadline);
  // While the latest attempt waits for the AI, where it is in the line.
  const waiting = latest?.evaluation?.status === 'pending' ? latest.evaluation : null;
  const line = waiting && latest ? await queueFor(latest.id) : null;
  const queue = waiting && line ? queueEstimate(line, waiting.next_attempt_at, evaluatorPaceMs(), now) : undefined;

  return (
    <PageShell page={page}>
      <section className="section" aria-labelledby="brief">
        <div className="section__inner">
          <LearnNav current="tasks" hasMentorArea={hasMentorArea} />
          <Link className="learn-back" href={taskPaths.learn}>
            <span aria-hidden="true">←</span> {copy.back}
          </Link>

          <div className="learn-glance">
            <Steps current={mentored ? 1 : step} />
            <div className="learn-deadline" data-phase={phase}>
              <span className="learn-label">{copy.deadline[phase]}</span>
              {phase === 'closed' ? (
                <span className="learn-deadline__done">{fill(copy.deadline.closedOn, { when: closes })}</span>
              ) : (
                <>
                  <Countdown
                    until={counted}
                    renderedAt={now}
                    size="page"
                    label={fill(phase === 'open' ? learnCopy.card.timerLabel : learnCopy.card.lateTimerLabel, {
                      when: phase === 'open' ? when : closes,
                    })}
                  />
                  <span className="learn-note">{fill(copy.deadline.due, { when })}</span>
                </>
              )}
            </div>
          </div>

          <SectionHeading id="brief" {...copy.brief} />
          <div className="learn-brief">
            <p className="learn-prose">{task.instructions}</p>
            <Frame size="md">
              <h3 className="learn-subtitle">{copy.criteriaTitle}</h3>
              {criteria.length > 0 ? (
                <ul className="learn-criteria">
                  {criteria.map((criterion) => (
                    <li key={criterion.label}>
                      <span>{criterion.label}</span>
                      <span className="learn-criteria__points">{fill(copy.points, { points: String(criterion.points) })}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="learn-prose">{task.grading_criteria}</p>
              )}
              <p className="learn-note">{copy.criteriaNote}</p>
            </Frame>
          </div>
        </div>
      </section>

      <section className="section section--ruled" aria-labelledby="your-work">
        <div className="section__inner">
          <SectionHeading id="your-work" {...copy.work} />
          <div className="learn-stack">
            {justReceived && (
              <div className="learn-notice" role="status">
                <p className="learn-notice__title">{learnCopy.receipt.title}</p>
                <p>
                  {fill(learnCopy.receipt.body, { n: String(submissions.length), when: formatDateTime(justReceived.created_at) })}{' '}
                  {lateBy(justReceived.created_at, task.deadline) > 0
                    ? fill(learnCopy.receipt.late, { late: formatSpan(lateBy(justReceived.created_at, task.deadline)) })
                    : learnCopy.receipt.onTime}
                  .
                </p>
                {again && <p>{learnCopy.receipt.again}</p>}
              </div>
            )}

            {mentored && (
              <div className="learn-notice" data-tone="quiet">
                <p>{copy.ownSession}</p>
                <p>
                  <Link className="learn-link" href={taskPaths.task(task.id)}>
                    {copy.ownSessionLink}
                  </Link>
                </p>
              </div>
            )}

            {latest && (
              <Frame size="lg" accent label={learnCopy.attempt.latest}>
                <Attempt submission={latest} number={numberOf(0)} deadline={task.deadline} now={now} heading="h3" queue={queue} latest />
              </Frame>
            )}

            {!mentored && phase === 'closed' && (
              <p className="learn-empty">{latest ? copy.closedNote : copy.closedNoWork}</p>
            )}

            {canHandIn && (
              <div className="learn-stack">
                <h3 className="learn-subtitle">{latest ? learnCopy.form.another : learnCopy.form.title}</h3>
                {latest && (
                  <p className="learn-text">
                    {fill(learnCopy.form.attemptsLeft, { left: String(attemptsLeft), max: String(MAX_ATTEMPTS) })}
                  </p>
                )}
                <SubmissionForm
                  key={latest?.id ?? 'first'}
                  taskId={task.id}
                  clientKey={randomUUID()}
                  acceptsText={acceptsText}
                  acceptsFile={acceptsFile}
                  late={phase === 'late'}
                />
              </div>
            )}
            {!mentored && phase !== 'closed' && attemptsLeft <= 0 && (
              <p className="learn-empty">{fill(learnCopy.form.noAttemptsLeft, { max: String(MAX_ATTEMPTS) })}</p>
            )}

            {earlier.length > 0 && (
              <details className="learn-earlier">
                <summary>{fill(copy.earlier, { n: String(earlier.length) })}</summary>
                <ol className="learn-earlier__list" reversed>
                  {earlier.map((submission, index) => (
                    <li key={submission.id}>
                      <Attempt submission={submission} number={numberOf(index + 1)} deadline={task.deadline} now={now} heading="h4" />
                    </li>
                  ))}
                </ol>
              </details>
            )}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
