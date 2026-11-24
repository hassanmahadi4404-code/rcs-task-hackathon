import Link from 'next/link';

import { NoSection } from '@/components/admin/AdminShell';
import EmptyState from '@/components/admin/EmptyState';
import PageHeader from '@/components/admin/PageHeader';
import { mentorCopy, taskPaths } from '@/content/tasks';

/** Deleted, never there, or another Mentor's: one answer for all three. */
export default function MentorNotFound() {
  const copy = mentorCopy.notFound;
  return (
    <>
      <NoSection />
      <PageHeader title={copy.title} />
      <EmptyState>
        <p>{copy.lede}</p>
        <Link className="admin-link" href={taskPaths.mentor}>
          {copy.home}
        </Link>
      </EmptyState>
    </>
  );
}
