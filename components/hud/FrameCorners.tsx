'use client';

/**
 * The four brackets of a `Frame`, on the counter-scrolling chrome plane —
 * TASK-066.
 *
 * Split out of `Frame` so that `Frame` itself stays a server component: only
 * the brackets need the parallax hook, and only the brackets should carry the
 * client boundary.
 *
 * The `chrome` depth is negative, so the brackets rise slightly as the panel
 * they surround falls. The clamp on that layer is deliberately tiny — a few
 * pixels reads as the housing sitting in front of the panel, and anything
 * more reads as a border that has come unstuck.
 */

import type { SectionId } from '@/config/motion';
import { useParallax } from '@/hooks/use-parallax';

export interface FrameCornersProps {
  sectionId?: SectionId;
}

export default function FrameCorners({ sectionId }: FrameCornersProps) {
  const ref = useParallax<HTMLSpanElement>('chrome', { sectionId });

  return (
    <span ref={ref} className="hud-frame__corners" aria-hidden="true">
      <span className="hud-frame__corner hud-frame__corner--tl" />
      <span className="hud-frame__corner hud-frame__corner--tr" />
      <span className="hud-frame__corner hud-frame__corner--bl" />
      <span className="hud-frame__corner hud-frame__corner--br" />
    </span>
  );
}
