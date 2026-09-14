import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { allAutoloadPaths, allPsr4Mappings, discoverComposerRoots, isAutoloadPathExcluded, loadComposerProject, resolvePsr4Namespaces } from '../src/index.js';
describe('Composer dependency discovery', () => {
  let root: string | undefined;
  afterEach(async () => { if (root) await rm(root, { recursive: true, force: true }); });
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
