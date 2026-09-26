import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());

it('does not assign an outer method signature to nested isset arguments', () => {
  const workspace = new SemanticWorkspace(parser);
  const uri = 'file:///NestedIntrinsic.php';
  const source = `<?php declare(strict_types=1);
    final class Presentation {
      private function formElements(bool $includePhoto = true): void {}
      /** @param array<string,mixed> $row */
      public function edit(array $row): void {
        $this->formElements(!isset($row['_content_draft']) && !isset($row['_write_versions']));
        $this->formElements(!empty($row['_content_draft']));
        $this->formElements($row['_content_draft']);
      }
    }`;
  try {
    workspace.update(uri, source, true);
    const diagnostics = workspace.incompatibleArguments(uri);
    expect(diagnostics).toEqual([expect.objectContaining({
      callable: 'Presentation::formElements', parameter: 'includePhoto', actualType: 'mixed', expectedType: 'bool',
      start: source.lastIndexOf("$row['_content_draft']"),
    })]);
  } finally { workspace.dispose(); }
});
