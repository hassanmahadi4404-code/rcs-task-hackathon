'use client';

import EmptyState from '@/components/admin/EmptyState';
import PageHeader from '@/components/admin/PageHeader';
import { adminCopy } from '@/content/admin';

/** A Mentor-area page whose data did not load, or whose action failed. */
export default function MentorError({ reset }: { reset: () => void }) {
  const copy = adminCopy.failed;
  return (
    <>
      <PageHeader title={copy.title} />
      <EmptyState>
        <p>{copy.lede}</p>
        <button type="button" className="admin-button admin-button--quiet" onClick={reset}>
          {copy.retry}
        </button>
      </EmptyState>
    </>
  );
}
