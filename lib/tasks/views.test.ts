import assert from 'node:assert/strict';
import { test } from 'node:test';

import { pendingWhy, pollDelay } from './evaluation-view.ts';
import { clockParts, timeLeft, urgency } from './countdown.ts';
import { rankRows } from './leaderboard.ts';
import { currentStep, effectiveScore, groupTasks, learnerState, learnerSummary, summarise, type AttemptSummary } from './learner.ts';
import {
  arrangeRows,
  latestPerLearner,
  mentorTaskPhase,
  needsPerson,
  overview,
  planOrder,
  reviewRows,
  reviewState,
  taskStats,
  trackStatus,
  trackSwitches,
} from './mentor.ts';
import type { EvaluationRow } from './types.ts';

const now = Date.parse('2026-11-20T12:00:00Z');
const inDays = (days: number) => new Date(now + days * 86_400_000).toISOString();
const attempt = (over: Partial<AttemptSummary> = {}): AttemptSummary => ({
  createdAt: inDays(-1),
  status: 'done',
  aiScore: 60,
  overrideScore: null,
  overridden: false,
  challenged: false,
  ...over,
});
const evaluation = (over: Partial<EvaluationRow> = {}): EvaluationRow => ({
  submission_id: 's',
  status: 'done',
  ai_score: 60,
  ai_feedback: 'ok',
  model: 'mock',
  override_score: null,
  override_note: null,
  overridden_by: null,
  overridden_at: null,
  updated_at: inDays(0),
  attempts: 1,
  next_attempt_at: inDays(0),
  failure_reason: null,
  flagged: false,
  challenged_at: null,
  challenge_note: null,
  ...over,
});

test('with nothing handed in, a Task is to do, late but open, or missed', () => {
  assert.equal(learnerState(inDays(2), [], now), 'todo');
  assert.equal(learnerState(inDays(-1), [], now), 'todo_late');
  assert.equal(learnerState(inDays(-4), [], now), 'missed');
});

test("the latest attempt decides a Learner's state", () => {
  assert.equal(learnerState(inDays(2), [attempt({ status: 'pending', aiScore: null })], now), 'reading');
  assert.equal(learnerState(inDays(2), [attempt()], now), 'feedback');
  assert.equal(learnerState(inDays(2), [attempt({ status: 'failed', aiScore: null })], now), 'needs_mentor');
  assert.equal(learnerState(inDays(2), [attempt({ status: 'failed', overridden: true })], now), 'mentor');
  assert.equal(learnerState(inDays(2), [attempt({ challenged: true })], now), 'challenged');
  // Once the Mentor answers, it is the Mentor's reply that shows, not the challenge.
  const answered = summarise(inDays(0), evaluation({ challenged_at: inDays(-1), challenge_note: 'x', override_score: 70 }));
  assert.deepEqual([answered.challenged, answered.overridden], [false, true]);
  assert.equal(summarise(inDays(0), evaluation({ challenged_at: inDays(-1), challenge_note: 'x' })).challenged, true);
  const older = attempt({ createdAt: inDays(-3) });
  const newer = attempt({ createdAt: inDays(-1), status: 'pending' });
  assert.equal(learnerState(inDays(2), [older, newer], now), 'reading');
  // Handed in before it closed: never "missed".
  assert.equal(learnerState(inDays(-30), [older], now), 'feedback');
});

test("the Mentor's score stands over the AI's", () => {
  assert.equal(effectiveScore({ aiScore: 60, overrideScore: 80 }), 80);
  assert.equal(effectiveScore({ aiScore: 60, overrideScore: 0 }), 0);
  assert.equal(effectiveScore({ aiScore: 60, overrideScore: null }), 60);
  assert.equal(effectiveScore({ aiScore: null, overrideScore: null }), null);
  assert.equal(summarise(inDays(0), evaluation({ override_note: 'see me' })).overridden, true);
  assert.equal(summarise(inDays(0), null).status, 'pending');
});

