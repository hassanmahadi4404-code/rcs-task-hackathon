import type { Metadata } from 'next';

import '@/styles/tasks.css';

/**
 * The Learner area. It is signed-in and personal, so nothing here is indexed.
 * The site's header and footer come from the `(site)` layout above; the
 * `.learn` wrapper scopes the task platform's own sizes (`styles/tasks.css`).
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return <div className="learn">{children}</div>;
}
