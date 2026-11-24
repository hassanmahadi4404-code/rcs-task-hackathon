'use client';

/** An Officer names a Mentor of a Session by email. */

import { useActionState } from 'react';

import { addMentor } from '@/app/mentor/actions';
import SubmitButton from '@/components/admin/SubmitButton';
import TextField from '@/components/tasks/TextField';
import { mentorCopy } from '@/content/tasks';
import { emptyFormState } from '@/lib/tasks/forms';

const copy = mentorCopy.session.mentors;
type ErrorKey = keyof typeof copy.errors;

export default function MentorForm({ sessionId }: { sessionId: string }) {
  const [state, action] = useActionState(addMentor, emptyFormState);
  const word = state.errors.email ?? state.errors.form;

  return (
    <form action={action} className="task-inline-form" key={state.saved ? 'saved' : 'open'}>
      <input type="hidden" name="session_id" value={sessionId} />
      <TextField name="email" label={copy.email} hint={copy.emailHint} type="email" error={word ? (copy.errors[word as ErrorKey] ?? copy.errors.unknown) : undefined} defaultValue={state.values.email ?? ''} required />
      <SubmitButton label={copy.add} className="admin-button admin-button--quiet" />
    </form>
  );
}
