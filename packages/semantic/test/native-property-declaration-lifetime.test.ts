import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';
let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
for (const retained of [true, false]) {
  it(`refreshes native property writes after owner edits and snapshot restore retained=${retained}`, () => {
    const workspace = new SemanticWorkspace(parser), owner = 'file:///Owner.php', uri = 'file:///Writer.php';
    try {
      workspace.setTargetPhpVersion('8.5');
      workspace.update(uri, "<?php function run(Holder $holder){$holder->mode='wrong';}", retained);
      const count = (): number => workspace.incompatibleAssignments(uri).length;
      workspace.update(owner, '<?php class Holder{public int $mode;}', retained);
      expect(count()).toBe(1); expect(count()).toBe(1);
      const snapshot = workspace.snapshot(owner)!;
      workspace.update(owner, '<?php class Holder{public string $mode;}', retained);
      expect(count()).toBe(0);
      workspace.update(owner, '<?php class Holder{/** @var int */public $mode;}', retained);
      expect(count()).toBe(0);
      workspace.remove(owner); expect(count()).toBe(0);
      expect(workspace.restore(snapshot, owner)).toBe(true); expect(count()).toBe(1);
      workspace.update(owner, '<?php class Holder{public string $mode;}', retained); expect(count()).toBe(0);
    } finally { workspace.dispose(); }
  });
  it(`refreshes promoted and set-hook write contracts after declaration changes retained=${retained}`, () => {
    const workspace = new SemanticWorkspace(parser), owner = 'file:///Owner.php', uri = 'file:///Writer.php';
    try {
      workspace.setTargetPhpVersion('8.5');
      workspace.update(uri, "<?php function run(Holder $holder){$holder->mode='wrong';}", retained);
      const count = (): number => workspace.incompatibleAssignments(uri).length;
      workspace.update(owner, '<?php class Holder{function __construct(public int $mode){}}', retained); expect(count()).toBe(1);
      workspace.update(owner, '<?php class Holder{function __construct(public string $mode){}}', retained); expect(count()).toBe(0);
      workspace.update(owner, '<?php class Holder{public int $mode{set(int $value){}}}', retained); expect(count()).toBe(1);
      workspace.update(owner, '<?php class Holder{public int $mode{set(int|string $value){}}}', retained); expect(count()).toBe(0);
      workspace.update(owner, '<?php class Holder{public int $mode{set(int $value){}}}', retained); expect(count()).toBe(1);
    } finally { workspace.dispose(); }
  });
}
