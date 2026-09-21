import { createHash } from 'node:crypto';
import { basename } from 'node:path';
import { Buffer } from 'node:buffer';

// Fixed width keeps the emitted source-map positions valid after substitution.
export const ENGINE_BUILD_PLACEHOLDER = 'PHP_COMPANION_ENGINE_BUILD_PLACEHOLDER'.padEnd(64, '_');

/** Identify the actual bundled engine, not a manually maintained cache version. */
export function finalizeReferenceEngineBuild(outputFiles, assets) {
  const engineFiles = ['language-server.js', 'candidateWorker.js'];
  const inputs = engineFiles.map((name) => {
    const matches = outputFiles.filter((file) => basename(file.path) === name);
    if (matches.length !== 1) throw new Error(`Expected one engine output: ${name}`);
    return { name, contents: matches[0].contents };
  });
  for (const name of ['web-tree-sitter.wasm', 'tree-sitter-php.wasm']) {
    const contents = assets.get(name);
    if (!contents) throw new Error(`Missing engine asset: ${name}`);
    inputs.push({ name, contents });
  }
  const server = inputs[0].contents;
  if (!Buffer.from(server).includes(ENGINE_BUILD_PLACEHOLDER)) throw new Error('Server build identity placeholder was not emitted.');
  const identities = inputs.map(({ name, contents }) => ({ name, hash: createHash('sha256').update(contents).digest('hex') }));
  const buildId = createHash('sha256').update(JSON.stringify({ schema: 1, inputs: identities })).digest('hex');
  return { buildId, files: outputFiles.map((file) => ({ path: file.path,
    contents: file.path.endsWith('.js')
      ? Buffer.from(Buffer.from(file.contents).toString('utf8').replaceAll(ENGINE_BUILD_PLACEHOLDER, buildId)) : file.contents,
  })) };
}
