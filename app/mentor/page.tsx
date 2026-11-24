import { CalendarClock, FileWarning } from 'lucide-react';
import Link from 'next/link';

import EmptyState from '@/components/admin/EmptyState';
import PageHeader from '@/components/admin/PageHeader';
import { ListGroup } from '@/components/admin/RowList';
import StatGrid, { StatTile } from '@/components/admin/StatGrid';
import { mentorCopy, taskPaths } from '@/content/tasks';
import { fill } from '@/lib/admin-payments';
import { mentorSessions } from '@/lib/tasks/data';
import { formatDateTime, formatRelative } from '@/lib/tasks/deadlines';
import { overview } from '@/lib/tasks/mentor';
import { mentorAccess } from '@/lib/tasks/mentor-page';
import { requestNow } from '@/lib/tasks/now';

const copy = mentorCopy.overview;

/** Where a Mentor or an Officer lands: what needs a person, and what is due. */
export default async function MentorOverviewPage() {
  const { scope } = await mentorAccess(taskPaths.mentor);
  const now = requestNow();
  const summary = overview(await mentorSessions(scope), now, scope.isOfficer);
  const needing = summary.attention.reduce((sum, item) => sum + item.count, 0);

  return (
    <>
      <PageHeader title={copy.title} lede={scope.isOfficer ? copy.ledeOfficer : copy.ledeMentor} />
      <StatGrid fill>
        <StatTile value={summary.editable} label={copy.stats.sessions} href={taskPaths.sessions} />
        <StatTile value={summary.takingWork} label={copy.stats.tasks} />
        <StatTile value={summary.submissions} label={copy.stats.submissions} />
        <StatTile value={summary.reading} label={copy.stats.reading} />
        <StatTile value={needing} label={copy.stats.attention} alert={needing > 0} />
      </StatGrid>

      <ListGroup id="attention" label={copy.attention.title} count={needing} note={copy.attention.note}>
        {summary.attention.length > 0 ? (
          <ul className="admin-attention">
            {summary.attention.map((item) => (
              <li key={item.taskId}>
                <Link href={`${taskPaths.task(item.taskId)}?group=attention`}>
                  <FileWarning className="admin-icon admin-attention__icon" aria-hidden="true" />
                  {fill(copy.attention.item, { n: String(item.count), task: item.title })}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState>{copy.attention.empty}</EmptyState>
        )}
      </ListGroup>

      <ListGroup id="deadlines" label={copy.deadlines.title} count={summary.deadlines.length}>
        {summary.deadlines.length > 0 ? (
          <ul className="admin-attention">
            {summary.deadlines.map((item) => (
              <li key={item.taskId}>
                <Link href={taskPaths.task(item.taskId)}>
                  <CalendarClock className="admin-icon admin-attention__icon" aria-hidden="true" />
                  <span>
                    {fill(copy.deadlines.item, { task: item.title, session: item.sessionTitle })}
                    <br />
                    <span className="admin-mono">
                      {fill(mentorCopy.when.both, { when: formatDateTime(item.deadline), relative: formatRelative(item.deadline, now) })}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState>{copy.deadlines.empty}</EmptyState>
        )}
      </ListGroup>
    </>
  );
}
