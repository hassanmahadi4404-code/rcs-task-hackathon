/**
 * Motion seam — PAT-003, TASK-013.
 *
 * One global level, per-section overrides, per-effect kill switches, and the
 * parallax depth table. Components never import `MOTION_LEVEL` or `sections`
 * directly; they call `useMotion(sectionId)` from `hooks/use-motion-config.ts`,
 * which resolves the level against user preference and device capability.
 *
 * Level semantics and the override precedence chain: config/motion.README.md
 */

/** 0 = static · 1 = reveals only · 2 = scroll choreography + parallax · 3 = adds continuous WebGL */
export type MotionLevel = 0 | 1 | 2 | 3;

/**
 * Section ids, matching the anchors in `content/site.ts` and `app/page.tsx`.
 *
 * TASK-163 — `achievements` is the home preview section, not the `/achievements`
 * route: the route's two sections take the shared defaults, the same way
 * `/team`'s three do.
 *
 * TASK-154 — `team` is gone. The combined Team section became two home
 * sections, `executive` and `past-executive`, and the `/team` route
 * (REQ-110, REQ-112). Sub-page sections do not need ids here: only a section
 * that carries a motion override, a grid plane, or a transition slot does,
 * and `/team`'s sections use the shared defaults.
 */
export type SectionId =
  | 'home'
  | 'what-we-do'
  | 'about'
  | 'events-preview'
  | 'executive'
  | 'past-executive'
  | 'achievements-preview'
  | 'join'
  | 'footer';

/**
 * Page order. The single runtime source for "which section comes after
 * which" — used where a section's behaviour has to differ from its
 * neighbours' (TASK-073). Reordering `app/page.tsx` means reordering this.
 */
export const SECTION_ORDER: SectionId[] = [
  'home',
  'what-we-do',
  'about',
  'events-preview',
  'executive',
  'past-executive',
  'achievements-preview',
  'join',
  'footer',
];

export type EffectName =
  | 'preloader'
  | 'cursor'
  | 'sectionTransition'
  | 'parallax'
  | 'countUp'
  | 'heroBackground'
  | 'terminalTyping';

export type ParallaxLayer = 'bg' | 'grid' | 'content' | 'chrome';

/**
 * Global ceiling. Every section resolves to at most this value unless it
 * declares its own override below.
 */
export const MOTION_LEVEL: MotionLevel = 2;

/**
 * Per-section overrides. An entry replaces the global level for that section
 * outright — it can raise as well as lower. Omitted sections inherit
 * `MOTION_LEVEL`.
 *
 * `home` is raised to 3 because the hero is the only place a continuous WebGL
 * background is permitted (PRF-002 still gates it by device).
 */
export const sections: Partial<Record<SectionId, MotionLevel>> = {
  home: 3,
};

/**
 * Minimum level at which each effect is allowed to run. An effect is enabled
 * when the resolved level is greater than or equal to its threshold.
 */
export const effectThresholds: Record<EffectName, MotionLevel> = {
  preloader: 1,
  cursor: 1,
  sectionTransition: 1,
  parallax: 2,
  countUp: 1,
  heroBackground: 3,
  terminalTyping: 1,
};

/**
 * Hard kill switches, independent of level. Set one to `false` to remove an
 * effect from the entire site without touching component code — useful for
 * bisecting a performance problem.
 */
export const effects: Record<EffectName, boolean> = {
  preloader: true,
  cursor: true,
  sectionTransition: true,
  parallax: true,
  countUp: true,
  heroBackground: true,
  terminalTyping: true,
};

/**
 * Layered depth parallax — REQ-016.
 *
 * `depth` is the global multiplier applied to every layer. Layer values are
 * the per-plane coefficients: positive lags behind the scroll, negative
 * counter-scrolls. `content` is pinned at 0 — body text is never parallaxed.
 */
