import assert from 'node:assert/strict';
import { test } from 'node:test';

import { readFeedback, writeFeedback } from './feedback.ts';

const items = [
  { label: 'Works on a phone', points: 20, max: 30, comment: 'You used a media query.\nCheck 375px too.' },
  { label: 'Clean CSS', points: 30, max: 30, comment: 'Consistent.' },
];

test('feedback written per criterion is read back the same', () => {
  const read = readFeedback(writeFeedback(items, 'Test at 375px.'));
  assert.equal(read.plain, '');
  assert.equal(read.nextStep, 'Test at 375px.');
  assert.deepEqual(read.items[0], {
    label: 'Works on a phone',
    points: 20,
    max: 30,
    comment: 'You used a media query. Check 375px too.',
  });
  assert.equal(read.items.length, 2);
});

test('feedback in any other form is shown as it is', () => {
  const seed = 'Good use of semantic elements and a working phone layout.';
  assert.deepEqual(readFeedback(seed), { items: [], nextStep: '', plain: seed });
  assert.equal(readFeedback('[20/30] A\nok\n\nSomething else entirely').items.length, 0);
});
