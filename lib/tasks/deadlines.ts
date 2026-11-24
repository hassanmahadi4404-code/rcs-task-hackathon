/**
 * Deadline decisions: whether a Task still takes work, how late a Submission
 * was, and until when a Mentor may change a Session.
 *
 * Every function takes the instants it compares, so `deadlines.test.ts` can
 * run it against any clock. The database makes the same decisions in
 * `task_accepts_submissions()` and `session_edit_until()`.
 *
 * No `@/` imports: Node's test runner executes this file directly.
 */

import { DAY_MS, LATE_WINDOW_MS, MENTOR_WINDOW_MS, TIME_ZONE, TIME_ZONE_OFFSET } from './rules.ts';

/** `open` before the deadline, `late` while late work is taken, then `closed`. */
export type TaskPhase = 'open' | 'late' | 'closed';

export function closesAt(deadline: string): number {
  return Date.parse(deadline) + LATE_WINDOW_MS;
}

export function taskPhase(deadline: string, now: number): TaskPhase {
  if (now <= Date.parse(deadline)) return 'open';
  return now <= closesAt(deadline) ? 'late' : 'closed';
}

/** Milliseconds past the deadline a Submission arrived; 0 when on time. */
export function lateBy(createdAt: string, deadline: string): number {
  return Math.max(0, Date.parse(createdAt) - Date.parse(deadline));
}

/** The end of the day a Session is held, on the society's clock. */
function endOfDay(heldOn: string): number {
  return Date.parse(`${heldOn}T00:00:00${TIME_ZONE_OFFSET}`) + DAY_MS;
}

/**
 * When a Mentor's say over a Session ends: a week after its last deadline,
 * or after the day it is held while it has no Task yet. A Session with no
 * Task and no settled date has not happened, so its window has no end yet
 * (`Infinity`).
 */
export function sessionEditUntil(heldOn: string, deadlines: readonly string[], dateTbc = false): number {
  if (deadlines.length === 0 && dateTbc) return Number.POSITIVE_INFINITY;
  const last = deadlines.length > 0 ? Math.max(...deadlines.map((d) => Date.parse(d))) : endOfDay(heldOn);
  return last + MENTOR_WINDOW_MS;
}

/**
 * `unscheduled` while its date is not settled, `upcoming` before the day it
 * is held, `open` while its Mentors may change it, then `closed`.
 */
export type SessionPhase = 'unscheduled' | 'upcoming' | 'open' | 'closed';

export function sessionPhase(heldOn: string, deadlines: readonly string[], now: number, dateTbc = false): SessionPhase {
  if (now > sessionEditUntil(heldOn, deadlines, dateTbc)) return 'closed';
  if (dateTbc) return 'unscheduled';
  return now < endOfDay(heldOn) - DAY_MS ? 'upcoming' : 'open';
}

const dateTime = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const dateOnly = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'UTC',
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

/** `Fri 20 Nov 2026, 23:59`, on the society's clock. */
export function formatDateTime(instant: string | number): string {
  return dateTime.format(new Date(instant)).replace(/,(?= \d{1,2} )/, '');
}

/** A `date` column, which has no time and no zone: `Fri 20 Nov 2026`. */
export function formatDate(date: string): string {
  return dateOnly.format(new Date(`${date}T00:00:00Z`)).replace(',', '');
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['day', DAY_MS],
  ['hour', 60 * 60 * 1000],
  ['minute', 60 * 1000],
];

const relative = new Intl.RelativeTimeFormat('en', { numeric: 'always' });

/** `in 3 days`, `2 hours ago`; the largest unit that fits, rounded down. */
export function formatRelative(instant: string | number, now: number): string {
  const diff = new Date(instant).getTime() - now;
  for (const [unit, size] of UNITS) {
    if (Math.abs(diff) >= size) return relative.format(Math.trunc(diff / size), unit);
  }
  return relative.format(diff < 0 ? -1 : 1, 'minute');
}

/** A span such as a lateness: `2 days`, `5 hours`, `12 minutes`. */
export function formatSpan(ms: number): string {
  for (const [unit, size] of UNITS) {
    if (ms >= size) {
      const n = Math.floor(ms / size);
      return `${n} ${unit}${n === 1 ? '' : 's'}`;
    }
  }
  return '1 minute';
}

/** A `datetime-local` value, read as the society's clock, as an ISO instant; null when it is not one. */
export function localToInstant(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(value)) return null;
  const time = Date.parse(`${value.length === 16 ? `${value}:00` : value}${TIME_ZONE_OFFSET}`);
  return Number.isNaN(time) ? null : new Date(time).toISOString();
}

/** An instant as a `datetime-local` value on the society's clock. */
export function instantToLocal(instant: string): string {
  const offsetMs = Number(TIME_ZONE_OFFSET.slice(1, 3)) * 60 * 60 * 1000;
  return new Date(Date.parse(instant) + offsetMs).toISOString().slice(0, 16);
}

/** Today's date on the society's clock, as a `date` column takes it. */
export function societyDate(now: number): string {
  return instantToLocal(new Date(now).toISOString()).slice(0, 10);
}
