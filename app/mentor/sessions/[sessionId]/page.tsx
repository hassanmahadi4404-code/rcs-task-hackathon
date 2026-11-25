import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { deleteSession, removeMentor } from '@/app/mentor/actions';
import EmptyState from '@/components/admin/EmptyState';
import PageHeader from '@/components/admin/PageHeader';
import PostButton from '@/components/admin/PostButton';
import RowList, { ListGroup, Row } from '@/components/admin/RowList';
import StatusPill from '@/components/admin/StatusPill';
import Countdown from '@/components/tasks/Countdown';
import MentorForm from '@/components/tasks/MentorForm';
import { formatCopy, learnCopy, mentorCopy, taskPaths } from '@/content/tasks';
import { fill } from '@/lib/admin-payments';
import { mentorScope, mentorSession } from '@/lib/tasks/data';
import { formatDate, formatDateTime, sessionEditUntil, sessionPhase } from '@/lib/tasks/deadlines';
import { isUuid } from '@/lib/tasks/files';
import { latestPerLearner, mentorTaskPhase } from '@/lib/tasks/mentor';
import { mentorAccess } from '@/lib/tasks/mentor-page';
import { requestNow } from '@/lib/tasks/now';
import { getViewer } from '@/lib/auth';

const copy = mentorCopy.session;

interface Props {
  params: Promise<{ sessionId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { sessionId } = await params;
  const viewer = await getViewer();
  const item = viewer && isUuid(sessionId) ? await mentorSession(await mentorScope(viewer), sessionId) : null;
  return { title: item?.session.title ?? mentorCopy.sessions.title };
}

/** One Session: its window, its Tasks with how much came in, and its Mentors. */
export default async function SessionPage({ params }: Props) {
  const { sessionId } = await params;
  const { viewer, scope } = await mentorAccess(taskPaths.session(sessionId));
  const item = isUuid(sessionId) ? await mentorSession(scope, sessionId) : null;
  if (!item) notFound();

  const { session, track, tasks, mentors, submissions } = item;
  const now = requestNow();
  const deadlines = tasks.map((task) => task.deadline);
  const until = sessionEditUntil(session.held_on, deadlines, session.date_tbc);
  const canEdit = scope.isOfficer || now <= until;
  const phase = mentorCopy.sessions.phase[sessionPhase(session.held_on, deadlines, now, session.date_tbc)];
  // No date and no Task yet: the window has no end to name.
  const window = !Number.isFinite(until)
    ? scope.isOfficer
      ? copy.window.officerUnscheduled
      : copy.window.mentorUnscheduled
    : fill(scope.isOfficer ? copy.window.officer : canEdit ? copy.window.mentorOpen : copy.window.mentorClosed, {
        until: formatDateTime(until),
      });

  return (
    <>
      <PageHeader
        title={session.title}
        crumbs={[{ label: mentorCopy.sessions.title, href: taskPaths.sessions }]}
        action={
          canEdit && (
            <Link className="admin-button" href={taskPaths.taskNew(session.id)}>
              {copy.tasks.new}
            </Link>
          )
        }
      >
        <div className="admin-now">
          <StatusPill tone={phase.tone}>{phase.label}</StatusPill>
          <span className="admin-now__label">{track.name}</span>
          <span className="admin-now__line">
            {session.date_tbc ? copy.dateTbc : fill(copy.heldOn, { date: formatDate(session.held_on) })}
          </span>
          {scope.isOfficer && (
            <Link className="admin-link" href={taskPaths.sessionEdit(session.id)}>
              {copy.edit}
            </Link>
          )}
        </div>
        {session.topic && (
          <div className="task-brief">
            <h2 className="sr-only">{copy.topic}</h2>
            <p>{session.topic}</p>
          </div>
        )}
        <p className="admin-now__line">{window}</p>
      </PageHeader>

      <ListGroup id="tasks" label={copy.tasks.title} count={tasks.length} note={copy.tasks.note}>
        {tasks.length > 0 ? (
          <RowList label={copy.tasks.title} columns={[...copy.tasks.columns]} status={copy.tasks.status}>
            {tasks.map((task) => {
              const state = copy.tasks.phase[mentorTaskPhase(task, now)];
              const learners = latestPerLearner(submissions.filter((submission) => submission.task_id === task.id)).length;
              return (
                <Row
                  key={task.id}
                  title={<Link href={taskPaths.task(task.id)}>{task.title}</Link>}
                  data={[
                    [
                      copy.tasks.columns[1],
                      <span className="task-due" key="due">
                        <span className="admin-mono">{formatDateTime(task.deadline)}</span>
                        {mentorTaskPhase(task, now) === 'open' && (
                          <Countdown
                            until={task.deadline}
                            renderedAt={now}
                            label={fill(learnCopy.card.timerLabel, { when: formatDateTime(task.deadline) })}
                          />
                        )}
                      </span>,
                    ],
                    [copy.tasks.columns[2], task.formats.map((format) => formatCopy.short[format]).join(', ')],
                    [copy.tasks.columns[3], <span className="admin-mono" key="work">{learners}</span>],
                  ]}
                  status={<StatusPill tone={state.tone}>{state.label}</StatusPill>}
                />
              );
            })}
          </RowList>
        ) : (
          <EmptyState>
            <p>{copy.tasks.empty}</p>
            {canEdit && <p>{copy.tasks.emptyHint}</p>}
          </EmptyState>
        )}
      </ListGroup>

      <ListGroup id="mentors" label={copy.mentors.title} count={mentors.length} note={copy.mentors.note}>
        {mentors.length > 0 ? (
          <ul className="task-mentors">
            {mentors.map((email) => (
              <li key={email}>
                <span>
                  {email}
                  {email === viewer.email && <span className="admin-now__label"> ({copy.mentors.you})</span>}
                </span>
                {scope.isOfficer && (
                  <PostButton
                    action={removeMentor}
                    fields={{ session_id: session.id, email }}
                    label={fill(copy.mentors.remove, { email })}
                    className="admin-button admin-button--quiet"
                    confirm={fill(copy.mentors.removeConfirm, { email })}
                  />
                )}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState>{copy.mentors.empty}</EmptyState>
        )}
        {scope.isOfficer && <MentorForm sessionId={session.id} />}
      </ListGroup>

      {scope.isOfficer && (
        <ListGroup id="danger" label={copy.danger.title} note={submissions.length > 0 ? copy.danger.blocked : copy.danger.note}>
          {submissions.length === 0 && (
            <div className="admin-actions">
              <PostButton
                action={deleteSession}
                fields={{ id: session.id }}
                label={copy.danger.delete}
                className="admin-button admin-button--danger"
                confirm={copy.danger.confirm}
              />
            </div>
          )}
        </ListGroup>
      )}
    </>
  );
}
