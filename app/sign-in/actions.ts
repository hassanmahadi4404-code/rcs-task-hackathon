'use server';

import { redirect } from 'next/navigation';

import { adminPaths } from '@/content/admin';
import { supabaseServer } from '@/lib/auth';

/** Starter kit only: email and password for the seed users. ruetcs.org uses Google. */
export async function signIn(form: FormData): Promise<void> {
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const password = String(form.get('password') ?? '');
  const next = String(form.get('next') ?? '');
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`${adminPaths.signIn}?error=1`);
  // Only a path on this site, never an absolute URL someone put in the link.
  redirect(next.startsWith('/') && !next.startsWith('//') ? next : '/');
}

/** Pass this to `AdminShell`'s `signOut`, or use it in a form on the Learner side. */
export async function signOut(): Promise<void> {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect(adminPaths.signIn);
}
