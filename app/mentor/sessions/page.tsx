import type { Metadata } from 'next';
import Link from 'next/link';

import EmptyState from '@/components/admin/EmptyState';
import PageHeader from '@/components/admin/PageHeader';
import RowList, { Row, type RowGroup } from '@/components/admin/RowList';
import StatusPill from '@/components/admin/StatusPill';
import { mentorCopy, taskPaths } from '@/content/tasks';
import { mentorSessions, type SessionItem } from '@/lib/tasks/data';
import { formatDate, sessionPhase } from '@/lib/tasks/deadlines';
import { mentorAccess } from '@/lib/tasks/mentor-page';
import { requestNow } from '@/lib/tasks/now';

const copy = mentorCopy.sessions;

export const metadata: Metadata = { title: copy.title };

/** The Sessions in this person's scope, grouped by Track, newest first. */
export default async function SessionsPage() {
  const { scope } = await mentorAccess(taskPaths.sessions);
  const now = requestNow();
  const sessions = await mentorSessions(scope);

  const byTrack = new Map<string, SessionItem[]>();
  for (const item of sessions) byTrack.set(item.track.id, [...(byTrack.get(item.track.id) ?? []), item]);
  const groups: RowGroup[] = [...byTrack.values()]
    .sort((a, b) => a[0].track.name.localeCompare(b[0].track.name, 'en'))
    .map((items) => ({
      id: items[0].track.id,
      label: items[0].track.name,
      count: items.length,
      note: items[0].track.archived ? copy.archived : undefined,
      rows: items.map(({ session, tasks, submissions }) => {
        const phase = copy.phase[sessionPhase(session.held_on, tasks.map((task) => task.deadline), now)];
        return (
          <Row
            key={session.id}
            title={<Link href={taskPaths.session(session.id)}>{session.title}</Link>}
            data={[
              [copy.columns[1], <span className="admin-mono" key="date">{formatDate(session.held_on)}</span>],
              [copy.columns[2], <span className="admin-mono" key="tasks">{tasks.length}</span>],
              [copy.columns[3], <span className="admin-mono" key="work">{submissions.length}</span>],
            ]}
            status={<StatusPill tone={phase.tone}>{phase.label}</StatusPill>}
          />
        );
      }),
    }));

  return (
    <>
      <PageHeader
        title={copy.title}
        lede={scope.isOfficer ? copy.ledeOfficer : copy.ledeMentor}
        action={
          scope.isOfficer && (
            <Link className="admin-button" href={taskPaths.sessionNew}>
              {copy.new}
            </Link>
          )
        }
      />
      {groups.length > 0 ? (
        <RowList label={copy.label} columns={[...copy.columns]} status={copy.status} groups={groups} />
      ) : (
        <EmptyState>{scope.isOfficer ? copy.emptyOfficer : copy.emptyMentor}</EmptyState>
      )}
    </>
  );
}
