import Link from 'next/link';

import PageShell from '@/components/chrome/PageShell';
import { kitHome } from '@/content/kit';

/** The kit's landing page. On ruetcs.org this address is the home page. */
export default function Page() {
  return (
    <PageShell page={kitHome.page}>
      <section className="section">
        <div className="section__inner">
          <ul>
            {kitHome.links.map((link) => (
              <li key={link.href}>
                <Link href={link.href}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </PageShell>
  );
}
