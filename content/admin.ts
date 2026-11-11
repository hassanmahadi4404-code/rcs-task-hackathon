/**
 * Starter kit extract of the dashboard copy and navigation.
 *
 * The shared pieces in `components/admin/` read this file. On ruetcs.org it
 * also holds every dashboard section's copy; here it holds only what the
 * shell and the generic pieces need. Put the Mentor area's own copy in
 * `content/tasks.ts`, not here.
 */

/** Addresses the dashboard shell knows about. */
export const adminPaths = {
  /** Where the shell's brand mark links when no `home` is passed. */
  home: '/mentor/',
  signIn: '/sign-in/',
} as const;

/**
 * Menu headings. A section with no `group` sits above them all. Starter kit:
 * the club site's headings are Content, Intake and Admin.
 */
export const adminNavGroups = [
  { id: 'sessions', label: 'Sessions' },
  { id: 'officers', label: 'Officers' },
] as const;

export interface AdminSection {
  label: string;
  /** Starter kit: any path. On ruetcs.org this is narrowed to `/admin/...` until the merge. */
  href: string;
  group?: (typeof adminNavGroups)[number]['id'];
}

export const adminCopy = {
  metaTitle: 'Dashboard · RUET Computing Society',
  /** Every signed-in page's tab title (#43): `%s` is the page's heading. */
  metaTemplate: '%s · Dashboard',
  brand: 'RCS',
  tag: 'Dashboard',
  navLabel: 'Dashboard',
  menuToggle: 'Toggle the dashboard menu',
  signOut: 'Sign out',
  /** Beside the role of a `SUPER_ADMINS` account, which nobody can demote. */
  locked: 'Bootstrap account, locked',
  breadcrumb: 'Breadcrumb',
  /** The heading of the column that holds each row's controls. */
  actions: 'Actions',
  /** The `⋯` menu on a list row; `{name}` is the row's title. */
  more: 'More actions for {name}',
  cancel: 'Cancel',
  /** Every list's one-line toolbar — issue #33. */
  toolbar: {
    all: 'All',
    sort: 'Sort',
    apply: 'Apply',
    /** The folded extra filters; `{n}` is how many are in force. */
    more: 'Filters',
    moreActive: 'Filters ({n})',
  },
  /** Next and previous under a paged list — issue #33. */
  pager: {
    label: 'Pages',
    previous: 'Previous',
    next: 'Next',
    /** `{first}`–`{last}` of `{total}` rows. */
    status: '{first}–{last} of {total}',
  },
  /** Read out while the next dashboard page loads behind its skeleton rows. */
  loading: 'Loading',
  /** A dashboard page whose data did not load, or whose action failed. */
  failed: {
    title: 'This page did not load',
    lede: 'Something went wrong while the dashboard read or saved data. Try again, and if it keeps failing, check the connection or ask the site maintainer.',
    retry: 'Try again',
  },
  notFound: {
    title: 'Page not found',
    lede: 'There is nothing at this address in the dashboard. It may have been deleted, or your role cannot use it.',
    home: 'Back to the overview',
  },
} as const;
