import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { allAutoloadPaths, allPsr4Mappings, discoverComposerRoots, isAutoloadPathExcluded, loadComposerProject, resolvePsr4Namespaces } from '../src/index.js';
describe('Composer dependency discovery', () => {
  let root: string | undefined;
  afterEach(async () => { if (root) await rm(root, { recursive: true, force: true }); });
  it('records the exact metadata consumed with custom vendor and installed package paths', async () => {
    root = await mkdtemp(join(tmpdir(), 'php-companion-project-inputs-'));
    await mkdir(join(root, 'deps', 'composer'), { recursive: true }); await mkdir(join(root, 'local'), { recursive: true });
    const inputs = new Map([
      [join(root, 'composer.json'), JSON.stringify({ config: { 'vendor-dir': 'deps' }, autoload: { 'psr-4': { 'App\\': 'src/' } } })],
      [join(root, 'composer.lock'), JSON.stringify({ packages: [{ name: 'local/package' }] })],
      [join(root, 'deps', 'composer', 'installed.json'), JSON.stringify({ packages: [{ name: 'local/package', install_path: '../../local' }] })],
      [join(root, 'local', 'composer.json'), JSON.stringify({ description: 'evidence-content-marker', autoload: { 'psr-4': { 'Local\\': 'src/' } } })],
    ]);
    for (const [path, source] of inputs) await writeFile(path, source);
    const project = (await loadComposerProject(root))!;
    expect(project.dependencies[0]?.root).toBe(join(root, 'local'));
    expect(project.inputEvidence).toEqual({ complete: true, reads: [...inputs].map(([path, source]) => ({
      kind: 'source', path, hash: createHash('sha256').update(source).digest('hex'),
    })) });
    expect(JSON.stringify(project.inputEvidence)).not.toContain('evidence-content-marker');
    const path = join(root, 'composer.json'); await writeFile(path, `${inputs.get(path)}\n`);
    const refreshed = (await loadComposerProject(root))!;
    expect(refreshed.psr4).toEqual(project.psr4);
    expect(refreshed.inputEvidence).not.toEqual(project.inputEvidence);
  });
  it('distinguishes missing metadata from malformed JSON with readable source', async () => {
    root = await mkdtemp(join(tmpdir(), 'php-companion-project-missing-inputs-'));
    await writeFile(join(root, 'composer.json'), '{}');
    const first = (await loadComposerProject(root))!;
    expect(first.inputEvidence).toMatchObject({ complete: true, reads: expect.arrayContaining([
      { kind: 'missing', path: join(root, 'composer.lock') },
      { kind: 'missing', path: join(root, 'vendor', 'composer', 'installed.json') },
    ]) });
    await writeFile(join(root, 'composer.lock'), '{malformed');
    const second = (await loadComposerProject(root))!;
    expect(second.dependencies).toEqual([]);
    expect(second.inputEvidence).toMatchObject({ complete: true, reads: expect.arrayContaining([
      { kind: 'source', path: join(root, 'composer.lock'), hash: createHash('sha256').update('{malformed').digest('hex') },
    ]) });
  });
  it('marks metadata I/O errors incomplete while retaining existing Composer fallback behavior', async () => {
    root = await mkdtemp(join(tmpdir(), 'php-companion-project-input-error-'));
    await writeFile(join(root, 'composer.json'), '{}');
    await writeFile(join(root, 'composer.lock'), JSON.stringify({ packages: [{ name: 'local/package', autoload: { 'psr-4': { 'Fallback\\': 'lib/' } } }] }));
    await mkdir(join(root, 'vendor', 'local', 'package', 'composer.json'), { recursive: true });
    const project = (await loadComposerProject(root))!;
    expect(project.dependencies[0]?.psr4[0]?.prefix).toBe('Fallback\\');
    expect(project.inputEvidence?.complete).toBe(false);
  });
  it('reads root and installed dependency mappings without executing Composer PHP', async () => {
    root = await mkdtemp(join(tmpdir(), 'php-companion-project-'));
    await mkdir(join(root, 'vendor', 'vendor', 'package'), { recursive: true });
    await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
    await writeFile(join(root, 'composer.lock'), JSON.stringify({ packages: [{ name: 'vendor/package', autoload: { 'psr-4': { 'Vendor\\Package\\': 'lib/' } } }] }));
    await writeFile(join(root, 'vendor', 'vendor', 'package', 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'Vendor\\Package\\': 'src/' } } }));
    const project = await loadComposerProject(root);
    expect(project?.dependencies).toMatchObject([{ name: 'vendor/package', psr4: [{ prefix: 'Vendor\\Package\\' }] }]);
    expect(allPsr4Mappings(project!).map((item) => item.prefix)).toEqual(['App\\', 'Vendor\\Package\\']);
  });
  it('collects PSR-0, classmap and files autoload paths statically', async () => {
    root = await mkdtemp(join(tmpdir(), 'php-companion-project-paths-'));
    await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-0': { 'Legacy_': 'legacy/' }, classmap: ['models/'], files: ['bootstrap.php'], 'exclude-from-classmap': ['/models/generated/'] } }));
    const project = await loadComposerProject(root);
    expect(project).toMatchObject({ psr0: [{ prefix: 'Legacy_' }], excludeFromClassmap: ['/models/generated/'] });
    expect(allAutoloadPaths(project!)).toEqual([join(root, 'legacy'), join(root, 'models'), join(root, 'bootstrap.php')]);
  });
  it('reads only explicitly hidden Composer platform extensions as unavailable', async () => {
    root = await mkdtemp(join(tmpdir(), 'php-companion-project-platform-'));
    await writeFile(join(root, 'composer.json'), JSON.stringify({
      require: { php: '^8.2', 'ext-json': '*' },
      config: { platform: { php: '8.2.12', 'ext-mbstring': false, 'ext-pdo': '8.2.12' } },
    }));
    await writeFile(join(root, 'composer.lock'), JSON.stringify({ 'platform-overrides': { php: '8.2.12', 'ext-dom': false, 'ext-mbstring': false } }));
    expect(await loadComposerProject(root)).toMatchObject({
      disabledExtensions: ['dom', 'mbstring'],
      platformPhp: '8.2.12',
      lockPlatformPhp: '8.2.12',
    });
  });
  it('matches rooted Composer classmap exclusions with single and recursive wildcards', async () => {
    root = await mkdtemp(join(tmpdir(), 'php-companion-project-excludes-'));
    await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' }, 'exclude-from-classmap': ['/src/Tests/', '/src/generated/*/Legacy.php', '/src/cache/**'] } }));
    const project = (await loadComposerProject(root))!;
    expect(isAutoloadPathExcluded(project, join(root, 'src', 'Tests', 'Fixture.php'))).toBe(true);
    expect(isAutoloadPathExcluded(project, join(root, 'src', 'generated', 'v1', 'Legacy.php'))).toBe(true);
    expect(isAutoloadPathExcluded(project, join(root, 'src', 'generated', 'v1', 'nested', 'Legacy.php'))).toBe(false);
    expect(isAutoloadPathExcluded(project, join(root, 'src', 'cache', 'deep', 'Cached.php'))).toBe(true);
    expect(isAutoloadPathExcluded(project, join(root, 'src', 'Testsuite', 'Fixture.php'))).toBe(false);
    expect(isAutoloadPathExcluded(project, join(`${root}-sibling`, 'src', 'Tests', 'Fixture.php'))).toBe(false);
  });
  it('checks dependency exclusions only inside the owning package root', async () => {
    root = await mkdtemp(join(tmpdir(), 'php-companion-project-dependency-excludes-'));
    const dependency = join(root, 'vendor', 'vendor', 'package');
    await mkdir(dependency, { recursive: true });
    await writeFile(join(root, 'composer.json'), '{}');
    await writeFile(join(root, 'composer.lock'), JSON.stringify({ packages: [{
      name: 'vendor/package', autoload: { 'psr-4': { 'Vendor\\Package\\': 'src/' }, 'exclude-from-classmap': ['/src/Internal/'] },
    }] }));
    await writeFile(join(dependency, 'composer.json'), JSON.stringify({
      autoload: { 'psr-4': { 'Vendor\\Package\\': 'src/' }, 'exclude-from-classmap': ['/src/Internal/'] },
    }));
    const project = (await loadComposerProject(root))!;
    expect(isAutoloadPathExcluded(project, join(dependency, 'src', 'Internal', 'Hidden.php'))).toBe(true);
    expect(isAutoloadPathExcluded(project, join(root, 'src', 'Internal', 'Visible.php'))).toBe(false);
  });
  it('returns every namespace candidate for overlapping PSR-4 mappings', () => {
    const directory = join('/workspace', 'src'); const file = join(directory, 'Model', 'User.php');
    expect(resolvePsr4Namespaces(file, [
      { prefix: 'App\\', directories: [directory], development: false },
      { prefix: 'Domain\\', directories: [directory], development: false },
    ])).toEqual(['App\\Model', 'Domain\\Model']);
  });
  it('uses Composer installed paths for symlinked path repositories', async () => {
    root = await mkdtemp(join(tmpdir(), 'php-companion-project-installed-'));
    await mkdir(join(root, 'vendor', 'composer'), { recursive: true }); await mkdir(join(root, 'packages', 'local'), { recursive: true });
    await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
    await writeFile(join(root, 'composer.lock'), JSON.stringify({ packages: [{ name: 'local/package', autoload: { 'psr-4': { 'Fallback\\': 'src/' } } }] }));
    await writeFile(join(root, 'vendor', 'composer', 'installed.json'), JSON.stringify({ packages: [{ name: 'local/package', install_path: '../../packages/local' }] }));
    await writeFile(join(root, 'packages', 'local', 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'Local\\Package\\': 'lib/' } } }));
    const project = await loadComposerProject(root);
    expect(project?.dependencies).toMatchObject([{ name: 'local/package', root: join(root, 'packages', 'local'), psr4: [{ prefix: 'Local\\Package\\', directories: [join(root, 'packages', 'local', 'lib')] }] }]);
  });
  it('discovers nested Composer projects without descending into vendor', async () => {
    root = await mkdtemp(join(tmpdir(), 'php-companion-project-nested-'));
    await mkdir(join(root, 'apps', 'api'), { recursive: true });
    await mkdir(join(root, 'vendor', 'ignored'), { recursive: true });
    await writeFile(join(root, 'composer.json'), '{}');
    await writeFile(join(root, 'apps', 'api', 'composer.json'), '{}');
    await writeFile(join(root, 'vendor', 'ignored', 'composer.json'), '{}');
    expect((await discoverComposerRoots(root)).roots).toEqual([root, join(root, 'apps', 'api')]);
    expect(await discoverComposerRoots(root, { shouldContinue: () => false })).toMatchObject({ roots: [], complete: false });
  });
});
