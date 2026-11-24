'use client';

/** An Officer's form for a Session: new (with its first Mentors), or the one being edited. */

import { useActionState } from 'react';

import { saveSession } from '@/app/mentor/actions';
import ActionBar from '@/components/admin/ActionBar';
import FormSection from '@/components/admin/FormSection';
import TextField from '@/components/tasks/TextField';
import { mentorCopy } from '@/content/tasks';
import { fill } from '@/lib/admin-payments';
import { emptyFormState } from '@/lib/tasks/forms';

const copy = mentorCopy.sessionForm;

export interface SessionFormProps {
  id?: string;
  tracks: { value: string; label: string }[];
  initial: { track_id: string; title: string; topic: string; position: string; held_on: string; date_tbc: boolean };
  cancelHref: string;
}

export default function SessionForm({ id, tracks, initial, cancelHref }: SessionFormProps) {
  const [state, action, pending] = useActionState(saveSession, emptyFormState);
  const { errors, values } = state;
  const again = Object.keys(values).length > 0;
  const mentorsError = errors.mentors ? fill(copy.errors.mentors, { email: errors.mentors.slice('mentors:'.length) }) : undefined;

  return (
    <form action={action} className="admin-form">
      {id && <input type="hidden" name="id" value={id} />}
      <FormSection id="session-section" title={copy.section.title} description={copy.section.description}>
        <TextField name="track_id" label={copy.track} error={errors.track_id && copy.errors.track} defaultValue={values.track_id ?? initial.track_id} options={tracks} required />
        <TextField name="title" label={copy.title} hint={copy.titleHint} error={errors.title && copy.errors.title} defaultValue={values.title ?? initial.title} required maxLength={160} />
        <TextField name="topic" label={copy.topic} hint={copy.topicHint} error={errors.topic && copy.errors.topic} defaultValue={values.topic ?? initial.topic} rows={3} maxLength={600} />
      </FormSection>

      <FormSection id="session-plan" title={copy.plan.title} description={copy.plan.description}>
        <TextField name="position" label={copy.position} hint={copy.positionHint} type="number" min={0} max={999} error={errors.position && copy.errors.position} defaultValue={values.position ?? initial.position} />
        <TextField name="held_on" label={copy.heldOn} hint={copy.heldOnHint} type="date" error={errors.held_on && copy.errors.heldOn} defaultValue={values.held_on ?? initial.held_on} />
        <p className="admin-field admin-field--check">
          <input className="admin-field__check" id="field-date-tbc" type="checkbox" name="date_tbc" defaultChecked={again ? values.date_tbc === 'on' : initial.date_tbc} aria-describedby="field-date-tbc-hint" />
          <label className="admin-field__label" htmlFor="field-date-tbc">
            {copy.dateTbc}
          </label>
          <span className="admin-field__hint" id="field-date-tbc-hint">
            {copy.dateTbcHint}
          </span>
        </p>
        {!id && <TextField name="mentors" label={copy.mentors} hint={copy.mentorsHint} error={mentorsError} defaultValue={values.mentors ?? ''} rows={3} />}
      </FormSection>
      <ActionBar save={copy.save} cancelHref={cancelHref} pending={pending}>
        {errors.form && (
          <span className="admin-error" role="alert">
            {copy.errors.unknown}
          </span>
        )}
      </ActionBar>
    </form>
  );
}
