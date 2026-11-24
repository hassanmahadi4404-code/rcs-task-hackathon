/**
 * The signed-in person for a task platform page. Identity still comes only
 * from `getViewer()`; this adds where to come back to, so someone who opens a
 * link to a Task or a Session lands on it after signing in.
 *
 * Server only.
 */

import { redirect } from 'next/navigation';

import { adminPaths } from '@/content/admin';
import { getViewer, type Viewer } from '@/lib/auth';

export async function viewerAt(path: string): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect(`${adminPaths.signIn}?next=${encodeURIComponent(path)}`);
  return viewer;
}
