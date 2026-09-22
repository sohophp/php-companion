import { parentPort, workerData } from 'node:worker_threads';
import { PhpSyntaxParser, type PhpParserPaths } from '@php-companion/parser';
import { createSourceCandidateSummary, sourceCandidateSummaryDecision } from '@php-companion/index';
import type { SemanticSnapshot, SemanticSourceDeclarationSnapshot } from '@php-companion/semantic';
import { compressCachedProjectPhpFile, compressCachedSourceDeclaration, createCachedProjectPhpFile,
  decompressCachedProjectPhpFile, restoreCachedProjectPhpFile, restoreCachedSourceDeclaration } from './projectFacts.js';
import type { CandidateCompression, CandidatePreparation, CandidateRestore, PreparedCandidate,
  PreparedCandidateCompression, PreparedCandidateRestore, SerializedPreparedCandidate } from './candidateWorkers.js';

const paths = (workerData as { paths?: PhpParserPaths }).paths;
let parserPromise: Promise<PhpSyntaxParser> | undefined;

parentPort?.on('message', async (task: CandidatePreparation | CandidateRestore | CandidateCompression) => {
  try {
    if ('kind' in task) {
      if (task.kind === 'compress') {
        const result: PreparedCandidateCompression = task.declarationsOnly
          ? { kind: 'compressed', id: task.id,
            declarations: compressCachedSourceDeclaration(task.snapshot as SemanticSourceDeclarationSnapshot, task.hash) }
          : { kind: 'compressed', id: task.id,
            semantic: compressCachedProjectPhpFile(createCachedProjectPhpFile(task.snapshot as SemanticSnapshot,
              { schema: 5, doctrineMethods: [], doctrineProperties: [], doctrineRepositoryLookups: [] }, task.hash)) };
        parentPort?.postMessage(result); return;
      }
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
    const matches = task.forceFull ? true : task.mode === 'named-argument'
      ? task.names.some((name) => new RegExp(
        `(?:^|[^\\p{L}\\p{N}_])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s|/\\*[\\s\\S]*?\\*/|//[^\\r\\n]*(?:\\r?\\n|$)|#[^\\r\\n]*(?:\\r?\\n|$))*:`, 'iu').test(task.source))
      : task.exactSymbols ? sourceCandidateSummaryDecision(summary, names, 'symbol') !== 'skip'
        : task.names.some((name) => task.source.toLowerCase().includes(name));
    const declarationsOnly = matches && task.deferBodies && task.mode === 'symbol'
      && sourceCandidateSummaryDecision(summary, names, 'symbol') === 'skip';
    const prepared: PreparedCandidate = {
      id: task.id, uri: task.uri, hash: task.hash, summary, matches, declarationsOnly,
      facts: matches ? parser.prepare(task.source, task.uri, declarationsOnly) : undefined,
    };
    // Serialize syntax facts off the main thread; JSON parsing avoids the cost
    // of reconstructing their deeply nested structured clone on the caller.
    parentPort?.postMessage({ id: task.id, json: JSON.stringify(prepared) } satisfies SerializedPreparedCandidate);
  } catch {
    parentPort?.postMessage({ id: task.id });
  }
});
