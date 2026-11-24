import type { Metadata } from 'next';
import Link from 'next/link';

import EmptyState from '@/components/admin/EmptyState';
import PageHeader from '@/components/admin/PageHeader';
import SessionForm from '@/components/tasks/SessionForm';
import { mentorCopy, taskPaths } from '@/content/tasks';
import { tracks } from '@/lib/tasks/data';
import { officerAccess } from '@/lib/tasks/mentor-page';

const copy = mentorCopy.sessionForm;

export const metadata: Metadata = { title: copy.newTitle };

/** An Officer plans a Session. */
export default async function NewSessionPage() {
  await officerAccess(taskPaths.sessionNew);
  const options = (await tracks()).filter((track) => !track.archived).map((track) => ({ value: track.id, label: track.name }));

  return (
    <>
      <PageHeader title={copy.newTitle} lede={copy.lede} crumbs={[{ label: mentorCopy.sessions.title, href: taskPaths.sessions }]} />
      {options.length > 0 ? (
        <SessionForm tracks={options} initial={{ track_id: '', title: '', topic: '', position: '', held_on: '', date_tbc: false }} cancelHref={taskPaths.sessions} />
      ) : (
        <EmptyState>
          <p>{copy.noTracks}</p>
          <Link className="admin-link" href={taskPaths.trackNew}>
            {mentorCopy.tracks.new}
          </Link>
        </EmptyState>
      )}
    </>
  );
}
