/**
 * Motion values for the task platform's own pieces. The site's are in
 * `config/motion.ts`, which is not ours to edit; these sit beside it so a
 * component still never carries a number of its own.
 */

/** The reticle cursor: the ring trails the pointer and closes this share of the gap each frame. */
export const reticle = {
  follow: 0.22,
  /** Closer than this, in px, and the ring has arrived: the frame loop stops. */
  settled: 0.1,
} as const;

/** How often a countdown redraws. */
export const TICK_MS = 1000;
