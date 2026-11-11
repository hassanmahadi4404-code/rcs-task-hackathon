'use client';

/**
 * `useMotion()` — the single read point for the motion seam (TASK-014).
 *
 * No component may import `MOTION_LEVEL` from `config/motion.ts` directly.
 * This hook resolves the effective level for a section against user
 * preference and device capability, then hands back typed booleans and
 * numbers so call sites never branch on a raw level.
 *
 * Precedence (highest wins):
 *   1. `prefers-reduced-motion: reduce`  → forces level 0 (ACC-001)
 *   2. `config/motion.ts` `sections[id]` → per-section override
 *   3. `config/motion.ts` `MOTION_LEVEL` → global ceiling
 * Then, independently:
 *   - `effects[name] === false` disables that effect at any level
 *   - `pointer: coarse` caps the level at 2 (no continuous WebGL on touch)
 *   - viewport < 768px attenuates parallax depths by `mobileAttenuation`
 */

import { useCallback, useMemo, useSyncExternalStore } from 'react';

import {
  MOBILE_BREAKPOINT,
  MOTION_LEVEL,
  durations,
  easings,
  effectThresholds,
  effects,
  parallax,
  pointerParallax,
  sections,
  stagger,
  type EffectName,
  type MotionLevel,
  type ParallaxLayer,
  type SectionId,
} from '@/config/motion';

export interface MotionConfig {
  /** Effective level after preference and capability resolution. */
  level: MotionLevel;
  /** True when the user has asked for reduced motion. */
  reducedMotion: boolean;
  /** True on `pointer: coarse` devices. */
  coarsePointer: boolean;
  /** True below `MOBILE_BREAKPOINT`. */
  isMobile: boolean;

  /* Per-effect resolved booleans. */
  preloader: boolean;
  cursor: boolean;
  sectionTransition: boolean;
  parallax: boolean;
  countUp: boolean;
  heroBackground: boolean;
  terminalTyping: boolean;

  /** Resolved parallax depth for a plane, already attenuated. 0 when disabled. */
  depth: (layer: ParallaxLayer) => number;
  /** Clamp on a plane's translate, in px — the tighter of layer and global. */
  maxOffset: (layer: ParallaxLayer) => number;
  /** Hero pointer parallax — TASK-067. False on touch and under reduced motion. */
  pointerParallax: boolean;

  durations: typeof durations;
  easings: typeof easings;
  stagger: typeof stagger;
}

/**
 * SSR-safe media query subscription. The server snapshot is `false`, so the
 * first paint assumes full motion; effects that would be jarring under that
 * (preloader, cursor) mount after hydration. See config/motion.README.md.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    [query],
  );

  const getSnapshot = useCallback(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  }, [query]);

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

export function useMotion(sectionId?: SectionId): MotionConfig {
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const coarsePointer = useMediaQuery('(pointer: coarse)');
  const isMobile = useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);

  const level = useMemo<MotionLevel>(() => {
    if (reducedMotion) return 0;
    const base = (sectionId && sections[sectionId]) ?? MOTION_LEVEL;
    // Touch devices never run the continuous WebGL tier (PRF-002).
    return coarsePointer ? (Math.min(base, 2) as MotionLevel) : base;
  }, [reducedMotion, coarsePointer, sectionId]);

  const enabled = useCallback(
    (name: EffectName) => effects[name] && level >= effectThresholds[name],
    [level],
  );

  const depth = useCallback(
    (layer: ParallaxLayer) => {
      if (!effects.parallax || level < effectThresholds.parallax) return 0;
      const attenuation = isMobile ? parallax.mobileAttenuation : 1;
      return parallax.layers[layer] * parallax.depth * attenuation;
    },
    [level, isMobile],
  );

  const maxOffset = useCallback(
    (layer: ParallaxLayer) =>
      Math.min(parallax.maxOffset, parallax.layerMaxOffset[layer]),
    [],
  );

  return useMemo(
    () => ({
      level,
      reducedMotion,
      coarsePointer,
      isMobile,
      preloader: enabled('preloader'),
      // The custom reticle is pointer-fine only, per REQ-014.
      cursor: enabled('cursor') && !coarsePointer,
      sectionTransition: enabled('sectionTransition'),
      parallax: enabled('parallax'),
      countUp: enabled('countUp'),
      heroBackground: enabled('heroBackground'),
      terminalTyping: enabled('terminalTyping'),
      depth,
      maxOffset,
      // Pointer parallax needs a pointer, so it is gated on capability rather
      // than on an effect switch of its own (REQ-014's rule, reused).
      pointerParallax:
        effects.parallax && level >= pointerParallax.minLevel && !coarsePointer,
      durations,
      easings,
      stagger,
    }),
    [level, reducedMotion, coarsePointer, isMobile, enabled, depth, maxOffset],
  );
}
