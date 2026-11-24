import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import { evaluate } from './evaluate.ts';
import { isScore, type EvaluationInput } from './evaluation-contract.ts';
import { EvaluatorError, failureOf } from './tasks/evaluator-error.ts';
import { readFeedback } from './tasks/feedback.ts';

const task = {
  title: 'A to-do list',
  instructions: 'Write a to-do list in plain JavaScript: add an item, mark it done, delete it.',
  gradingCriteria:
    'All three actions work: 40. Survives a reload (localStorage): 30. Readable code with no global variables leaking: 30.',
};
const input = (text: string | null, file: EvaluationInput['submission']['file'] = null): EvaluationInput => ({
  task,
  submission: { text, file },
});
const strong =
  'I wrote add, done and delete actions as three functions inside a module so no global variables leak. ' +
  'The list is saved to localStorage on every change and read back on load, so it survives a reload. ' +
  'The code is readable: small functions, clear names, and one render function that redraws the list.';

const original = process.env.EVALUATOR;
afterEach(() => {
  if (original === undefined) delete process.env.EVALUATOR;
  else process.env.EVALUATOR = original;
});

test('mock: the same input always gives the same result', async () => {
  delete process.env.EVALUATOR;
  const first = await evaluate(input(strong));
  const second = await evaluate(input(strong));
  assert.deepEqual(first, second);
  assert.equal(first.model, 'mock');
  assert.ok(isScore(first.score));

  const withFile = input(strong, { name: 'submission.png', mediaType: 'image/png', bytes: new Uint8Array([1, 2, 3]) });
  assert.deepEqual(await evaluate(withFile), await evaluate(withFile));
});

test('mock: the feedback is marked against the criteria the Mentor wrote', async () => {
  process.env.EVALUATOR = 'mock';
  const { feedback, score } = await evaluate(input(strong));
  const read = readFeedback(feedback);
  assert.deepEqual(read.items.map((item) => item.max), [40, 30, 30]);
  assert.equal(read.items[1].label, 'Survives a reload (localStorage)');
  assert.ok(read.nextStep.length > 0);
  const earned = read.items.reduce((sum, item) => sum + item.points, 0);
  assert.equal(score, earned);
});

test('mock: fuller, on-topic work earns more, and nothing earns nothing', async () => {
  process.env.EVALUATOR = 'mock';
  const good = await evaluate(input(strong));
  const thin = await evaluate(input('It works on my laptop I think.'));
  const empty = await evaluate(input('ok'));
  assert.ok(good.score > thin.score, `${good.score} > ${thin.score}`);
  assert.equal(empty.score, 0);
});

test('fail: always throws, with a reason the caller can act on', async () => {
  process.env.EVALUATOR = 'fail';
  await assert.rejects(evaluate(input(strong)), (error) => {
    assert.ok(error instanceof EvaluatorError);
    assert.deepEqual(failureOf(error), { reason: 'unavailable', retryAfterMs: null });
    return true;
  });
});

test('an error that is not an EvaluatorError is read as unavailable', () => {
  assert.deepEqual(failureOf(new TypeError('fetch failed')), { reason: 'unavailable', retryAfterMs: null });
});
