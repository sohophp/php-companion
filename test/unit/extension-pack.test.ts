import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

interface ExtensionManifest {
  name: string;
  version: string;
  publisher: string;
  license: string;
  repository?: { type: string; url: string };
  homepage?: string;
  bugs?: { url: string };
  icon?: string;
  galleryBanner?: { color: string; theme: string };
  files?: string[];
  extensionPack?: string[];
  extensionDependencies?: string[];
}

const openSourceExtensions = [
  'sohophp.php-companion',
  'sohophp.twig-plus',
  'k--kato.intellij-idea-keybindings',
  'neilbrayfield.php-docblocker',
  'MehediDracula.php-namespace-resolver',
  'everstorm.php-smart-files',
  'xdebug.php-debug',
  'recca0120.vscode-phpunit',
  'junstyle.php-cs-fixer',
  'swordev.phpstan',
];

async function readManifest(path: string): Promise<ExtensionManifest> {
  return JSON.parse(await readFile(resolve(path), 'utf8')) as ExtensionManifest;
}

describe('PHP Companion manifests', () => {
  it('uses the shared 0.1 release metadata in every manifest', async () => {
    const manifests = await Promise.all([
      readManifest('package.json'),
      readManifest('packages/php-companion-extension-pack/package.json'),
      readManifest('packages/php-companion-recommended-pack/package.json'),
    ]);
    for (const manifest of manifests) {
      expect(manifest.publisher).toBe('sohophp');
      expect(manifest.version).toBe('0.1.1');
      expect(manifest.license).toBe('MIT');
      expect(manifest.repository).toEqual({
        type: 'git',
        url: 'https://github.com/sohophp/php-companion.git',
      });
      expect(manifest.homepage).toContain('https://github.com/sohophp/php-companion');
      expect(manifest.bugs?.url).toBe('https://github.com/sohophp/php-companion/issues');
    }
  });

  it('ships a Marketplace icon and dark gallery banner for every extension', async () => {
    const manifestPaths = [
      'package.json',
      'packages/php-companion-extension-pack/package.json',
      'packages/php-companion-recommended-pack/package.json',
    ];

    for (const manifestPath of manifestPaths) {
      const manifest = await readManifest(manifestPath);
      expect(manifest.icon).toBe('resources/icon.png');
      expect(manifest.files).toContain('resources/icon.png');
      expect(manifest.galleryBanner?.theme).toBe('dark');

      const iconPath = resolve(manifestPath, '..', manifest.icon ?? '');
      const icon = await readFile(iconPath);
      expect(icon.subarray(1, 4).toString('ascii')).toBe('PNG');
      expect(icon.readUInt32BE(16)).toBe(256);
      expect(icon.readUInt32BE(20)).toBe(256);
    }
  });

  it('publishes the core extension under sohophp without runtime dependencies', async () => {
    const manifest = await readManifest('package.json');
    expect(`${manifest.publisher}.${manifest.name}`).toBe('sohophp.php-companion');
    expect(manifest.extensionDependencies).toEqual([]);
    expect(manifest.extensionPack).toEqual([]);
  });

  it('keeps the open source pack language-server neutral', async () => {
    const manifest = await readManifest('packages/php-companion-extension-pack/package.json');
    expect(`${manifest.publisher}.${manifest.name}`).toBe('sohophp.php-companion-open-source-pack');
    expect(manifest.extensionPack).toEqual(openSourceExtensions);
    expect(new Set(manifest.extensionPack).size).toBe(openSourceExtensions.length);
    expect(manifest.extensionPack?.some((id) => id.toLowerCase().includes('intelephense'))).toBe(false);
  });

  it('adds only Intelephense to the recommended pack', async () => {
    const manifest = await readManifest('packages/php-companion-recommended-pack/package.json');
    expect(`${manifest.publisher}.${manifest.name}`).toBe('sohophp.php-companion-recommended-pack');
    expect(manifest.extensionPack).toEqual([
      ...openSourceExtensions,
      'bmewburn.vscode-intelephense-client',
    ]);
    expect(new Set(manifest.extensionPack).size).toBe(openSourceExtensions.length + 1);
    expect(manifest.extensionPack).toContain('sohophp.twig-plus');
  });
});
