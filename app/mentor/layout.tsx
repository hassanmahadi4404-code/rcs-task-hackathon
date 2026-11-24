import type { Metadata } from 'next';
import Link from 'next/link';

import { signOut } from '@/app/sign-in/actions';
import AdminShell from '@/components/admin/AdminShell';
import GatePanel from '@/components/admin/GatePanel';
import RouteFocus from '@/components/chrome/RouteFocus';
import { skipLink } from '@/content/site';
import { mentorCopy, mentorNav, taskPaths } from '@/content/tasks';
import { fill } from '@/lib/admin-payments';
import { mentorScope } from '@/lib/tasks/data';
import { viewerAt } from '@/lib/tasks/viewer';

import '@/styles/tasks.css';

export const metadata: Metadata = {
  title: { default: mentorCopy.metaTitle, template: mentorCopy.metaTemplate },
  robots: { index: false, follow: false },
};

/**
 * The Mentor area, in the dashboard's shell. Officers see every Session and
 * the Tracks; a Mentor sees the Sessions they were named for. Anyone else who
 * is signed in is told, plainly, that there is nothing here for them.
 */
export default async function MentorLayout({ children }: { children: React.ReactNode }) {
  const viewer = await viewerAt(taskPaths.mentor);
  const scope = await mentorScope(viewer);
  const invited = scope.isOfficer || scope.sessionIds.length > 0;
  const copy = mentorCopy.notInvited;

  return (
    <div className="admin">
      <a className="skip-link" href={skipLink.href}>
        {skipLink.label}
      </a>
      <RouteFocus />
      {invited ? (
        <AdminShell
          sections={scope.isOfficer ? [mentorNav.overview, mentorNav.sessions, mentorNav.tracks] : [mentorNav.overview, mentorNav.sessions]}
          email={viewer.email}
          role={scope.isOfficer ? mentorCopy.roles.officer : mentorCopy.roles.mentor}
          locked={false}
          signOut={signOut}
          home={taskPaths.mentor}
        >
          {children}
        </AdminShell>
      ) : (
        <GatePanel eyebrow={copy.eyebrow} title={copy.title} lede={fill(copy.lede, { email: viewer.email })}>
          <form action={signOut} className="admin-actions">
            {viewer.memberId && (
              <Link className="admin-button" href={taskPaths.learn}>
                {copy.learn}
              </Link>
            )}
            <button type="submit" className="admin-button admin-button--quiet">
              {copy.signOut}
            </button>
          </form>
        </GatePanel>
      )}
    </div>
  );
}
