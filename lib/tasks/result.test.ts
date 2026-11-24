import assert from 'node:assert/strict';
import { test } from 'node:test';

import { EvaluatorError } from './evaluator-error.ts';
import { checkResult } from './result.ts';

test('a whole score with feedback is stored', () => {
  assert.deepEqual(checkResult({ score: 72, feedback: '  Good.  ', model: 'mock' }), {
    score: 72,
    feedback: 'Good.',
    model: 'mock',
    flagged: false,
  });
  assert.equal(checkResult({ score: 0, feedback: 'x', model: '', flagged: true }).model, 'unknown');
  assert.equal(checkResult({ score: 5, feedback: 'x', model: 'm', flagged: true }).flagged, true);
});

test('anything else is refused, whatever the evaluator claims', () => {
  for (const bad of [
    null,
    'great work',
    { score: 101, feedback: 'x' },
    { score: 72.5, feedback: 'x' },
    { score: '72', feedback: 'x' },
    { score: 72, feedback: '   ' },
    { score: 72 },
  ]) {
    assert.throws(() => checkResult(bad), (error) => error instanceof EvaluatorError && error.reason === 'invalid_output');
  }
});

test('very long feedback is cut, not stored whole', () => {
  assert.equal(checkResult({ score: 1, feedback: 'a'.repeat(20_000), model: 'm' }).feedback.length, 8000);
});
