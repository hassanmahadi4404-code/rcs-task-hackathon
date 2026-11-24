import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { deleteTask, runWaiting } from '@/app/mentor/actions';
import EmptyState from '@/components/admin/EmptyState';
import ListToolbar from '@/components/admin/ListToolbar';
import PageHeader from '@/components/admin/PageHeader';
import Pager from '@/components/admin/Pager';
import PostButton from '@/components/admin/PostButton';
import RowList, { ListGroup, Row } from '@/components/admin/RowList';
import StatGrid, { StatTile } from '@/components/admin/StatGrid';
import StatusPill from '@/components/admin/StatusPill';
import { formatCopy, mentorCopy, taskPaths } from '@/content/tasks';
import { fill } from '@/lib/admin-payments';
import { pageNumber, paginate, pick } from '@/lib/admin-lists';
import { getViewer } from '@/lib/auth';
import { mentorScope, mentorTask, taskContext } from '@/lib/tasks/data';
import { formatDateTime, formatSpan, sessionEditUntil } from '@/lib/tasks/deadlines';
import { isUuid } from '@/lib/tasks/files';
import { REVIEW_GROUPS, REVIEW_SORTS, arrangeRows, inGroup, mentorTaskPhase, reviewRows, taskStats, latestPerLearner } from '@/lib/tasks/mentor';
import { mentorAccess } from '@/lib/tasks/mentor-page';
import { requestNow } from '@/lib/tasks/now';

const copy = mentorCopy.task;

