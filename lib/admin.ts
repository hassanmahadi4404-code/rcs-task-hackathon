/**
 * Dashboard access decisions — issue #6.
 *
 * Who a signed-in officer is to the dashboard, and what they may see. The
 * database decides row access through RLS (`is_admin`, `is_super_admin`);
 * this module turns those answers plus `SUPER_ADMINS` into one role, and the
 * role into a navigation. `lib/auth.ts` feeds it and renders nothing itself.
 *
 * No `@/` imports: Node's test runner executes this file directly.
 */

export type Role = 'super_admin' | 'moderator';

/** What `is_admin()` and `is_super_admin()` answered for the signed-in JWT. */
export interface RowAccess {
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** The `SUPER_ADMINS` env value: comma-separated emails. */
export function parseSuperAdmins(raw: string | undefined): string[] {
  return (raw ?? '').split(',').map(normalizeEmail).filter(Boolean);
}

/** A bootstrap account is always a super admin and is shown locked. */
export function isBootstrap(email: string, superAdmins: string[]): boolean {
  return superAdmins.includes(normalizeEmail(email));
}

/**
 * `null` means not invited, or invited but inactive. A bootstrap email is a
 * super admin whatever its row says, so the society can never be locked out.
 */
export function resolveRole(
  email: string | undefined,
  superAdmins: string[],
  access: RowAccess,
): Role | null {
  if (!email) return null;
  if (isBootstrap(email, superAdmins) || access.isSuperAdmin) return 'super_admin';
  return access.isAdmin ? 'moderator' : null;
}

/** The navigation sections a role may use, in their declared order. */
export function sectionsFor<T extends { roles: readonly Role[] }>(
  sections: readonly T[],
  role: Role,
): T[] {
  return sections.filter((section) => section.roles.includes(role));
}

/**
 * The section a path sits in — issue #21. Nested pages (`/admin/events/<id>/`)
 * belong to their list, so the longest matching address wins; `trailingSlash`
 * means `usePathname()` may or may not end in `/`. A section that holds
 * others (the Overview) is only its own page, so a dashboard 404 is in none (#43).
 */
export function currentSection<T extends { href: string }>(
  sections: readonly T[],
  pathname: string,
): T | undefined {
  const path = pathname.endsWith('/') ? pathname : `${pathname}/`;
  return sections
    .filter(
      (section) =>
        path === section.href ||
        (path.startsWith(section.href) &&
          !sections.some((other) => other !== section && other.href.startsWith(section.href))),
    )
    .sort((a, b) => b.href.length - a.href.length)[0];
}

/** The skeleton a dashboard page loads behind — issue #41. */
export type PageShape = 'list' | 'record' | 'form';

/** Top-level sections that are not lists; everything else is one. `''` is the Overview. */
const SECTION_SHAPES: Record<string, PageShape> = {
  '': 'record',
  settings: 'form',
  recruitment: 'form',
  payments: 'record',
};

/** Sections whose rows open as a record (stat tiles, then actions), not a form. */
const RECORD_SECTIONS = new Set(['members', 'access']);

function pageShape(pathname: string): PageShape {
  const [section = '', id, person] = pathname.split('/').filter(Boolean).slice(1);
  if (person) return 'form';
  if (!id) return SECTION_SHAPES[section] ?? 'list';
  if (id === 'new' || id === 'handover') return 'form';
  if (section === 'team') return 'list';
  return RECORD_SECTIONS.has(section) ? 'record' : 'form';
}

/** A skeleton for another page, or `busy` for the same list re-queried. */
export type NavigationFeedback = PageShape | 'busy';

function withSlash(pathname: string): string {
  return pathname.endsWith('/') ? pathname : `${pathname}/`;
}

/**
 * What a dashboard click shows while the next page loads — issue #41.
 * Another page gets a skeleton in its shape; the same list with a new
 * search, group, or page stays in view and is marked busy. `null` is left
 * to the browser: other origins, pages outside the dashboard, `skip`
 * addresses that are not pages (a CSV download, sign-in), and jumps within
 * the page.
 */
export function navigationFeedback(
  from: string,
  to: string,
  skip: readonly string[],
): NavigationFeedback | null {
  const here = new URL(from);
  const next = new URL(to, from);
  const path = withSlash(next.pathname);
  if (next.origin !== here.origin || !path.startsWith('/admin/') || skip.includes(path)) return null;
  if (path !== withSlash(here.pathname)) return pageShape(path);
  return next.search === here.search ? null : 'busy';
}
