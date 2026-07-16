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

async function manifest(path: string): Promise<ExtensionManifest> {
  return JSON.parse(await readFile(resolve(path), 'utf8')) as ExtensionManifest;
}

describe('paused PHP Companion manifests', () => {
  it('publishes every extension as version 0.1.3', async () => {
    for (const path of ['package.json', 'packages/php-companion-extension-pack/package.json', 'packages/php-companion-recommended-pack/package.json']) {
      const value = await manifest(path);
      expect(value.publisher).toBe('sohophp');
      expect(value.version).toBe('0.1.3');
      expect(value.icon).toBe('resources/icon.png');
    }
  });

  it('keeps the core extension inert', async () => {
    const value = await manifest('package.json');
    expect(value.displayName).toContain('Paused');
    expect(value.activationEvents).toEqual([]);
    expect(value.contributes).toBeUndefined();
    expect(value.extensionPack).toEqual([]);
    expect(value.main).toBe('./dist/extension.js');
  });

  it('ships both extension packs empty', async () => {
    const openSource = await manifest('packages/php-companion-extension-pack/package.json');
    const recommended = await manifest('packages/php-companion-recommended-pack/package.json');
    expect(openSource.extensionPack).toEqual([]);
    expect(recommended.extensionPack).toEqual([]);
    expect(openSource.contributes).toBeUndefined();
    expect(recommended.contributes).toBeUndefined();
  });
});