interface Props {
  params: Promise<{ taskId: string }>;
  searchParams: Promise<{ group?: string; q?: string; sort?: string; page?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { taskId } = await params;
  const viewer = await getViewer();
  const context = viewer && isUuid(taskId) ? await taskContext(await mentorScope(viewer), taskId) : null;
  return { title: context?.task.title ?? mentorCopy.sessions.title };
}

/** One Task as its Mentor sees it: what came in, and which of it needs a person. */
export default async function MentorTaskPage({ params, searchParams }: Props) {
  const [{ taskId }, query] = await Promise.all([params, searchParams]);
  const { scope } = await mentorAccess(taskPaths.task(taskId));
  const work = isUuid(taskId) ? await mentorTask(scope, taskId) : null;
  if (!work) notFound();

  const { task, session, deadlines, submissions, submitters } = work;
  const now = requestNow();
  const canEdit = scope.isOfficer || now <= sessionEditUntil(session.held_on, deadlines, session.date_tbc);
  const phase = mentorCopy.session.tasks.phase[mentorTaskPhase(task, now)];
  const stats = taskStats(latestPerLearner(submissions), task.deadline);

  const group = pick(query.group, REVIEW_GROUPS, 'all');
  const sort = pick(query.sort, REVIEW_SORTS, 'recent');
  const q = typeof query.q === 'string' ? query.q : '';
  const rows = reviewRows(submissions, submitters, task.deadline);
  const page = paginate(arrangeRows(rows, { group, q, sort }), pageNumber(query.page));
  const path = taskPaths.task(task.id);

  return (
    <>
      <PageHeader
        title={task.title}
        crumbs={[
          { label: mentorCopy.sessions.title, href: taskPaths.sessions },
          { label: session.title, href: taskPaths.session(session.id) },
        ]}
        action={
          canEdit && (
            <Link className="admin-button" href={taskPaths.taskEdit(task.id)}>
              {copy.edit}
            </Link>
          )
        }
      >
        <div className="admin-now">
          <StatusPill tone={phase.tone}>{phase.label}</StatusPill>
          <span className="admin-now__label">{copy.deadline}</span>
          <span className="admin-mono">{formatDateTime(task.deadline)}</span>
          <span className="admin-now__label">{copy.accepts}</span>
          <span className="admin-now__line">{task.formats.map((format) => formatCopy.short[format]).join(', ')}</span>
        </div>
      </PageHeader>

      <StatGrid fill>
        <StatTile value={stats.learners} label={copy.stats.learners} />
        <StatTile value={stats.late} label={copy.stats.late} />
        <StatTile value={stats.average ?? copy.noAverage} label={copy.stats.average} />
        <StatTile value={stats.reading} label={copy.stats.reading} />
        <StatTile value={stats.attention} label={copy.stats.attention} alert={stats.attention > 0} />
      </StatGrid>

      <ListGroup id="brief" label={copy.brief}>
        <div className="task-brief">
          <h3>{copy.instructions}</h3>
          <p>{task.instructions}</p>
          <h3>{copy.criteria}</h3>
          <p>{task.grading_criteria}</p>
        </div>
      </ListGroup>

      <ListGroup id="submissions" label={copy.list.title} count={rows.length} note={copy.list.note}>
        {rows.length > 0 ? (
          <>
            <ListToolbar
              path={path}
              groupsLabel={copy.list.groupsLabel}
              groups={REVIEW_GROUPS.map((id) => ({
                id,
                label: copy.list.groups[id],
                count: rows.filter((row) => inGroup(row, id)).length,
              }))}
              group={group}
              search={copy.list.search}
              q={q}
              sorts={REVIEW_SORTS.map((id) => ({ id, label: copy.list.sorts[id] }))}
              sort={sort}
            />
            {page.items.length > 0 ? (
              <RowList label={copy.list.label} columns={[...copy.list.columns]} status={copy.list.status}>
                {page.items.map((row) => {
                  const state = copy.state[row.state];
                  const changed = row.state === 'changed' && row.aiScore !== null && row.score !== row.aiScore;
                  return (
                    <Row
                      key={row.memberId}
                      title={<Link href={taskPaths.submission(row.latest.id)}>{row.name || mentorCopy.submission.unknownLearner}</Link>}
                      data={[
                        [copy.list.columns[1], <span className="admin-mono" key="roll">{row.roll}</span>],
                        [
                          copy.list.columns[2],
                          <span className="admin-mono" key="when">
                            {formatDateTime(row.latest.created_at)}
                            {row.late > 0 && ` · ${fill(copy.list.late, { late: formatSpan(row.late) })}`}
                          </span>,
                        ],
                        [copy.list.columns[3], <span className="admin-mono" key="tries">{row.attempts}</span>],
                        [
                          copy.list.columns[4],
                          <span className="admin-mono" key="score">
                            {row.score === null
                              ? copy.list.noScore
                              : changed
                                ? fill(copy.list.scoreChanged, { score: String(row.score), ai: String(row.aiScore) })
                                : row.score}
                          </span>,
                        ],
                      ]}
                      status={<StatusPill tone={state.tone}>{state.label}</StatusPill>}
                    />
                  );
                })}
              </RowList>
            ) : (
              <EmptyState>{copy.list.emptyFiltered}</EmptyState>
            )}
            <Pager path={path} state={{ group: group === 'all' ? '' : group, q, sort: sort === 'recent' ? '' : sort }} page={page} />
          </>
        ) : (
          <EmptyState>{copy.list.empty}</EmptyState>
        )}
        {stats.reading > 0 && (
          <div className="admin-actions">
            <PostButton action={runWaiting} fields={{ task_id: task.id }} label={copy.run} className="admin-button admin-button--quiet" />
            <span className="admin-now__line">{fill(copy.runNote, { n: String(stats.reading) })}</span>
          </div>
        )}
      </ListGroup>

      {canEdit && submissions.length === 0 && (
        <ListGroup id="danger" label={copy.danger.title} note={copy.danger.note}>
          <div className="admin-actions">
            <PostButton
              action={deleteTask}
              fields={{ id: task.id, session_id: session.id }}
              label={copy.danger.delete}
              className="admin-button admin-button--danger"
              confirm={copy.danger.confirm}
            />
          </div>
        </ListGroup>
      )}
    </>
  );
}
