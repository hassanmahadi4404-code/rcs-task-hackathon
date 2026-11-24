import type { Metadata } from 'next';
import Link from 'next/link';

import EmptyState from '@/components/admin/EmptyState';
import PageHeader from '@/components/admin/PageHeader';
import RowList, { Row } from '@/components/admin/RowList';
import StatusPill from '@/components/admin/StatusPill';
import { mentorCopy, taskPaths } from '@/content/tasks';
import { tracks } from '@/lib/tasks/data';
import { officerAccess } from '@/lib/tasks/mentor-page';

const copy = mentorCopy.tracks;

export const metadata: Metadata = { title: copy.title };

/** Officers: the standing streams Sessions belong to. */
export default async function TracksPage() {
  await officerAccess(taskPaths.tracks);
  const items = await tracks();

  return (
    <>
      <PageHeader
        title={copy.title}
        lede={copy.lede}
        action={
          <Link className="admin-button" href={taskPaths.trackNew}>
            {copy.new}
          </Link>
        }
      />
      {items.length > 0 ? (
        <RowList label={copy.label} columns={[...copy.columns]} status={copy.status}>
          {items.map((track) => {
            const state = copy.state[track.archived ? 'archived' : 'active'];
            return (
              <Row
                key={track.id}
                title={<Link href={taskPaths.track(track.id)}>{track.name}</Link>}
                data={[
                  [copy.columns[1], track.description],
                  [copy.columns[2], <span className="admin-mono" key="sessions">{track.sessions}</span>],
                ]}
                status={<StatusPill tone={state.tone}>{state.label}</StatusPill>}
              />
            );
          })}
        </RowList>
      ) : (
        <EmptyState>{copy.empty}</EmptyState>
      )}
    </>
  );
}
