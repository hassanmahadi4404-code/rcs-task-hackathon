'use client';

/**
 * Lenis provider and the page's single scroll rAF loop — TASK-033, PRF-004.
 *
 * Every scroll-driven effect on this site (parallax in Phase 6, section
 * transitions, the scroll-progress chrome) reads from here. No other module
 * may open a `requestAnimationFrame` loop for scroll — that is the whole
 * point of this component, and the reason it exposes `subscribe` rather than
 * letting consumers reach for the Lenis instance and register their own.
 *
 * At motion level 0 Lenis never instantiates: children render inside a
 * context whose `subscribe` is a no-op and whose `scrollTo` falls back to
 * native `scrollIntoView`. Nothing downstream needs to branch (GUD-005).
 *
 * Lenis is imported dynamically inside that effect rather than at module
 * scope (TASK-079). A static import put ~21 KiB gzipped of scroll library in
 * the initial chunk of every load — including the reduced-motion and level-0
 * loads that never instantiate it — and its evaluation competed with the
 * hero's entrance for the main thread. Nothing above the fold needs smooth
 * scrolling to have arrived, because nothing has been scrolled yet.
 */

import type Lenis from 'lenis';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';

import { smoothScroll } from '@/config/motion';
import { useMotion } from '@/hooks/use-motion-config';

export interface ScrollState {
  /** Scroll offset in px. */
  scroll: number;
  /** Instantaneous velocity, px per frame. Sign follows direction. */
  velocity: number;
  /** 0–1 through the document. */
  progress: number;
}

export type ScrollListener = (state: ScrollState) => void;

interface SmoothScrollApi {
  /** Register a per-frame scroll listener. Returns its unsubscribe. */
  subscribe: (listener: ScrollListener) => () => void;
  /** Anchor navigation, routed through Lenis so it eases rather than jumps. */
  scrollTo: (target: string | HTMLElement, offset?: number) => void;
  /** True when Lenis is actually driving the page. */
  enabled: boolean;
}

const noopApi: SmoothScrollApi = {
  subscribe: () => () => {},
  scrollTo: (target) => {
    if (typeof document === 'undefined') return;
    const node =
      typeof target === 'string' ? document.querySelector(target) : target;
    node?.scrollIntoView({ behavior: 'auto', block: 'start' });
  },
  enabled: false,
};

const SmoothScrollContext = createContext<SmoothScrollApi>(noopApi);

/** The read point for every scroll-driven effect. */
export function useSmoothScroll(): SmoothScrollApi {
  return useContext(SmoothScrollContext);
}

export default function SmoothScroll({ children }: { children: ReactNode }) {
  const motion = useMotion();
  // Lenis is a level-1-and-up nicety; level 0 means the user asked for none
  // of this, and native scrolling is the correct answer.
  const enabled = motion.level > 0;

  const listeners = useRef(new Set<ScrollListener>());
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let lenis: Lenis | null = null;
    let frame = 0;
    let cancelled = false;

    import('lenis')
      .then(({ default: LenisCtor }) => {
        // The effect may have torn down while the chunk was in flight.
        if (cancelled) return;

        lenis = new LenisCtor({
          lerp: smoothScroll.lerp,
          wheelMultiplier: smoothScroll.wheelMultiplier,
          touchMultiplier: smoothScroll.touchMultiplier,
          allowNestedScroll: smoothScroll.allowNestedScroll,
        });
        lenisRef.current = lenis;

        lenis.on('scroll', ({ scroll, velocity, progress }: ScrollState) => {
          listeners.current.forEach((listener) =>
            listener({ scroll, velocity, progress }),
          );
        });

        // The one loop.
        const raf = (time: number) => {
          lenis!.raf(time);
          frame = requestAnimationFrame(raf);
        };
        frame = requestAnimationFrame(raf);
      })
      .catch(() => {
        /* No smooth scroll. The page scrolls natively and `scrollTo` falls
           through to `noopApi` — a documented degradation, not a failure
           (GUD-005). */
      });

    return () => {
      cancelled = true;
      if (frame) cancelAnimationFrame(frame);
      lenis?.destroy();
      lenisRef.current = null;
    };
  }, [enabled]);

  const subscribe = useCallback((listener: ScrollListener) => {
    const set = listeners.current;
    set.add(listener);
    return () => {
      set.delete(listener);
    };
  }, []);

  const scrollTo = useCallback(
    (target: string | HTMLElement, offset = 0) => {
      const lenis = lenisRef.current;
      if (lenis) {
        lenis.scrollTo(target, { offset });
        return;
      }
      noopApi.scrollTo(target, offset);
    },
    [],
  );

  const api = useMemo<SmoothScrollApi>(
    () => ({ subscribe, scrollTo, enabled }),
    [subscribe, scrollTo, enabled],
  );

  return (
    <SmoothScrollContext.Provider value={api}>
      {children}
    </SmoothScrollContext.Provider>
  );
}
