import assert from 'node:assert/strict';
import { test } from 'node:test';

import { REMOVED, redact } from './redact.ts';

const ayesha = ['Ayesha Rahman', '2203001', 'learner1@kit.test', '01700000001'];

test('emails and phone numbers go, whoever they belong to', () => {
  const out = redact('Mail me at someone.else@example.com or call +880 1712-345678 / 01812345678.');
  assert.ok(!out.includes('@'));
  assert.ok(!/\d{6}/.test(out));
});

test("the Learner's own name, roll, email and phone go wherever they appear", () => {
  const out = redact('Done by ayesha (2203001). — Ayesha Rahman, learner1@kit.test, 01700000001', ayesha);
  for (const term of ['ayesha', 'rahman', '2203001', 'kit.test', '0170000']) {
    assert.ok(!out.toLowerCase().includes(term), `${term} in: ${out}`);
  }
});

test('a heading at the top that labels a name, a roll or an ID loses its value', () => {
  const out = redact('// Name: Tanvir Hasan\n// Roll: 2203002\nStudent ID - 2203002\nconst total = 2203002;');
  assert.equal(out.split('\n')[0], `// Name: ${REMOVED}`);
  assert.equal(out.split('\n')[1], `// Roll: ${REMOVED}`);
  assert.equal(out.split('\n')[2], `Student ID - ${REMOVED}`);
});

test('a heading on the same line as the answer costs only the name', () => {
  const out = redact('Name: Tanvir Hasan, roll 2203002. I wrote add, done and delete as three functions.');
  assert.equal(out, `Name: ${REMOVED}, roll ${REMOVED}. I wrote add, done and delete as three functions.`);
  assert.equal(redact('Thanks to my friend (Roll no: 2304003) for testing.'), `Thanks to my friend (Roll no: ${REMOVED}) for testing.`);
});

test('the work itself is left alone', () => {
  const code = 'const MOD = 1000000007;\nfor (let i = 0; i < 100000; i++) { todo.name = "milk"; }';
  assert.equal(redact(code, ayesha), code);
  // A roll inside a longer number is not that roll.
  assert.equal(redact('id 122030019', ayesha), 'id 122030019');
});

test('input built to stall a pattern costs nothing', () => {
  const started = performance.now();
  for (const hostile of [
    ' '.repeat(40_000) + 'x',
    'roll' + ' '.repeat(40_000),
    '// name' + ' '.repeat(40_000) + ':',
    'a'.repeat(40_000),
    'a.'.repeat(20_000) + '@',
    '0 1'.repeat(13_000),
  ]) {
    redact(hostile, ['Ayesha Rahman', '2203001']);
  }
  assert.ok(performance.now() - started < 1000, `took ${performance.now() - started} ms`);
});
