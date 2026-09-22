import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { Worker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { defaultPhpParserPaths, PhpSyntaxParser } from '@php-companion/parser';
import { analyzeProjectPhpFileFacts } from '../src/projectFacts.js';

describe('source-only candidate preparation', () => {
  it('transfers Doctrine facts from the worker with the matching source', async () => {
    const worker = new Worker(fileURLToPath(new URL('../../../dist/candidateWorker.js', import.meta.url)),
      { workerData: { paths: defaultPhpParserPaths() } });
    const parser = await PhpSyntaxParser.createDefault();
    const uri = 'file:///src/Page.php';
    const source = `<?php namespace App;
      use Doctrine\\ORM\\Mapping as ORM;
      #[ORM\\Entity]
      class Page {
        #[ORM\\ManyToOne(targetEntity: User::class)] public ?User $owner;
      }`;
    try {
      const id = 1;
      const reply = new Promise<{ id: number; json: string }>((resolve, reject) => {
        worker.once('message', resolve);
        worker.once('error', reject);
      });
      worker.postMessage({ id, uri, source, hash: createHash('sha256').update(source).digest('hex'),
        names: [], mode: 'symbol', deferBodies: false, forceFull: true, includeProjectFacts: true });
      const result = JSON.parse((await reply).json);
      expect(result).toMatchObject({ id, uri, facts: { kind: 'full' } });
      expect(result.projectFacts.doctrineProperties).toHaveLength(1);
      expect(result.projectFacts).toEqual(analyzeProjectPhpFileFacts(parser, uri, source));
    } finally {
      parser.dispose();
      await worker.terminate();
    }
  });
});
