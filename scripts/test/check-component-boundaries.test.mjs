import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, symlink, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import process from 'node:process';
import { test } from 'node:test';
import { auditComponentBoundaries } from '../check-component-boundaries.mjs';

async function fixture(t, packages) {
  const root = await mkdtemp(join(tmpdir(), 'sophp-component-boundaries-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'packages'));
  for (const [directory, definition] of Object.entries(packages)) {
    const path = join(root, 'packages', directory);
    await mkdir(join(path, 'src'), { recursive: true });
    await writeFile(join(path, 'package.json'), JSON.stringify({ name: '@php-companion/' + directory, exports: { '.': './dist/index.js' }, ...definition.manifest }));
    await writeFile(join(path, 'src/index.ts'), definition.source ?? 'export const value = 1;');
  }
  return root;
}

test('accepts public imports, exports, type imports, dynamic literals, and local re-exports', async t => {
  const root = await fixture(t, {
    parser: { manifest: { exports: { '.': './dist/index.js', './types': './dist/types.js', './syntax/*': './dist/syntax/*.js' } } },
    'semantic-provider': {},
    index: { manifest: { dependencies: { '@php-companion/semantic-provider': 'workspace:^' } }, source: "import '@php-companion/semantic-provider';" },
    semantic: { manifest: { dependencies: { '@php-companion/parser': 'workspace:^' }, devDependencies: { vscode: '*', '@php-companion/framework-symfony': 'workspace:^' } }, source: `
      import { value } from '@php-companion/parser';
      export { value } from '@php-companion/parser/types';
      export { value as syntax } from '@php-companion/parser/syntax/node';
      type Parser = import('@php-companion/parser').Parser;
      const lazy = import('@php-companion/parser');
      const required = require('@php-companion/parser');
      export { value };` },
  });
  await mkdir(join(root, 'packages', 'empty-leftover'));
  const result = await auditComponentBoundaries(root);
  assert.equal(result.componentCount, 4); assert.equal(result.importCount, 7); assert.deepEqual(result.violations, []);
  assert.equal(result.sourceFileCount, 4); assert.ok(Object.keys(result.inputs).every(path => !path.includes('\\')));
});

const negatives = [
  ['undeclared import', 'source-dependency-must-be-declared', { semantic: { source: "import '@php-companion/parser';" }, parser: {} }],
  ['private subpath', 'use-public-component-exports', { semantic: { manifest: { dependencies: { '@php-companion/parser': 'workspace:^' } }, source: "import '@php-companion/parser/src/internal';" }, parser: {} }],
  ['unexported package root', 'use-public-component-exports', { semantic: { manifest: { dependencies: { '@php-companion/parser': 'workspace:^' } }, source: "import '@php-companion/parser';" }, parser: { manifest: { exports: { './types': './dist/types.js' } } } }],
  ['relative package escape', 'no-cross-package-relative-imports', { semantic: { source: "import '../../parser/src/index.js';" }, parser: {} }],
  ['wrong workspace range', 'declared-component-dependency', { semantic: { manifest: { dependencies: { '@php-companion/parser': 'workspace:*' } } }, parser: {} }],
  ['missing component', 'declared-component-dependency', { semantic: { manifest: { dependencies: { '@php-companion/missing': 'workspace:^' } } } }],
  ['manifest cycle', 'acyclic-component-dependencies', { parser: { manifest: { dependencies: { '@php-companion/index': 'workspace:^' } } }, index: { manifest: { dependencies: { '@php-companion/parser': 'workspace:^' } } } }],
  ['semantic framework dependency', 'semantic-does-not-depend-on-framework-or-adapter', { semantic: { manifest: { dependencies: { '@php-companion/framework-symfony': 'workspace:^' } }, source: "import '@php-companion/framework-symfony';" }, 'framework-symfony': {} }],
  ['manifest-only semantic framework dependency', 'semantic-does-not-depend-on-framework-or-adapter', { semantic: { manifest: { dependencies: { '@php-companion/framework-symfony': 'workspace:^' } } }, 'framework-symfony': {} }],
  ['manifest-only index framework dependency', 'index-does-not-depend-on-semantic-or-adapter', { index: { manifest: { dependencies: { '@php-companion/framework-symfony': 'workspace:^' } } }, 'framework-symfony': {} }],
  ['manifest-only editor dependency', 'components-do-not-import-vscode-adapter', { parser: { manifest: { dependencies: { vscode: '*' } } } }],
  ['index semantic dependency', 'index-does-not-depend-on-semantic-or-adapter', { index: { manifest: { dependencies: { '@php-companion/semantic': 'workspace:^' } }, source: "import '@php-companion/semantic';" }, semantic: {} }],
  ['editor dependency', 'components-do-not-import-vscode-adapter', { parser: { manifest: { dependencies: { vscode: '*' } }, source: "import 'vscode';" } }],
  ['testkit runtime dependency', 'testkit-is-not-product-runtime', { semantic: { manifest: { dependencies: { '@php-companion/testkit': 'workspace:^' } } }, testkit: {} }],
  ['type system IO', 'type-system-has-no-direct-io', { 'type-system': { source: "import 'node:fs/promises';" } }],
  ['computed import', 'module-specifier-must-be-static', { parser: { source: 'import(target);' } }],
  ['computed require', 'module-specifier-must-be-static', { parser: { source: 'require(target);' } }],
  ['duplicate component identity', 'unique-component-name', { parser: {}, duplicate: { manifest: { name: '@php-companion/parser' } } }],
];
for (const [name, rule, packages] of negatives) test(`rejects ${name}`, async t => {
  const root = await fixture(t, packages), result = await auditComponentBoundaries(root);
  assert.ok(result.violations.some(violation => violation.rule === rule), JSON.stringify(result.violations));
});

for (const valid of [true, false]) test(`CLI reports and exits ${valid ? 'zero for valid imports' : 'nonzero for a violation'}`, async t => {
  const root = await fixture(t, { parser: { source: valid ? 'export const value = 1;' : "import '@php-companion/missing';" } });
  await mkdir(join(root, 'scripts')); await mkdir(join(root, 'node_modules'));
  const typescript = dirname(dirname(fileURLToPath(import.meta.resolve('typescript'))));
  await symlink(typescript, join(root, 'node_modules/typescript'), process.platform === 'win32' ? 'junction' : 'dir');
  const script = join(root, 'scripts/check-component-boundaries.mjs'), output = join(root, 'result.json');
  await writeFile(script, await readFile(new URL('../check-component-boundaries.mjs', import.meta.url)));
  const child = spawnSync(process.execPath, [script, output], { encoding: 'utf8', timeout: 10000 });
  assert.equal(child.error, undefined); assert.equal(child.signal, null); assert.equal(child.status, valid ? 0 : 1, child.stderr);
  const report = JSON.parse(await readFile(output, 'utf8'));
  assert.equal(report.violations.length, valid ? 0 : 1);
  assert.equal(JSON.parse(child.stdout.trim()).violations, report.violations.length);
});
