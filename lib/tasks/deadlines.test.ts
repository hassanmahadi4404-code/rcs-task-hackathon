import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  formatDate,
  formatDateTime,
  formatRelative,
  formatSpan,
  instantToLocal,
  lateBy,
  localToInstant,
  sessionEditUntil,
  sessionPhase,
  taskPhase,
} from './deadlines.ts';
import { DAY_MS } from './rules.ts';

const deadline = '2026-11-20T17:59:00Z'; // 23:59 in Dhaka
const at = (iso: string) => Date.parse(iso);

test('a Task is open until its deadline, takes late work for three days, then closes', () => {
  assert.equal(taskPhase(deadline, at('2026-11-20T17:59:00Z')), 'open');
  assert.equal(taskPhase(deadline, at('2026-11-20T17:59:01Z')), 'late');
  assert.equal(taskPhase(deadline, at('2026-11-23T17:59:00Z')), 'late');
  assert.equal(taskPhase(deadline, at('2026-11-23T17:59:01Z')), 'closed');
});

test('lateness is the time past the deadline', () => {
  assert.equal(lateBy('2026-11-20T17:00:00Z', deadline), 0);
  assert.equal(lateBy('2026-11-20T19:59:00Z', deadline), 2 * 60 * 60 * 1000);
});

test("a Mentor's say ends a week after the Session's last deadline", () => {
  const until = sessionEditUntil('2026-11-10', ['2026-11-15T10:00:00Z', deadline]);
  assert.equal(until, at(deadline) + 7 * DAY_MS);
  assert.equal(sessionPhase('2026-11-10', [deadline], until), 'open');
  assert.equal(sessionPhase('2026-11-10', [deadline], until + 1), 'closed');
});

test('a Session with no Task counts from the end of the day it is held, in Dhaka', () => {
  const until = sessionEditUntil('2026-11-10', []);
  assert.equal(until, at('2026-11-10T18:00:00Z') + 7 * DAY_MS);
  assert.equal(sessionPhase('2026-11-10', [], at('2026-11-09T17:59:00Z')), 'upcoming');
  assert.equal(sessionPhase('2026-11-10', [], at('2026-11-09T18:00:00Z')), 'open');
});

test("times are shown on the society's clock", () => {
  assert.equal(formatDateTime(deadline), 'Fri 20 Nov 2026, 23:59');
  assert.equal(formatDate('2026-11-20'), 'Fri 20 Nov 2026');
});

test('distances read the way people say them', () => {
  const now = at('2026-11-20T12:00:00Z');
  assert.equal(formatRelative('2026-11-23T13:00:00Z', now), 'in 3 days');
  assert.equal(formatRelative('2026-11-20T09:30:00Z', now), '2 hours ago');
  assert.equal(formatRelative('2026-11-20T12:00:20Z', now), 'in 1 minute');
  assert.equal(formatSpan(2 * DAY_MS + 5), '2 days');
  assert.equal(formatSpan(60 * 60 * 1000), '1 hour');
  assert.equal(formatSpan(10), '1 minute');
});

test('a deadline typed into the form is Dhaka time', () => {
  assert.equal(localToInstant('2026-11-20T23:59'), '2026-11-20T17:59:00.000Z');
  assert.equal(instantToLocal('2026-11-20T17:59:00Z'), '2026-11-20T23:59');
  assert.equal(localToInstant('tomorrow'), null);
  assert.equal(localToInstant('2026-13-40T99:99'), null);
});
