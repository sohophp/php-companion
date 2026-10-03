import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import process from 'node:process';
import { PhpSyntaxParser } from '../packages/parser/dist/index.js';
import { SemanticWorkspace } from '../packages/semantic/dist/index.js';

const parser = await PhpSyntaxParser.createDefault();
const owner = 'file:///vendor/Contract.php';
const rows = [];
const source = "<?php /** @param array{mode:'create'} $options */ function choose(array $options):void{} "
  + "class Builder{/** @param array{mode:'create'} $options */ public function send(array $options):void{}}";
const donor = new SemanticWorkspace(parser);
donor.update(owner, source);
const snapshot = globalThis.structuredClone(donor.snapshot(owner));
donor.dispose();
try {
  for (const mode of ['parsed', 'snapshot', 'declaration snapshot', 'source declaration'])
    for (const context of ['argument', 'method']) for (const part of ['key', 'value']) {
      const workspace = new SemanticWorkspace(parser), uri = 'file:///src/Consumer.php';
      try {
        if (mode === 'parsed') workspace.update(owner, source);
        else if (mode === 'snapshot') assert.equal(workspace.restore(globalThis.structuredClone(snapshot), owner), true);
        else if (mode === 'declaration snapshot') assert.equal(workspace.restoreDeclaration(globalThis.structuredClone(snapshot), owner), true);
        else workspace.updateDeclarations(owner, source);
        const prefix = (context === 'argument' ? '<?php choose(' : '<?php $builder=new Builder();$builder->send(')
          + (part === 'key' ? "['mo" : "['mode'=>'cr");
        const target = prefix + "]); echo 'done';";
        workspace.update(uri, target, true);
        const before = JSON.stringify(workspace.snapshot(uri));
        const result = workspace.completionContext(uri, prefix.length);
        const labels = part === 'key' ? result.shapeKeys?.keys.map(key => key.name) ?? []
          : result.expectedValues?.map(value => value.label) ?? [];
        const expected = part === 'key' ? ['mode'] : ["'create'"];
        const end = part === 'key' ? result.shapeKeys?.end : result.expectedValues?.[0]?.end;
        assert.equal(workspace.source(uri), target);
        assert.equal(workspace.source(owner), source);
        assert.equal(JSON.stringify(workspace.snapshot(uri)), before);
        rows.push({ mode, context, part, labels, expected, end, offset: prefix.length,
          passed: JSON.stringify(labels) === JSON.stringify(expected) && end === prefix.length });
      } finally { workspace.dispose(); }
    }
} finally { parser.dispose(); }
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(rows, null, 2) + '\n');
globalThis.console.log(JSON.stringify(rows, null, 2));
assert.ok(rows.every(row => row.passed), 'Cached array creation candidates or replacement ranges changed.');
