'use client';

/**
 * Hairline grid plane — TASK-028.
 *
 * The mid-depth layer of the parallax stack (REQ-016): behind content, in
 * front of the background. Pure CSS `repeating-linear-gradient`, radially
 * masked so it dissolves before it reaches the section edges.
 *
 * The plane drifts at the `grid` depth from `config/motion.ts` (TASK-066).
 * Its 120px inset is what pays for that drift: the grid is drawn larger than
 * the section on every side, so translating it never walks an edge into view.
 * The `data-parallax-layer` attribute is retained as the observable marker —
 * the wiring itself is the hook, one plane at a time.
 */

import type { SectionId } from '@/config/motion';
import { useParallax } from '@/hooks/use-parallax';
import { cn } from '@/lib/utils';

export interface GridPlaneProps {
  /** Host section, so a per-section motion override reaches this plane. */
  sectionId?: SectionId;
  /** Cell size step. `fine` = 32px, `base` = 56px, `wide` = 96px. */
  scale?: 'fine' | 'base' | 'wide';
  /** Mask shape. `radial` fades from the centre; `top` fades downward. */
  mask?: 'radial' | 'top' | 'none';
  /** Renders the accent-tinted variant, for sections that need a warmer bed. */
  accent?: boolean;
  className?: string;
}

export default function GridPlane({
  sectionId,
  scale = 'base',
  mask = 'radial',
  accent = false,
  className,
}: GridPlaneProps) {
  const ref = useParallax<HTMLDivElement>('grid', { sectionId });

  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-parallax-layer="grid"
      className={cn(
        'hud-grid',
        `hud-grid--${scale}`,
        `hud-grid--mask-${mask}`,
        accent && 'hud-grid--accent',
        className,
      )}
    />
  );
}
