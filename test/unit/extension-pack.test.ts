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

async function openSourceExtensions(): Promise<string[]> {
  const entries = JSON.parse(await readFile(resolve('test/extension/open-source-profile.extensions.json'), 'utf8')) as Array<{ id: string; defaultPack?: boolean }>;
  return ['sohophp.php-companion', ...entries.filter((entry) => entry.defaultPack !== false).map((entry) => entry.id)];
}

async function manifest(path: string): Promise<ExtensionManifest> {
  return JSON.parse(await readFile(resolve(path), 'utf8')) as ExtensionManifest;
}

describe('PHP Companion manifests', () => {
  it('publishes every extension as version 0.4.5', async () => {
    for (const path of ['package.json', 'packages/php-companion-extension-pack/package.json', 'packages/php-companion-recommended-pack/package.json']) {
      const value = await manifest(path);
      expect(value.publisher).toBe('sohophp');
      expect(value.version).toBe('0.4.5');
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
    const defaults = (value.contributes as { configuration?: { properties?: Record<string, { default?: unknown }> } }).configuration?.properties;
    expect(defaults?.['phpCompanion.languageServer.enabled']?.default).toBe(true);
  });

  it('ships both focused packs without another PHP language server', async () => {
    const openSource = await manifest('packages/php-companion-extension-pack/package.json');
    const recommended = await manifest('packages/php-companion-recommended-pack/package.json');
    const extensions = await openSourceExtensions();
    expect(openSource.extensionPack).toEqual(extensions);
    expect(recommended.extensionPack).toEqual(extensions);
    expect(openSource.extensionPack).not.toContain('bmewburn.vscode-intelephense-client');
    expect(recommended.extensionPack).not.toContain('bmewburn.vscode-intelephense-client');
    expect(openSource.extensionPack).not.toContain('symfony.language-tools');
    expect(recommended.extensionPack).not.toContain('symfony.language-tools');
    expect(openSource.contributes).toBeDefined();
    expect(recommended.contributes).toEqual(openSource.contributes);
    const defaults = (openSource.contributes as { configurationDefaults?: Record<string, unknown> }).configurationDefaults;
    expect(defaults?.['phpCompanion.languageServer.enabled']).toBe(true);
    expect(defaults?.['symfonyLsp.runtimeIndexing']).toBe(false);
    expect(defaults?.['symfonyLsp.releaseMetadata']).toBe(false);
    expect(defaults?.['[xml]']).toEqual({ 'editor.defaultFormatter': 'redhat.vscode-xml' });
  });
});
