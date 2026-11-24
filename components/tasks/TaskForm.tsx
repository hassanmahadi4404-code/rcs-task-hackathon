'use client';

/**
 * Setting a Task: new, or the one being edited. A Mentor writes the grading
 * criteria as they would say them; the line under the box shows how the AI
 * will read them (`lib/tasks/criteria.ts`), so a typo in the points is caught
 * before a Learner is marked against it.
 */

import { useActionState, useState } from 'react';

import { saveTask } from '@/app/mentor/actions';
import ActionBar from '@/components/admin/ActionBar';
import FormSection from '@/components/admin/FormSection';
import TextField from '@/components/tasks/TextField';
import { mentorCopy } from '@/content/tasks';
import { fill } from '@/lib/admin-payments';
import { parseCriteria, totalPoints } from '@/lib/tasks/criteria';
import { emptyFormState } from '@/lib/tasks/forms';

const copy = mentorCopy.taskForm;

export interface TaskFormProps {
  /** The Task being edited, or the Session a new one is for. */
  id?: string;
  sessionId: string;
  initial: {
    title: string;
    instructions: string;
    grading_criteria: string;
    /** A `datetime-local` value on the society's clock. */
    deadline: string;
    formats: string[];
    published: boolean;
  };
  hasSubmissions: boolean;
  cancelHref: string;
}

export default function TaskForm({ id, sessionId, initial, hasSubmissions, cancelHref }: TaskFormProps) {
  const [state, action, pending] = useActionState(saveTask, emptyFormState);
  const { errors, values } = state;
  const again = Object.keys(values).length > 0;
  const formats = again ? (values.formats ?? '').split(',') : initial.formats;
  const [criteria, setCriteria] = useState(values.grading_criteria ?? initial.grading_criteria);
  const parsed = parseCriteria(criteria);

  return (
    <form action={action} className="admin-form">
      {id && <input type="hidden" name="id" value={id} />}
      <input type="hidden" name="session_id" value={sessionId} />
      {hasSubmissions && <p className="admin-prompt">{copy.hasSubmissions}</p>}

      <FormSection id="task-brief" title={copy.brief.title} description={copy.brief.description}>
        <TextField name="title" label={copy.name} error={errors.title && copy.errors.title} defaultValue={values.title ?? initial.title} required maxLength={160} />
        <TextField name="instructions" label={copy.instructions} hint={copy.instructionsHint} error={errors.instructions && copy.errors.instructions} defaultValue={values.instructions ?? initial.instructions} rows={8} required maxLength={8000} />
      </FormSection>

      <FormSection id="task-marking" title={copy.marking.title} description={copy.marking.description}>
        <TextField name="grading_criteria" label={copy.criteria} hint={copy.criteriaHint} error={errors.grading_criteria && copy.errors.criteria} defaultValue={values.grading_criteria ?? initial.grading_criteria} rows={6} required maxLength={4000} onChange={setCriteria} />
        {criteria.trim() && (
          <p className="admin-field__note" role="status">
            {parsed.length > 0
              ? fill(copy.criteriaParsed, { n: String(parsed.length), total: String(totalPoints(parsed)) })
              : copy.criteriaWhole}
          </p>
        )}
      </FormSection>

      <FormSection id="task-hand-in" title={copy.handIn.title} description={copy.handIn.description}>
        <TextField name="deadline" label={copy.deadline} hint={copy.deadlineHint} type="datetime-local" error={errors.deadline && copy.errors.deadline} defaultValue={values.deadline ?? initial.deadline} required />
        <fieldset className="task-checks" aria-describedby={errors.formats ? 'formats-error' : undefined}>
          <legend>{copy.formats}</legend>
          {(['text', 'file'] as const).map((format) => (
            <p className="admin-field admin-field--check" key={format}>
              <input className="admin-field__check" id={`field-format-${format}`} type="checkbox" name="formats" value={format} defaultChecked={formats.includes(format)} />
              <label className="admin-field__label" htmlFor={`field-format-${format}`}>
                {format === 'text' ? copy.formatText : copy.formatFile}
              </label>
            </p>
          ))}
          {errors.formats && (
            <span className="admin-field__note" data-error id="formats-error" role="alert">
              {copy.errors.formats}
            </span>
          )}
        </fieldset>
        <p className="admin-field admin-field--check">
          <input className="admin-field__check" id="field-published" type="checkbox" name="published" defaultChecked={again ? values.published === 'on' : initial.published} aria-describedby="field-published-hint" />
          <label className="admin-field__label" htmlFor="field-published">
            {copy.published}
          </label>
          <span className="admin-field__hint" id="field-published-hint">
            {copy.publishedHint}
          </span>
        </p>
      </FormSection>

      <ActionBar save={copy.save} cancelHref={cancelHref} pending={pending}>
        {errors.form && (
          <span className="admin-error" role="alert">
            {errors.form === 'not_allowed' ? copy.errors.not_allowed : copy.errors.unknown}
          </span>
        )}
      </ActionBar>
    </form>
  );
}
