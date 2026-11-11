'use client';

/**
 * Layered depth parallax — TASK-065, REQ-016, PRF-004.
 *
 * Attach the returned ref to a plane and it drifts against the scroll by its
 * layer's depth. Three properties make this safe to sprinkle around:
 *
 *   one loop      — the hook subscribes to `SmoothScroll`'s shared Lenis
 *                   frame callback. It never opens a `requestAnimationFrame`
 *                   loop of its own, which is the whole of PRF-004.
 *   transform only— the only property ever written is `transform` (plus
 *                   `will-change`, added when the plane enters view and
 *                   removed when it leaves). Nothing here can trigger layout.
 *   pure of scroll— the offset is a function of the element's current
 *                   position, not an accumulator, so it is identical whether
 *                   the reader arrived by scrolling, by anchor jump, or by
 *                   reloading mid-page.
 *
 * Depth, mobile attenuation, and the clamp all resolve through `useMotion`,
 * so at level 0 — including under `prefers-reduced-motion` — the depth is 0,
 * the effect returns early, and the plane keeps whatever CSS gave it.
 */

import { useEffect, useRef, type RefObject } from 'react';

import { useSmoothScroll } from '@/components/chrome/SmoothScroll';
import type { ParallaxLayer, SectionId } from '@/config/motion';
import { useMotion } from '@/hooks/use-motion-config';

export interface ParallaxOptions {
  /** Host section, so a per-section motion override reaches this plane too. */
  sectionId?: SectionId;
  /**
   * Clamp override in px. Defaults to the layer's clamp in `config/motion.ts`.
   * Pass one only when a specific plane has less bleed than its layer allows.
   */
  max?: number;
  /** Opt out without changing hook order at the call site. */
  disabled?: boolean;
}

/**
 * Margin by which a plane counts as "in view" for the `will-change` toggle.
 * Wider than the viewport so the hint lands before the first visible frame.
 */
const ACTIVATION_MARGIN = '20% 0px';

export function useParallax<T extends HTMLElement>(
  layer: ParallaxLayer,
  { sectionId, max, disabled = false }: ParallaxOptions = {},
): RefObject<T | null> {
  const ref = useRef<T>(null);
  const motion = useMotion(sectionId);
  const { subscribe } = useSmoothScroll();

  const depth = disabled ? 0 : motion.depth(layer);
  const clamp = max ?? motion.maxOffset(layer);

  useEffect(() => {
    const element = ref.current;
    if (!element || depth === 0 || clamp === 0) return;

    let visible = false;

    const update = () => {
      const rect = element.getBoundingClientRect();
      const viewport = window.innerHeight;
      /* Distance from the viewport's centre line to the plane's own centre.
         Zero at dead centre, which is where every plane sits unshifted. */
      const delta = rect.top + rect.height / 2 - viewport / 2;
      const offset = Math.max(-clamp, Math.min(clamp, -delta * depth));
      element.style.transform = `translate3d(0, ${offset.toFixed(2)}px, 0)`;
    };

    /* The hint costs GPU memory, so it is held only while the plane is near
       enough to move visibly. */
    const observer =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(
            ([entry]) => {
              visible = entry.isIntersecting;
              element.style.willChange = visible ? 'transform' : '';
              if (visible) update();
            },
            { rootMargin: ACTIVATION_MARGIN, threshold: 0 },
          );

    if (observer) observer.observe(element);
    else visible = true;

    const unsubscribe = subscribe(() => {
      if (visible) update();
    });

    /* Resize changes both the viewport centre and the plane's height; without
       this the offset stays frozen at the pre-resize value. */
    const onResize = () => update();
    window.addEventListener('resize', onResize, { passive: true });

    update();

    return () => {
      observer?.disconnect();
      unsubscribe();
      window.removeEventListener('resize', onResize);
      element.style.transform = '';
      element.style.willChange = '';
    };
  }, [depth, clamp, subscribe]);

  return ref;
}

export default useParallax;
