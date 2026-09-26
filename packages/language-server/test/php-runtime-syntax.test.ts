import { spawnSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import type { SupportedPhpVersion } from '@php-companion/language-spec';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { analyzePhpDocument } from '../src/analysis.js';

const versions: SupportedPhpVersion[] = ['7.2', '7.3', '7.4', '8.0', '8.1', '8.2', '8.3', '8.4', '8.5'];
const configured = JSON.parse(process.env.PHP_COMPANION_TEST_PHP_BINARIES ?? '{}') as Partial<Record<SupportedPhpVersion, string>>;
const binaries = Object.entries(configured) as Array<[SupportedPhpVersion, string]>;
const cases: Array<{ name: string; introduced: SupportedPhpVersion; source: string }> = [
  { name: 'trailing-call-comma', introduced: '7.3', source: '<?php function f($x) {} f(1,);' },
  { name: 'arrow-function', introduced: '7.4', source: '<?php $f = fn(int $x): int => $x + 1;' },
  { name: 'match-expression', introduced: '8.0', source: '<?php $x = match (1) { 1 => 2, default => 0 };' },
  { name: 'enum', introduced: '8.1', source: '<?php enum State { case Ready; }' },
  { name: 'readonly-class', introduced: '8.2', source: '<?php readonly class State { public function __construct(public int $id) {} }' },
  { name: 'typed-class-constant', introduced: '8.3', source: '<?php class State { public const int ID = 1; }' },
  { name: 'property-hook', introduced: '8.4', source: '<?php class State { public int $id { get => 1; } }' },
  { name: 'void-cast', introduced: '8.5', source: '<?php (void) strlen("x");' },
];

it('requires a PHP 8.5 void cast operand without flagging comments or string content', async () => {
  const parser = await PhpSyntaxParser.createDefault();
  try {
    for (const source of ['<?php (void) ;', '<?php (void) /* spacer */ ;', '<?php foo((void));']) {
      const document = TextDocument.create('file:///void-cast.php', 'php', 1, source);
      const diagnostics = analyzePhpDocument(document, parser, '8.5').diagnostics;
      expect(diagnostics.some((item) => item.code === 'php.syntax'), source).toBe(true);
      expect(analyzePhpDocument(document, parser, '8.4').diagnostics.some((item) => item.code === 'php.syntax'), source).toBe(false);
    }
    for (const source of ['<?php (void) /* spacer */ strlen("x");', '<?php "(void)";']) {
      const document = TextDocument.create('file:///void-cast.php', 'php', 1, source);
      expect(analyzePhpDocument(document, parser, '8.5').diagnostics.some((item) => item.code === 'php.syntax'), source).toBe(false);
    }
  } finally {
    parser.dispose();
  }
});

describe.skipIf(binaries.length === 0)('real PHP syntax versus SoPHP diagnostics', () => {
  let parser: PhpSyntaxParser;
  beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
  afterAll(() => parser.dispose());

  it.each(binaries)('matches PHP %s syntax acceptance', async (version, executable) => {
    expect(versions).toContain(version);
    const root = await mkdtemp(join(tmpdir(), 'sophp-runtime-syntax-'));
    try {
      for (const fixture of cases) {
        const path = join(root, `${fixture.name}.php`);
        await writeFile(path, fixture.source);
        const runtime = spawnSync(executable, ['-l', path], { encoding: 'utf8', timeout: 3_000 });
        expect(runtime.error, `${version} ${fixture.name}: ${runtime.stderr}`).toBeUndefined();
        const accepted = runtime.status === 0;
        expect(accepted, `${version} ${fixture.name}: ${runtime.stderr}`)
          .toBe(versions.indexOf(version) >= versions.indexOf(fixture.introduced));

        const document = TextDocument.create(`file://${path}`, 'php', 1, fixture.source);
        const issues = analyzePhpDocument(document, parser, version).diagnostics
          .filter((item) => item.code === 'php.syntax' || item.code === 'php.version.unsupported');
        if (accepted) expect(issues, `${version} ${fixture.name}`).toEqual([]);
        else expect(issues.some((item) => item.code === 'php.version.unsupported'), `${version} ${fixture.name}: ${JSON.stringify(issues)}`)
          .toBe(true);
      }
      for (const [name, source] of [
        ['missing-void-operand', '<?php (void) ;'],
        ['missing-void-operand-after-comment', '<?php (void) /* spacer */ ;'],
        ['missing-void-argument', '<?php foo((void));'],
      ]) {
        const path = join(root, `${name}.php`);
        await writeFile(path, source);
        const runtime = spawnSync(executable, ['-l', path], { encoding: 'utf8', timeout: 3_000 });
        const shouldReject = version === '8.5';
        expect(runtime.status !== 0, `${version} ${name}: ${runtime.stderr}`).toBe(shouldReject);
        const document = TextDocument.create(`file://${path}`, 'php', 1, source);
        const hasSyntaxError = analyzePhpDocument(document, parser, version).diagnostics.some((item) => item.code === 'php.syntax');
        expect(hasSyntaxError, `${version} ${name}: ${runtime.stderr}`).toBe(shouldReject);
      }
      if (version === '8.5') {
        for (const [name, source] of [
          ['valid-void-with-comment', '<?php (void) /* spacer */ strlen("x");'],
          ['void-text-in-string', '<?php "(void)";'],
        ]) {
          const path = join(root, `${name}.php`);
          await writeFile(path, source);
          const runtime = spawnSync(executable, ['-l', path], { encoding: 'utf8', timeout: 3_000 });
          expect(runtime.status, `${version} ${name}: ${runtime.stderr}`).toBe(0);
          const document = TextDocument.create(`file://${path}`, 'php', 1, source);
          expect(analyzePhpDocument(document, parser, version).diagnostics.filter((item) => item.code === 'php.syntax'),
            `${version} ${name}`).toEqual([]);
        }
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
