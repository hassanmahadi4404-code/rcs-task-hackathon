import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { clearOverride, rerunEvaluation } from '@/app/mentor/actions';
import FormSection from '@/components/admin/FormSection';
import PageHeader from '@/components/admin/PageHeader';
import PostButton from '@/components/admin/PostButton';
import RowList, { ListGroup, Row } from '@/components/admin/RowList';
import StatusPill from '@/components/admin/StatusPill';
import FeedbackList from '@/components/tasks/FeedbackList';
import OverrideForm from '@/components/tasks/OverrideForm';
import { mentorCopy, taskPaths } from '@/content/tasks';
import { fill } from '@/lib/admin-payments';
import { mentorSubmission } from '@/lib/tasks/data';
import { formatDateTime, formatRelative, formatSpan, lateBy, sessionEditUntil } from '@/lib/tasks/deadlines';
import { fileKind, fileNameOf, formatBytes, isUuid } from '@/lib/tasks/files';
import { reviewState } from '@/lib/tasks/mentor';
import { mentorAccess } from '@/lib/tasks/mentor-page';
import { requestNow } from '@/lib/tasks/now';
import type { EvaluationRow } from '@/lib/tasks/types';

const copy = mentorCopy.submission;

export const metadata: Metadata = { title: copy.metaTitle };

function AiRead({ evaluation, now }: { evaluation: EvaluationRow; now: number }) {
  if (evaluation.status === 'pending') {
    return (
      <p className="admin-now__line">
        {fill(copy.ai.pending, { n: String(evaluation.attempts), when: formatRelative(Math.max(Date.parse(evaluation.next_attempt_at), now + 1000), now) })}
      </p>
    );
  }
  if (evaluation.status === 'failed' || evaluation.ai_score === null || evaluation.ai_feedback === null) {
    const reason = evaluation.failure_reason;
    return (
      <p className="admin-now__line">
        {reason === 'superseded'
          ? copy.ai.failed.superseded
          : reason === 'unreadable'
            ? copy.ai.failed.unreadable
            : reason === 'quota'
              ? copy.ai.failed.quota
              : fill(copy.ai.failed.default, { n: String(evaluation.attempts) })}
      </p>
    );
  }
  return (
    <>
      {evaluation.flagged && <p className="task-flag">{copy.ai.flagged}</p>}
      <dl className="task-facts">
        <div>
          <dt>{copy.ai.score}</dt>
          <dd className="admin-mono">{evaluation.ai_score}/100</dd>
        </div>
      </dl>
      <FeedbackList feedback={evaluation.ai_feedback} />
      <p className="admin-field__hint">
        {fill(copy.ai.model, { model: evaluation.model ?? '', when: formatDateTime(evaluation.updated_at) })}
      </p>
    </>
  );
}

