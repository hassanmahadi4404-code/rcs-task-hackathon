/**
 * Site-wide strings — TASK-018, PAT-004.
 *
 * Nav, brand, socials, contact, footer. No user-visible string may live in a
 * component (GUD-004).
 */

import type { SectionId } from '@/config/motion';

/**
 * TASK-146 (REQ-109) — nav items now mix two kinds of destination, so `href`
 * widens from ``#${string}`` to a root-relative path. Both kinds are written
 * from the root: `/#about` is a home-page section, `/events` is a route.
 * Writing anchors as `/#about` rather than `#about` is what makes them work
 * from a sub-page, where `#about` would resolve against a document that has
 * no such section.
 *
 * `sectionId` is the discriminator. Present means "this is a home-page
 * section"; absent means "this is a route". Nothing downstream should test
 * the string shape of `href` to tell them apart.
 */
export interface NavItem {
  label: string;
  href: `/${string}`;
  /** Set only on home-page anchors. Its absence marks a route item. */
  sectionId?: SectionId;
}

/** The `#id` a nav anchor points at, or `null` for a route item. */
export function navHash(item: NavItem): `#${string}` | null {
  return item.sectionId ? `#${item.sectionId}` : null;
}

/**
 * The deployed origin — TASK-184 (REQ-145).
 *
 * The site serves from `ruetcs.org`, the club's own domain, registered to the
 * club account and pointed at Vercel. It replaced the generated
 * `rcs-phi-six.vercel.app` host, whose suffix was Vercel's rather than ours
 * and had already changed once. Every canonical and OG URL is resolved
 * against this, so it is declared once, here, with the other site constants.
 */
export const SITE_URL = 'https://ruetcs.org';

/**
 * Document metadata — TASK-183 (REQ-144, GUD-004).
 *
 * Lived as a literal in `app/layout.tsx` until this phase, and still carried
 * v1's hero copy after Round 1 rewrote it. The description below is the
 * current hero subhead's claim, not the superseded one.
 */
export const meta = {
  title: 'RUET Computing Society',
  description:
    'The computing society of Rajshahi University of Engineering & Technology — workshops, hackathons, open source, and the students who build them.',
} as const;

export const brand = {
  name: 'RUET Computing Society',
  shortName: 'RUET-CS',
  initials: 'RCS',
  tagline: 'Computing Built By Students',
  university: 'Rajshahi University of Engineering & Technology',
} as const;

/**
 * TASK-176 (REQ-137) — five items, superseding TASK-146's six. `Join` is
 * gone: the `Join Us` pill to the right of this list already pointed at
 * `/#join`, so the nav carried the same destination twice, and the duplicate
 * was what made the row crowd the pill between roughly 900px and 1100px.
 * The pill is now the site's sole Join control.
 */
export const nav: NavItem[] = [
  { label: 'Home', href: '/' },
  // Starter kit: the two areas the Hackathon builds. The club site adds the same two links.
  { label: 'Learn', href: '/learn' },
  { label: 'Mentor', href: '/mentor' },
];

/** The right-hand header pill — REQ-137 makes it the only Join control. */
export const navCta = {
  label: 'Join Us',
  href: '/#join',
} as const;

/**
 * The home page's sections, in document order — TASK-171 (REQ-133).
 *
 * The left-edge rail's source of truth. It used to be derived from `nav` by
 * filtering for items that carry a `sectionId`, which was correct while the
 * nav was a list of home-page anchors and nothing else. It stopped being
 * correct the moment the nav gained route items: the rail indexed three of
 * the eight sections and, with `Join` now removed from the nav (REQ-137),
 * would have indexed two.
 *
 * These are two different lists that happened to coincide. The nav answers
 * "where can you go from here"; this answers "what is on this page, in what
 * order". Reordering `app/page.tsx` means reordering this — and
 * `SECTION_ORDER` in `config/motion.ts`, which carries the same sequence for
 * the transition modules and additionally includes `footer`.
 */
export interface HomeSection {
  id: SectionId;
  label: string;
}

export const homeSections: HomeSection[] = [
  { id: 'home', label: 'Home' },
  { id: 'what-we-do', label: 'What We Do' },
  { id: 'about', label: 'About' },
  { id: 'events-preview', label: 'Events' },
  { id: 'executive', label: 'Executive' },
  { id: 'past-executive', label: 'Past Panels' },
  { id: 'achievements-preview', label: 'Achievements' },
  { id: 'join', label: 'Join' },
];

/**
 * TASK-074, ACC-002. The target is the first block of real copy, not the
 * `<main>` element: the header band overlays the top of the page (TASK-145),
 * so skipping to the top of `main` would skip nothing. On Home `#main-content`
 * is the hero's copy block; on every sub-page it is the page header's title
 * block (ACC-105).
 */
