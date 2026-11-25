/**
 * The time left until a deadline, as a clock a child can read.
 *
 * No `@/` imports: Node's test runner executes this file directly.
 */

export interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  /** The moment has passed; every part is 0. */
  over: boolean;
}

export function timeLeft(until: number, now: number): TimeLeft {
  const total = Math.max(0, Math.floor((until - now) / 1000));
  return {
    days: Math.floor(total / 86_400),
    hours: Math.floor((total % 86_400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
    over: until <= now,
  };
}

/**
 * How pressing it is: `calm` with more than a day left, `soon` inside the
 * last day, `now` inside the last hour or once it has passed.
 */
export type Urgency = 'calm' | 'soon' | 'now';

export function urgency(until: number, now: number): Urgency {
  const left = until - now;
  if (left <= 60 * 60 * 1000) return 'now';
  return left <= 24 * 60 * 60 * 1000 ? 'soon' : 'calm';
}

const two = (n: number) => String(n).padStart(2, '0');

/** The parts to show, largest first: days appear only while there are any. */
export function clockParts(left: TimeLeft): { value: string; unit: 'd' | 'h' | 'm' | 's' }[] {
  const parts: { value: string; unit: 'd' | 'h' | 'm' | 's' }[] = [
    { value: two(left.hours), unit: 'h' },
    { value: two(left.minutes), unit: 'm' },
    { value: two(left.seconds), unit: 's' },
  ];
  return left.days > 0 ? [{ value: String(left.days), unit: 'd' }, ...parts] : parts;
}
