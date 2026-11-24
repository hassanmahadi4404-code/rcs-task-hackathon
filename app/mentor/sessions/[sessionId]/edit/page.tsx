import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import PageHeader from '@/components/admin/PageHeader';
import SessionForm from '@/components/tasks/SessionForm';
import { mentorCopy, taskPaths } from '@/content/tasks';
import { mentorSession, tracks } from '@/lib/tasks/data';
import { isUuid } from '@/lib/tasks/files';
import { officerAccess } from '@/lib/tasks/mentor-page';

const copy = mentorCopy.sessionForm;

export const metadata: Metadata = { title: copy.editTitle };

/** An Officer renames or moves a Session. */
export default async function EditSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const { scope } = await officerAccess(taskPaths.sessionEdit(sessionId));
  const item = isUuid(sessionId) ? await mentorSession(scope, sessionId) : null;
  if (!item) notFound();
  const options = (await tracks()).map((track) => ({ value: track.id, label: track.name }));

  return (
    <>
      <PageHeader
        title={copy.editTitle}
        crumbs={[
          { label: mentorCopy.sessions.title, href: taskPaths.sessions },
          { label: item.session.title, href: taskPaths.session(item.session.id) },
        ]}
      />
      <SessionForm
        id={item.session.id}
        tracks={options}
        initial={{ track_id: item.session.track_id, title: item.session.title, held_on: item.session.held_on }}
        cancelHref={taskPaths.session(item.session.id)}
      />
    </>
  );
}
