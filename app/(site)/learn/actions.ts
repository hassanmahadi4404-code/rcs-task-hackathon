'use server';

import { randomUUID } from 'node:crypto';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { after } from 'next/server';

import { learnCopy, taskPaths } from '@/content/tasks';
import { requireViewer, supabaseServer } from '@/lib/auth';
import { isUuid, submissionPath } from '@/lib/tasks/files';
import { readSubmissionForm } from '@/lib/tasks/forms';
import { drainQueue } from '@/lib/tasks/run-evaluation';

export type SubmitError = keyof typeof learnCopy.errors;

/** What the form shows after a refusal: the reason, and the text that was typed. */
export interface SubmitState {
  error: SubmitError | null;
  body: string;
}

/**
 * How long handing in waits for the first read before it shows the receipt.
 * The mock evaluator and a quick model finish inside it, so the Learner lands
 * on their feedback; a slow one carries on after the response.
 */
const FIRST_READ_WAIT_MS = 3500;

const isSubmitError = (word: string): word is SubmitError => word in learnCopy.errors;

/** The database raises one word per refusal (`submissions_before_insert()`). */
function refusal(message: string | undefined): SubmitError {
  return message && isSubmitError(message) ? message : 'unknown';
}

/**
 * A signed URL for the browser to put one file straight into Storage. Vercel
 * refuses request bodies over 4.5 MB, so a file never passes through this
 * server; the Storage policies decide whether this Learner may upload here.
 */
export async function requestUpload(
  taskId: string,
  fileName: string,
): Promise<{ ok: true; url: string; path: string } | { ok: false; error: SubmitError }> {
  const viewer = await requireViewer();
  if (!viewer.memberId) return { ok: false, error: 'not_a_member' };
  if (!isUuid(taskId)) return { ok: false, error: 'task_not_found' };

  const supabase = await supabaseServer();
  const path = submissionPath(taskId, viewer.memberId, randomUUID(), fileName);
  const { data, error } = await supabase.storage.from('submissions').createSignedUploadUrl(path);
  if (error || !data) {
    // Not allowed means the Task stopped taking work; ask it why.
    const open = await supabase.rpc('task_accepts_submissions', { p_task: taskId });
    return { ok: false, error: open.data === false ? 'task_closed' : 'upload_failed' };
  }
  return { ok: true, url: data.signedUrl, path: data.path };
}

/**
 * Hand in one attempt. The work is saved before anything else happens: the
 * AI's read comes after, and whether it succeeds, fails or is slow, the
 * Submission is already there and the Learner is told so.
 */
export async function submitWork(_previous: SubmitState, form: FormData): Promise<SubmitState> {
  const viewer = await requireViewer();
  const body = String(form.get('body') ?? '');
  const fail = (error: SubmitError): SubmitState => ({ error, body });
  if (!viewer.memberId) return fail('not_a_member');

  const read = readSubmissionForm(form);
  if (!read.ok) return fail(refusal(Object.values(read.errors)[0]));
  const { taskId, clientKey, file, uploadedPath } = read.values;
  const supabase = await supabaseServer();

  // Without JavaScript a small file comes with the form; put it where the
  // browser would have. If that fails, the insert below names the reason.
  let filePath = uploadedPath;
  if (file) {
    filePath = submissionPath(taskId, viewer.memberId, randomUUID(), file.name);
    await supabase.storage
      .from('submissions')
      .upload(filePath, file, { contentType: file.type || 'application/octet-stream', upsert: false });
  }

  const saved = await supabase
    .from('submissions')
    .insert({ task_id: taskId, member_id: viewer.memberId, body: read.values.body, file_path: filePath, client_key: clientKey })
    .select('id')
    .single();

  let submissionId = saved.data?.id as string | undefined;
  let again = false;
  if (saved.error?.code === '23505') {
    // This attempt was already saved: a retry after a lost response, or a double click.
    const existing = await supabase.from('submissions').select('id').eq('client_key', clientKey).maybeSingle();
    submissionId = existing.data?.id as string | undefined;
    again = true;
  }
  if (!submissionId) return fail(refusal(saved.error?.message));

  // Move the line. If this Submission is near the front it is read now; if not,
  // whoever is in front is, and this one's turn comes sooner for it.
  const firstRead = drainQueue();
  after(() => firstRead);
  await Promise.race([firstRead, new Promise((resolve) => setTimeout(resolve, FIRST_READ_WAIT_MS))]);

  const path = taskPaths.learnTask(taskId);
  revalidatePath(path);
  redirect(`${path}?received=${submissionId}${again ? '&again=1' : ''}#your-work`);
}

/**
 * Look again at an Evaluation that has not finished, and move the line while
 * here. It reads whoever is at the front, which may not be the one asking:
 * that is what carries along a Learner who closed the tab. Anyone who may read
 * the Submission may ask; asking early or often changes nothing, because the
 * database gives out one run per slot.
 */
export async function checkEvaluation(submissionId: string): Promise<void> {
  await requireViewer();
  if (!isUuid(submissionId)) return;
  const supabase = await supabaseServer();
  const { data } = await supabase.from('submissions').select('task_id').eq('id', submissionId).maybeSingle();
  if (!data) return;
  await drainQueue({ max: 1 });
  revalidatePath(taskPaths.learnTask(data.task_id as string));
}

/** The same, from a form, for a browser without JavaScript. */
export async function checkEvaluationForm(form: FormData): Promise<void> {
  await checkEvaluation(String(form.get('submission_id') ?? ''));
}
