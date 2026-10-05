import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());

for (const retained of [true, false]) it.each(['update', 'restore', 'restoreDeclaration'] as const)(
  `refreshes warmed aliased function signatures after %s, retained=${retained}`, mode => {
    const project = new SemanticWorkspace(parser), donor = new SemanticWorkspace(parser);
    const defsUri = 'file:///Definitions.php', callerUri = 'file:///Caller.php';
    const caller = '<?php namespace Consumer; use function Definitions\\pick as choose; choose();';
    const offset = caller.indexOf('choose(') + 'choose('.length;
    const setDefinitions = (source: string): void => {
      if (mode === 'update') project.update(defsUri, source, retained);
      else {
        donor.update(defsUri, source, retained);
        expect(project[mode](structuredClone(donor.snapshot(defsUri)!), defsUri)).toBe(true);
      }
    };
    try {
      project.update(callerUri, caller, retained);
      for (const returnType of ['string', 'int', 'string']) {
        setDefinitions(`<?php namespace Definitions; function PICK():${returnType}{} class Helper {public function pick():bool{}}`);
        for (let query = 0; query < 3; query++) {
          expect(project.signatures(callerUri, offset)).toMatchObject([{ fqcn: 'Definitions\\PICK', returnType, uri: defsUri }]);
          expect(project.signatures(callerUri, offset)).toHaveLength(1);
        }
      }
      setDefinitions('<?php namespace Definitions; function renamed():bool{}');
      expect(project.signatures(callerUri, offset)).toEqual([]);
      setDefinitions('<?php namespace Definitions; function pick():bool{}');
      expect(project.signature(callerUri, offset)?.returnType).toBe('bool');
      project.remove(defsUri);
      expect(project.signatures(callerUri, offset)).toEqual([]);
      setDefinitions('<?php namespace Definitions; function pick():float{}');
      expect(project.signature(callerUri, offset)?.returnType).toBe('float');
    } finally { project.dispose(); donor.dispose(); }
  });

it('retains duplicate declarations and excludes methods and other namespaces', () => {
  const project = new SemanticWorkspace(parser), uri = 'file:///Caller.php';
  try {
    project.update('file:///First.php', '<?php namespace Shared; function pick():string{} class Helper{public function pick():bool{}}');
    project.update('file:///Second.php', '<?php namespace Shared; function PICK():int{}');
    project.update('file:///Other.php', '<?php namespace Other; function pick():float{}');
    const caller = '<?php \\Shared\\pick();'; project.update(uri, caller);
    const signatures = project.signatures(uri, caller.indexOf('pick(') + 'pick('.length);
    expect(signatures.map(item => [item.uri, item.returnType])).toEqual([
      ['file:///First.php', 'string'], ['file:///Second.php', 'int'],
    ]);
    project.remove('file:///First.php');
    expect(project.signatures(uri, caller.indexOf('pick(') + 'pick('.length).map(item => item.returnType)).toEqual(['int']);
  } finally { project.dispose(); }
});
