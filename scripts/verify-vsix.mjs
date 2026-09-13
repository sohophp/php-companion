import { access } from 'node:fs/promises';
import { Buffer } from 'node:buffer';
import process from 'node:process';
import yauzl from 'yauzl';

const artifacts = [
  {
    path: 'php-companion-0.4.5.vsix',
    core: true,
    required: [
      'extension/package.json',
      'extension/dist/extension.js',
      'extension/dist/language-server.js',
      'extension/resources/icon.png',
    ],
  },
  {
    path: 'packages/php-companion-extension-pack/php-companion-open-source-pack-0.4.5.vsix',
    focusedPack: true,
    required: [
      'extension/package.json',
      'extension/readme.md',
      'extension/package.nls.zh-cn.json',
      'extension/resources/icon.png',
    ],
  },
  {
    path: 'packages/php-companion-recommended-pack/php-companion-recommended-pack-0.4.5.vsix',
    focusedPack: true,
    required: [
      'extension/package.json',
      'extension/readme.md',
      'extension/package.nls.zh-cn.json',
      'extension/resources/icon.png',
    ],
  },
];

function entries(path) {
  return new Promise((resolve, reject) => {
    yauzl.open(path, { lazyEntries: true }, (error, zip) => {
      if (error || !zip) {
        reject(error ?? new Error(`Unable to open ${path}`));
        return;
      }
      const names = new Set();
      zip.on('entry', (entry) => {
        names.add(entry.fileName);
        zip.readEntry();
      });
      zip.on('error', reject);
      zip.on('end', () => resolve(names));
      zip.readEntry();
    });
  });
}

function textEntry(path, expectedName) {
  return new Promise((resolve, reject) => {
    yauzl.open(path, { lazyEntries: true }, (error, zip) => {
      if (error || !zip) { reject(error ?? new Error(`Unable to open ${path}`)); return; }
      zip.on('entry', (entry) => {
        if (entry.fileName !== expectedName) { zip.readEntry(); return; }
        zip.openReadStream(entry, (streamError, stream) => {
          if (streamError || !stream) { reject(streamError ?? new Error(`Unable to read ${expectedName}`)); return; }
          const chunks = [];
          stream.on('data', (chunk) => chunks.push(chunk));
          stream.on('error', reject);
          stream.on('end', () => { resolve(Buffer.concat(chunks).toString('utf8')); zip.close(); });
        });
      });
      zip.on('error', reject);
      zip.on('end', () => reject(new Error(`${path} is missing ${expectedName}`)));
      zip.readEntry();
    });
  });
}

for (const artifact of artifacts) {
  await access(artifact.path);
  const names = await entries(artifact.path);
  const missing = artifact.required.filter((name) => !names.has(name));
  if (missing.length > 0) {
    throw new Error(`${artifact.path} is missing: ${missing.join(', ')}`);
  }
  if (artifact.core) {
    const manifest = JSON.parse(await textEntry(artifact.path, 'extension/package.json'));
    if (manifest.contributes?.configuration?.properties?.['phpCompanion.languageServer.enabled']?.default !== true) {
      throw new Error(`${artifact.path} must enable the self-hosted PHP language server by default.`);
    }
  }
  if (artifact.focusedPack) {
    const manifest = JSON.parse(await textEntry(artifact.path, 'extension/package.json'));
    const expectedExtensions = [
      'sohophp.php-companion', 'sohophp.twig-plus', 'symfony.language-tools',
      'redhat.vscode-yaml', 'xdebug.php-debug', 'recca0120.vscode-phpunit',
      'junstyle.php-cs-fixer', 'editorconfig.editorconfig',
    ].sort();
    const actualExtensions = Array.isArray(manifest.extensionPack)
      ? manifest.extensionPack.map((id) => String(id).toLowerCase()).sort() : [];
    if (JSON.stringify(actualExtensions) !== JSON.stringify(expectedExtensions)) {
      throw new Error(`${artifact.path} must contain exactly the eight approved open-source extensions.`);
    }
    if (manifest.extensionPack?.includes('bmewburn.vscode-intelephense-client')) {
      throw new Error(`${artifact.path} must not install Intelephense.`);
    }
    if (manifest.contributes?.configurationDefaults?.['phpCompanion.languageServer.enabled'] !== true) {
      throw new Error(`${artifact.path} must enable the self-hosted PHP language server.`);
    }
    if (manifest.contributes?.configurationDefaults?.['symfonyLsp.runtimeIndexing'] !== false
      || manifest.contributes?.configurationDefaults?.['symfonyLsp.releaseMetadata'] !== false) {
      throw new Error(`${artifact.path} must keep Symfony runtime execution and release metadata requests disabled.`);
    }
  }
  process.stdout.write(`Verified ${artifact.path}\n`);
}