/** One Submission: the work as handed in, the AI's read of it, and the Mentor's word. */
export default async function MentorSubmissionPage({ params }: { params: Promise<{ submissionId: string }> }) {
  const { submissionId } = await params;
  const { scope } = await mentorAccess(taskPaths.submission(submissionId));
  const work = isUuid(submissionId) ? await mentorSubmission(scope, submissionId) : null;
  if (!work) notFound();

  const { submission, submitter, task, session, deadlines, attempts } = work;
  const { evaluation } = submission;
  const now = requestNow();
  const canEdit = scope.isOfficer || now <= sessionEditUntil(session.held_on, deadlines, session.date_tbc);
  const late = lateBy(submission.created_at, task.deadline);
  const state = mentorCopy.task.state[reviewState(evaluation)];
  const fileName = submission.file_path ? fileNameOf(submission.file_path) : null;
  const number = attempts.findIndex((attempt) => attempt.id === submission.id) + 1;
  const overridden = evaluation ? evaluation.override_score !== null || evaluation.override_note !== null : false;

  return (
    <>
      <PageHeader
        title={fill(copy.title, { name: submitter?.name ?? copy.unknownLearner })}
        crumbs={[
          { label: mentorCopy.sessions.title, href: taskPaths.sessions },
          { label: session.title, href: taskPaths.session(session.id) },
          { label: task.title, href: taskPaths.task(task.id) },
        ]}
      >
        <div className="admin-now">
          <StatusPill tone={state.tone}>{state.label}</StatusPill>
          <StatusPill tone={late > 0 ? 'draft' : 'done'}>
            {late > 0 ? fill(copy.facts.late, { late: formatSpan(late) }) : copy.facts.onTime}
          </StatusPill>
        </div>
        <dl className="task-facts">
          <div>
            <dt>{copy.facts.learner}</dt>
            <dd>{submitter?.name ?? copy.unknownLearner}</dd>
          </div>
          <div>
            <dt>{copy.facts.roll}</dt>
            <dd className="admin-mono">{submitter?.roll}</dd>
          </div>
          <div>
            <dt>{copy.facts.submittedAt}</dt>
            <dd className="admin-mono">{formatDateTime(submission.created_at)}</dd>
          </div>
          <div>
            <dt>{copy.facts.attempt}</dt>
            <dd className="admin-mono">{fill(copy.facts.attemptOf, { n: String(number), total: String(attempts.length) })}</dd>
          </div>
        </dl>
      </PageHeader>

      <FormSection id="work" title={copy.work.title} description={copy.work.description} wide>
        <div className="admin-field">
          <span className="admin-field__label">{copy.work.text}</span>
          {submission.body ? (
            <pre className="task-work" tabIndex={0}>
              {submission.body}
            </pre>
          ) : (
            <span className="admin-field__hint">{copy.work.noText}</span>
          )}
        </div>
        {fileName && (
          <div className="admin-field">
            <span className="admin-field__label">{copy.work.file}</span>
            <a className="admin-link" href={taskPaths.mentorFile(submission.id)}>
              {fill(copy.work.download, { name: fileName, size: formatBytes(submission.file_size ?? 0) })}
            </a>
            {fileKind(fileName) === 'other' && <span className="admin-field__hint">{copy.work.fileSkipped}</span>}
          </div>
        )}
      </FormSection>

      <FormSection id="ai" title={copy.ai.title} description={copy.ai.description} wide>
        {evaluation && <AiRead evaluation={evaluation} now={now} />}
        {canEdit && evaluation && evaluation.status !== 'pending' && (
          <div className="admin-actions">
            <PostButton
              action={rerunEvaluation}
              fields={{ submission_id: submission.id }}
              label={copy.ai.rerun}
              className="admin-button admin-button--quiet"
              confirm={copy.ai.rerunConfirm}
            />
          </div>
        )}
      </FormSection>

      <FormSection id="override" title={copy.override.title} description={copy.override.description} wide>
        {overridden && evaluation?.overridden_by && evaluation.overridden_at && (
          <p className="admin-now__line" role="status">
            {fill(copy.override.by, { email: evaluation.overridden_by, when: formatDateTime(evaluation.overridden_at) })}
          </p>
        )}
        {canEdit ? (
          <>
            <OverrideForm
              key={evaluation?.overridden_at ?? 'none'}
              submissionId={submission.id}
              initial={{ score: evaluation?.override_score?.toString() ?? '', note: evaluation?.override_note ?? '' }}
            />
            {overridden && (
              <div className="admin-actions">
                <PostButton
                  action={clearOverride}
                  fields={{ submission_id: submission.id }}
                  label={copy.override.clear}
                  className="admin-button admin-button--danger"
                  confirm={copy.override.clearConfirm}
                />
              </div>
            )}
          </>
        ) : (
          <>
            {overridden && (
              <dl className="task-facts">
                {evaluation?.override_score !== null && (
                  <div>
                    <dt>{copy.override.score}</dt>
                    <dd className="admin-mono">{evaluation?.override_score}/100</dd>
                  </div>
                )}
                {evaluation?.override_note && (
                  <div>
                    <dt>{copy.override.note}</dt>
                    <dd>{evaluation.override_note}</dd>
                  </div>
                )}
              </dl>
            )}
            <p className="admin-now__line">{copy.override.closed}</p>
          </>
        )}
      </FormSection>

      {attempts.length > 1 && (
        <ListGroup id="attempts" label={copy.attempts.title} count={attempts.length} note={copy.attempts.note}>
          <RowList label={copy.attempts.label} columns={[...copy.attempts.columns]} status={copy.attempts.status}>
            {attempts.map((attempt, index) => {
              const attemptState = mentorCopy.task.state[reviewState(attempt.evaluation)];
              const score = attempt.evaluation?.override_score ?? attempt.evaluation?.ai_score ?? null;
              const name = fill(attempt.id === submission.id ? copy.attempts.current : copy.attempts.name, { n: String(index + 1) });
              return (
                <Row
                  key={attempt.id}
                  title={attempt.id === submission.id ? name : <Link href={taskPaths.submission(attempt.id)}>{name}</Link>}
                  data={[
                    [copy.attempts.columns[1], <span className="admin-mono" key="when">{formatDateTime(attempt.created_at)}</span>],
                    [copy.attempts.columns[2], <span className="admin-mono" key="score">{score ?? mentorCopy.task.list.noScore}</span>],
                  ]}
                  status={<StatusPill tone={attemptState.tone}>{attemptState.label}</StatusPill>}
                />
              );
            })}
          </RowList>
        </ListGroup>
      )}
    </>
  );
}
