'use client';

/**
 * The society's email, as a copy control — issue #16.
 *
 * Not a `mailto:` link. On a phone without a mail client configured for the
 * inbox, `mailto:` does nothing and the reader is left with an address they
 * cannot select; the copy button hands it over in one tap instead.
 *
 * The address sits beside the button rather than inside it, as ordinary
 * selectable text: text inside a `<button>` cannot be dragged over in every
 * engine, and a reader whose clipboard is refused (an insecure origin, a
 * denied permission) has to be able to select it by hand. That is also why
 * a failed copy is silent — nothing was lost, the address is right there.
 *
 * `Copied` is both visible and announced: the button's own label carries it,
 * and a live region that is empty at rest announces it once rather than
 * announcing the label returning two seconds later.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';

import { COPIED_HOLD_MS } from '@/config/motion';
import { copyEmail } from '@/content/site';

export interface CopyEmailProps {
  email: string;
  /** Sits on the wrapper, so a caller can style the control as its own. */
  className?: string;
  /** Rendered ahead of the address — the Connect band tile's icon and word. */
  children?: ReactNode;
}

export default function CopyEmail({ email, className, children }: CopyEmailProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email);
    } catch {
      return;
    }
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), COPIED_HOLD_MS);
  };

  return (
    <span className={className ? `copy-email ${className}` : 'copy-email'}>
      {children}
      <span className="copy-email__address">{email}</span>
      {/* The visible word is the first word of the accessible name, so the
          two agree for a reader who speaks the label to a voice control. */}
      <button
        type="button"
        className="copy-email__button"
        onClick={copy}
        aria-label={`${copied ? copyEmail.copied : copyEmail.label} ${email}`}
        data-cursor="magnetic"
      >
        {copied ? copyEmail.copied : copyEmail.label}
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {copied ? copyEmail.copied : ''}
      </span>
    </span>
  );
}