export const skipLink = {
  label: 'Skip to content',
  href: '#main-content',
} as const;

/**
 * TASK-138 (REQ-107) — the three destinations are rows now, not code.
 *
 * They moved to the `settings` row in issue #10, where a super admin edits
 * them; `getSocials` reads them and the seed migration carries the three
 * this file used to hold. The shape they are stored in is still this one.
 */
export interface SocialLink {
  /** `lucide-react` icon name. Must be present in `SOCIAL_ICONS`. */
  icon: string;
  /** Accessible name — used as the `aria-label` on the footer's icon link. */
  label: string;
  /** Short word shown on the Connect band's larger tiles (TASK-137). */
  tile: string;
  href: string;
}

/**
 * The address behind a `mailto:` social, or `null` for an ordinary link —
 * issue #16. A super admin can point one social at the inbox (the seed does:
 * the Connect band's `Email` tile), and that one is rendered as a copy
 * control rather than as a link, so the site carries no `mailto:` anywhere.
 * The rest open in a new tab.
 */
export function mailtoAddress(social: SocialLink): string | null {
  const scheme = 'mailto:';
  return social.href.startsWith(scheme) ? social.href.slice(scheme.length) : null;
}

/**
 * The label and the address of the campus. The inbox is not here: it moved
 * to the `settings` row in issue #10, because it is the one fact on the site
 * that changes with a committee, and `getContact` reads it from there.
 */
export const contact = {
  label: 'General enquiries',
  location: 'Kazla, Rajshahi 6204, Bangladesh',
} as const;

/**
 * The pre-footer Connect band — REQ-119, REQ-120, REQ-122.
 *
 * The band carries the ASCII wordmark canvas and the social tiles.
 *
 * REQ-122's `CLICK TO DISASSEMBLE` hint is gone at the owner's instruction:
 * the line competed with the wordmark it was labelling. Discoverability now
 * rests entirely on the canvas's `data-cursor` state, which is REQ-122's
 * other half and is still in place.
 */
export const connect = {
  eyebrow: 'CONNECT',
  headline: 'Find us where the work happens.',
  body: 'Announcements, event calls, and open-source drops go out on these three channels first.',
  /**
   * The sampling source for the ASCII canvas and the image every fallback
   * path shows in its place (TASK-124, TASK-135). Flat white on transparent,
   * rasterised from `assets/logo.svg` — that file uses `currentColor` and
   * declares no intrinsic size, so `drawImage` cannot size it reliably.
   */
  wordmark: {
    src: '/assets/wordmark-sample.png',
    alt: `${brand.name} wordmark`,
    width: 1600,
    height: 607,
  },
} as const;

/**
 * The email control — issue #16. The address is a copy button rather than a
 * `mailto:` link: most readers are on a phone with no mail client configured
 * for the society's inbox, and a dead `mailto:` loses the address entirely.
 * The address stays on screen as selectable text either way, so a browser
 * that refuses clipboard access costs nothing.
 */
export const copyEmail = {
  /** The button's resting label. Its accessible name adds the address. */
  label: 'Copy',
  /** Announced and shown after a successful copy. */
  copied: 'Copied',
} as const;

export const footer = {
  legal: `© ${new Date().getFullYear()} RUET Computing Society. All rights reserved.`,
  built: 'Student-built at RUET.',
  /** Issue #20 — the link to `/privacy`, in both footers. */
  privacy: 'Privacy',
  /** The developer's credit, a chip on the baseline of both footers. */
  credit: {
    label: 'Developed by',
    name: 'Adib',
    href: 'https://www.linkedin.com/in/adibhasan11',
    arrow: '↗',
    newTab: '(LinkedIn, opens in a new tab)',
  },
} as const;

/**
 * Boot sequence copy — REQ-013, consumed by `components/chrome/Preloader`.
 *
 * Lines are emitted evenly across the preloader's budget, so the count and
 * the `PRELOADER_MAX_MS` ceiling in `config/motion.ts` together set the
 * cadence. Adding a line makes each one shorter, never the sequence longer.
 */
export const boot = {
  lines: [
    'INIT RCS-WEB',
    'MOUNT /society',
    'LINK 5 OBJECTIVES',
    'READY',
  ],
  /** Announced to assistive tech in place of the animated log. */
  status: 'Loading RUET Computing Society',
  skip: 'Press any key to skip',
} as const;

/** Monospace chrome readouts. Decorative, but still strings, so still here. */
export const telemetry = {
  coordinates: '24.3636° N, 88.6241° E', // RUET campus
  build: 'RCS-WEB / MVP',
  status: 'SYSTEM NOMINAL',
} as const;
