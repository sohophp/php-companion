import { access } from 'node:fs/promises';
import process from 'node:process';
import yauzl from 'yauzl';

const artifacts = [
  {
    path: 'php-companion-0.1.3.vsix',
    required: [
      'extension/package.json',
      'extension/dist/extension.js',
      'extension/resources/icon.png',
    ],
  },
  {
    path: 'packages/php-companion-extension-pack/php-companion-open-source-pack-0.1.3.vsix',
    required: [
      'extension/package.json',
      'extension/readme.md',
      'extension/package.nls.zh-cn.json',
      'extension/resources/icon.png',
    ],
  },
  {
    path: 'packages/php-companion-recommended-pack/php-companion-recommended-pack-0.1.3.vsix',
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

for (const artifact of artifacts) {
  await access(artifact.path);
  const names = await entries(artifact.path);
  const missing = artifact.required.filter((name) => !names.has(name));
  if (missing.length > 0) {
    throw new Error(`${artifact.path} is missing: ${missing.join(', ')}`);
  }
  process.stdout.write(`Verified ${artifact.path}\n`);
}
