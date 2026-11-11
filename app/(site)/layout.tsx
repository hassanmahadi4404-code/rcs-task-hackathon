import SiteShell from '@/components/chrome/SiteShell';
import { getContact, getSocials } from '@/lib/data';

/**
 * The public site's furniture, as on ruetcs.org: every page under `app/(site)/`
 * renders inside the header and footer. Learner pages go in `app/(site)/learn/`.
 */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [socials, contact] = await Promise.all([getSocials(), getContact()]);

  return (
    <SiteShell
      socials={socials}
      contact={contact}
      joinOpen={false}
      present={{ hasEvents: false, hasAchievements: false }}
    >
      {children}
    </SiteShell>
  );
}
