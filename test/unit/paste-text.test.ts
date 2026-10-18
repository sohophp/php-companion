import { describe, expect, it } from 'vitest';
import { phpPasteTargetsOnlyText, mayNeedPhpImportResolution, potentialPhpTypeNames, resolvePasteAliasConflicts } from '../../src/paste/pasteText.js';

describe('PHP import paste text preflight', () => {
  it('skips version numbers and ordinary scalar values', () => {
    expect(mayNeedPhpImportResolution('20260814113000')).toBe(false);
    expect(mayNeedPhpImportResolution("'20260814113000'")).toBe(false);
    expect(mayNeedPhpImportResolution('true 42 null')).toBe(false);
  });

  it('keeps class-like PHP names eligible for import resolution', () => {
    expect(mayNeedPhpImportResolution('new ProductSearchSettings()')).toBe(true);
    expect([...potentialPhpTypeNames('Runner|Service $value')]).toEqual(['Runner', 'Service']);
  });
});

describe('paste alias conflict resolution', () => {
  const symbols = [{ fqcn: 'Vendor\\First', alias: 'First' }, { fqcn: 'Vendor\\Second', alias: 'Second' }];
  type Symbol = typeof symbols[number] & { selectedAlias?: string };
  const plan = async (selected: Symbol[]): Promise<{ conflict?: { fqcn: string; sourceAlias: string }; aliases?: string[] }> => {
    const conflict = selected.find(symbol => !symbol.selectedAlias);
    return conflict ? { conflict: { fqcn: conflict.fqcn, sourceAlias: conflict.alias } }
      : { aliases: selected.map(symbol => symbol.selectedAlias!) };
  };

  it('resolves both conflicts while preserving the original clipboard symbols', async () => {
    const asked: string[] = [];
    const result = await resolvePasteAliasConflicts(symbols, plan, async conflict => {
      asked.push(conflict.sourceAlias); return `${conflict.sourceAlias}External`;
    }, true, async () => true);
    expect(asked).toEqual(['First', 'Second']);
    expect(result).toEqual({ aliases: ['FirstExternal', 'SecondExternal'] });
    expect(symbols).toEqual([{ fqcn: 'Vendor\\First', alias: 'First' }, { fqcn: 'Vendor\\Second', alias: 'Second' }]);
  });

  it('cancels the entire result when the second alias is cancelled', async () => {
    expect(await resolvePasteAliasConflicts(symbols, plan, async conflict =>
      conflict.sourceAlias === 'First' ? 'FirstExternal' : undefined, true, async () => true)).toBeUndefined();
  });

  it('does not prompt in automatic mode', async () => {
    let asked = false;
    expect(await resolvePasteAliasConflicts(symbols, plan, async () => { asked = true; return 'Alias'; }, false, async () => true)).toBeUndefined();
    expect(asked).toBe(false);
  });

  it('withdraws the result when the source changes during alias selection', async () => {
    let unchanged = true;
    expect(await resolvePasteAliasConflicts(symbols, plan, async () => { unchanged = false; return 'Alias'; }, true, async () => unchanged)).toBeUndefined();
  });

  it('stops a repeated unresolved conflict without another prompt', async () => {
    let asked = 0;
    expect(await resolvePasteAliasConflicts(symbols, async () => ({ conflict: { fqcn: 'Vendor\\First', sourceAlias: 'First' } }),
      async () => { asked++; return 'Occupied'; }, true, async () => true)).toBeUndefined();
    expect(asked).toBe(1);
  });
});


describe('literal paste target preflight', () => {
  const target = (marked: string): boolean => {
    const start = marked.indexOf('|'); const source = marked.replace('|', '');
    return phpPasteTargetsOnlyText(source, [{ start, end: start }]);
  };
  it.each([
    "<?php $a='|';", '<?php $a="|";', "<?php $a='中文|😀';",
    String.raw`<?php $a='it\'s |text';`,
    '<?php /* " */ $a="|";', '<?php // "\n$a="|";', '<?php #[Label] $a="|";',
    "<?php $a='unterminated|", '<?php $a=<<<TXT\n|hello\nTXT;',
    "<?php $a=<<<'TXT'\n|$value\nTXT;", '<?php $a=<<<TXT\n|hello\n  TXT;',
    '<?php $a="?>"; ?>html |text',
    '<?php $a="{$obj->value}"; $b="|";',
  ])('recognizes text in %s', marked => expect(target(marked)).toBe(true));
  it.each([
    "<?php $a=''|;", "<?php $a=|'';", "<?php // ' |comment", "<?php /* ' |comment */",
    '<?php $a="{$obj->call("arg")}"; new |Service();',
    '<?php $a=<<<TXT\ntext\nTXT; new |Service();', '<?php $a=|new Service();',
    '<?php $a="{$|obj}";',
  ])('keeps code or ambiguous contexts in %s', marked => expect(target(marked)).toBe(false));
  it('requires every selection to stay inside text', () => {
    const source = "<?php $a='hello'; $b='world';";
    expect(phpPasteTargetsOnlyText(source, [{ start: 11, end: 14 }, { start: 22, end: 24 }])).toBe(true);
    expect(phpPasteTargetsOnlyText(source, [{ start: 11, end: 17 }])).toBe(false);
    expect(phpPasteTargetsOnlyText(source, [{ start: 11, end: 11 }, { start: 17, end: 17 }])).toBe(false);
    expect(phpPasteTargetsOnlyText(source, [])).toBe(false);
  });
});
