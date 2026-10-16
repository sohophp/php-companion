import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());

const uri = 'file:///TraitAdaptationOrder.php';
const orders = ['visibility-first', 'alias-first'] as const;
const visibilities = [
  ['public', 'private'], ['public', 'protected'],
  ['protected', 'public'], ['private', 'public'],
] as const;
const memberCases = visibilities.flatMap(([original, adapted]) => orders.flatMap(order =>
  [false, true].map(qualified => ({ original, adapted, order, qualified }))));

function adaptations(order: typeof orders[number], adapted: string, alias: string, qualified = false): string {
  const method = qualified ? 'Methods::seed' : 'seed';
  const change = `${method} as ${adapted};`, copy = `${method} as ${alias};`;
  return order === 'visibility-first' ? `${change} ${copy}` : `${copy} ${change}`;
}

function source(original: string, rules: string): string {
  return `<?php
trait Methods { ${original} function seed(int $value): int { return $value; } }
class Host { use Methods { ${rules} } function inspect(): void { $this->seed(1); } }
function consume(Host $host): void { $host->copied(1); }
`;
}

function methods(workspace: SemanticWorkspace, text: string, marker: string): Record<string, string> {
  return Object.fromEntries(workspace.completeMembers(uri, text.indexOf(marker) + marker.length)
    .filter(member => ['seed', 'copied'].includes(member.name))
    .map(member => [member.name, member.visibility]));
}

it.each(memberCases)('preserves original alias visibility ($original -> $adapted, $order, qualified=$qualified)', config => {
  const workspace = new SemanticWorkspace(parser);
  try {
    const text = source(config.original, adaptations(config.order, config.adapted, 'copied', config.qualified));
    workspace.update(uri, text, true);
    expect(methods(workspace, text, '$this->')).toEqual({ seed: config.adapted, copied: config.original });
    const exposed: Record<string, string> = {};
    if (config.adapted === 'public') exposed.seed = 'public';
    if (config.original === 'public') exposed.copied = 'public';
    expect(methods(workspace, text, '$host->')).toEqual(exposed);
    const alias = workspace.completeMembers(uri, text.indexOf('$this->') + '$this->'.length)
      .find(member => member.name === 'copied');
    expect(alias).toMatchObject({ fqcn: 'Host::copied', declarationFqcn: 'Methods::seed', declarationName: 'seed' });
  } finally { workspace.dispose(); }
});

it.each(['restore', 'restoreDeclaration', 'restoreSourceDeclaration'] as const)(
  'keeps visibility order independent after %s and replacement', mode => {
    const donor = new SemanticWorkspace(parser), workspace = new SemanticWorkspace(parser);
    try {
      for (const order of orders) {
        const initial = source('public', adaptations(order, 'private', 'copied'));
        donor.update(uri, initial, true);
        const snapshot = mode === 'restoreSourceDeclaration' ? donor.sourceDeclarationSnapshot(uri)! : donor.snapshot(uri)!;
        expect(workspace[mode](structuredClone(snapshot), uri)).toBe(true);
        expect(methods(workspace, initial, '$host->')).toEqual({ copied: 'public' });
        const changed = source('private', adaptations(order, 'public', 'copied'));
        workspace.update(uri, changed, true);
        expect(methods(workspace, changed, '$host->')).toEqual({ seed: 'public' });
      }
    } finally { donor.dispose(); workspace.dispose(); }
  });

it.each(orders.flatMap(order => [false, true].map(qualified => ({ order, qualified }))))(
  'retains the original public contract for constructor aliases ($order, qualified=$qualified)', config => {
    const workspace = new SemanticWorkspace(parser);
    try {
      const header = `trait Methods { public function seed(int $value) {} }
class Host { use Methods { ${adaptations(config.order, 'private', '__construct', config.qualified)} } }`;
      for (const args of ['', '()', "('wrong')"]) {
        const text = `<?php declare(strict_types=1); ${header} new Host${args};`;
        workspace.update(uri, text, true);
        expect(workspace.inaccessibleInstantiations(uri)).toEqual([]);
        if (args === "('wrong')") expect(workspace.incompatibleArguments(uri).map(item => item.parameter)).toEqual(['value']);
        else expect(workspace.missingRequiredArguments(uri).map(item => item.parameters)).toEqual([['value']]);
      }
    } finally { workspace.dispose(); }
  });

it.each(orders)('honors an explicit visibility on the alias (%s)', order => {
  const workspace = new SemanticWorkspace(parser);
  try {
    const text = source('private', adaptations(order, 'protected', 'public copied'));
    workspace.update(uri, text, true);
    expect(methods(workspace, text, '$this->')).toEqual({ seed: 'protected', copied: 'public' });
    expect(methods(workspace, text, '$host->')).toEqual({ copied: 'public' });
  } finally { workspace.dispose(); }
});

it.each(orders)('keeps final adaptation on the original method (%s)', order => {
  const workspace = new SemanticWorkspace(parser);
  try {
    workspace.setTargetPhpVersion('8.5');
    const text = source('public', adaptations(order, 'final', 'copied'));
    workspace.update(uri, text, true);
    const members = workspace.publicInstanceMethods('Host');
    expect(Boolean(members.find(member => member.name === 'seed')?.final)).toBe(true);
    expect(Boolean(members.find(member => member.name === 'copied')?.final)).toBe(false);
  } finally { workspace.dispose(); }
});
