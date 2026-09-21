import { parentPort, workerData } from 'node:worker_threads';
import { PhpSyntaxParser, type PhpParserPaths } from '@php-companion/parser';
import { createSourceCandidateSummary, sourceCandidateSummaryDecision } from '@php-companion/index';
import { decompressCachedProjectPhpFile, restoreCachedProjectPhpFile, restoreCachedSourceDeclaration } from './projectFacts.js';
import type { CandidatePreparation, CandidateRestore, PreparedCandidate, PreparedCandidateRestore } from './candidateWorkers.js';

const paths = (workerData as { paths?: PhpParserPaths }).paths;
let parserPromise: Promise<PhpSyntaxParser> | undefined;

parentPort?.on('message', async (task: CandidatePreparation | CandidateRestore) => {
  try {
    if ('kind' in task) {
      const payload = task.payload as { declarations?: unknown; semantic?: unknown } | null;
      const declaration = task.deferBodies ? restoreCachedSourceDeclaration(payload?.declarations, task.uri, task.hash) : undefined;
      const semantic = declaration ? undefined : restoreCachedProjectPhpFile(decompressCachedProjectPhpFile(payload?.semantic), task.uri);
      const result: PreparedCandidateRestore = { kind: 'restored', id: task.id, uri: task.uri, hash: task.hash,
        declaration, semantic: semantic?.checksums.source === task.hash ? semantic : undefined };
      parentPort?.postMessage(result); return;
    }
    const parser = await (parserPromise ??= paths ? PhpSyntaxParser.create(paths) : PhpSyntaxParser.createDefault());
    const summary = createSourceCandidateSummary(task.source);
    const names = new Set(task.names);
    const matches = task.mode === 'named-argument'
      ? task.names.some((name) => new RegExp(
        `(?:^|[^\\p{L}\\p{N}_])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s|/\\*[\\s\\S]*?\\*/|//[^\\r\\n]*(?:\\r?\\n|$)|#[^\\r\\n]*(?:\\r?\\n|$))*:`, 'iu').test(task.source))
      : task.names.some((name) => task.source.toLowerCase().includes(name));
    const declarationsOnly = matches && task.deferBodies && task.mode === 'symbol'
      && sourceCandidateSummaryDecision(summary, names, 'symbol') === 'skip';
    const prepared: PreparedCandidate = {
      id: task.id, uri: task.uri, hash: task.hash, summary, matches, declarationsOnly,
      facts: matches ? parser.prepare(task.source, task.uri, declarationsOnly) : undefined,
    };
    parentPort?.postMessage(prepared);
  } catch {
    parentPort?.postMessage({ id: task.id });
  }
});
