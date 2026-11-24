/**
 * Downloading a Submission's file. The bucket is private, so a link on a page
 * points here; this asks Storage, as the signed-in person, for a URL that
 * works for a minute, and sends the browser to it. RLS on `submissions` and
 * on `storage.objects` decides whether there is anything to send.
 *
 * Server only.
 */

import { NextResponse } from 'next/server';

import { adminPaths } from '@/content/admin';
import { getViewer, supabaseServer } from '@/lib/auth';
import { submissionFile } from '@/lib/tasks/data';
import { fileNameOf, isUuid } from '@/lib/tasks/files';

const LINK_SECONDS = 60;

const notFound = () => new NextResponse(null, { status: 404 });

export async function downloadSubmissionFile(request: Request, submissionId: string): Promise<NextResponse> {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.redirect(new URL(adminPaths.signIn, request.url));
  if (!isUuid(submissionId)) return notFound();

  const row = await submissionFile(submissionId);
  if (!row?.file_path) return notFound();

  const supabase = await supabaseServer();
  const { data } = await supabase.storage
    .from('submissions')
    .createSignedUrl(row.file_path, LINK_SECONDS, { download: fileNameOf(row.file_path) });
  if (!data?.signedUrl) return notFound();

  const response = NextResponse.redirect(data.signedUrl);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
