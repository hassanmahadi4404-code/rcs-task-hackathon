/**
 * Corner-bracket container — TASK-026, DES-001.
 *
 * The single framing device of the HUD language. Everything that needs to
 * read as an instrument panel — the terminal, the About panels, the exec
 * cards, the Join form — sits inside one of these rather than inventing its
 * own border treatment.
 *
 * The brackets are drawn by `::before` / `::after` on two nested spans in
 * `styles/hud.css`, not by a border, so the frame stays open on its edges.
 */

import type { ElementType, ReactNode } from 'react';

import FrameCorners from '@/components/hud/FrameCorners';
import type { SectionId } from '@/config/motion';
import { cn } from '@/lib/utils';

export type FrameSize = 'sm' | 'md' | 'lg';

export interface FrameProps {
  /** Bracket length and internal padding step. */
  size?: FrameSize;
  /** Monospace caption pinned to the top edge, interrupting the hairline. */
  label?: string;
  /** Switches brackets and label from hairline white to accent. */
  accent?: boolean;
  /** Draws the connecting hairlines between brackets. Off gives corners only. */
  rules?: boolean;
  /** Element to render. Defaults to `div`; pass `section`, `article`, `li`… */
  as?: ElementType;
  /** Host section, so a per-section motion override reaches the brackets. */
  sectionId?: SectionId;
  className?: string;
  children?: ReactNode;
}

export default function Frame({
  size = 'md',
  label,
  accent = false,
  rules = true,
  as: Tag = 'div',
  sectionId,
  className,
  children,
}: FrameProps) {
  return (
    <Tag
      className={cn(
        'hud-frame',
        `hud-frame--${size}`,
        accent && 'hud-frame--accent',
        rules && 'hud-frame--rules',
        label && 'hud-frame--labelled',
        className,
      )}
    >
      <FrameCorners sectionId={sectionId} />
      {label && <span className="hud-frame__label">{label}</span>}
      <div className="hud-frame__body">{children}</div>
    </Tag>
  );
}
