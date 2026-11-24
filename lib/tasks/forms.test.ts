import assert from 'node:assert/strict';
import { test } from 'node:test';

import { readEmails, readOverrideForm, readSessionForm, readSubmissionForm, readTaskForm, readTrackForm, typed } from './forms.ts';

const form = (fields: Record<string, string | string[] | File>) => {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    for (const one of Array.isArray(value) ? value : [value]) data.append(name, one);
  }
  return data;
};
const errorsOf = (read: { ok: boolean; errors?: Record<string, string> }) => (read.ok ? {} : read.errors);
const TASK = '3f2b8c1e-5a44-4c1b-9a51-0d6f1e2a7b90';
const KEY = '11111111-1111-4111-8111-111111111111';

test('a Task form becomes a row, with the deadline read as Dhaka time', () => {
  const read = readTaskForm(
    form({
      title: '  A to-do list ',
      instructions: 'Build it.',
      grading_criteria: 'Works: 100',
      deadline: '2026-11-20T23:59',
      formats: ['file', 'text', 'video'],
      published: 'on',
    }),
  );
  assert.deepEqual(read, {
    ok: true,
    values: {
      title: 'A to-do list',
      instructions: 'Build it.',
      grading_criteria: 'Works: 100',
      deadline: '2026-11-20T17:59:00.000Z',
      formats: ['text', 'file'],
      published: true,
    },
  });
});

test('each thing wrong with a Task form is named', () => {
  const read = readTaskForm(form({ title: ' ', instructions: '', grading_criteria: 'x'.repeat(4001), deadline: 'soon' }));
  assert.deepEqual(errorsOf(read), {
    title: 'title',
    instructions: 'instructions',
    grading_criteria: 'criteria',
    deadline: 'deadline',
    formats: 'formats',
  });
});

test('Mentors are named by email, one per line, lower-cased and once each', () => {
  assert.deepEqual(readEmails(' A@Kit.Test \n b@kit.test, a@kit.test'), { emails: ['a@kit.test', 'b@kit.test'], invalid: null });
  assert.deepEqual(readEmails('a@kit.test\nnot an email'), { emails: [], invalid: 'not an email' });
  assert.deepEqual(readEmails(''), { emails: [], invalid: null });
});

test('a Session form needs a Track, a title and a real date', () => {
  const good = readSessionForm(form({ track_id: TASK, title: 'Web 04', held_on: '2026-12-01', mentors: 'm@kit.test' }));
  assert.deepEqual(good, { ok: true, values: { track_id: TASK, title: 'Web 04', held_on: '2026-12-01', mentors: ['m@kit.test'] } });
  const bad = readSessionForm(form({ track_id: 'web', title: '', held_on: '01/12/2026', mentors: 'nobody' }));
  assert.deepEqual(errorsOf(bad), { track_id: 'track', title: 'title', held_on: 'heldOn', mentors: 'mentors:nobody' });
});

test('a Track form', () => {
  assert.deepEqual(readTrackForm(form({ name: ' Web ', description: '', archived: 'on' })), {
    ok: true,
    values: { name: 'Web', description: '', archived: true },
  });
  assert.deepEqual(errorsOf(readTrackForm(form({ name: '', description: 'x'.repeat(401) }))), {
    name: 'name',
    description: 'description',
  });
});

test("a Mentor's word is a score, a note, or both", () => {
  assert.deepEqual(readOverrideForm(form({ score: '75', note: ' Nice. ' })), { ok: true, values: { score: 75, note: 'Nice.' } });
  assert.deepEqual(readOverrideForm(form({ score: '', note: 'Only a note' })), { ok: true, values: { score: null, note: 'Only a note' } });
  assert.deepEqual(readOverrideForm(form({ score: '0', note: '' })), { ok: true, values: { score: 0, note: null } });
  assert.deepEqual(errorsOf(readOverrideForm(form({ score: '', note: ' ' }))), { score: 'override_empty' });
  for (const score of ['101', '-1', '7.5', 'ten']) {
    assert.deepEqual(errorsOf(readOverrideForm(form({ score, note: 'x' }))), { score: 'score_out_of_range' });
  }
  assert.deepEqual(errorsOf(readOverrideForm(form({ score: '5', note: 'x'.repeat(2001) }))), { note: 'note_too_long' });
});

test('a Submission form carries text, a posted file, or a file already uploaded', () => {
  const text = readSubmissionForm(form({ task_id: TASK, client_key: KEY, body: ' my answer ' }));
  assert.ok(text.ok && text.values.body === 'my answer' && text.values.file === null);

  const file = new File(['<main></main>'], 'index.html', { type: 'text/html' });
  const posted = readSubmissionForm(form({ task_id: TASK, client_key: KEY, body: '', file }));
  assert.ok(posted.ok && posted.values.file?.name === 'index.html' && posted.values.body === null);

  const uploaded = readSubmissionForm(form({ task_id: TASK, client_key: KEY, uploaded_path: 't/m/u/big.pdf' }));
  assert.ok(uploaded.ok && uploaded.values.uploadedPath === 't/m/u/big.pdf');
});

test('a Submission form is refused with the same words the database uses', () => {
  const base = { task_id: TASK, client_key: KEY };
  assert.deepEqual(errorsOf(readSubmissionForm(form({ ...base, body: '   ' }))), { form: 'empty_submission' });
  assert.deepEqual(errorsOf(readSubmissionForm(form({ ...base, body: 'x'.repeat(50_001) }))), { body: 'body_too_long' });
  assert.deepEqual(errorsOf(readSubmissionForm(form({ task_id: 'nope', client_key: KEY, body: 'x' }))), { form: 'task_not_found' });
  const big = new File([new Uint8Array(4 * 1024 * 1024)], 'big.zip');
  assert.deepEqual(errorsOf(readSubmissionForm(form({ ...base, file: big }))), { file: 'file_too_large_posted' });
  const huge = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'huge.zip');
  assert.deepEqual(errorsOf(readSubmissionForm(form({ ...base, file: huge }))), { file: 'file_too_large' });
});

test('what was typed is kept for showing the form again', () => {
  const kept = typed(form({ title: 'T', formats: ['text', 'file'], $ACTION_ID: 'x', file: new File(['a'], 'a.txt') }));
  assert.deepEqual(kept, { title: 'T', formats: 'text,file' });
});
