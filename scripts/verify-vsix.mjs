import { access, readFile } from 'node:fs/promises';
import { Buffer } from 'node:buffer';
import process from 'node:process';
import { URL } from 'node:url';
import yauzl from 'yauzl';

const openSourceProfile = JSON.parse(await readFile(new URL('../test/extension/open-source-profile.extensions.json', import.meta.url), 'utf8'));

const artifacts = [
  {
    path: 'packages/php-companion-symfony/php-companion-symfony-0.4.5.vsix',
    symfony: true,
    required: [
      'extension/package.json',
      'extension/dist/extension.js',
      'extension/dist/service-provider.js',
      'extension/dist/event-provider.js',
      'extension/dist/controller-context-provider.js',
      'extension/dist/static-route-provider.js',
      'extension/dist/winstar-route-provider.js',
      'extension/dist/tree-sitter-php.wasm',
      'extension/dist/web-tree-sitter.wasm',
      'extension/readme.md',
      'extension/resources/icon.png',
    ],
  },
  {
    path: 'php-companion-0.4.5.vsix',
    core: true,
    required: [
      'extension/package.json',
      'extension/dist/extension.js',
      'extension/dist/language-server.js',
      'extension/dist/candidateWorker.js',
      'extension/dist/portableCandidateSearchWorker.js',
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
    if (names.has('extension/dist/winstar-route-provider.js')) {
      throw new Error(`${artifact.path} must not bundle the standalone Symfony Winstar route provider.`);
    }
    const manifest = JSON.parse(await textEntry(artifact.path, 'extension/package.json'));
    if (manifest.contributes?.configuration?.properties?.['phpCompanion.languageServer.enabled']?.default !== true) {
      throw new Error(`${artifact.path} must enable the self-hosted PHP language server by default.`);
    }
    for (const entry of ['extension/dist/extension.js', 'extension/dist/language-server.js', 'extension/dist/candidateWorker.js']) {
      const bundle = await textEntry(artifact.path, entry);
      if (/require\(["']web-tree-sitter["']\)/.test(bundle)) {
        throw new Error(`${artifact.path} leaves web-tree-sitter as a runtime dependency in ${entry}.`);
      }
    }
  }
  if (artifact.symfony) {
    const manifest = JSON.parse(await textEntry(artifact.path, 'extension/package.json'));
    if (manifest.publisher !== 'sohophp' || manifest.name !== 'php-companion-symfony' || manifest.version !== '0.4.5') {
      throw new Error(`${artifact.path} has an unexpected Symfony extension identity.`);
    }
    if (JSON.stringify(manifest.extensionDependencies) !== JSON.stringify(['sohophp.php-companion'])) {
      throw new Error(`${artifact.path} must depend only on the PHP Companion core extension.`);
    }
    for (const entry of ['extension/dist/extension.js', 'extension/dist/service-provider.js', 'extension/dist/event-provider.js', 'extension/dist/controller-context-provider.js', 'extension/dist/static-route-provider.js', 'extension/dist/winstar-route-provider.js']) {
      const bundle = await textEntry(artifact.path, entry);
      if (/require\(["']@php-companion\//.test(bundle)) throw new Error(`${artifact.path} leaves a workspace package as a runtime dependency in ${entry}.`);
    }
  }
  if (artifact.focusedPack) {
    const manifest = JSON.parse(await textEntry(artifact.path, 'extension/package.json'));
    const expectedExtensions = ['sohophp.php-companion', 'sohophp.php-companion-symfony', ...openSourceProfile.filter((entry) => entry.defaultPack !== false).map((entry) => entry.id)]
      .map((id) => id.toLowerCase()).sort();
    const actualExtensions = Array.isArray(manifest.extensionPack)
      ? manifest.extensionPack.map((id) => String(id).toLowerCase()).sort() : [];
    if (JSON.stringify(actualExtensions) !== JSON.stringify(expectedExtensions)) {
      throw new Error(`${artifact.path} must contain exactly the approved default open-source extensions.`);
    }
    if (manifest.extensionPack?.includes('bmewburn.vscode-intelephense-client')) {
      throw new Error(`${artifact.path} must not install Intelephense.`);
    }
    if (manifest.contributes?.configurationDefaults?.['phpCompanion.languageServer.enabled'] !== true) {
      throw new Error(`${artifact.path} must enable the self-hosted PHP language server.`);
    }
    if (Object.keys(manifest.contributes?.configurationDefaults ?? {}).some((key) => key.startsWith('symfonyLsp.'))) {
      throw new Error(`${artifact.path} must not configure the removed Symfony Language Tools extension.`);
    }
    if (manifest.contributes?.configurationDefaults?.['[xml]']?.['editor.defaultFormatter'] !== 'redhat.vscode-xml') {
      throw new Error(`${artifact.path} must select Red Hat XML as the XML formatter.`);
    }
  }
  process.stdout.write(`Verified ${artifact.path}\n`);
}
