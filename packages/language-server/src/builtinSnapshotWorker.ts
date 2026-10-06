// Transient builtin syntax worker; semantic enrichment remains on the parent.
import { parentPort, workerData } from 'node:worker_threads';
import { PhpSyntaxParser, type PhpParserPaths } from '@php-companion/parser';

interface Task {
  id: number;
  version: string;
  documents: Array<{ uri: string; source: string }>;
}
const paths = (workerData as { paths?: PhpParserPaths }).paths;
let parserPromise: Promise<PhpSyntaxParser> | undefined;
let tail = Promise.resolve();
parentPort?.on('message', (task: Task) => {
  tail = tail.then(async () => {
    const parser = await (parserPromise ??= paths ? PhpSyntaxParser.create(paths) : PhpSyntaxParser.createDefault());
    const records = task.documents.map(document => ({ uri: document.uri, source: document.source,
      prepared: parser.prepare(document.source, document.uri, false) }));
    parentPort?.postMessage({ id: task.id, json: JSON.stringify(records) });
  }).catch(error => {
    parentPort?.postMessage({ id: task.id, error: String(error) });
  });
});
