/**
 * Sub-page footer — TASK-178, REQ-139.
 *
 * `/team`, `/events`, and `/achievements` end conventionally: the mark, the
 * society's name, its tagline, where it is, how to reach it, the three
 * socials, and the legal row. No ASCII band, in any form — the band is the
 * home page's ending (REQ-138), and repeating it on every route would spend
 * a canvas and a sampling loop on three pages that did not ask for one
 * (REQ-141). `SiteShell` chooses between the two by pathname, so the band's
 * component is not in the tree here at all.
 *
 * This is the old `Footer` minus the alumni strip (REQ-142) and plus the
 * tagline (REQ-143), which was declared in `content/site.ts` and read
 * nowhere; it now has exactly one consumer, which is this line.
 */

import Link from 'next/link';

import CopyEmail from '@/components/chrome/CopyEmail';
import LogoMark from '@/components/brand/LogoMark';
import Hairline from '@/components/hud/Hairline';
import { SOCIAL_ICONS } from '@/components/chrome/social-icons';
import DeveloperCredit from '@/components/chrome/DeveloperCredit';
import { privacyPage } from '@/content/pages';
import {
  brand,
  contact as contactCopy,
  footer,
  mailtoAddress,
  telemetry,
  type SocialLink,
} from '@/content/site';
import type { ContactDetails } from '@/lib/data';

export interface SiteFooterProps {
  socials: SocialLink[];
  contact: ContactDetails;
}

export default function SiteFooter({ socials, contact }: SiteFooterProps) {
  return (
    <footer className="site-footer" id="footer">
      <div className="site-footer__inner">
        <div className="site-footer__grid">
          <div className="site-footer__brand">
            <LogoMark title="" className="site-footer__mark logo-on-dark" />
            <div>
              <p className="site-footer__name">{brand.name}</p>
              <p className="site-footer__tagline">{brand.tagline}</p>
              <p className="site-footer__place">{contact.location}</p>
            </div>
          </div>

          <div className="site-footer__contact">
            <span className="site-footer__contact-label">{contactCopy.label}</span>
            {/* Issue #16 — the address, plus a button that copies it. */}
            <CopyEmail email={contact.email} className="site-footer__email" />
          </div>

          {/* The inbox is one row above as a copy control, so a `mailto:`
              social is dropped here rather than repeated as an icon that
              opens a mail client the reader may not have (issue #16). */}
          <ul className="site-footer__socials">
            {socials.map((social) => {
              const Icon = SOCIAL_ICONS[social.icon];
              if (!Icon || mailtoAddress(social)) return null;
              return (
                <li key={social.label}>
                  <a
                    href={social.href}
                    aria-label={social.label}
                    className="site-footer__social"
                    data-cursor="magnetic"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Icon size={16} strokeWidth={1.5} aria-hidden="true" />
                  </a>
                </li>
              );
            })}
          </ul>
        </div>

        <Hairline className="site-footer__rule" />

        <div className="site-footer__baseline">
          <p className="site-footer__legal">
            {footer.legal}{' '}
            <Link href={privacyPage.path} className="site-footer__privacy">
              {footer.privacy}
            </Link>
          </p>
          <DeveloperCredit />
          <p className="site-footer__telemetry">
            <span>{telemetry.build}</span>
            <span>{telemetry.coordinates}</span>
            <span>{footer.built}</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
