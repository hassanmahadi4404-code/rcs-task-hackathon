/**
 * Copy for the Starter kit's own pages: the landing page and the stand-in
 * sign-in. Neither ships to ruetcs.org, where the home page and Google
 * sign-in take their place.
 */

import type { PageMeta } from '@/content/pages';

export const kitHome = {
  page: {
    path: '/',
    eyebrow: 'STARTER KIT',
    title: 'RCS Task Hackathon',
    lede: 'Build the Learner area at /learn and the Mentor area at /mentor. BRIEF.md says what to build; CONTRIBUTING.md says how.',
    caption: 'KIT · LEARN · MENTOR',
    metaTitle: 'Starter kit · RUET Computing Society',
    metaDescription: 'The Starter kit for the RCS Task Hackathon.',
  } satisfies PageMeta,
  links: [
    { label: 'Learner area (/learn)', href: '/learn/' },
    { label: 'Mentor area (/mentor)', href: '/mentor/' },
    { label: 'Sign in as a seed user', href: '/sign-in/' },
  ],
} as const;

export const signInCopy = {
  metaTitle: 'Sign in · Starter kit',
  eyebrow: 'STARTER KIT',
  title: 'Sign in',
  lede: 'Use one of the seed users from supabase/seed.sql. On ruetcs.org this page is replaced by Google sign-in.',
  email: 'Email',
  password: 'Password',
  submit: 'Sign in',
  error: 'That email and password did not match a seed user.',
  signedInAs: 'Signed in as {email}.',
  signOut: 'Sign out',
} as const;
