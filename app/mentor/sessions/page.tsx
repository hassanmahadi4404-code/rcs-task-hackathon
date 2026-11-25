import type { Metadata } from 'next';
import Link from 'next/link';

import EmptyState from '@/components/admin/EmptyState';
import PageHeader from '@/components/admin/PageHeader';
import RowList, { Row, type RowGroup } from '@/components/admin/RowList';
import StatusPill from '@/components/admin/StatusPill';
import { mentorCopy, taskPaths } from '@/content/tasks';
import { fill } from '@/lib/admin-payments';
import { mentorSessions, type SessionItem } from '@/lib/tasks/data';
import { formatDate, sessionPhase } from '@/lib/tasks/deadlines';
import { planOrder, trackStatus } from '@/lib/tasks/mentor';
import { mentorAccess } from '@/lib/tasks/mentor-page';
import { requestNow } from '@/lib/tasks/now';

const copy = mentorCopy.sessions;

export const metadata: Metadata = { title: copy.title };

/** Said under a Track's name when it is not running; a running Track shows its description. */
function trackNote(track: { archived: boolean; upcoming: boolean }): string | undefined {
  const status = trackStatus(track);
  return status === 'running' ? undefined : copy.trackNote[status];
}

/**
 * The plan, laid out the way the society keeps it: every Track in the order
 * it is taught, and under it each Session with its syllabus, its Mentors and
 * its date. A Mentor sees the same table, with only their own Sessions in it.
 */
export default async function SessionsPage() {
  const { scope } = await mentorAccess(taskPaths.sessions);
  const now = requestNow();
  const sessions = await mentorSessions(scope);

  const byTrack = new Map<string, SessionItem[]>();
  for (const item of sessions) byTrack.set(item.track.id, [...(byTrack.get(item.track.id) ?? []), item]);
  const tracks = [...byTrack.values()]
    .sort((a, b) => a[0].track.name.localeCompare(b[0].track.name, 'en'))
    .sort((a, b) => planOrder(a[0].track, b[0].track));

  const mono = (value: React.ReactNode, key: string) => (
    <span className="admin-mono" key={key}>
      {value}
    </span>
  );
  const groups: RowGroup[] = tracks.map((items) => ({
    id: items[0].track.id,
    label: items[0].track.name,
    count: items.length,
    note: trackNote(items[0].track) ?? (items[0].track.description || undefined),
    rows: items.map(({ session, tasks, mentors, submissions }) => {
      const deadlines = tasks.map((task) => task.deadline);
      const phase = copy.phase[sessionPhase(session.held_on, deadlines, now, session.date_tbc)];
      const [first, second, ...others] = mentors;
      return (
        <Row
          key={session.id}
          title={<Link href={taskPaths.session(session.id)}>{session.title}</Link>}
          data={[
            [copy.columns[1], <span className="task-topic" key="topic">{session.topic || copy.none}</span>],
            [copy.columns[2], <span className="task-email" key="m1">{first ?? copy.none}</span>],
            [
              copy.columns[3],
              <span className="task-email" key="m2">
                {second ?? copy.none}
                {others.length > 0 && ` ${fill(copy.moreMentors, { n: String(others.length) })}`}
              </span>,
            ],
            [copy.columns[4], session.date_tbc ? copy.dateTbc : mono(formatDate(session.held_on), 'date')],
            [copy.columns[5], mono(tasks.length, 'tasks')],
            [copy.columns[6], mono(submissions.length, 'work')],
          ]}
          status={<StatusPill tone={phase.tone}>{phase.label}</StatusPill>}
        />
      );
    }),
  }));

  const plural = (n: number, one: string, many: string) => (n === 1 ? one : fill(many, { n: String(n) }));

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
      >
        {sessions.length > 0 && (
          <p className="admin-now__line">
            {fill(copy.summary, {
              sessions: plural(sessions.length, copy.count.session, copy.count.sessions),
              tracks: plural(tracks.length, copy.count.track, copy.count.tracks),
            })}
          </p>
        )}
      </PageHeader>
      {groups.length > 0 ? (
        <RowList label={copy.label} columns={[...copy.columns]} status={copy.status} groups={groups} />
      ) : (
        <EmptyState>{scope.isOfficer ? copy.emptyOfficer : copy.emptyMentor}</EmptyState>
      )}
    </>
  );
}
