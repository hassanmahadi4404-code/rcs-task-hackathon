/**
 * The task platform's forms, read back from what was posted.
 *
 * A posted form is anything anyone typed, so each reader returns either
 * values the database will take or a word per field that is wrong;
 * `content/tasks.ts` has the sentence for each word. The database holds the
 * same limits as `check` constraints, so a bug here cannot widen them.
 *
 * No `@/` imports: Node's test runner executes this file directly.
 */

import { localToInstant } from './deadlines.ts';
import { isUuid } from './files.ts';
import { TRACK_STATUSES, trackSwitches } from './mentor.ts';
import { nullable, text } from '../form-values.ts';
import { FORMATS, MAX_BODY_CHARS, MAX_FILE_BYTES, MAX_NOTE_CHARS, MAX_POSTED_FILE_BYTES, type Format } from './rules.ts';

/** Field name to the word for what is wrong with it. */
export type FieldErrors = Record<string, string>;

export type Read<T> = { ok: true; values: T } | { ok: false; errors: FieldErrors };

/** What a form shows after it was refused: what was typed, and what was wrong. */
export interface FormState {
  errors: FieldErrors;
  values: Record<string, string>;
  saved?: boolean;
}

export const emptyFormState: FormState = { errors: {}, values: {} };

const field = (form: FormData, name: string): string => {
  const value = form.get(name);
  return typeof value === 'string' ? value : '';
};

/** Every text field as typed, for showing the form again. Files are left out. */
export function typed(form: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [name, value] of form.entries()) {
    if (typeof value !== 'string' || name.startsWith('$')) continue;
    values[name] = name in values ? `${values[name]},${value}` : value;
  }
  return values;
}

const done = <T>(errors: FieldErrors, values: T): Read<T> =>
  Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, values };

