import type { Metadata } from 'next';

import RouteFocus from '@/components/chrome/RouteFocus';
import { signInCopy } from '@/content/kit';
import { skipLink } from '@/content/site';

export const metadata: Metadata = {
  title: signInCopy.metaTitle,
  robots: { index: false, follow: false },
};

/**
 * The dashboard's root wrapper, as `app/admin/layout.tsx` is on ruetcs.org:
 * `styles/admin.css` is scoped to `.admin`. The Mentor area's layout needs
 * the same wrapper around `AdminShell`.
 */
export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin">
      <a className="skip-link" href={skipLink.href}>
        {skipLink.label}
      </a>
      <RouteFocus />
      {children}
    </div>
  );
}
