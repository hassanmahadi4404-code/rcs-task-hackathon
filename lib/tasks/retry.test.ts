import assert from 'node:assert/strict';
import { test } from 'node:test';

import { DAY_MS } from './rules.ts';
import { MAX_RUNS, afterFailure } from './retry.ts';

const now = Date.parse('2026-11-20T18:00:00Z');
const base = { retryAfterMs: null, submittedAt: now - 60_000, now };

test('a failed run is tried again, further apart each time, then left to the Mentor', () => {
  const waits = [1, 2, 3, 4].map((attempts) => {
    const next = afterFailure({ ...base, attempts, reason: 'unavailable' });
    assert.equal(next.status, 'pending');
    return next.status === 'pending' ? next.nextAttemptAt - now : 0;
  });
  assert.deepEqual(waits, [10_000, 30_000, 120_000, 600_000]);
  assert.deepEqual(afterFailure({ ...base, attempts: MAX_RUNS, reason: 'timeout' }), { status: 'failed', attempts: MAX_RUNS });
});

test('work an AI cannot read is not tried twice', () => {
  assert.equal(afterFailure({ ...base, attempts: 1, reason: 'unreadable' }).status, 'failed');
});

test('a used-up quota does not count against the Submission, and pauses everything', () => {
  const next = afterFailure({ ...base, attempts: 3, reason: 'quota', retryAfterMs: 34_000 });
  assert.deepEqual(next, { status: 'pending', attempts: 2, nextAttemptAt: now + 34_000, pauseUntil: now + 34_000 });

  // No hint from the model: five minutes. A silly hint is held to sane bounds.
  const blind = afterFailure({ ...base, attempts: 1, reason: 'quota' });
  assert.equal(blind.status === 'pending' && blind.nextAttemptAt - now, 5 * 60_000);
  const eager = afterFailure({ ...base, attempts: 1, reason: 'quota', retryAfterMs: 1 });
  assert.equal(eager.status === 'pending' && eager.nextAttemptAt - now, 30_000);
  const never = afterFailure({ ...base, attempts: 1, reason: 'quota', retryAfterMs: 7 * DAY_MS });
  assert.equal(never.status === 'pending' && never.nextAttemptAt - now, 60 * 60_000);
});

test('after two days without quota the Submission is left to the Mentor', () => {
  const old = afterFailure({ ...base, attempts: 1, reason: 'quota', submittedAt: now - 2 * DAY_MS - 1 });
  assert.deepEqual(old, { status: 'failed', attempts: 0 });
});
