import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { deleteTrack } from '@/app/mentor/actions';
import PageHeader from '@/components/admin/PageHeader';
import PostButton from '@/components/admin/PostButton';
import { ListGroup } from '@/components/admin/RowList';
import TrackForm from '@/components/tasks/TrackForm';
import { mentorCopy, taskPaths } from '@/content/tasks';
import { supabaseServer } from '@/lib/auth';
import { trackById } from '@/lib/tasks/data';
import { isUuid } from '@/lib/tasks/files';
import { officerAccess } from '@/lib/tasks/mentor-page';

const copy = mentorCopy.trackForm;

export const metadata: Metadata = { title: copy.editTitle };

/** An Officer renames, archives or deletes a Track. */
export default async function EditTrackPage({ params }: { params: Promise<{ trackId: string }> }) {
  const { trackId } = await params;
  await officerAccess(taskPaths.track(trackId));
  const track = isUuid(trackId) ? await trackById(trackId) : null;
  if (!track) notFound();
  const supabase = await supabaseServer();
  const hasWork = (await supabase.rpc('track_has_submissions', { p_track: track.id })).data === true;

  return (
    <>
      <PageHeader title={copy.editTitle} crumbs={[{ label: mentorCopy.tracks.title, href: taskPaths.tracks }]} />
      <TrackForm id={track.id} initial={{ name: track.name, description: track.description, archived: track.archived, position: String(track.position) }} />
      <ListGroup id="danger" label={copy.danger.title} note={hasWork ? copy.danger.blocked : copy.danger.note}>
        {!hasWork && (
          <div className="admin-actions">
            <PostButton
              action={deleteTrack}
              fields={{ id: track.id }}
              label={copy.danger.delete}
              className="admin-button admin-button--danger"
              confirm={copy.danger.confirm}
            />
          </div>
        )}
      </ListGroup>
    </>
  );
}
