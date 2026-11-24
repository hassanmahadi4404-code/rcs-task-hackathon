'use client';

/** An Officer's form for a Track: new, or the one being edited. */

import { useActionState } from 'react';

import { saveTrack } from '@/app/mentor/actions';
import ActionBar from '@/components/admin/ActionBar';
import FormSection from '@/components/admin/FormSection';
import TextField from '@/components/tasks/TextField';
import { mentorCopy, taskPaths } from '@/content/tasks';
import { emptyFormState } from '@/lib/tasks/forms';

const copy = mentorCopy.trackForm;
type ErrorKey = keyof typeof copy.errors;

export interface TrackFormProps {
  id?: string;
  initial: { name: string; description: string; archived: boolean; position: string };
}

export default function TrackForm({ id, initial }: TrackFormProps) {
  const [state, action, pending] = useActionState(saveTrack, emptyFormState);
  const error = (name: string) => (state.errors[name] ? copy.errors[state.errors[name] as ErrorKey] : undefined);
  const again = Object.keys(state.values).length > 0;

  return (
    <form action={action} className="admin-form">
      {id && <input type="hidden" name="id" value={id} />}
      <FormSection id="track-section" title={copy.section.title} description={copy.section.description}>
        <TextField name="name" label={copy.name} hint={copy.nameHint} error={error('name')} defaultValue={state.values.name ?? initial.name} required maxLength={80} />
        <TextField name="description" label={copy.description} hint={copy.descriptionHint} error={error('description')} defaultValue={state.values.description ?? initial.description} rows={3} maxLength={400} />
        <TextField name="position" label={copy.position} hint={copy.positionHint} type="number" min={0} max={999} error={error('position')} defaultValue={state.values.position ?? initial.position} />
        {id && (
          <p className="admin-field admin-field--check">
            <input className="admin-field__check" id="field-archived" type="checkbox" name="archived" defaultChecked={again ? state.values.archived === 'on' : initial.archived} aria-describedby="field-archived-hint" />
            <label className="admin-field__label" htmlFor="field-archived">
              {copy.archived}
            </label>
            <span className="admin-field__hint" id="field-archived-hint">
              {copy.archivedHint}
            </span>
          </p>
        )}
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
