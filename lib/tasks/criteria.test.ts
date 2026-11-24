import assert from 'node:assert/strict';
import { test } from 'node:test';

import { criteriaToMark, parseCriteria, scoreFrom, totalPoints } from './criteria.ts';

test('criteria written as prose with points become a list', () => {
  const criteria = parseCriteria(
    'Semantic elements (header, main, section, nav) used correctly: 40. Layout works on a phone: 30. Clean, consistent CSS: 30.',
  );
  assert.deepEqual(criteria, [
    { label: 'Semantic elements (header, main, section, nav) used correctly', points: 40 },
    { label: 'Layout works on a phone', points: 30 },
    { label: 'Clean, consistent CSS', points: 30 },
  ]);
  assert.equal(totalPoints(criteria), 100);
});

test('a full stop or a colon inside a criterion does not split it', () => {
  const criteria = parseCriteria('O(n) or O(n log n) time, e.g. with a map: 40 points\n- Handles duplicates: 20%');
  assert.deepEqual(criteria.map((c) => c.points), [40, 20]);
  assert.equal(criteria[0].label, 'O(n) or O(n log n) time, e.g. with a map');
  assert.equal(criteria[1].label, 'Handles duplicates');
});

test('criteria with no points are one criterion worth everything', () => {
  assert.deepEqual(parseCriteria('Be clear and correct.'), []);
  assert.deepEqual(criteriaToMark('Be clear\nand correct.'), [{ label: 'Be clear and correct.', points: 100 }]);
});

test('the score is added up here, with every criterion held to its range', () => {
  const criteria = [
    { label: 'a', points: 40 },
    { label: 'b', points: 20 },
  ];
  assert.equal(scoreFrom(criteria, [40, 20]), 100);
  assert.equal(scoreFrom(criteria, [30, 0]), 50);
  // A model that answers 1000 for one criterion gains nothing by it.
  assert.equal(scoreFrom(criteria, [1000, -5]), 67);
  assert.equal(scoreFrom(criteria, []), 0);
  assert.equal(scoreFrom([], [10]), 0);
});