/** One value of a closed set, or null when it is not one of them. */
function pick<T extends string>(value: string, allowed: readonly T[]): T | null {
  return (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function readEmail(value: string): string | null {
  const email = text(value).toLowerCase();
  return EMAIL.test(email) ? email : null;
}

/** One address per line (or comma); the first that is not an address is named. */
export function readEmails(value: string): { emails: string[]; invalid: string | null } {
  const emails: string[] = [];
  for (const part of value.split(/[\n,;]+/).map(text).filter(Boolean)) {
    const email = readEmail(part);
    if (!email) return { emails: [], invalid: part };
    if (!emails.includes(email)) emails.push(email);
  }
  return { emails, invalid: null };
}

export interface TrackValues {
  name: string;
  description: string;
  archived: boolean;
  upcoming: boolean;
  position: number;
}

/** A place in an order: a whole number from 0 to 999; blank is 0. Null when it is neither. */
function readPosition(value: string): number | null {
  const typedValue = text(value);
  if (typedValue === '') return 0;
  return /^\d{1,3}$/.test(typedValue) ? Number(typedValue) : null;
}

export function readTrackForm(form: FormData): Read<TrackValues> {
  const errors: FieldErrors = {};
  const name = text(field(form, 'name'));
  const description = text(field(form, 'description'));
  if (name.length < 1 || name.length > 80) errors.name = 'name';
  const position = readPosition(field(form, 'position'));
  if (description.length > 400) errors.description = 'description';
  const status = pick(field(form, 'status'), TRACK_STATUSES);
  if (position === null) errors.position = 'position';
  if (!status) errors.status = 'status';
  return done(errors, { name, description, ...trackSwitches(status ?? 'running'), position: position ?? 0 });
}

export interface SessionValues {
  track_id: string;
  title: string;
  topic: string;
  position: number;
  /** Empty when the date is not settled and none was typed; the action fills a placeholder. */
  held_on: string;
  date_tbc: boolean;
  mentors: string[];
}

export function readSessionForm(form: FormData): Read<SessionValues> {
  const errors: FieldErrors = {};
  const track_id = field(form, 'track_id');
  const title = text(field(form, 'title'));
  const topic = text(field(form, 'topic'));
  const position = readPosition(field(form, 'position'));
  const held_on = field(form, 'held_on');
  const date_tbc = field(form, 'date_tbc') === 'on';
  const { emails, invalid } = readEmails(field(form, 'mentors'));
  const dated = /^\d{4}-\d{2}-\d{2}$/.test(held_on) && !Number.isNaN(Date.parse(held_on));
  if (!isUuid(track_id)) errors.track_id = 'track';
  if (title.length < 1 || title.length > 160) errors.title = 'title';
  if (topic.length > 600) errors.topic = 'topic';
  if (position === null) errors.position = 'position';
  // A date is needed unless it is marked as not settled; then a blank one is allowed.
  if (!dated && !(date_tbc && held_on === '')) errors.held_on = 'heldOn';
  if (invalid) errors.mentors = `mentors:${invalid}`;
  return done(errors, { track_id, title, topic, position: position ?? 0, held_on, date_tbc, mentors: emails });
}

export interface TaskValues {
  title: string;
  instructions: string;
  grading_criteria: string;
  deadline: string;
  formats: Format[];
  /** Null keeps the Task a draft. */
  published: boolean;
}

export function readTaskForm(form: FormData): Read<TaskValues> {
  const errors: FieldErrors = {};
  const title = text(field(form, 'title'));
  const instructions = text(field(form, 'instructions'));
  const grading_criteria = text(field(form, 'grading_criteria'));
  const deadline = localToInstant(field(form, 'deadline'));
  const chosen = form.getAll('formats').map(String);
  const formats = FORMATS.filter((format) => chosen.includes(format));
  if (title.length < 1 || title.length > 160) errors.title = 'title';
  if (instructions.length < 1 || instructions.length > 8000) errors.instructions = 'instructions';
  if (grading_criteria.length < 1 || grading_criteria.length > 4000) errors.grading_criteria = 'criteria';
  if (!deadline) errors.deadline = 'deadline';
  if (formats.length === 0) errors.formats = 'formats';
  return done(errors, {
    title,
    instructions,
    grading_criteria,
    deadline: deadline ?? '',
    formats,
    published: field(form, 'published') === 'on',
  });
}

export interface OverrideValues {
  score: number | null;
  note: string | null;
}

export function readOverrideForm(form: FormData): Read<OverrideValues> {
  const errors: FieldErrors = {};
  const rawScore = text(field(form, 'score'));
  const note = nullable(field(form, 'note'));
  const score = rawScore === '' ? null : /^\d{1,3}$/.test(rawScore) ? Number(rawScore) : Number.NaN;
  if (score !== null && !(score >= 0 && score <= 100)) errors.score = 'score_out_of_range';
  if (note && note.length > MAX_NOTE_CHARS) errors.note = 'note_too_long';
  if (score === null && note === null) errors.score = 'override_empty';
  return done(errors, { score, note });
}

export interface SubmissionValues {
  taskId: string;
  clientKey: string;
  body: string | null;
  /** A file posted with the form (no JavaScript, or a small one). */
  file: File | null;
  /** The Storage path of a file the browser already uploaded. */
  uploadedPath: string | null;
}

/** Errors here are the same words the database raises, so one list of sentences serves both. */
export function readSubmissionForm(form: FormData): Read<SubmissionValues> {
  const taskId = field(form, 'task_id');
  const clientKey = field(form, 'client_key');
  const body = nullable(field(form, 'body'));
  const posted = form.get('file');
  const file = posted instanceof File && posted.size > 0 ? posted : null;
  const uploadedPath = nullable(field(form, 'uploaded_path'));

  if (!isUuid(taskId)) return { ok: false, errors: { form: 'task_not_found' } };
  if (!isUuid(clientKey)) return { ok: false, errors: { form: 'unknown' } };
  if (body && body.length > MAX_BODY_CHARS) return { ok: false, errors: { body: 'body_too_long' } };
  if (file && file.size > MAX_FILE_BYTES) return { ok: false, errors: { file: 'file_too_large' } };
  if (file && file.size > MAX_POSTED_FILE_BYTES) return { ok: false, errors: { file: 'file_too_large_posted' } };
  if (!body && !file && !uploadedPath) return { ok: false, errors: { form: 'empty_submission' } };
  return { ok: true, values: { taskId, clientKey, body, file, uploadedPath } };
}
