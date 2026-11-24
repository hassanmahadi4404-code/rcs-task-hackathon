/**
 * What every Mentor-area page starts with: who is looking, and which
 * Sessions are theirs. Someone who is neither an Officer nor a Mentor of
 * anything gets the layout's "nothing here" panel; a page asked for by them
 * directly answers 404, the same as an address that does not exist.
 *
 * Server only.
 */

import { notFound } from 'next/navigation';

import type { Viewer } from '@/lib/auth';
import { mentorScope, type MentorScope } from '@/lib/tasks/data';
import { viewerAt } from '@/lib/tasks/viewer';

export async function mentorAccess(path: string): Promise<{ viewer: Viewer; scope: MentorScope }> {
  const viewer = await viewerAt(path);
  const scope = await mentorScope(viewer);
  if (!scope.isOfficer && scope.sessionIds.length === 0) notFound();
  return { viewer, scope };
}

/** For the pages only an Officer has: Tracks, and planning Sessions. */
export async function officerAccess(path: string): Promise<{ viewer: Viewer; scope: MentorScope }> {
  const access = await mentorAccess(path);
  if (!access.scope.isOfficer) notFound();
  return access;
}
