/**
 * Sub-page furniture copy — TASK-148, REQ-125.
 *
 * The three routes Round 2 adds share one shell (`components/chrome/PageShell`),
 * and this is the shell's content: the eyebrow, the page's single `h1`, the
 * lede under it, and the telemetry caption that stands in for the HUD section
 * caption the home page's sections carry.
 *
 * Route bodies live in their own content modules — `content/events.ts`,
 * `content/team.ts`, and (Phase 8) `content/achievements.ts`. Only the header
 * of each page is here, because only the header is the shell's business.
 */

import { brand } from '@/content/site';

export interface PageMeta {
  /** Route path, matching the directory under `app/`. */
  path: `/${string}`;
  /** Monospace eyebrow above the title. Uppercase, telemetry voice. */
  eyebrow: string;
  /** The page's one `h1` (ACC-105). */
  title: string;
  /** One or two sentences under the title. Inter, lede size. */
  lede: string;
  /** Telemetry caption on the header's hairline. Kept short — it is chrome. */
  caption: string;
  /** `<title>` and `og:title` — the route's own metadata. */
  metaTitle: string;
  metaDescription: string;
}

/** The affordance back to Home, shared by all three pages. */
export const backToHome = {
  label: 'Back to home',
  href: '/',
} as const;

/**
 * Shown in a page body that has no content yet. Phases 7 and 8 replace each
 * of these with the real thing; until then the shell is honest about being
 * empty rather than shipping invented content (CON-104).
 */
export const pending = {
  eyebrow: 'PENDING',
  body: 'This page is being built. Its content lands in the next phase of the current plan.',
} as const;

export const teamPage: PageMeta = {
  path: '/team',
  eyebrow: 'TEAM / ROSTER',
  title: 'The people behind RCS',
  lede: 'Teams, the org structure, and every member currently serving. The Central Executive Committee itself is introduced on the home page.',
  caption: 'TEAMS · ORG · MEMBERS',
  metaTitle: `Team — ${brand.name}`,
  metaDescription:
    'Teams, org structure, and the members currently serving the RUET Computing Society.',
};

export const eventsPage: PageMeta = {
  path: '/events',
  eyebrow: 'EVENTS / ARCHIVE',
  title: 'Everything we have run, and what is next',
  lede: 'Workshops, contests, hackathons, and seminars — upcoming first, then the full archive. Open any card for the detail.',
  caption: 'UPCOMING · PAST · FULL DETAIL',
  metaTitle: `Events — ${brand.name}`,
  metaDescription:
    'Upcoming and past workshops, contests, hackathons, and seminars run by the RUET Computing Society.',
};

export const achievementsPage: PageMeta = {
  path: '/achievements',
  eyebrow: 'ACHIEVEMENTS / RECORD',
  title: 'What the society and its members have won',
  lede: 'Club achievements first, then the individual records our members have set in national and international competitions.',
  caption: 'CLUB · MEMBERS',
  metaTitle: `Achievements — ${brand.name}`,
  metaDescription:
    'Club and member achievements of the RUET Computing Society.',
};

/** Issue #20 — linked from both footers, not from the nav. */
export const privacyPage: PageMeta = {
  path: '/privacy',
  eyebrow: 'PRIVACY / POLICY',
  title: 'What this site collects',
  lede: 'The Join form, officer sign-in, and a spam check. Nothing else is collected, and nothing is sold or shared.',
  caption: 'JOIN FORM · SIGN-IN · SPAM CHECK',
  metaTitle: `Privacy — ${brand.name}`,
  metaDescription:
    'What the RUET Computing Society website collects, why, and how to have it corrected or deleted.',
};

/** Every sub-page, in nav order. Used by the build-time route audit. */
export const pages: PageMeta[] = [eventsPage, teamPage, achievementsPage];
