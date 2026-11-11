/**
 * Hairline rule — TASK-028.
 *
 * A 1px (or sub-pixel) divider that fades at one or both ends so it reads as
 * an instrument rule rather than a border. Horizontal by default.
 */

import { cn } from '@/lib/utils';

export interface HairlineProps {
  orientation?: 'horizontal' | 'vertical';
  /** `default` is white at 12%; `strong` at 24%; `accent` uses the accent hairline. */
  tone?: 'default' | 'strong' | 'accent';
  /** Which ends fade out. `none` gives a flat rule. */
  fade?: 'none' | 'start' | 'end' | 'both';
  className?: string;
}

export default function Hairline({
  orientation = 'horizontal',
  tone = 'default',
  fade = 'none',
  className,
}: HairlineProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'hud-hairline',
        `hud-hairline--${orientation}`,
        `hud-hairline--${tone}`,
        `hud-hairline--fade-${fade}`,
        className,
      )}
    />
  );
}
