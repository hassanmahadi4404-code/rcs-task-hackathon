'use server';

/**
 * Everything a Mentor or an Officer changes. Each action writes as the
 * signed-in person, so the database's policies decide whether it happens:
 * a Mentor whose window has closed gets the same refusal here as they would
 * with the public key. An action only adds the sentence that explains it.
 */

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { taskPaths } from '@/content/tasks';
import { requireViewer, supabaseServer } from '@/lib/auth';
import { mentorScope, taskContext } from '@/lib/tasks/data';
import { societyDate } from '@/lib/tasks/deadlines';
import { isUuid } from '@/lib/tasks/files';
import {
  readEmail,
  readOverrideForm,
  readSessionForm,
  readTaskForm,
  readTrackForm,
  typed,
  type FormState,
} from '@/lib/tasks/forms';
import { runDueEvaluations, runEvaluation } from '@/lib/tasks/run-evaluation';

const UNIQUE = '23505';

const refused = (form: FormData, errors: Record<string, string>): FormState => ({ errors, values: typed(form) });
const id = (form: FormData, name: string): string | null => {
  const value = form.get(name);
  return isUuid(value) ? value : null;
};

// ---------------------------------------------------------------------------
// Tracks (Officers)
// ---------------------------------------------------------------------------

export async function saveTrack(_previous: FormState, form: FormData): Promise<FormState> {
  await requireViewer();
  const read = readTrackForm(form);
  if (!read.ok) return refused(form, read.errors);

  const supabase = await supabaseServer();
  const trackId = id(form, 'id');
  const { data, error } = trackId
    ? await supabase.from('tracks').update(read.values).eq('id', trackId).select('id')
    : await supabase.from('tracks').insert(read.values).select('id');
  if (error?.code === UNIQUE) return refused(form, { name: 'taken' });
  if (error || !data?.length) return refused(form, { form: 'unknown' });

  revalidatePath(taskPaths.tracks);
  redirect(taskPaths.tracks);
}

export async function deleteTrack(form: FormData): Promise<void> {
  await requireViewer();
  const trackId = id(form, 'id');
  if (trackId) {
    const supabase = await supabaseServer();
    await supabase.from('tracks').delete().eq('id', trackId);
  }
  revalidatePath(taskPaths.tracks);
  redirect(taskPaths.tracks);
}

// ---------------------------------------------------------------------------
// Sessions and their Mentors (Officers)
// ---------------------------------------------------------------------------

export async function saveSession(_previous: FormState, form: FormData): Promise<FormState> {
  await requireViewer();
  const read = readSessionForm(form);
  if (!read.ok) return refused(form, read.errors);
  const { mentors, held_on, ...rest } = read.values;

  const supabase = await supabaseServer();
  const sessionId = id(form, 'id');
  // `held_on` cannot be empty in the core. With no date settled, a new Session
  // takes today's as a placeholder nobody is shown, and an existing one keeps its own.
  const { data, error } = sessionId
    ? await supabase.from('sessions').update(held_on ? { ...rest, held_on } : rest).eq('id', sessionId).select('id')
    : await supabase.from('sessions').insert({ ...rest, held_on: held_on || societyDate(Date.now()) }).select('id');
  const saved = data?.[0]?.id as string | undefined;
  if (error || !saved) return refused(form, { form: 'unknown' });

  if (!sessionId && mentors.length > 0) {
    await supabase.from('session_mentors').insert(mentors.map((email) => ({ session_id: saved, email })));
  }
  revalidatePath(taskPaths.sessions);
  redirect(taskPaths.session(saved));
}

export async function deleteSession(form: FormData): Promise<void> {
  await requireViewer();
  const sessionId = id(form, 'id');
  if (!sessionId) redirect(taskPaths.sessions);
  const supabase = await supabaseServer();
  const { data } = await supabase.from('sessions').delete().eq('id', sessionId).select('id');
  revalidatePath(taskPaths.sessions);
  // Still there: it has Submissions, or this person may not delete it.
  redirect(data?.length ? taskPaths.sessions : taskPaths.session(sessionId));
}

export async function addMentor(_previous: FormState, form: FormData): Promise<FormState> {
  await requireViewer();
  const sessionId = id(form, 'session_id');
  const email = readEmail(String(form.get('email') ?? ''));
  if (!sessionId) return refused(form, { form: 'unknown' });
  if (!email) return refused(form, { email: 'invalid' });

  const supabase = await supabaseServer();
  const { error } = await supabase.from('session_mentors').insert({ session_id: sessionId, email });
  if (error?.code === UNIQUE) return refused(form, { email: 'exists' });
  if (error) return refused(form, { form: 'unknown' });

  revalidatePath(taskPaths.session(sessionId));
  return { errors: {}, values: {}, saved: true };
}

