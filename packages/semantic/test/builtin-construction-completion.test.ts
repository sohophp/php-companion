import { afterAll, beforeAll, expect, it } from 'vitest';
import { builtinDocumentUri, builtinPhpStub, SUPPORTED_PHP_VERSIONS } from '@php-companion/language-spec';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
const handles = [['Shmop', 80], ['XMLParser', 80], ['FTP\\Connection', 81],
  ['PgSql\\Connection', 81], ['PgSql\\Result', 81], ['PgSql\\Lob', 81]] as const;

it.each(SUPPORTED_PHP_VERSIONS)('keeps PHP %s native factory types out of new but in references', version => {
  const workspace = new SemanticWorkspace(parser), uri = 'file:///NativeConstructor.php';
  try {
    workspace.update(builtinDocumentUri(version), builtinPhpStub(version));
    for (const [name, introduced] of handles) {
      const present = Number(version.replace('.', '')) >= introduced;
      for (const marked of ['<?php new \\' + name + '§;', '<?php new /* constructor */ \\' + name + '§;']) {
        workspace.update(uri, marked.replace('§', ''), true);
        expect(workspace.typeCompletionContext(uri, marked.indexOf('§'))?.constructKind).toBe('class');
        expect(workspace.completeTypes(uri, marked.indexOf('§')).map(item => item.fqcn), marked).not.toContain(name);
      }
      for (const marked of ['<?php function accept(\\' + name + '§ $value):void{}',
        '<?php function produce():\\' + name + '§{}', '<?php $value instanceof \\' + name + '§;',
        ...(name.includes('\\') ? ['<?php namespace Consumer; use ' + name + '§;'] : [])]) {
        workspace.update(uri, marked.replace('§', ''), true);
        expect(workspace.completeTypes(uri, marked.indexOf('§')).some(item => item.fqcn === name), marked).toBe(present);
      }
      const marked = '<?php use ' + name + ' as NativeHandle; new NativeHan§;';
      workspace.update(uri, marked.replace('§', ''), true);
      expect(workspace.completeTypes(uri, marked.indexOf('§')).map(item => item.fqcn)).not.toContain(name);
    }
    for (const name of ['Closure', 'Generator', 'GdImage', 'CurlHandle']) {
      const marked = '<?php new \\' + name + '§;'; workspace.update(uri, marked.replace('§', ''), true);
      expect(workspace.completeTypes(uri, marked.indexOf('§')).map(item => item.fqcn)).not.toContain(name);
    }
    for (const name of ['stdClass', 'ArrayObject', ...(Number(version.replace('.', '')) >= 80 ? ['WeakMap'] : [])]) {
      const marked = '<?php new \\' + name + '§;'; workspace.update(uri, marked.replace('§', ''), true);
      expect(workspace.completeTypes(uri, marked.indexOf('§')).map(item => item.fqcn)).toContain(name);
    }
  } finally { workspace.dispose(); }
});

it('preserves same-named user classes, including when native extensions are disabled', () => {
  const workspace = new SemanticWorkspace(parser), uri = 'file:///UserHandles.php';
  try {
    for (const disabledExtensions of [[], ['shmop', 'xml', 'ftp', 'pgsql']]) {
      const builtinUri = builtinDocumentUri('8.5', { disabledExtensions });
      workspace.update(builtinUri, builtinPhpStub('8.5', { disabledExtensions }));
      for (const [name] of handles) {
        const local = name.split('\\').at(-1)!;
        const marked = '<?php namespace UserHandles; class ' + local + ' {} new ' + local + '§;';
        workspace.update(uri, marked.replace('§', ''), true);
        const candidates = workspace.completeTypes(uri, marked.indexOf('§')).map(item => item.fqcn);
        expect(candidates).toContain('UserHandles\\' + local);
        expect(candidates).not.toContain(name);
      }
      workspace.remove(builtinUri);
    }
    const marked = '<?php class Shmop {} new Shmop§;';
    workspace.update(uri, marked.replace('§', ''), true);
    expect(workspace.completeTypes(uri, marked.indexOf('§')).map(item => item.fqcn)).toEqual(['Shmop']);
  } finally { workspace.dispose(); }
});