test('/learn lists what is running, undone work first, then what has finished', () => {
  const tasks = [
    { id: 'later', deadline: inDays(5), attempts: [] },
    { id: 'closed-missed', deadline: inDays(-9), attempts: [] },
    { id: 'running-done', deadline: inDays(1), attempts: [attempt({ createdAt: inDays(-3) })] },
    { id: 'soon', deadline: inDays(2), attempts: [] },
    { id: 'late', deadline: inDays(-1), attempts: [] },
    { id: 'closed-done', deadline: inDays(-20), attempts: [attempt({ createdAt: inDays(-21), aiScore: 70 })] },
  ];
  const groups = groupTasks(tasks, now);
  // Late work is still taken, so that Task is still running, and it is the most pressing.
  assert.deepEqual(groups.running.map((t) => t.id), ['late', 'soon', 'later', 'running-done']);
  assert.deepEqual(groups.finished.map((t) => t.id), ['closed-missed', 'closed-done']);
  assert.deepEqual(learnerSummary(tasks, now), { running: 4, todo: 3, finished: 2, points: 130 });
});

test("a Learner's points are the scores that stand on their latest attempts", () => {
  const tasks = [
    { deadline: inDays(1), attempts: [attempt({ aiScore: 40, overrideScore: 90, overridden: true })] },
    { deadline: inDays(1), attempts: [attempt({ status: 'pending', aiScore: null })] },
    { deadline: inDays(1), attempts: [attempt({ status: 'failed', aiScore: null, overrideScore: 55, overridden: true })] },
    { deadline: inDays(1), attempts: [attempt({ createdAt: inDays(-3), aiScore: 99 }), attempt({ createdAt: inDays(-1), aiScore: 10 })] },
  ];
  assert.equal(learnerSummary(tasks, now).points, 90 + 0 + 55 + 10);
});

test('a waiting Evaluation says why it is waiting', () => {
  assert.equal(pendingWhy(evaluation({ status: 'pending', attempts: 0 }), now), 'first');
  assert.equal(pendingWhy(evaluation({ status: 'pending', failure_reason: 'timeout' }), now), 'retry');
  assert.equal(pendingWhy(evaluation({ status: 'pending', failure_reason: 'quota' }), now), 'quota');
  assert.equal(pendingWhy(evaluation({ status: 'pending', updated_at: inDays(-1) }), now), 'stalled');
});

test('a page asks again just after the next run, never too often or too rarely', () => {
  assert.equal(pollDelay(new Date(now + 10_000).toISOString(), now), 11_000);
  assert.equal(pollDelay(new Date(now - 60_000).toISOString(), now), 2500);
  assert.equal(pollDelay(inDays(1), now), 60_000);
});

test('what a Mentor needs to look at', () => {
  assert.equal(reviewState(evaluation()), 'read');
  assert.equal(reviewState(evaluation({ status: 'pending' })), 'reading');
  assert.equal(reviewState(evaluation({ status: 'failed' })), 'failed');
  assert.equal(reviewState(evaluation({ flagged: true })), 'flagged');
  assert.equal(reviewState(evaluation({ status: 'failed', override_score: 50 })), 'changed');
  assert.equal(reviewState(evaluation({ flagged: true, override_note: 'I read it' })), 'changed');
  assert.equal(reviewState(null), 'reading');
  // A challenge needs a person, until a person has answered it.
  const challenged = evaluation({ challenged_at: inDays(0), challenge_note: 'I did test it.' });
  assert.equal(reviewState(challenged), 'challenged');
  assert.equal(needsPerson('challenged'), true);
  assert.equal(reviewState({ ...challenged, flagged: true }), 'challenged');
  assert.equal(reviewState({ ...challenged, override_note: 'You are right.' }), 'changed');
  // An older attempt set aside for a newer one is nobody's problem.
  const skipped = reviewState(evaluation({ status: 'failed', failure_reason: 'superseded' }));
  assert.equal(skipped, 'skipped');
  assert.equal(needsPerson(skipped), false);
  assert.deepEqual(['failed', 'flagged', 'read', 'changed', 'reading'].map((s) => needsPerson(s as never)), [true, true, false, false, false]);
});

test("a Task's numbers are over each Learner's latest attempt", () => {
  const deadline = inDays(-2);
  const submissions = [
    { member_id: 'a', created_at: inDays(-5), evaluation: evaluation({ ai_score: 10 }) },
    { member_id: 'a', created_at: inDays(-3), evaluation: evaluation({ ai_score: 70 }) },
    { member_id: 'b', created_at: inDays(-1), evaluation: evaluation({ ai_score: 40, override_score: 90 }) },
    { member_id: 'c', created_at: inDays(-4), evaluation: evaluation({ status: 'failed', ai_score: null }) },
    { member_id: 'd', created_at: inDays(-4), evaluation: evaluation({ status: 'pending', ai_score: null }) },
  ];
  const work = latestPerLearner(submissions);
  assert.equal(work.find((w) => w.memberId === 'a')?.attempts, 2);
  assert.equal(work.find((w) => w.memberId === 'a')?.latest.created_at, inDays(-3));
  assert.deepEqual(taskStats(work, deadline), { learners: 4, late: 1, average: 80, reading: 1, attention: 1 });
  assert.equal(taskStats([], deadline).average, null);
});

