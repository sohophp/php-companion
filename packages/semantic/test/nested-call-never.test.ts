import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

describe('native never calls with nested arguments', () => {
  let parser: PhpSyntaxParser;
  let workspace: SemanticWorkspace;

  beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); workspace = new SemanticWorkspace(parser); });
  afterAll(() => { workspace.dispose(); parser.dispose(); });

  it('proves only the compatible outer call in a same-file on-demand analysis', () => {
    const uri = 'file:///workspace/src/NestedNever.php';
    const source = `<?php namespace App;
function stop(array $payload): never { throw new \\Exception(); }
function ordinary(array $payload): void {}
function run(): void {
    stop(array('x')); afterStop();
    ordinary(array('x')); afterOrdinary();
}`;
    workspace.update(uri, source, true);
    expect(workspace.neverReturningCalls(uri, true).map((range) => source.slice(range.start, range.end)))
      .toEqual(["stop(array('x'))"]);
    workspace.remove(uri);
  });

  it.each(['full', 'declarations', 'restored', 'source-restored'] as const)(
    'keeps the local-only proof boundary with %s facts', (mode) => {
      const local = new SemanticWorkspace(parser);
      const uri = 'file:///workspace/src/LocalProof.php';
      const source = `<?php namespace App;
function stop(string $value): never { throw new \\Exception(); }
/** @return never */ function documented(string $value) { throw new \\Exception(); }
class Ender { public function stop(): never { throw new \\Exception(); }
    public static function halt(): never { throw new \\Exception(); } }
function run(Ender $ender): void {
    stop('ok'); afterLocal();
    stop([]); afterMismatch();
    documented('ok'); afterDocumented();
    externalStop('ok'); afterExternal();
    $ender->stop(); afterMethod();
    Ender::halt(); afterStatic();
    $callback = stop(...); $callback('ok'); afterCallable();
}`;
      try {
        local.update('file:///workspace/src/External.php', `<?php namespace App;
function externalStop(string $value): never { throw new \\Exception(); }`);
        if (mode === 'declarations') local.updateDeclarations(uri, source);
        else {
          local.update(uri, source, true);
          if (mode === 'restored') expect(local.restoreDeclaration(local.snapshot(uri)!, uri)).toBe(true);
          if (mode === 'source-restored') expect(local.restoreSourceDeclaration(local.sourceDeclarationSnapshot(uri)!, uri)).toBe(true);
        }
        const calls = (localOnly: boolean): string[] => local.neverReturningCalls(uri, localOnly)
          .map((range) => source.slice(range.start, range.end));
        expect(calls(true)).toEqual(["stop('ok')", "$callback('ok')"]);
        expect(calls(false)).toEqual(["stop('ok')", "externalStop('ok')", '$ender->stop()', 'Ender::halt()', "$callback('ok')"]);
      } finally { local.dispose(); }
    },
  );

  it('refreshes the proof when edits introduce, remove or duplicate a local native never declaration', () => {
    const local = new SemanticWorkspace(parser);
    const uri = 'file:///workspace/src/ChangingProof.php';
    const ordinary = `<?php namespace App;
/** @return never */ function stop(): void {}
class Ender { public function halt(): never { throw new \\Exception(); } }
function run(Ender $ender): void { stop(); $ender->halt(); }`;
    const terminating = ordinary.replace('function stop(): void {}', 'function stop(): never { throw new \\Exception(); }');
    const duplicateUri = 'file:///workspace/src/Duplicate.php';
    const calls = (source: string): string[] => {
      local.update(uri, source, true);
      return local.neverReturningCalls(uri, true).map((range) => source.slice(range.start, range.end));
    };
    try {
      expect(calls(ordinary)).toEqual([]);
      expect(calls(terminating)).toEqual(['stop()']);
      local.update(duplicateUri, '<?php namespace App; function stop(): never { throw new \\Exception(); }');
      expect(calls(terminating)).toEqual([]);
      local.remove(duplicateUri);
      expect(calls(terminating)).toEqual(['stop()']);
      expect(calls(ordinary)).toEqual([]);
    } finally { local.dispose(); }
  });

  it.each(['full', 'declarations', 'source'] as const)(
    'queries the restored source after replacing an open document through %s restore', (mode) => {
      const local = new SemanticWorkspace(parser), donor = new SemanticWorkspace(parser);
      const uri = 'file:///workspace/src/Replacement.php';
      const previous = '<?php function previous(string $old): void {} previous("old");';
      const restored = `<?php namespace Replacement;
function stop(string $value): never { throw new \\Exception(); }
function run(): void { stop('new'); }`;
      try {
        local.update(uri, previous, true); donor.update(uri, restored);
        const accepted = mode === 'source'
          ? local.restoreSourceDeclaration(donor.sourceDeclarationSnapshot(uri)!, uri)
          : mode === 'declarations' ? local.restoreDeclaration(donor.snapshot(uri)!, uri)
            : local.restore(donor.snapshot(uri)!, uri);
        expect(accepted).toBe(true);
        expect(local.source(uri)).toBe(restored);
        expect(local.signature(uri, restored.indexOf("stop('new')") + 5)).toMatchObject({
          fqcn: 'Replacement\\stop', nativeReturnType: 'never', parameters: [{ name: 'value', type: 'string' }],
        });
        expect(local.neverReturningCalls(uri, true).map((range) => restored.slice(range.start, range.end)))
          .toEqual(["stop('new')"]);
        local.update(uri, previous, true);
        expect(local.neverReturningCalls(uri, true)).toEqual([]);
        expect(local.signature(uri, previous.lastIndexOf('previous(') + 9)).toMatchObject({ fqcn: 'previous', nativeReturnType: 'void' });
      } finally { local.dispose(); donor.dispose(); }
    },
  );
});
