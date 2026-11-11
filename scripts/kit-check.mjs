// The Gate's last step: fails if any file the Starter kit shipped was edited
// or deleted. Adding new files is fine.
//
//   node scripts/kit-check.mjs           check against kit-manifest.json
//   node scripts/kit-check.mjs --write   organiser only: regenerate the manifest
//                                        from the files git tracks
//
// Files an Entry is expected to change are not in the manifest.

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const MANIFEST = 'kit-manifest.json';
const OPEN = new Set([
  MANIFEST,
  'README.md',
  'DECISIONS.md',
  'FAQ.md',
  'package.json',
  'package-lock.json',
  '.gitignore',
  'next-env.d.ts',
]);

const hash = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');

if (process.argv.includes('--write')) {
  const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
    .split('\0')
    .filter((path) => path && !OPEN.has(path))
    .sort();
  const manifest = Object.fromEntries(files.map((path) => [path, hash(path)]));
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`kit-check: wrote ${files.length} files to ${MANIFEST}`);
  process.exit(0);
}

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
const broken = Object.entries(manifest).flatMap(([path, sum]) =>
  !existsSync(path) ? [`deleted  ${path}`] : hash(path) !== sum ? [`edited   ${path}`] : [],
);

if (broken.length > 0) {
  console.error('kit-check: these Starter kit files must not change:');
  for (const line of broken) console.error(`  ${line}`);
  console.error('Undo the change and put your code in your own files (BRIEF.md, "Rules of the codebase").');
  process.exit(1);
}
console.log(`kit-check: ${Object.keys(manifest).length} kit files unchanged`);
