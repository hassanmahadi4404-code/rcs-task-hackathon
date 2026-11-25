'use client';

/**
 * A Learner challenges the AI's score: one sentence or two on what it
 * missed, sent to their Mentor. It sits folded beside the score, behind a
 * native `<summary>`, so it opens without JavaScript and the form posts
 * through a server action either way. What was typed stays if it is refused.
 */

import { useActionState } from 'react';

import { challengeScore, type ChallengeState } from '@/app/(site)/learn/actions';
import { learnCopy } from '@/content/tasks';

const copy = learnCopy.evaluation.challenge;
const MAX_REASON = 1000;
const initial: ChallengeState = { error: null, reason: '' };

export default function ChallengeForm({ submissionId }: { submissionId: string }) {
  const [state, action, sending] = useActionState(challengeScore, initial);

  return (
    <details className="learn-challenge" open={state.error !== null || undefined}>
      <summary className="learn-button learn-button--quiet">{copy.open}</summary>
      <form action={action} className="learn-form">
        <input type="hidden" name="submission_id" value={submissionId} />
        <p className="learn-subtitle">{copy.title}</p>
        {state.error && (
          <div className="learn-notice" data-tone="error" role="alert">
            <p>{copy.errors[state.error]}</p>
          </div>
        )}
        <p className="learn-field" data-invalid={state.error === 'reason_missing' || state.error === 'reason_too_long' || undefined}>
          <label className="learn-field__label" htmlFor={`challenge-${submissionId}`}>
            {copy.reason}
          </label>
          <textarea
            className="learn-field__input learn-field__input--short"
            id={`challenge-${submissionId}`}
            name="reason"
            rows={3}
            maxLength={MAX_REASON}
            defaultValue={state.reason}
            required
            aria-describedby={`challenge-${submissionId}-hint`}
            data-lenis-prevent
          />
          <span className="learn-field__hint" id={`challenge-${submissionId}-hint`}>
            {copy.reasonHint}
          </span>
        </p>
        <div className="learn-actions">
          <button type="submit" className="learn-button" disabled={sending} aria-busy={sending || undefined}>
            {sending ? copy.sending : copy.submit}
          </button>
        </div>
      </form>
    </details>
  );
}
