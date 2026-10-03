import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import process from 'node:process';
import { requirePinnedPhpstormStubs } from './phpstorm-stubs-source.mjs';
import { builtinPhpExtensionStub } from '../packages/language-spec/dist/index.js';
import { GETTEXT_FUNCTIONS } from '../packages/language-spec/dist/gettext.js';

const source = process.argv[2];
if (!source) throw new Error('Usage: node scripts/audit-phpstorm-gettext-source.mjs SOURCE');
const repository = resolve(source);
const revision = requirePinnedPhpstormStubs(repository);
// git show also works for a sparse checkout of the pinned upstream revision.
const upstream = execFileSync('git', ['-C', repository, 'show', 'HEAD:gettext/gettext.php'], { encoding: 'utf8' });
const names = [...upstream.matchAll(/^function\s+([\w]+)\s*\(/gm)].map((match) => match[1]);
const sorted = (values) => [...values].sort();
if (names.length !== 10 || new Set(names).size !== 10
  || JSON.stringify(sorted(names)) !== JSON.stringify(sorted(GETTEXT_FUNCTIONS))) {
  throw new Error(`gettext function catalog differs from ${revision}; review upstream before changing declarations`);
}
for (const version of ['7.2', '8.5']) {
  const declarations = [...builtinPhpExtensionStub(version, 'gettext').matchAll(/\bfunction\s+([\w]+)\s*\(/g)]
    .map((match) => match[1]);
  if (JSON.stringify(sorted(declarations)) !== JSON.stringify(sorted(names)))
    throw new Error(`gettext ${version} declarations do not match pinned upstream`);
}
process.stdout.write(`gettext: ${names.length} functions from ${revision}; PHP 7.2/8.5 declarations match\n`);
