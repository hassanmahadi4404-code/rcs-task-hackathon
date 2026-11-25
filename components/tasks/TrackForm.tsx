'use client';

/** An Officer's form for a Track: new, or the one being edited. */

import { useActionState } from 'react';

import { saveTrack } from '@/app/mentor/actions';
import ActionBar from '@/components/admin/ActionBar';
import FormSection from '@/components/admin/FormSection';
import TextField from '@/components/tasks/TextField';
import { mentorCopy, taskPaths } from '@/content/tasks';
import { emptyFormState } from '@/lib/tasks/forms';
import { TRACK_STATUSES, type TrackStatus } from '@/lib/tasks/mentor';

const copy = mentorCopy.trackForm;
type ErrorKey = keyof typeof copy.errors;

export interface TrackFormProps {
  id?: string;
  initial: { name: string; description: string; status: TrackStatus; position: string };
}

export default function TrackForm({ id, initial }: TrackFormProps) {
  const [state, action, pending] = useActionState(saveTrack, emptyFormState);
  const error = (name: string) => (state.errors[name] ? copy.errors[state.errors[name] as ErrorKey] : undefined);

  return (
    <form action={action} className="admin-form">
      {id && <input type="hidden" name="id" value={id} />}
      <FormSection id="track-section" title={copy.section.title} description={copy.section.description}>
        <TextField name="name" label={copy.name} hint={copy.nameHint} error={error('name')} defaultValue={state.values.name ?? initial.name} required maxLength={80} />
        <TextField name="description" label={copy.description} hint={copy.descriptionHint} error={error('description')} defaultValue={state.values.description ?? initial.description} rows={3} maxLength={400} />
        <TextField name="position" label={copy.position} hint={copy.positionHint} type="number" min={0} max={999} error={error('position')} defaultValue={state.values.position ?? initial.position} />
        <fieldset className="task-checks" aria-describedby="field-status-hint">
          <legend>{copy.status}</legend>
          {TRACK_STATUSES.map((status) => (
            <p className="admin-field admin-field--check" key={status}>
              <input className="admin-field__check" id={`field-status-${status}`} type="radio" name="status" value={status} defaultChecked={(state.values.status ?? initial.status) === status} />
              <label className="admin-field__label" htmlFor={`field-status-${status}`}>
                {copy.statuses[status]}
              </label>
            </p>
          ))}
          <span className="admin-field__hint" id="field-status-hint">
            {copy.statusHint}
          </span>
          {state.errors.status && (
            <span className="admin-field__note" data-error role="alert">
              {copy.errors.status}
            </span>
          )}
        </fieldset>
      </FormSection>
      <ActionBar save={copy.save} cancelHref={taskPaths.tracks} pending={pending}>
        {state.errors.form && (
          <span className="admin-error" role="alert">
            {copy.errors.unknown}
          </span>
        )}
      </ActionBar>
    </form>
  );
}
