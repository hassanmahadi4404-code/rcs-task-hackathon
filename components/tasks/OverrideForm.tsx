'use client';

/**
 * The Mentor's word on one Submission: a score, a note, or both. "A Mentor
 * who disagrees can say so, and the Learner should see it."
 */

import { useActionState } from 'react';

import { saveOverride } from '@/app/mentor/actions';
import SubmitButton from '@/components/admin/SubmitButton';
import TextField from '@/components/tasks/TextField';
import { mentorCopy } from '@/content/tasks';
import { emptyFormState } from '@/lib/tasks/forms';
import { MAX_NOTE_CHARS } from '@/lib/tasks/rules';

const copy = mentorCopy.submission.override;
type ErrorKey = keyof typeof copy.errors;
const sentence = (word: string | undefined) => (word ? (copy.errors[word as ErrorKey] ?? copy.errors.unknown) : undefined);

export interface OverrideFormProps {
  submissionId: string;
  initial: { score: string; note: string };
}

export default function OverrideForm({ submissionId, initial }: OverrideFormProps) {
  const [state, action] = useActionState(saveOverride, emptyFormState);
  const { errors, values } = state;

  return (
    <form action={action} className="admin-form">
      <input type="hidden" name="submission_id" value={submissionId} />
      <TextField name="score" label={copy.score} hint={copy.scoreHint} type="number" min={0} max={100} error={sentence(errors.score)} defaultValue={values.score ?? initial.score} />
      <TextField name="note" label={copy.note} hint={copy.noteHint} error={sentence(errors.note)} defaultValue={values.note ?? initial.note} rows={4} maxLength={MAX_NOTE_CHARS} />
      <div className="admin-actions">
        <SubmitButton label={copy.save} className="admin-button" />
        {errors.form && (
          <span className="admin-error" role="alert">
            {sentence(errors.form)}
          </span>
        )}
      </div>
    </form>
  );
}
