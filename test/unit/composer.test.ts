import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { findComposerRoot, loadComposerProject, resolvePsr4Class, resolvePsr4Namespace } from '../../src/composer/project.js';

describe('Composer project discovery', () => {
  it('loads platform and multi-directory PSR-4 mappings', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-composer-'));
    await mkdir(join(root, 'src', 'Feature'), { recursive: true });
    await writeFile(join(root, 'composer.json'), JSON.stringify({
      require: { php: '^7.2 || ^8.1' },
      config: { platform: { php: '8.1.12' } },
      autoload: { 'psr-4': { 'App\\': ['src/', 'generated/'] } },
      'autoload-dev': { 'psr-4': { 'Tests\\': 'tests/' } },
    }));
    expect(await findComposerRoot(join(root, 'src', 'Feature'), root)).toBe(root);
    const project = await loadComposerProject(root, true);
    expect(project?.platformPhp).toBe('8.1.12');
    expect(project?.requiredPhp).toBe('^7.2 || ^8.1');
    expect(project?.psr4).toHaveLength(2);
    expect(project?.psr4[0]?.directories).toHaveLength(2);
  });

  it('resolves imported classes through the most specific PSR-4 mappings', () => {
    expect(resolvePsr4Class('App\\Feature\\Service', [
      { prefix: 'App\\', directories: ['/project/src'], development: false },
      { prefix: 'App\\Feature\\', directories: ['/project/features'], development: false },
    ])).toEqual([
      '/project/features/Service.php',
      '/project/src/Feature/Service.php',
    ]);
  });

  it('derives the namespace after moving a PHP file within a PSR-4 tree', () => {
    const mappings = [{ prefix: 'App\\', directories: ['/project/src'], development: false }];
    expect(resolvePsr4Namespace('/project/src/Domain/Billing/Invoice.php', mappings)).toBe('App\\Domain\\Billing');
    expect(resolvePsr4Namespace('/project/src/Invoice.php', mappings)).toBe('App');
    expect(resolvePsr4Namespace('/project/other/Invoice.php', mappings)).toBeUndefined();
  });
});
