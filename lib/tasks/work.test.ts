import assert from 'node:assert/strict';
import { test } from 'node:test';

import { foldWork } from './work.ts';

test('a short answer is shown whole', () => {
  const text = 'I used a hash map.\nIt is O(n).';
  assert.deepEqual(foldWork(text), { head: text, rest: '', restLines: 0 });
  assert.deepEqual(foldWork(''), { head: '', rest: '', restLines: 0 });
});

test('a long answer is folded at a line, and nothing is lost or repeated', () => {
  const lines = Array.from({ length: 60 }, (_, i) => `line ${i + 1}`);
  const text = lines.join('\n');
  const { head, rest, restLines } = foldWork(text);
  assert.equal(head.split('\n').length, 24);
  assert.equal(restLines, 36);
  assert.equal(`${head}\n${rest}`, text);
});

test('a few very long lines are folded too', () => {
  const text = `${'word '.repeat(500)}\nsecond line`;
  const { head, rest } = foldWork(text);
  assert.ok(head.length <= 1800);
  assert.ok(rest.length > 0);
  // Cut at a space, so no word is split.
  assert.ok(head.endsWith('word'));
  assert.equal((head + rest).replace(/\s/g, ''), text.replace(/\s/g, ''));
});

test('one unbroken run of characters is still cut', () => {
  const { head, rest } = foldWork('x'.repeat(5000));
  assert.equal(head.length, 1800);
  assert.equal(rest.length, 3200);
});
