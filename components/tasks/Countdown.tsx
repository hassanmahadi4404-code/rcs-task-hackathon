'use client';

/**
 * The time left until a deadline, ticking. The digits are for the eye;
 * assistive tech is given `label`, a sentence that does not change every
 * second. When the moment passes, the page is asked for again once, so the
 * Task moves to where it now belongs without a reload.
 */

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { learnCopy } from '@/content/tasks';
import { useTickingNow } from '@/hooks/use-ticking-now';
import { clockParts, timeLeft, urgency } from '@/lib/tasks/countdown';

export interface CountdownProps {
  /** The instant counted down to. */
  until: string | number;
  /** The server's clock when the page was rendered. */
  renderedAt: number;
  label: string;
  size?: 'card' | 'page';
}

export default function Countdown({ until, renderedAt, label, size = 'card' }: CountdownProps) {
  const now = useTickingNow(renderedAt);
  const target = new Date(until).getTime();
  const left = timeLeft(target, now);
  const router = useRouter();
  const asked = useRef(false);

  useEffect(() => {
    if (!left.over || asked.current) return;
    asked.current = true;
    router.refresh();
  }, [left.over, router]);

  return (
    <span className="task-clock" role="timer" aria-label={label} data-urgency={urgency(target, now)} data-size={size}>
      {clockParts(left).map(({ value, unit }) => (
        <span className="task-clock__part" key={unit} aria-hidden="true">
          <span className="task-clock__value">{value}</span>
          <span className="task-clock__unit">{learnCopy.card.units[unit]}</span>
        </span>
      ))}
    </span>
  );
}
