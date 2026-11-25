import type { Metadata } from 'next';

import Reticle from '@/components/tasks/Reticle';

import '@/styles/tasks.css';

/**
 * The Learner area. It is signed-in and personal, so nothing here is indexed.
 * The site's header and footer come from the `(site)` layout above; the
 * `.learn` wrapper scopes the task platform's own sizes (`styles/tasks.css`).
 * The reticle cursor is the site's; the kit's shell leaves it out, so it is
 * mounted here (`components/tasks/Reticle.tsx`).
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="learn">
      {children}
      <Reticle />
    </div>
  );
}
