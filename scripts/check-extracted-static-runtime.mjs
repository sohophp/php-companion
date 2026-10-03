import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { PhpSyntaxParser } from '../packages/parser/dist/index.js';
import { SemanticWorkspace } from '../packages/semantic/dist/index.js';

const php = process.argv[2]; assert.ok(php, 'Provide an actual PHP 8 runtime');
const parser = await PhpSyntaxParser.createDefault();
const directory = await mkdtemp(join(tmpdir(), 'sophp-static-contract-'));
try {
  const workspace = new SemanticWorkspace(parser);
  const source = `<?php namespace Contract;
abstract class Builder {
  public function with(self $other, string $label = 'static'): static { return $this; }
  abstract public function optional(): ?static;
  public static function create(): static { return new static(); }
  public function maybe(): static|false { return $this; }
}
class ChildBuilder extends Builder { public function optional(): ?static { return $this; } }
`;
  const uri = 'file:///Builder.php'; workspace.update(uri, source, true);
  const result = workspace.extractInterface(uri, source.indexOf('Builder') + 1, '8.0'); assert.ok(result);
  assert.ok(result.interfaceSource.includes('public static function create(): static;'));
  const altered = source.slice(0, result.insertOffset) + result.insertText + source.slice(result.insertOffset);
  await writeFile(join(directory, 'BuilderInterface.php'), result.interfaceSource);
  await writeFile(join(directory, 'Builder.php'), altered);
  const program = join(directory, 'check.php');
  await writeFile(program, `<?php
require __DIR__ . '/BuilderInterface.php'; require __DIR__ . '/Builder.php';
$child = new Contract\\ChildBuilder();
echo json_encode(['php' => PHP_VERSION, 'implements' => $child instanceof Contract\\BuilderInterface,
  'with' => get_class($child->with($child)), 'factory' => get_class(Contract\\ChildBuilder::create()),
  'optional' => get_class($child->optional()), 'maybe' => get_class($child->maybe()),
  'interfaceReturn' => (string) (new ReflectionMethod(Contract\\BuilderInterface::class, 'create'))->getReturnType()]);
`);
  const proof = JSON.parse(execFileSync(php, [program], { encoding: 'utf8', timeout: 10_000 }));
  assert.match(proof.php, /^8\./u); assert.equal(proof.implements, true);
  for (const name of ['with', 'factory', 'optional', 'maybe']) assert.equal(proof[name], 'Contract\\ChildBuilder');
  assert.equal(proof.interfaceReturn, 'static');
  process.stdout.write(`${JSON.stringify({ ...proof, interfaceSource: result.interfaceSource,
    scope: 'Generated interface and altered class compiled and executed by real PHP; child late-static binding preserved' }, null, 2)}\n`);
} finally { parser.dispose(); await rm(directory, { recursive: true, force: true }); }