test('a Task is a draft to its Mentor until it is published', () => {
  assert.equal(mentorTaskPhase({ deadline: inDays(2), published_at: null }, now), 'draft');
  assert.equal(mentorTaskPhase({ deadline: inDays(2), published_at: inDays(1) }, now), 'draft');
  assert.equal(mentorTaskPhase({ deadline: inDays(2), published_at: inDays(-1) }, now), 'open');
  assert.equal(mentorTaskPhase({ deadline: inDays(-1), published_at: inDays(-5) }, now), 'late');
  assert.equal(mentorTaskPhase({ deadline: inDays(-9), published_at: inDays(-20) }, now), 'closed');
});

test("a Task's list is each Learner's latest attempt, filtered, searched and sorted", () => {
  const deadline = inDays(-2);
  const submissions = [
    { member_id: 'a', created_at: inDays(-5), evaluation: evaluation({ ai_score: 10 }) },
    { member_id: 'a', created_at: inDays(-3), evaluation: evaluation({ ai_score: 70 }) },
    { member_id: 'b', created_at: inDays(-1), evaluation: evaluation({ ai_score: 40, override_score: 90 }) },
    { member_id: 'c', created_at: inDays(-4), evaluation: evaluation({ status: 'failed', ai_score: null }) },
    { member_id: 'd', created_at: inDays(-6), evaluation: evaluation({ status: 'pending', ai_score: null }) },
  ];
  const people = [
    { member_id: 'a', name: 'Tanvir Hasan', roll: '2203002' },
    { member_id: 'b', name: 'Ayesha Rahman', roll: '2203001' },
    { member_id: 'c', name: 'Nusrat Jahan', roll: '2304003' },
  ];
  const rows = reviewRows(submissions, people, deadline);
  const ids = (view: Parameters<typeof arrangeRows>[1]) => arrangeRows(rows, view).map((row) => row.memberId);

  assert.deepEqual(ids({ group: 'all', q: '', sort: 'recent' }), ['b', 'a', 'c', 'd']);
  assert.deepEqual(ids({ group: 'all', q: '', sort: 'score' }), ['c', 'd', 'a', 'b']);
  assert.deepEqual(ids({ group: 'all', q: '', sort: 'name' }), ['d', 'b', 'c', 'a']);
  assert.deepEqual(ids({ group: 'attention', q: '', sort: 'recent' }), ['c']);
  assert.deepEqual(ids({ group: 'reading', q: '', sort: 'recent' }), ['d']);
  assert.deepEqual(ids({ group: 'challenged', q: '', sort: 'recent' }), []);
  assert.deepEqual(ids({ group: 'changed', q: '', sort: 'recent' }), ['b']);
  assert.deepEqual(ids({ group: 'late', q: '', sort: 'recent' }), ['b']);
  assert.deepEqual(ids({ group: 'all', q: ' 2203 ', sort: 'name' }), ['b', 'a']);
  assert.deepEqual(ids({ group: 'all', q: 'nusrat', sort: 'recent' }), ['c']);

  const b = rows.find((row) => row.memberId === 'b');
  assert.deepEqual([b?.score, b?.aiScore, b?.attempts, b?.state], [90, 40, 1, 'changed']);
  // No name for someone the roster did not return; the row is still there.
  assert.equal(rows.find((row) => row.memberId === 'd')?.name, '');
});

