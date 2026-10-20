import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
const factoryUri = 'file:///ChainReceiver/Factory.php';
const callerUri = 'file:///ChainReceiver/Caller.php';
const factory = `<?php namespace ChainReceiver;
class Worker { public function take(int $first, string $second = 'ready'): void {} }
function make(): Worker { return new Worker(); }
function unknown() { return unavailable(); }
function take(string $unrelated): void {}
`;

function workspace(restored: boolean): SemanticWorkspace {
  const result = new SemanticWorkspace(parser);
  result.update(factoryUri, factory);
  if (restored) {
    const snapshot = JSON.parse(JSON.stringify(result.snapshotForPersistence(factoryUri)));
    result.remove(factoryUri);
    expect(result.restoreDeclaration(snapshot, factoryUri)).toBe(true);
  }
  return result;
}

for (const restored of [false, true]) {
  for (const version of ['7.2', '8.5']) {
    it.each(['make()->take(', '(make())->take('])(
      `resolves completed expression-receiver signatures and missing arguments at PHP ${version}, restored=${restored}: %s`, header => {
        const w = workspace(restored);
        try {
          w.setTargetPhpVersion(version);
          const source = `<?php namespace ChainReceiver; function run(): void { ${header}); }`;
          w.update(callerUri, source, true);
          const signatures = w.signatures(callerUri, source.indexOf(header) + header.length);
          expect(signatures.map(item => item.fqcn)).toEqual(['ChainReceiver\\Worker::take']);
          expect(signatures[0]?.parameters.map(item => item.name)).toEqual(['first', 'second']);
          expect(w.missingRequiredArguments(callerUri)).toEqual([
            expect.objectContaining({ callable: 'ChainReceiver\\Worker::take', parameters: ['first'] }),
          ]);
        } finally { w.dispose(); }
      },
    );

    it(`keeps expression-receiver signatures while arguments are incomplete at PHP ${version}, restored=${restored}`, () => {
      const w = workspace(restored);
      try {
        w.setTargetPhpVersion(version);
        const source = '<?php namespace ChainReceiver; make()->take(';
        w.update(callerUri, source, true);
        expect(w.signatures(callerUri, source.length).map(item => item.fqcn)).toEqual(['ChainReceiver\\Worker::take']);
      } finally { w.dispose(); }
    });

    it(`does not resolve an unknown expression receiver as a same-name global function at PHP ${version}, restored=${restored}`, () => {
      const w = workspace(restored);
      try {
        w.setTargetPhpVersion(version);
        const source = '<?php namespace ChainReceiver; unknown()->take();';
        w.update(callerUri, source, true);
        expect(w.signatures(callerUri, source.indexOf('take(') + 'take('.length)).toEqual([]);
        expect(w.missingRequiredArguments(callerUri)).toEqual([]);
      } finally { w.dispose(); }
    });
  }
}

it.each([false, true])('keeps nullable complete-chain value proofs with legacy call kinds omitted=%s', omitKinds => {
  const w = new SemanticWorkspace(parser);
  try {
    w.update(factoryUri, `<?php namespace ChainReceiver;
class Worker { public function maybe(): ?Worker {} public function next(): Worker {} }
function accept(Worker $value): void {}`);
    const source = '<?php namespace ChainReceiver; function run(Worker $worker): void { accept($worker->maybe()?->next()); }';
    w.update(callerUri, source);
    const snapshot = w.snapshotForPersistence(callerUri)!;
    if (omitKinds) {
      for (const facts of [snapshot.implementation.file, ...snapshot.implementation.callables.map(item => item.facts)]) {
        for (const call of facts.calls) delete call.kind;
      }
    }
    w.remove(callerUri);
    expect(w.restoreDeclaration(snapshot, callerUri)).toBe(true);
    expect(w.incompatibleArguments(callerUri).map(item => [item.actualType, item.expectedType])).toEqual([
      ['ChainReceiver\\Worker|null', 'ChainReceiver\\Worker'],
    ]);
  } finally { w.dispose(); }
});