export const parallax = {
  depth: 1,
  layers: {
    bg: 0.35,
    grid: 0.18,
    content: 0,
    chrome: -0.08,
  } as Record<ParallaxLayer, number>,
  /** Multiplier applied to every depth below 768px (TASK-068). */
  mobileAttenuation: 0.3,
  /** Global clamp on the resulting translate, in px. No layer may exceed it. */
  maxOffset: 140,
  /**
   * Per-layer clamp, in px. A plane may only travel as far as its own bleed
   * allows: `.hud-grid` is inset by 120px, `.hero-bg` by 120px, and the frame
   * brackets have no bleed at all — they drift a few px off their panel and
   * anything more reads as a broken border rather than as depth.
   */
  layerMaxOffset: {
    bg: 110,
    grid: 100,
    content: 0,
    chrome: 14,
  } as Record<ParallaxLayer, number>,
} as const;

/**
 * Hero pointer parallax — TASK-067.
 *
 * The hook writes only the normalised pointer position (`--pp-x` / `--pp-y`,
 * each -1…1) onto the hero. The per-plane amplitudes and the smoothing are
 * `--pp-amp-*` and `--pp-ease` in `config/tokens.css`, because they are the
 * kind of value CSS should own (GUD-002) — this record holds the gate only.
 */
export const pointerParallax = {
  /** Never runs on touch: there is no pointer to parallax against. */
  minLevel: 2 as MotionLevel,
} as const;

/**
 * Durations in seconds. Mirrors of `--dur-*` in `config/tokens.css`; keep the
 * two numerically identical so CSS transitions and Motion animations on the
 * same element agree.
 */
export const durations = {
  instant: 0.12,
  fast: 0.24,
  base: 0.42,
  slow: 0.7,
  slower: 1.1,
} as const;

/** Cubic-bezier control points. Mirrors of `--ease-*` in `config/tokens.css`. */
export const easings = {
  out: [0.22, 1, 0.36, 1],
  inOut: [0.65, 0, 0.35, 1],
  hud: [0.16, 1, 0.3, 1],
} as const satisfies Record<string, readonly [number, number, number, number]>;

/** Stagger steps in seconds, matching the hero's `--d` / `--line-d` cadence. */
export const stagger = {
  line: 0.18,
  item: 0.08,
  block: 0.12,
} as const;

/**
 * Preloader ceiling in ms. The component enforces this as a hard timeout, and
 * every boot animation in `styles/chrome.css` is expressed as a fraction of it
 * via the inline `--boot-ms` custom property — so this is the only number to
 * change. The boot log divides the budget evenly across its lines plus one, so
 * the four lines in `content/site.ts` land at 600/1200/1800/2400ms.
 *
 * Raised from REQ-013's 1200 on the owner's instruction (2026-08-17): at 1.2s
 * the sequence was over before it registered as having happened.
 */
export const PRELOADER_MAX_MS = 3000;

/**
 * How long the email control holds its `Copied` state, in ms — issue #16.
 * Long enough to read and to be announced, short enough that the control is
 * back to its resting label before the reader looks again.
 */
export const COPIED_HOLD_MS = 2000;

/** Lenis configuration for the single shared scroll loop (TASK-033, PRF-004). */
export const smoothScroll = {
  duration: 1.05,
  /** Lenis `easing` — exponential ease-out. */
  lerp: 0.1,
  wheelMultiplier: 1,
  touchMultiplier: 1.6,
  /**
   * REQ-114 — hand the wheel to any nested scroller the pointer is inside
   * (today: the terminal scrollback) until that scroller reaches its end, at
   * which point Lenis takes the wheel back and the page resumes.
   *
   * `data-lenis-prevent`, which TASK-116 proposes, is unconditional: it would
   * fix the terminal but leave the page frozen while the pointer rests over a
   * scrollback that has hit its end. This flag is the conditional form, and it
   * requires `overscroll-behavior: auto` on the nested scroller — Lenis reads
   * `contain` as "never chain" and stops handing the wheel back.
   */
  allowNestedScroll: true,
} as const;

/** Viewport width below which mobile attenuation applies. Matches `useIsMobile`. */
export const MOBILE_BREAKPOINT = 768;
