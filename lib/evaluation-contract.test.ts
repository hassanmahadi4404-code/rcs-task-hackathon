import assert from 'node:assert/strict';
import { test } from 'node:test';

import { evaluatorFromEnv, isScore } from './evaluation-contract.ts';

test('EVALUATOR picks the implementation, defaulting to mock', () => {
  assert.equal(evaluatorFromEnv(undefined), 'mock');
  assert.equal(evaluatorFromEnv(''), 'mock');
  assert.equal(evaluatorFromEnv('openai'), 'mock');
  assert.equal(evaluatorFromEnv('gemini'), 'gemini');
  assert.equal(evaluatorFromEnv(' FAIL '), 'fail');
});

test('a score is a whole number from 0 to 100', () => {
  for (const ok of [0, 1, 99, 100]) assert.ok(isScore(ok), String(ok));
  for (const bad of [-1, 101, 50.5, NaN, '50', null]) assert.ok(!isScore(bad), String(bad));
});
