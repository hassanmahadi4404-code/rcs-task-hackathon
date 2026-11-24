import assert from 'node:assert/strict';
import { test } from 'node:test';

import { fileKind, fileNameOf, formatBytes, isUuid, mediaTypeOf, safeFileName, submissionPath } from './files.ts';

test('a file is text, a document an AI can open, or something for the Mentor', () => {
  assert.equal(fileKind('index.HTML'), 'text');
  assert.equal(fileKind('solution.cpp'), 'text');
  assert.equal(fileKind('report.pdf'), 'document');
  assert.equal(fileKind('shot.jpeg'), 'document');
  assert.equal(fileKind('project.zip'), 'other');
  assert.equal(fileKind('README'), 'other');
});

test('the media type comes from the extension, not from what the browser said', () => {
  assert.equal(mediaTypeOf('a.py'), 'text/plain');
  assert.equal(mediaTypeOf('a.jpg'), 'image/jpeg');
  assert.equal(mediaTypeOf('a.exe'), 'application/octet-stream');
});

test('a file name is made safe for a Storage path and keeps its extension', () => {
  assert.equal(safeFileName('my page (final).html'), 'my-page-final.html');
  assert.equal(safeFileName('../../etc/passwd'), 'etc-passwd');
  assert.equal(safeFileName('আমার কাজ.pdf'), 'file.pdf');
  assert.ok(safeFileName(`${'a'.repeat(300)}.css`).length <= 84);
});

test('the Storage path is task, member, attempt, name', () => {
  const path = submissionPath('t', 'm', 'k', 'To do.js');
  assert.equal(path, 't/m/k/To-do.js');
  assert.equal(fileNameOf(path), 'To-do.js');
});

test('sizes and ids', () => {
  assert.equal(formatBytes(900), '900 B');
  assert.equal(formatBytes(4096), '4 KB');
  assert.equal(formatBytes(4.2 * 1024 * 1024), '4.2 MB');
  assert.ok(isUuid('3f2b8c1e-5a44-4c1b-9a51-0d6f1e2a7b90'));
  assert.ok(!isUuid('3f2b8c1e'));
  assert.ok(!isUuid(null));
});
