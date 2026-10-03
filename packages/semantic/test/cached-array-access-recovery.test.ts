import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());

const owner = 'file:///cached/Contracts.php';
const background = '<?php class CachedHolder { /** @var array{mode:string,payload:array{mode:string}} */ public $options; } '
  + "/** @return array{mode:string,payload:array{mode:string}} */ function cachedOptions(): array { return ['mode'=>'create','payload'=>['mode'=>'create']]; }";
const cases = [
  ['property', "<?php function read(CachedHolder $holder){$holder->options['mo§]; echo 'done';}"],
  ['function', "<?php function read(){ $options=cachedOptions(); $options['mo§]; echo 'done';}"],
  ['nested function', "<?php function read(){ $options=cachedOptions(); $options['payload']['mo§]; echo 'done';}"],
] as const;
const modes = ['parsed', 'snapshot', 'declaration snapshot', 'source declaration'] as const;

it.each(modes.flatMap(mode => cases.map(([name, marked]) => ({ mode, name, marked }))))(
  'recovers $name with $mode without modifying source or the target snapshot', ({ mode, marked }) => {
    const donor = new SemanticWorkspace(parser);
    donor.update(owner, background);
    const snapshot = structuredClone(donor.snapshot(owner));
    donor.dispose();
    const workspace = new SemanticWorkspace(parser), uri = 'file:///cached/Consumer.php';
    const source = marked.replace('§', ''), offset = marked.indexOf('§');
    try {
      if (mode === 'parsed') workspace.update(owner, background);
      else if (mode === 'snapshot') expect(workspace.restore(structuredClone(snapshot), owner)).toBe(true);
      else if (mode === 'declaration snapshot') expect(workspace.restoreDeclaration(structuredClone(snapshot), owner)).toBe(true);
      else workspace.updateDeclarations(owner, background);
      workspace.update(uri, source, true);
      const before = JSON.stringify(workspace.snapshot(uri));
      const context = workspace.completionContext(uri, offset);
      expect(context.kind === 'array-access-key' ? context.arrayKeys.keys.map(key => key.name) : []).toEqual(['mode']);
      if (context.kind === 'array-access-key') expect(context.arrayKeys.end).toBe(offset);
      expect(workspace.source(uri)).toBe(source);
      expect(workspace.source(owner)).toBe(background);
      expect(JSON.stringify(workspace.snapshot(uri))).toBe(before);
      // Loading deferred body facts is allowed. Once complete, they must equal
      // the original eager snapshot, not facts from the repaired consumer.
      expect(workspace.snapshot(owner)).toEqual(snapshot);
    } finally { workspace.dispose(); }
  },
);
