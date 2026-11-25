import type { Metadata } from 'next';

import PageHeader from '@/components/admin/PageHeader';
import TrackForm from '@/components/tasks/TrackForm';
import { mentorCopy, taskPaths } from '@/content/tasks';
import { officerAccess } from '@/lib/tasks/mentor-page';

const copy = mentorCopy.trackForm;

export const metadata: Metadata = { title: copy.newTitle };

export default async function NewTrackPage() {
  await officerAccess(taskPaths.trackNew);
  return (
    <>
      <PageHeader title={copy.newTitle} crumbs={[{ label: mentorCopy.tracks.title, href: taskPaths.tracks }]} />
      <TrackForm initial={{ name: '', description: '', status: 'running', position: '' }} />
    </>
  );
}