export async function removeMentor(form: FormData): Promise<void> {
  await requireViewer();
  const sessionId = id(form, 'session_id');
  const email = readEmail(String(form.get('email') ?? ''));
  if (!sessionId || !email) return;
  const supabase = await supabaseServer();
  await supabase.from('session_mentors').delete().eq('session_id', sessionId).eq('email', email);
  revalidatePath(taskPaths.session(sessionId));
}

// ---------------------------------------------------------------------------
// Tasks (Mentors in their window, and Officers)
// ---------------------------------------------------------------------------

export async function saveTask(_previous: FormState, form: FormData): Promise<FormState> {
  const viewer = await requireViewer();
  const read = readTaskForm(form);
  if (!read.ok) return refused(form, read.errors);
  const { published, ...values } = read.values;

  const supabase = await supabaseServer();
  const taskId = id(form, 'id');
  let saved: string | undefined;

  if (taskId) {
    const existing = await taskContext(await mentorScope(viewer), taskId);
    if (!existing) return refused(form, { form: 'not_allowed' });
    // Publishing again does not move the moment it was first published.
    const published_at = published ? (existing.task.published_at ?? new Date().toISOString()) : null;
    const { data } = await supabase.from('tasks').update({ ...values, published_at }).eq('id', taskId).select('id');
    saved = data?.[0]?.id as string | undefined;
  } else {
    const sessionId = id(form, 'session_id');
    if (!sessionId) return refused(form, { form: 'unknown' });
    const { data } = await supabase
      .from('tasks')
      .insert({ ...values, session_id: sessionId, published_at: published ? new Date().toISOString() : null })
      .select('id');
    saved = data?.[0]?.id as string | undefined;
  }
  // No row back means a policy said no: the window has closed, or it never was theirs.
  if (!saved) return refused(form, { form: 'not_allowed' });

  revalidatePath(taskPaths.task(saved));
  redirect(taskPaths.task(saved));
}

export async function deleteTask(form: FormData): Promise<void> {
  await requireViewer();
  const taskId = id(form, 'id');
  const sessionId = id(form, 'session_id');
  if (!taskId || !sessionId) redirect(taskPaths.sessions);
  const supabase = await supabaseServer();
  const { data } = await supabase.from('tasks').delete().eq('id', taskId).select('id');
  revalidatePath(taskPaths.session(sessionId));
  redirect(data?.length ? taskPaths.session(sessionId) : taskPaths.task(taskId));
}

// ---------------------------------------------------------------------------
// Evaluations: the Mentor's word, and asking the AI again
// ---------------------------------------------------------------------------

const OVERRIDE_REFUSALS = ['override_empty', 'score_out_of_range', 'note_too_long', 'not_allowed'];

export async function saveOverride(_previous: FormState, form: FormData): Promise<FormState> {
  await requireViewer();
  const submissionId = id(form, 'submission_id');
  const read = readOverrideForm(form);
  if (!submissionId) return refused(form, { form: 'unknown' });
  if (!read.ok) return refused(form, read.errors);

  const supabase = await supabaseServer();
  const { error } = await supabase.rpc('set_evaluation_override', {
    p_submission: submissionId,
    p_score: read.values.score,
    p_note: read.values.note,
  });
  if (error) return refused(form, { form: OVERRIDE_REFUSALS.includes(error.message) ? error.message : 'unknown' });

  revalidatePath(taskPaths.submission(submissionId));
  return { errors: {}, values: {}, saved: true };
}

export async function clearOverride(form: FormData): Promise<void> {
  await requireViewer();
  const submissionId = id(form, 'submission_id');
  if (!submissionId) return;
  const supabase = await supabaseServer();
  await supabase.rpc('clear_evaluation_override', { p_submission: submissionId });
  revalidatePath(taskPaths.submission(submissionId));
}

/** Throw the AI's read away and ask again; the database refuses anyone without a say. */
export async function rerunEvaluation(form: FormData): Promise<void> {
  await requireViewer();
  const submissionId = id(form, 'submission_id');
  if (!submissionId) return;
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc('request_reevaluation', { p_submission: submissionId });
  if (!error) await runEvaluation(submissionId);
  revalidatePath(taskPaths.submission(submissionId));
}

/** Run the Evaluations of one Task that are waiting and due. */
export async function runWaiting(form: FormData): Promise<void> {
  const viewer = await requireViewer();
  const taskId = id(form, 'task_id');
  if (!taskId) return;
  // Only someone who can see the Task's work gets to spend quota on it.
  if (!(await taskContext(await mentorScope(viewer), taskId))) return;
  await runDueEvaluations(taskId);
  revalidatePath(taskPaths.task(taskId));
}
