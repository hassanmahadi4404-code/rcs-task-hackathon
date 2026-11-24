/**
 * `/learn` for someone signed in who is not a Member. "People who are not
 * part of any of this should find nothing here": they are told so, with the
 * address they signed in with, because the usual cause is the wrong account.
 */

import Link from 'next/link';

import { signOut } from '@/app/sign-in/actions';
import PageShell from '@/components/chrome/PageShell';
import { learnCopy, learnPage, taskPaths } from '@/content/tasks';
import { fill } from '@/lib/admin-payments';

const copy = learnCopy.outsider;

export default function LearnOutsider({ email, hasMentorArea }: { email: string; hasMentorArea: boolean }) {
  return (
    <PageShell
      page={{ ...learnPage, eyebrow: copy.eyebrow, title: copy.title, lede: fill(copy.body, { email }), caption: copy.eyebrow }}
    >
      <section className="section">
        <div className="section__inner">
          <form action={signOut} className="learn-actions">
            {hasMentorArea && (
              <Link className="learn-button" href={taskPaths.mentor}>
                {copy.mentorLink}
              </Link>
            )}
            <button type="submit" className="learn-button learn-button--quiet">
              {copy.signOut}
            </button>
          </form>
        </div>
      </section>
    </PageShell>
  );
}
