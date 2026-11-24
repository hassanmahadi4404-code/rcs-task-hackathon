/**
 * The numbers the task platform's rules turn on.
 *
 * The database enforces the same ones (`mentor_window()`, `late_window()`,
 * `max_attempts()` and the bucket's size limit in `supabase/migrations/`);
 * these copies are for what a page says before anyone tries.
 *
 * No `@/` imports: Node's test runner executes this file directly.
 */

export const DAY_MS = 24 * 60 * 60 * 1000;

/** BRIEF.md: a Mentor's say over a Session ends a week after its last deadline. */
export const MENTOR_WINDOW_MS = 7 * DAY_MS;

/** Late work is taken for this long after a deadline, and marked late. */
export const LATE_WINDOW_MS = 3 * DAY_MS;

/** Attempts one Learner may make at one Task. */
export const MAX_ATTEMPTS = 10;

/** BRIEF.md: a file of up to 10 MB. */
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

/**
 * The largest file a form can post through the server: Vercel refuses request
 * bodies over 4.5 MB and `next.config.ts` caps a server action at 4 MB.
 * Anything larger goes straight from the browser to Storage.
 */
export const MAX_POSTED_FILE_BYTES = 3.5 * 1024 * 1024;

export const MAX_BODY_CHARS = 50_000;
export const MAX_NOTE_CHARS = 2000;

/** The society's clock. Bangladesh has no daylight saving, so the offset is fixed. */
export const TIME_ZONE = 'Asia/Dhaka';
export const TIME_ZONE_OFFSET = '+06:00';

export const FORMATS = ['text', 'file'] as const;
export type Format = (typeof FORMATS)[number];
