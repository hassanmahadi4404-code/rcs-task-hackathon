'use client';

/**
 * A form's submit button that shows the form is working — issue #7, given a
 * busy state by #31.
 *
 * While the server action runs the button is disabled and `aria-busy`, and
 * a second click is dropped, so a double click submits once. With `confirm`
 * it asks first. Without JavaScript there is no prompt and no busy state:
 * the button submits, and the database's policies are the guarantee either
 * way.
 */

import { useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';

export interface SubmitButtonProps {
  label: string;
  className?: string;
  /** Replaces the visible label; `label` becomes the accessible name. */
  icon?: React.ReactNode;
  confirm?: string;
  disabled?: boolean;
}

export default function SubmitButton({ label, className, icon, confirm, disabled }: SubmitButtonProps) {
  const { pending } = useFormStatus();
  /* `pending` reaches the button a render late; the ref drops a second
     click that lands before it does. */
  const sent = useRef(false);
  useEffect(() => {
    if (!pending) sent.current = false;
  }, [pending]);

  return (
    <button
      type="submit"
      className={className}
      aria-label={icon ? label : undefined}
      aria-busy={pending || undefined}
      disabled={disabled || pending}
      onClick={(event) => {
        if (sent.current || (confirm && !window.confirm(confirm))) {
          event.preventDefault();
          return;
        }
        /* An invalid form does not submit, so it must not lock the button. */
        sent.current = event.currentTarget.form?.checkValidity() ?? true;
      }}
    >
      {icon ?? label}
    </button>
  );
}
