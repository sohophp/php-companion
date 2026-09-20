import process from 'node:process';
import { performance } from 'node:perf_hooks';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { PhpSyntaxParser } from '../packages/parser/dist/index.js';
import { SemanticWorkspace } from '../packages/semantic/dist/index.js';
import { indexComposerSources } from '../packages/index/dist/index.js';
import { analyzeProjectPhpFileFacts, createCachedProjectPhpFile, restoreCachedProjectPhpFile } from '../packages/language-server/dist/projectFacts.js';
const root = resolve(process.argv[2] ?? '.');
const cache = await mkdtemp(join(tmpdir(), 'php-index-benchmark-'));
const parser = await PhpSyntaxParser.create({ coreWasmPath: resolve('dist/web-tree-sitter.wasm'), phpWasmPath: resolve('dist/tree-sitter-php.wasm') });
try {
  for (const mode of ['cold', 'warm']) {
    const workspace = new SemanticWorkspace(parser); const started = performance.now();
    const result = await indexComposerSources(root, { includeDependencies: false,
      onSource: ({ uri, source, hash }) => {
        workspace.update(uri, source);
        return createCachedProjectPhpFile(workspace.snapshotForPersistence(uri), analyzeProjectPhpFileFacts(parser, uri, source), hash);
      },
      cache: { directory: cache, version: 'benchmark-v1', restore: (value, { uri }) => {
        const record = restoreCachedProjectPhpFile(value, uri);
        return Boolean(record && workspace.restoreDeclaration(record.semantic, uri));
      } },
    });
    process.stdout.write(JSON.stringify({ mode, elapsedMs: Math.round(performance.now() - started), ...result }) + '\n');
    workspace.dispose();
  }
} finally { parser.dispose(); await rm(cache, { recursive: true, force: true }); }