test('the overview counts what needs a person, and what is due soon', () => {
  const sessions = [
    {
      session: { id: 's1', title: 'Web 02', held_on: '2026-11-18' },
      tasks: [
        { id: 't1', title: 'A to-do list', deadline: inDays(3), published_at: inDays(-2) },
        { id: 't2', title: 'Draft', deadline: inDays(2), published_at: null },
      ],
      submissions: [
        { task_id: 't1', member_id: 'a', created_at: inDays(-1), evaluation: evaluation({ status: 'failed' }) },
        { task_id: 't1', member_id: 'b', created_at: inDays(-1), evaluation: evaluation({ status: 'pending' }) },
        { task_id: 't1', member_id: 'c', created_at: inDays(-1), evaluation: evaluation({ flagged: true }) },
        { task_id: 't1', member_id: 'c', created_at: inDays(-2), evaluation: evaluation({ status: 'failed' }) },
      ],
    },
    {
      session: { id: 's2', title: 'Web 01', held_on: '2026-10-01' },
      tasks: [{ id: 't3', title: 'Profile', deadline: inDays(-10), published_at: inDays(-30) }],
      submissions: [{ task_id: 't3', member_id: 'a', created_at: inDays(-12), evaluation: evaluation() }],
    },
  ];
  const mentor = overview(sessions, now, false);
  assert.equal(mentor.editable, 1);
  assert.equal(mentor.takingWork, 1);
  assert.equal(mentor.submissions, 5);
  assert.equal(mentor.reading, 1);
  assert.deepEqual(mentor.attention, [{ taskId: 't1', title: 'A to-do list', count: 2 }]);
  assert.deepEqual(mentor.deadlines.map((d) => d.taskId), ['t1']);
  assert.equal(overview(sessions, now, true).editable, 2);
});

test('the plan is in the order it is taught, with anything unplaced after it', () => {
  const tracks = [
    { name: 'CP', position: 0 },
    { name: 'Web', position: 2 },
    { name: 'Old', position: 0 },
    { name: 'Foundations', position: 1 },
  ];
  // The sort is stable, so the unplaced keep the order they came in.
  assert.deepEqual([...tracks].sort(planOrder).map((track) => track.name), ['Foundations', 'Web', 'CP', 'Old']);
});

test('the time left is a clock: days only while there are any', () => {
  const until = now + 2 * 86_400_000 + 5 * 3_600_000 + 7 * 60_000 + 9_000;
  assert.deepEqual(timeLeft(until, now), { days: 2, hours: 5, minutes: 7, seconds: 9, over: false });
  assert.deepEqual(clockParts(timeLeft(until, now)).map((p) => p.value + p.unit), ['2d', '05h', '07m', '09s']);
  assert.deepEqual(clockParts(timeLeft(now + 3_661_000, now)).map((p) => p.value + p.unit), ['01h', '01m', '01s']);
  assert.deepEqual(timeLeft(now - 5000, now), { days: 0, hours: 0, minutes: 0, seconds: 0, over: true });
  assert.equal(timeLeft(now, now).over, true);
});

test('a deadline gets more pressing as it nears', () => {
  assert.equal(urgency(now + 2 * 86_400_000, now), 'calm');
  assert.equal(urgency(now + 86_400_000, now), 'soon');
  assert.equal(urgency(now + 3_600_000, now), 'now');
  assert.equal(urgency(now - 1, now), 'now');
});

test('Learners on the same points share a place on the leaderboard', () => {
  const row = (name: string, points: number, tasks = 1) => ({ name, points, tasks, average: points, is_viewer: false });
  const ranked = rankRows([row('Dipa', 70), row('Ayesha', 150, 2), row('Tanvir', 90), row('Nusrat', 90), row('Rafi', 150, 3)]);
  assert.deepEqual(
    ranked.map((r) => `${r.rank} ${r.name}`),
    ['1 Rafi', '1 Ayesha', '3 Nusrat', '3 Tanvir', '5 Dipa'],
  );
  assert.deepEqual(rankRows([]), []);
});

test('a Task has three steps, and a Learner is always on one of them', () => {
  assert.equal(currentStep([]), 2);
  assert.equal(currentStep([attempt({ status: 'pending', aiScore: null })]), 3);
  assert.equal(currentStep([attempt()]), 4);
  assert.equal(currentStep([attempt({ status: 'failed', aiScore: null })]), 4);
  assert.equal(currentStep([attempt({ status: 'pending', aiScore: null, overridden: true })]), 4);
});

test('a Track is upcoming, running or finished', () => {
  assert.equal(trackStatus({ archived: false, upcoming: false }), 'running');
  assert.equal(trackStatus({ archived: false, upcoming: true }), 'upcoming');
  assert.equal(trackStatus({ archived: true, upcoming: false }), 'finished');
  for (const status of ['upcoming', 'running', 'finished'] as const) {
    assert.equal(trackStatus(trackSwitches(status)), status);
  }
});
