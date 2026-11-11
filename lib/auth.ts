/**
 * Who is signed in — the Starter kit's one identity seam.
 *
 * Entries read identity only through `getViewer()` and `requireViewer()`. On
 * ruetcs.org the same two functions sit on top of the club site's Google
 * sign-in, so an Entry ports without touching its pages. Never read the
 * session or the `admins` and `members` tables any other way.
 *
 * Mentor is not a role (ADR 0001 in the organiser's notes): whether someone
 * mentors a Session is a row in `session_mentors` for their `email`, which an
 * Entry looks up itself.
 *
 * Server only: it reads the session cookies.
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';

import { adminPaths } from '@/content/admin';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export interface Viewer {
  /** `auth.uid()` in SQL. */
  userId: string;
  /** Lower-cased; `auth.jwt() ->> 'email'` in SQL. */
  email: string;
  /** An active Officer; `public.is_admin()` in SQL. */
  isOfficer: boolean;
  /** The Member this person is, or null; `public.viewer_member_id()` in SQL. */
  memberId: string | null;
}

/** A Supabase client acting as the signed-in person, so RLS decides every read and write. */
export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Called from a server component; middleware has already refreshed.
        }
      },
    },
  });
}

/** The signed-in person, or null when signed out. Cached per request. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email?.toLowerCase();
  if (!user || !email) return null;

  // The same checks RLS makes, so the UI can never grant more than the database.
  const [admin, member] = await Promise.all([
    supabase.rpc('is_admin'),
    supabase.rpc('viewer_member_id'),
  ]);
  return {
    userId: user.id,
    email,
    isOfficer: admin.data === true,
    memberId: typeof member.data === 'string' ? member.data : null,
  };
});

/** The signed-in person; a signed-out visitor is sent to sign in. */
export async function requireViewer(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect(adminPaths.signIn);
  return viewer;
}
