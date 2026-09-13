import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const root = resolve(import.meta.dirname, '..');
const temporary = await mkdtemp(join(tmpdir(), 'php-companion-pack-'));
const tarballs = join(temporary, 'tarballs');
const consumer = join(temporary, 'consumer');
const changesetStatus = join(temporary, 'changeset-status.json');
const packageDirectories = ['packages/language-spec', 'packages/phpdoc', 'packages/parser', 'packages/project', 'packages/index', 'packages/type-system', 'packages/interop', 'packages/semantic-provider', 'packages/semantic-provider-host', 'packages/framework-symfony', 'packages/framework-doctrine', 'packages/semantic', 'packages/refactor', 'packages/language-server', 'packages/testkit'];

const manifests = new Map();
for (const packageDirectory of packageDirectories) {
  const manifest = JSON.parse(await readFile(join(root, packageDirectory, 'package.json'), 'utf8'));
  manifests.set(manifest.name, manifest);
  if (manifest.license !== 'MIT') throw new Error(`${manifest.name} must declare its MIT license.`);
  if (manifest.engines?.node !== '>=20') throw new Error(`${manifest.name} must publish its Node.js runtime requirement.`);
  for (const requiredFile of ['dist', 'README.md', 'LICENSE', 'CHANGELOG.md']) {
    if (!manifest.files?.includes(requiredFile)) throw new Error(`${manifest.name} does not publish ${requiredFile}.`);
  }
  if (!manifest.exports?.['.']?.types || !manifest.exports?.['.']?.import) throw new Error(`${manifest.name} has no typed ESM root export.`);
  for (const [dependency, range] of Object.entries(manifest.dependencies ?? {})) {
    if (dependency.startsWith('@php-companion/') && range !== 'workspace:^') throw new Error(`${manifest.name} must use workspace:^ for ${dependency}.`);
  }
}
const visiting = new Set(); const visited = new Set();
const visit = (name) => {
  if (visiting.has(name)) throw new Error(`Component dependency cycle detected at ${name}.`);
  if (visited.has(name)) return;
  visiting.add(name);
  for (const dependency of Object.keys(manifests.get(name)?.dependencies ?? {})) if (manifests.has(dependency)) visit(dependency);
  visiting.delete(name); visited.add(name);
};
for (const name of manifests.keys()) visit(name);

