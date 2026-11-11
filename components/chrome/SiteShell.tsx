'use client';

/**
 * Starter kit version of the site's shell: the header, the skip link, focus
 * handling on navigation, smooth scroll and the footer. The club site's shell
 * also mounts the preloader, the custom cursor, the scroll rail and the home
 * footer; none of them belong on the pages the Hackathon builds.
 */

import type { ReactNode } from 'react';

import Header from '@/components/chrome/Header';
import RouteFocus from '@/components/chrome/RouteFocus';
import SiteFooter from '@/components/chrome/SiteFooter';
import SmoothScroll from '@/components/chrome/SmoothScroll';
import { skipLink, type SocialLink } from '@/content/site';
import type { ContactDetails, SectionsPresent } from '@/lib/data';

export interface SiteShellProps {
  children: ReactNode;
  socials: SocialLink[];
  contact: ContactDetails;
  present: SectionsPresent;
  joinOpen: boolean;
}

export default function SiteShell({ children, socials, contact, present, joinOpen }: SiteShellProps) {
  return (
    <SmoothScroll>
      <a className="skip-link" href={skipLink.href}>
        {skipLink.label}
      </a>
      <RouteFocus />

      <div className="site-shell">
        <div className="site-header-mount">
          <Header {...present} joinOpen={joinOpen} />
        </div>

        {children}

        <SiteFooter socials={socials} contact={contact} />
      </div>
    </SmoothScroll>
  );
}
