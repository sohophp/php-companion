import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

interface ExtensionManifest {
  name: string;
  displayName: string;
  version: string;
  publisher: string;
  main?: string;
  activationEvents?: string[];
  contributes?: Record<string, unknown>;
  extensionPack?: string[];
  icon?: string;
}

const openSourceExtensions = [
  'sohophp.php-companion',
  'sohophp.twig-plus',
  'xdebug.php-debug',
  'recca0120.vscode-phpunit',
  'junstyle.php-cs-fixer',
  'EditorConfig.EditorConfig',
];

async function manifest(path: string): Promise<ExtensionManifest> {
  return JSON.parse(await readFile(resolve(path), 'utf8')) as ExtensionManifest;
}

describe('PHP Companion manifests', () => {
  it('publishes every extension as version 0.4.0', async () => {
    for (const path of ['package.json', 'packages/php-companion-extension-pack/package.json', 'packages/php-companion-recommended-pack/package.json']) {
      const value = await manifest(path);
      expect(value.publisher).toBe('sohophp');
      expect(value.version).toBe('0.4.0');
      expect(value.icon).toBe('resources/icon.png');
    }
  });

  it('restores the core with lazy activation and contributions', async () => {
    const value = await manifest('package.json');
    expect(value.displayName).not.toContain('Paused');
    expect(value.activationEvents).toContain('onLanguage:php');
    expect(value.contributes).toBeDefined();
    expect(value.extensionPack).toEqual([]);
    expect(value.main).toBe('./dist/extension.js');
  });

  it('ships focused packs and only adds Intelephense to the recommended profile', async () => {
    const openSource = await manifest('packages/php-companion-extension-pack/package.json');
    const recommended = await manifest('packages/php-companion-recommended-pack/package.json');
    expect(openSource.extensionPack).toEqual(openSourceExtensions);
    expect(recommended.extensionPack).toEqual([
      'sohophp.php-companion',
      'sohophp.twig-plus',
      'bmewburn.vscode-intelephense-client',
      ...openSourceExtensions.slice(2),
    ]);
    expect(openSource.contributes).toBeDefined();
    expect(recommended.contributes).toEqual(openSource.contributes);
  });
});