try {
  await run('pnpm', ['exec', 'changeset', 'status', '--since', 'origin/main', '--output', changesetStatus], { cwd: root, shell: process.platform === 'win32' });
  const releasePlan = JSON.parse(await readFile(changesetStatus, 'utf8'));
  if (!Array.isArray(releasePlan.changesets) || !Array.isArray(releasePlan.releases)) throw new Error('Changesets returned an invalid release plan.');
  await mkdir(tarballs);
  await mkdir(consumer);
  for (const packageDirectory of packageDirectories) {
    await run('pnpm', ['pack', '--pack-destination', tarballs], { cwd: join(root, packageDirectory), shell: process.platform === 'win32' });
  }
  const archives = (await readdir(tarballs)).filter((name) => name.endsWith('.tgz')).map((name) => join(tarballs, name));
  if (archives.length !== 15) throw new Error(`Expected fifteen package archives, found ${archives.length}.`);
  await writeFile(join(consumer, 'package.json'), JSON.stringify({ private: true, type: 'module' }, null, 2));
  await run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', ...archives], { cwd: consumer, shell: process.platform === 'win32' });
  for (const [name] of manifests) {
    const installedRoot = join(consumer, 'node_modules', ...name.split('/'));
    const installed = JSON.parse(await readFile(join(installedRoot, 'package.json'), 'utf8'));
    await Promise.all(['README.md', 'LICENSE', 'CHANGELOG.md'].map((file) => readFile(join(installedRoot, file), 'utf8')));
    for (const [dependency, range] of Object.entries(installed.dependencies ?? {})) {
      if (dependency.startsWith('@php-companion/') && (typeof range !== 'string' || !range.startsWith('^') || range.includes('workspace:'))) {
        throw new Error(`${name} packed an invalid compatibility range for ${dependency}: ${range}`);
      }
    }
  }
  await writeFile(join(consumer, 'smoke.mjs'), `
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { PhpSyntaxParser } from '@php-companion/parser';
import { compatibility, named } from '@php-companion/type-system';
import { loadComposerProject } from '@php-companion/project';
import { SemanticWorkspace } from '@php-companion/semantic';
import { parsePhpDoc } from '@php-companion/phpdoc';
import { indexComposerSources } from '@php-companion/index';
import { builtinPhpStub } from '@php-companion/language-spec';
import { encodeLspMessage, LspMessageDecoder, markedSource } from '@php-companion/testkit';
import { createEditPlan } from '@php-companion/refactor';
import { INTEROP_PROTOCOL_VERSION, negotiateInterop } from '@php-companion/interop';
import { isSemanticFactsContribution, semanticFacts } from '@php-companion/semantic-provider';
import { runSemanticProvider } from '@php-companion/semantic-provider-host';
import { analyzeSymfonyControllerContexts } from '@php-companion/framework-symfony';
import { analyzeDoctrineDocument } from '@php-companion/framework-doctrine';

const parser = await PhpSyntaxParser.createDefault();
const parsed = parser.parse('<?php namespace Consumer; class Installed {}');
if (parsed.declarations[0]?.fqcn !== 'Consumer\\\\Installed') throw new Error('Parser tarball returned the wrong declaration.');
parsed.tree.delete();
parser.dispose();
if (compatibility(named('App\\\\User'), named('App\\\\User')) !== 'yes') throw new Error('Type-system tarball returned the wrong compatibility.');
if (typeof loadComposerProject !== 'function' || typeof SemanticWorkspace !== 'function') throw new Error('Project or semantic tarball exports are unavailable.');
if (parsePhpDoc('/** @return App\\\\User */').tags[0]?.type?.kind !== 'name') throw new Error('PHPDoc tarball returned the wrong type.');
if (typeof indexComposerSources !== 'function') throw new Error('Index tarball export is unavailable.');
if (!builtinPhpStub('8.5').includes('DateTimeImmutable')) throw new Error('Language-spec tarball returned no core stub.');
if (markedSource('<?php /*@query*/run();').offset('query') !== 6) throw new Error('Testkit tarball returned the wrong marker offset.');
if (createEditPlan('smoke', [{ uri: 'file:///A.php', version: 1, length: 1 }], [{ uri: 'file:///A.php', start: 0, end: 1, newText: '' }]).textEdits[0]?.expectedVersion !== 1) throw new Error('Refactor tarball returned an invalid edit plan.');
const hello = { protocolVersion: INTEROP_PROTOCOL_VERSION, providerId: 'consumer', projectId: 'project', snapshotVersion: '1', capabilities: ['controller-contexts'] };
if (!negotiateInterop(hello, hello, ['controller-contexts']).compatible) throw new Error('Interop tarball could not negotiate a compatible protocol.');
if (!isSemanticFactsContribution(semanticFacts('consumer', '1'))) throw new Error('Semantic provider tarball rejected a valid contribution.');
if (typeof runSemanticProvider !== 'function') throw new Error('Semantic provider host tarball export is unavailable.');
const frameworkParser = await PhpSyntaxParser.createDefault();
const frameworkContexts = analyzeSymfonyControllerContexts(frameworkParser, { uri: 'file:///Controller.php', snapshotVersion: '1', source: "<?php class Controller { function show(User $user) { $this->render('page.html.twig', ['user' => $user]); } }" });
frameworkParser.dispose();
if (frameworkContexts[0]?.template !== 'page.html.twig') throw new Error('Symfony framework tarball returned no controller context.');
const doctrineParser = await PhpSyntaxParser.createDefault();
const doctrineFacts = analyzeDoctrineDocument(doctrineParser, 'file:///Entity.php', "<?php use Doctrine\\\\ORM\\\\Mapping as ORM; #[ORM\\\\Entity] class Entity {}");
doctrineParser.dispose();
if (doctrineFacts.entities[0]?.fqcn !== 'Entity') throw new Error('Doctrine framework tarball returned no entity fact.');

const serverEntry = fileURLToPath(new URL('./node_modules/@php-companion/language-server/dist/server.js', import.meta.url));
const child = spawn(process.execPath, [serverEntry, '--stdio'], { stdio: ['pipe', 'pipe', 'pipe'] });
const decoder = new LspMessageDecoder(); const pending = new Map(); let nextId = 1;
child.stdout.on('data', (chunk) => {
  for (const message of decoder.push(chunk)) {
    const response = message;
    if (typeof response?.id !== 'number') continue;
    pending.get(response.id)?.(response);
    pending.delete(response.id);
  }
});
const request = (method, params) => new Promise((resolveRequest, reject) => {
  const id = nextId++; const timer = setTimeout(() => { pending.delete(id); reject(new Error('Installed language server timed out for ' + method + '.')); }, 5000);
  pending.set(id, (message) => { clearTimeout(timer); if (message.error) reject(new Error(message.error.message)); else resolveRequest(message.result); });
  child.stdin.write(encodeLspMessage({ jsonrpc: '2.0', id, method, params }));
});
const notify = (method, params) => child.stdin.write(encodeLspMessage({ jsonrpc: '2.0', method, params }));
const initialized = await request('initialize', { processId: null, capabilities: {}, rootUri: null });
if (initialized?.capabilities?.documentSymbolProvider !== true) throw new Error('Installed language server returned unexpected capabilities.');
notify('initialized', {});
notify('textDocument/didOpen', { textDocument: { uri: 'file:///Installed.php', languageId: 'php', version: 1, text: '<?php namespace Consumer; class Installed { public function run(): void {} }' } });
const symbols = await request('textDocument/documentSymbol', { textDocument: { uri: 'file:///Installed.php' } });
if (!Array.isArray(symbols) || symbols[0]?.name !== 'Installed') throw new Error('Installed language server did not answer a real PHP document query.');
await request('shutdown', null); notify('exit');
await new Promise((resolveExit, reject) => { child.on('error', reject); child.on('exit', (code) => code === 0 ? resolveExit() : reject(new Error('Installed language server exited with ' + code + '.'))); });
`);
  await run(process.execPath, ['smoke.mjs'], { cwd: consumer });
  process.stdout.write('Verified fifteen PHP Companion component tarballs from an isolated consumer.\n');
} finally {
  await rm(temporary, { recursive: true, force: true });
}
