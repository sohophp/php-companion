import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, readdir, realpath } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export interface InstalledProfileInput {
  candidateCommit: string;
  candidateDirectory: string;
  extensionsDirectory: string;
  extensions: Array<{ id: string; version: string; path: string }>;
  fileHashes: Record<string, string>;
  productFilesChecked: number;
}

export async function inspectInstalledProfile(repository: string, candidateDirectory: string,
  extensionsDirectory: string, versionManifest: string): Promise<InstalledProfileInput> {
  // Use the existing archive/content verifier, including its strict installation metadata normalization.
  const program = `const {verifyCandidate,assessInstalledArtifacts}=await import(process.argv[1]);
const candidate=await verifyCandidate(process.argv[2]);
const installed=await assessInstalledArtifacts(candidate,process.argv[3]);
if(!installed.matching)throw Error(JSON.stringify(installed));
console.log(JSON.stringify({candidateCommit:candidate.manifest.source.commit,
artifacts:candidate.manifest.artifacts,checked:installed.products.reduce((sum,p)=>sum+p.checked,0)}));`;
  const assessment = JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', program,
    pathToFileURL(join(repository, 'scripts', 'alpha-preflight.mjs')).toString(), candidateDirectory, extensionsDirectory],
  { encoding: 'utf8' })) as { candidateCommit: string; artifacts: Array<{ id: string; version: string }>; checked: number };
  const external = JSON.parse(await readFile(versionManifest, 'utf8')) as Array<{ id: string; version: string }>;
  assert.ok(Array.isArray(external) && external.length > 0, 'An explicit external-version manifest is required');
  const expected = [...assessment.artifacts, ...external];
  assert.ok(expected.every(item => typeof item.id === 'string' && typeof item.version === 'string'));
  assert.equal(new Set(expected.map(item => item.id.toLowerCase())).size, expected.length, 'Duplicate extension identity');
  const directory = await realpath(extensionsDirectory);
  const installed: InstalledProfileInput['extensions'] = [];
  for (const name of await readdir(directory, { withFileTypes: true })) {
    if (!name.isDirectory()) continue;
    const folder = join(directory, name.name);
    const manifest = JSON.parse(await readFile(join(folder, 'package.json'), 'utf8')) as { publisher: string; name: string; version: string };
    installed.push({ id: `${manifest.publisher}.${manifest.name}`, version: manifest.version, path: folder });
  }
  assert.equal(installed.length, expected.length, 'Unexpected installed members in the isolated directory');
  const extensions = expected.map(item => {
    assert.ok(typeof item.id === 'string' && typeof item.version === 'string');
    const found = installed.find(actual => actual.id.toLowerCase() === item.id.toLowerCase());
    assert.ok(found, `Missing installed ${item.id}`);
    assert.equal(found.version, item.version, `Incorrect installed version for ${item.id}`); return found;
  });
  for (const id of ['sohophp.twig-plus', 'xdebug.php-debug', 'redhat.vscode-yaml', 'redhat.vscode-xml',
    'junstyle.php-cs-fixer', 'editorconfig.editorconfig', 'eiminsasete.apacheconf-snippets', 'neilbrayfield.php-docblocker'])
    assert.ok(extensions.some(item => item.id.toLowerCase() === id), `Required workflow member ${id}`);
  const fileHashes: Record<string, string> = {};
  const snapshot = async (folder: string): Promise<void> => {
    for (const item of await readdir(folder, { withFileTypes: true })) {
      const path = join(folder, item.name);
      assert.ok(!item.isSymbolicLink(), `Installed payload must use regular files: ${path}`);
      if (item.isDirectory()) await snapshot(path);
      else if (item.isFile()) fileHashes[path] = createHash('sha256').update(await readFile(path)).digest('hex');
    }
  };
  for (const extension of extensions) await snapshot(extension.path);
  return { candidateCommit: assessment.candidateCommit, candidateDirectory: resolve(candidateDirectory),
    extensionsDirectory: directory, extensions, fileHashes, productFilesChecked: assessment.checked };
}
