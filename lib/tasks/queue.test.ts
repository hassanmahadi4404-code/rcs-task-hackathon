import assert from 'node:assert/strict';
import { test } from 'node:test';

import { evaluatorIntervalMs, queueEstimate, queuePollDelay, waitParts } from './queue.ts';

const now = Date.parse('2026-11-20T17:30:00Z');
const at = (seconds: number) => new Date(now + seconds * 1000).toISOString();

test('only a real model is paced, at a rate the environment can set', () => {
  assert.equal(evaluatorIntervalMs('mock', undefined), 0);
  assert.equal(evaluatorIntervalMs('fail', '5'), 0);
  assert.equal(evaluatorIntervalMs('gemini', undefined), 6000);
  assert.equal(evaluatorIntervalMs('gemini', '30'), 2000);
  assert.equal(evaluatorIntervalMs('gemini', '7'), 8572);
  // A rate that makes no sense falls back to the default rather than stopping the line.
  for (const bad of ['0', '-3', 'fast', '2.5', '100000']) assert.equal(evaluatorIntervalMs('gemini', bad), 6000);
});

test('a place in line becomes about how long', () => {
  const free = { ahead: 0, next_slot_at: at(-5), paused_until: null };
  assert.deepEqual(queueEstimate(free, at(-60), 6000, now), { position: 1, waitMs: 0, paused: false });

  // Seven ahead at one every six seconds, and the next slot is in two.
  const busy = { ahead: 7, next_slot_at: at(2), paused_until: null };
  assert.deepEqual(queueEstimate(busy, at(-60), 6000, now), { position: 8, waitMs: 44_000, paused: false });

  // Out of quota for five minutes: the line starts again after that.
  const paused = { ahead: 2, next_slot_at: at(-1), paused_until: at(300) };
  assert.deepEqual(queueEstimate(paused, at(-60), 6000, now), { position: 3, waitMs: 312_000, paused: true });

  // A run that failed and is tried again later waits for that, however short the line.
  assert.equal(queueEstimate(free, at(120), 6000, now).waitMs, 120_000);
  // An evaluator with no pace: only the slot matters.
  assert.equal(queueEstimate(busy, at(-60), 0, now).waitMs, 2000);
});

test('a page looks again in time for its turn, and often enough to keep the line moving', () => {
  assert.equal(queuePollDelay(0), 2500);
  assert.equal(queuePollDelay(12_000), 6000);
  assert.equal(queuePollDelay(600_000), 20_000);
});

test('a wait is said the way people say it', () => {
  assert.deepEqual(waitParts(0), { unit: 'moments' });
  assert.deepEqual(waitParts(14_000), { unit: 'moments' });
  assert.deepEqual(waitParts(44_000), { unit: 'seconds', n: 40 });
  assert.deepEqual(waitParts(89_000), { unit: 'seconds', n: 90 });
  assert.deepEqual(waitParts(312_000), { unit: 'minutes', n: 5 });
  assert.deepEqual(waitParts(3 * 3_600_000), { unit: 'hours', n: 3 });
});
